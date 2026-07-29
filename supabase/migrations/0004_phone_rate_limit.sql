-- Axom Relief — rate limit by phone number as well as by IP.
--
-- IP alone is not enough: a bot on a phone network or a cheap proxy pool gets a
-- fresh IP per request, but the number it types is what an operator actually has
-- to call. Limiting the number too means a flood of fake requests all claiming
-- one contact number gets stopped even when every POST comes from a new address.
--
-- The two limits are deliberately different: 5 per IP (a whole village can share
-- one tower NAT, so it has to be loose) and 3 per number in 10 minutes (one
-- person legitimately re-submitting a couple of times, no more).

alter table public.submission_log
  add column if not exists phone_hash text;

create index if not exists submission_log_phone_time_idx
  on public.submission_log (phone_hash, created_at desc);

create or replace function public.enforce_submission_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  ip         text;
  phone      text;
  phash      text;
  recent_ip  integer;
  recent_ph  integer;
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

  -- Both requests and helpers store the number in contact_number. Strip to
  -- digits and keep the last 10 so 91xxxxxxxxxx, 0xxxxxxxxxx and xxxxxxxxxx
  -- all land in the same bucket — otherwise the limit is bypassed by prefix.
  phone := right(regexp_replace(coalesce(new.contact_number, ''), '\D', '', 'g'), 10);

  -- ponytail: md5, not a salted KDF. This only has to be a stable counting key,
  -- and the table is RLS-locked with zero policies so it is unreachable through
  -- the API. It avoids a second plaintext copy of every caller's number; it is
  -- NOT protection against someone who already has database access.
  phash := case when phone = '' then null else md5(phone) end;

  -- ponytail: swept inline on write. Fine at helpline scale (a few rows/min);
  -- move to a pg_cron job if the table ever gets hot.
  delete from public.submission_log where created_at < now() - interval '1 hour';

  select count(*) into recent_ip
  from public.submission_log
  where client_ip = ip and created_at > now() - interval '10 minutes';

  if recent_ip >= 5 then
    raise exception 'rate_limit_exceeded'
      using hint = 'Too many submissions from this connection. Please wait a few minutes.';
  end if;

  if phash is not null then
    select count(*) into recent_ph
    from public.submission_log
    where phone_hash = phash and created_at > now() - interval '10 minutes';

    if recent_ph >= 3 then
      raise exception 'rate_limit_exceeded'
        using hint = 'This phone number has already been submitted several times. Please wait a few minutes.';
    end if;
  end if;

  insert into public.submission_log (client_ip, phone_hash) values (ip, phash);
  return new;
end;
$$;

revoke all on function public.enforce_submission_rate_limit() from public, anon, authenticated;
