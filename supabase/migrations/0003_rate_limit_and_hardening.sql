-- Axom Relief — abuse protection.
--
-- The anon key ships in the public JS bundle, so anyone can POST straight to
-- PostgREST with curl. The browser (Turnstile, the honeypot, form validation)
-- is therefore NOT a trust boundary — the database is the only place a limit
-- can actually be enforced. Everything below runs server-side.

-- ─────────────────────────────────────────────────────────────
-- Size caps — stop a single POST from writing a megabyte of text
-- ─────────────────────────────────────────────────────────────
alter table public.requests
  add constraint requests_name_len       check (length(name) between 1 and 80),
  add constraint requests_location_len   check (length(location) between 1 and 200),
  add constraint requests_other_len      check (needs_other is null or length(needs_other) <= 100),
  add constraint requests_notes_len      check (notes is null or length(notes) <= 500),
  add constraint requests_needs_len      check (coalesce(array_length(needs, 1), 0) <= 10),
  add constraint requests_people_max     check (num_people <= 500);

alter table public.helpers
  add constraint helpers_name_len        check (length(name) between 1 and 80),
  add constraint helpers_areas_len       check (areas_text is null or length(areas_text) <= 200),
  add constraint helpers_given_len       check (what_given is null or length(what_given) <= 200),
  add constraint helpers_districts_len   check (coalesce(array_length(districts_covered, 1), 0) <= 3);

alter table public.helplines
  add constraint helplines_label_len     check (length(label) between 1 and 60),
  add constraint helplines_phone_len     check (length(phone_number) between 3 and 20);

alter table public.news_updates
  add constraint news_message_len        check (length(message) between 1 and 500);

-- ─────────────────────────────────────────────────────────────
-- Rate limit — per client IP, enforced in a BEFORE INSERT trigger
-- ─────────────────────────────────────────────────────────────

-- RLS on with zero policies: unreachable through the API. Only the
-- security-definer trigger below can touch it, so caller IPs never become
-- publicly readable the way an `ip` column on `requests` would.
create table if not exists public.submission_log (
  id bigserial primary key,
  client_ip text not null,
  created_at timestamptz not null default now()
);

create index if not exists submission_log_ip_time_idx
  on public.submission_log (client_ip, created_at desc);

alter table public.submission_log enable row level security;

create or replace function public.enforce_submission_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  ip text;
  recent integer;
begin
  -- Signed-in admins are not rate limited.
  if auth.role() = 'authenticated' then
    return new;
  end if;

  -- First hop of x-forwarded-for is the real client on Supabase's edge.
  -- Unidentifiable callers share one bucket on purpose: fail closed, so a
  -- stripped header throttles harder rather than opening a bypass.
  ip := coalesce(
    nullif(split_part(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ',', 1), ''),
    'unknown'
  );

  -- ponytail: swept inline on write. Fine at helpline scale (a few rows/min);
  -- move to a pg_cron job if the table ever gets hot.
  delete from public.submission_log where created_at < now() - interval '1 hour';

  select count(*) into recent
  from public.submission_log
  where client_ip = ip and created_at > now() - interval '10 minutes';

  if recent >= 5 then
    raise exception 'rate_limit_exceeded'
      using hint = 'Too many submissions from this connection. Please wait a few minutes.';
  end if;

  insert into public.submission_log (client_ip) values (ip);
  return new;
end;
$$;

-- Only the trigger runs this; nobody should be able to call it directly.
revoke all on function public.enforce_submission_rate_limit() from public, anon, authenticated;

drop trigger if exists requests_rate_limit on public.requests;
create trigger requests_rate_limit
  before insert on public.requests
  for each row execute function public.enforce_submission_rate_limit();

drop trigger if exists helpers_rate_limit on public.helpers;
create trigger helpers_rate_limit
  before insert on public.helpers
  for each row execute function public.enforce_submission_rate_limit();

-- ─────────────────────────────────────────────────────────────
-- RLS tightening
-- ─────────────────────────────────────────────────────────────

-- The old public-insert policies let anyone write the rescue-dispatch fields
-- (helper_name / helper_en_route_at) or backdate created_at, which would let a
-- forged row claim "a rescuer is already on the way" and get someone skipped.
drop policy if exists "anyone can submit a request" on public.requests;
create policy "anyone can submit a request"
  on public.requests for insert
  to anon, authenticated
  with check (
    hidden = false
    and helper_name is null
    and helper_from is null
    and helper_eta_minutes is null
    and helper_en_route_at is null
    and created_at > now() - interval '5 minutes'
  );

drop policy if exists "anyone can register as a helper" on public.helpers;
create policy "anyone can register as a helper"
  on public.helpers for insert
  to anon, authenticated
  with check (hidden = false and created_at > now() - interval '5 minutes');

-- News updates had no update policy, so admins could post but never fix a typo.
drop policy if exists "admins can update news updates" on public.news_updates;
create policy "admins can update news updates"
  on public.news_updates for update
  to authenticated
  using (true)
  with check (true);
