-- Real map coordinates + richer helper coverage fields.

-- ─────────────────────────────────────────────────────────────
-- Real lat/lng for map markers, replacing the abstract map_x/map_y
-- SVG coordinates used by the old illustrated map.
-- ─────────────────────────────────────────────────────────────
alter table public.requests
  add column if not exists lat double precision,
  add column if not exists lng double precision;

alter table public.helpers
  add column if not exists lat double precision,
  add column if not exists lng double precision;

-- Helpers can cover several districts, plus free-text local areas.
alter table public.helpers
  add column if not exists districts_covered text[] not null default '{}',
  add column if not exists areas_text text;

-- Carry the old single free-text column over, then leave it in place
-- (dropping it would break any row an admin still has open).
update public.helpers
  set areas_text = areas_covered
  where areas_text is null and areas_covered is not null;

-- ─────────────────────────────────────────────────────────────
-- Backfill coordinates for existing rows: district centre plus a small
-- offset so overlapping pins stay individually clickable. ~0.045 deg is
-- roughly 5 km, which keeps a pin inside its own district.
-- ─────────────────────────────────────────────────────────────
create or replace function public.district_centre(d text)
returns double precision[]
language sql immutable
as $$
  select case d
    when 'Sivasagar'  then array[26.9855, 94.6376]
    when 'Charaideo'  then array[27.0333, 95.0167]
    when 'Jorhat'     then array[26.7509, 94.2037]
    else array[26.9855, 94.6376]
  end;
$$;

update public.requests
set lat = (public.district_centre(district))[1] + (random() - 0.5) * 0.09,
    lng = (public.district_centre(district))[2] + (random() - 0.5) * 0.09
where lat is null;

-- A request with a real shared GPS pin should use it verbatim.
update public.requests
set lat = live_lat, lng = live_lng
where has_live_location = true and live_lat is not null and live_lng is not null;

update public.helpers
set lat = (public.district_centre('Sivasagar'))[1] + (random() - 0.5) * 0.09,
    lng = (public.district_centre('Sivasagar'))[2] + (random() - 0.5) * 0.09
where lat is null;

-- ─────────────────────────────────────────────────────────────
-- Phone numbers are Indian 10-digit mobiles (first digit 6-9).
-- Enforced here as well as in the UI so a direct API call can't bypass it.
-- ─────────────────────────────────────────────────────────────
-- Existing rows were stored with spaces / +91 prefixes; strip to bare digits
-- first, otherwise the constraint below rejects them.
update public.requests
  set contact_number = right(regexp_replace(contact_number, '\D', '', 'g'), 10);
update public.helpers
  set contact_number = right(regexp_replace(contact_number, '\D', '', 'g'), 10);

alter table public.requests
  drop constraint if exists requests_contact_number_check;
alter table public.requests
  add constraint requests_contact_number_check
  check (contact_number ~ '^[6-9][0-9]{9}$');

alter table public.helpers
  drop constraint if exists helpers_contact_number_check;
alter table public.helpers
  add constraint helpers_contact_number_check
  check (contact_number ~ '^[6-9][0-9]{9}$');

-- ─────────────────────────────────────────────────────────────
-- The abstract SVG coordinates the illustrated map used are gone.
-- ─────────────────────────────────────────────────────────────
alter table public.requests drop column if exists map_x, drop column if exists map_y;
alter table public.helpers  drop column if exists map_x, drop column if exists map_y;

drop function if exists public.district_centre(text);
