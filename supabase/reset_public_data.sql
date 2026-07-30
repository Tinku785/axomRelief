-- ─────────────────────────────────────────────────────────────
-- DESTRUCTIVE. Wipes every help request, every rescuer registration and
-- every news update. Helpline numbers are the only thing kept.
--
-- Deliberately NOT a migration: a file under migrations/ re-runs on every
-- `supabase db push`, which would silently wipe live flood data on each
-- deploy. Run this by hand, once, in the Supabase SQL editor:
--
--     psql "$DATABASE_URL" -f supabase/reset_public_data.sql
--
-- There is no undo. Take a backup first if the rows might matter.
-- ─────────────────────────────────────────────────────────────

begin;

delete from public.requests;
delete from public.helpers;
delete from public.news_updates;

-- The IP/phone rate-limit ledger. Clearing it means a tester who already hit
-- the limit is not locked out of the fresh install. Holds no public data.
delete from public.submission_log;

-- public.helplines is intentionally untouched.

commit;

-- What is left:
select 'requests'     as table_name, count(*) from public.requests
union all select 'helpers',       count(*) from public.helpers
union all select 'news_updates',  count(*) from public.news_updates
union all select 'helplines',     count(*) from public.helplines;
