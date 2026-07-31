-- The 500-person cap from 0003 was only ever meant to stop garbage input
-- (a mistyped 999999999), but it turned out to reject real rows: a college or
-- a relief camp sheltering a whole neighbourhood is legitimately in the
-- hundreds-to-thousands. 5000 is still far below "obviously fake" while
-- fitting any single site in the three districts.

alter table public.requests drop constraint if exists requests_people_max;
alter table public.requests
  add constraint requests_people_max check (num_people <= 5000);
