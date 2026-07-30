-- Feedback round 2:
--   * one alternate number is not enough — a household shares whichever phone
--     still has charge, so keep a list (primary + up to 4 more)
--   * rescuers get a free-text note, same as requesters already have
--
-- contact_number stays the primary: the rate-limit trigger and every existing
-- card, popup and admin row read it, and it is the number that gets dialled
-- first. The extras live in an array beside it.

alter table public.requests
  add column if not exists contact_numbers text[] not null default '{}';

alter table public.helpers
  add column if not exists contact_numbers text[] not null default '{}',
  add column if not exists notes text;

-- Carry over the single alternate number added in 0005.
update public.requests
  set contact_numbers = array[contact_number_2]
  where contact_number_2 is not null and contact_numbers = '{}';
update public.helpers
  set contact_numbers = array[contact_number_2]
  where contact_number_2 is not null and contact_numbers = '{}';

alter table public.requests drop constraint if exists requests_contact_2_check;
alter table public.helpers  drop constraint if exists helpers_contact_2_check;
alter table public.requests drop column if exists contact_number_2;
alter table public.helpers  drop column if exists contact_number_2;

-- Four extras on top of the primary. Element format is checked by joining the
-- array into one string: a CHECK cannot run a subquery, and array_to_string is
-- immutable, so this is the one expression that validates every element.
alter table public.requests drop constraint if exists requests_contact_numbers_check;
alter table public.requests
  add constraint requests_contact_numbers_check check (
    coalesce(array_length(contact_numbers, 1), 0) <= 4
    and (
      coalesce(array_length(contact_numbers, 1), 0) = 0
      or array_to_string(contact_numbers, ',') ~ '^[6-9][0-9]{9}(,[6-9][0-9]{9})*$'
    )
  );

alter table public.helpers drop constraint if exists helpers_contact_numbers_check;
alter table public.helpers
  add constraint helpers_contact_numbers_check check (
    coalesce(array_length(contact_numbers, 1), 0) <= 4
    and (
      coalesce(array_length(contact_numbers, 1), 0) = 0
      or array_to_string(contact_numbers, ',') ~ '^[6-9][0-9]{9}(,[6-9][0-9]{9})*$'
    )
  );

alter table public.helpers drop constraint if exists helpers_notes_len;
alter table public.helpers
  add constraint helpers_notes_len check (notes is null or length(notes) <= 500);
