-- Admin triage ranking: a priority score computed fresh on every read.
--
-- Nothing is stored. The score is a PostgREST computed column, so the admin
-- list gets it by asking for `select=*,priority_score` and it is recalculated
-- per query - which is the point: the age term moves on its own, and marking a
-- request resolved drops it out of the ranked view with no backfill.
--
-- On the status model: this does NOT add an open/resolved enum. `status`
-- already exists (0008) with three values, and 'in_progress' carries real
-- meaning - a rescuer said they are attending but nobody has confirmed arrival.
-- Collapsing it would lose that distinction on live rows. "Open" here means
-- "not resolved", which is what the ranked view actually needs.

-- ─────────────────────────────────────────────────────────────
-- When a request was resolved - so the resolved tab can sort by it
-- ─────────────────────────────────────────────────────────────
-- The 44 rows already resolved predate this column and stay null; the UI falls
-- back to created_at for them rather than inventing a resolution time.
alter table public.requests add column if not exists resolved_at timestamptz;

create or replace function public.stamp_resolved_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'resolved' and old.status is distinct from 'resolved' then
    new.resolved_at := now();
  elsif new.status <> 'resolved' then
    -- Reopening clears it, so a row cannot claim a resolution time it no
    -- longer has.
    new.resolved_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists requests_stamp_resolved_at on public.requests;
create trigger requests_stamp_resolved_at
  before update on public.requests
  for each row execute function public.stamp_resolved_at();

-- ─────────────────────────────────────────────────────────────
-- request_updates - the source of the score's update_count term
-- ─────────────────────────────────────────────────────────────
-- The scoring formula subtracts 15 per logged update: a request an operator has
-- already touched several times is one somebody is working, so it should sink
-- below untouched requests of equal urgency.
--
-- NOTE: nothing writes to this table yet. No feature in the app logs an update,
-- so update_count is 0 for every row today and the term contributes nothing.
-- The table and the join exist so the formula is implemented as specified and
-- starts working the moment an update-logging feature lands.
create table if not exists public.request_updates (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  note text check (note is null or length(note) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists request_updates_request_idx
  on public.request_updates (request_id);

alter table public.request_updates enable row level security;

-- Same rule as every other operator table: real admins only, checked by the
-- database rather than by the client.
drop policy if exists "admins can read request updates" on public.request_updates;
create policy "admins can read request updates"
  on public.request_updates for select to authenticated using (public.is_admin());

drop policy if exists "admins can insert request updates" on public.request_updates;
create policy "admins can insert request updates"
  on public.request_updates for insert to authenticated with check (public.is_admin());

drop policy if exists "admins can delete request updates" on public.request_updates;
create policy "admins can delete request updates"
  on public.request_updates for delete to authenticated using (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- Weights
-- ─────────────────────────────────────────────────────────────
-- Immutable, so it can be inlined and used inside an aggregate.
create or replace function public.need_weight(need text)
returns integer
language sql
immutable
as $$
  select case need
    when 'medical'    then 3
    when 'rescue'     then 3
    when 'water'      then 2
    when 'food'       then 2
    when 'sanitation' then 2
    when 'baby_care'  then 2
    when 'clothes'    then 1
    else 1               -- 'other', plus any key added to the UI but not here
  end;
$$;

-- ─────────────────────────────────────────────────────────────
-- The score
-- ─────────────────────────────────────────────────────────────
--   (priority_weight × 50)
-- + (needs_weight    × 20)   highest weight among the needs selected
-- + (LEAST(num_people, 20))
-- + (hours_since_created × 0.5)
-- − (update_count × 15)
--
-- Takes the table row type and lives in the exposed schema, which is what makes
-- PostgREST treat it as a computed column on `requests`.
create or replace function public.priority_score(r public.requests)
returns numeric
language sql
stable
as $$
  select round(
      (case r.priority
         when 'critical' then 3
         when 'urgent'   then 2
         else 1
       end) * 50
    -- A request whose only need is free-text 'other' has an empty needs array
    -- (the client strips the key on insert), so fall back to weight 1 rather
    -- than scoring it as if it asked for nothing.
    + coalesce(
        (select max(public.need_weight(n)) from unnest(r.needs) as n),
        case when r.needs_other is not null then 1 else 0 end
      ) * 20
    + least(r.num_people, 20)
    + (extract(epoch from (now() - r.created_at)) / 3600) * 0.5
    - (select count(*) from public.request_updates u where u.request_id = r.id) * 15
  , 1);
$$;

-- Readable by the same roles that can read the rows it scores; RLS on
-- `requests` still decides which rows they ever see.
grant execute on function public.need_weight(text) to anon, authenticated;
grant execute on function public.priority_score(public.requests) to anon, authenticated;
