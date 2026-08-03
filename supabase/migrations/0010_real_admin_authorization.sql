-- Security disclosure, Finding 2 (critical): "admin" meant "has any session".
--
-- Every admin policy was `to authenticated using (true)`, so ANY account -
-- including one created through public signup - could read hidden rows, hide
-- live requests and permanently delete victim records by calling PostgREST
-- directly. A frontend email allowlist would not have touched this: the
-- database was the thing granting the rights, so the database is where the
-- fix has to live.

create table if not exists public.admins (
  email text primary key,
  note text,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

-- Seeded with the accounts that exist today. Add a co-admin with:
--   insert into public.admins (email, note) values ('someone@example.com', 'who they are');
insert into public.admins (email, note)
values ('admin@axomrelief.app', 'original operator account')
on conflict (email) do nothing;

-- security definer so the check can read a table that nobody can read directly;
-- stable so Postgres may cache it within a statement instead of re-running it
-- once per row.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- Admins may read the list (the dashboard shows who has access); nobody may
-- change it through the API. Adding an admin is a deliberate act at the SQL
-- editor, not something a compromised session can do.
drop policy if exists "admins can read the admin list" on public.admins;
create policy "admins can read the admin list"
  on public.admins for select
  to authenticated
  using (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- Replace every "any logged-in user" policy with a real check
-- ─────────────────────────────────────────────────────────────
drop policy if exists "admins can read all requests" on public.requests;
create policy "admins can read all requests"
  on public.requests for select to authenticated using (public.is_admin());

drop policy if exists "admins can update requests" on public.requests;
create policy "admins can update requests"
  on public.requests for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins can delete requests" on public.requests;
create policy "admins can delete requests"
  on public.requests for delete to authenticated using (public.is_admin());

drop policy if exists "admins can read all helpers" on public.helpers;
create policy "admins can read all helpers"
  on public.helpers for select to authenticated using (public.is_admin());

drop policy if exists "admins can update helpers" on public.helpers;
create policy "admins can update helpers"
  on public.helpers for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins can delete helpers" on public.helpers;
create policy "admins can delete helpers"
  on public.helpers for delete to authenticated using (public.is_admin());

drop policy if exists "admins can insert helplines" on public.helplines;
create policy "admins can insert helplines"
  on public.helplines for insert to authenticated with check (public.is_admin());

drop policy if exists "admins can update helplines" on public.helplines;
create policy "admins can update helplines"
  on public.helplines for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins can delete helplines" on public.helplines;
create policy "admins can delete helplines"
  on public.helplines for delete to authenticated using (public.is_admin());

drop policy if exists "admins can insert news updates" on public.news_updates;
create policy "admins can insert news updates"
  on public.news_updates for insert to authenticated with check (public.is_admin());

drop policy if exists "admins can update news updates" on public.news_updates;
create policy "admins can update news updates"
  on public.news_updates for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins can delete news updates" on public.news_updates;
create policy "admins can delete news updates"
  on public.news_updates for delete to authenticated using (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- The rate limiter exempted "authenticated", which was the same mistake
-- ─────────────────────────────────────────────────────────────
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
  -- Only real admins skip the limit now. Before this, anyone who signed up
  -- could post unlimited rows.
  if public.is_admin() then
    return new;
  end if;

  ip := coalesce(
    nullif(split_part(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ',', 1), ''),
    'unknown'
  );

  phone := right(regexp_replace(coalesce(new.contact_number, ''), '\D', '', 'g'), 10);
  phash := case when phone = '' then null else md5(phone) end;

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
