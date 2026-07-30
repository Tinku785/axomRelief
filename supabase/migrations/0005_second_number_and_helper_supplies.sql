-- Feedback round 1:
--   * both forms: a second contact number (one phone dies, the other rings)
--   * rescuers: supplies picked from the same category list requesters use,
--     so a rescuer's offer can be cross-referenced against a request's needs.

alter table public.requests
  add column if not exists contact_number_2 text;

alter table public.helpers
  add column if not exists contact_number_2 text,
  add column if not exists supplies text[] not null default '{}',
  add column if not exists supplies_other text;

-- Same shape rule as the primary number, but optional.
alter table public.requests drop constraint if exists requests_contact_2_check;
alter table public.requests
  add constraint requests_contact_2_check
  check (contact_number_2 is null or contact_number_2 ~ '^[6-9][0-9]{9}$');

alter table public.helpers drop constraint if exists helpers_contact_2_check;
alter table public.helpers
  add constraint helpers_contact_2_check
  check (contact_number_2 is null or contact_number_2 ~ '^[6-9][0-9]{9}$');

alter table public.helpers drop constraint if exists helpers_supplies_len;
alter table public.helpers
  add constraint helpers_supplies_len
  check (coalesce(array_length(supplies, 1), 0) <= 10);

alter table public.helpers drop constraint if exists helpers_supplies_other_len;
alter table public.helpers
  add constraint helpers_supplies_other_len
  check (supplies_other is null or length(supplies_other) <= 100);
