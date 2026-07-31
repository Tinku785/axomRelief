-- A request has a lifecycle, not just an existence:
--
--   looking      nobody has picked it up yet
--   in_progress  a rescuer said they are attending — still visible to everyone
--                else, because "someone said they'd go" is not the same as
--                "they arrived", and hiding it would strand the family if that
--                rescuer never turns up
--   resolved     an admin phoned the family and confirmed help reached them.
--                Stays in the list, greyed out; drops off the map.

alter table public.requests
  add column if not exists status text not null default 'looking';

alter table public.requests drop constraint if exists requests_status_check;
alter table public.requests
  add constraint requests_status_check
  check (status in ('looking', 'in_progress', 'resolved'));

-- Rows that already had a rescuer stamped on them are in progress.
update public.requests
  set status = 'in_progress'
  where status = 'looking' and helper_en_route_at is not null;

create index if not exists requests_status_idx on public.requests (status);

-- ─────────────────────────────────────────────────────────────
-- Letting the public claim a request, without letting them edit it
-- ─────────────────────────────────────────────────────────────
-- The anon key is in the public bundle, so "the button only sends status" is
-- not a control — a curl can send any column. RLS decides WHICH ROWS may be
-- updated; only a trigger can decide WHICH COLUMNS. Both are needed.

create policy "anyone can claim a request"
  on public.requests for update
  to anon
  using (hidden = false and status = 'looking')
  with check (status = 'in_progress');

create or replace function public.guard_public_request_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  claimed_by text;
begin
  -- Guard ONLY the anonymous path. Checking for 'authenticated' instead would
  -- also trap the service role and the SQL editor (auth.role() is null there),
  -- locking an operator out of fixing a row by hand — which is exactly how
  -- this table gets maintained.
  if coalesce(auth.role(), 'service_role') <> 'anon' then
    return new;
  end if;

  if old.status <> 'looking' or new.status <> 'in_progress' then
    raise exception 'not_allowed';
  end if;

  -- Keep the one field the claimer is allowed to contribute, then throw the
  -- rest of their payload away by rebuilding the row from the stored one.
  -- Written this way on purpose: a column added later is protected by default
  -- instead of silently becoming publicly writable.
  claimed_by := nullif(trim(new.helper_name), '');
  new := old;
  new.status := 'in_progress';
  new.helper_name := left(claimed_by, 80);
  new.helper_en_route_at := now();
  return new;
end;
$$;

revoke all on function public.guard_public_request_update() from public, anon, authenticated;

drop trigger if exists requests_public_update_guard on public.requests;
create trigger requests_public_update_guard
  before update on public.requests
  for each row execute function public.guard_public_request_update();
