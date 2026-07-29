-- Axom Relief — initial schema
-- Run with: supabase db push   (or paste into the Supabase SQL editor)

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────
-- requests — "I want help" submissions
-- ─────────────────────────────────────────────────────────────
create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  district text not null check (district in ('Sivasagar', 'Charaideo', 'Jorhat')),
  location text not null,
  contact_number text not null,
  num_people integer not null default 1 check (num_people >= 1),
  needs text[] not null default '{}',
  needs_other text,
  priority text not null check (priority in ('critical', 'urgent', 'needed')),
  boat_required boolean,
  notes text,
  has_live_location boolean not null default false,
  live_lat double precision,
  live_lng double precision,
  map_x double precision not null,
  map_y double precision not null,
  helper_name text,
  helper_from text,
  helper_eta_minutes integer,
  helper_en_route_at timestamptz,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists requests_created_at_idx on public.requests (created_at desc);
create index if not exists requests_district_idx on public.requests (district);
create index if not exists requests_priority_idx on public.requests (priority);
create index if not exists requests_hidden_idx on public.requests (hidden);

alter table public.requests enable row level security;

create policy "public can read visible requests"
  on public.requests for select
  to anon, authenticated
  using (hidden = false);

create policy "admins can read all requests"
  on public.requests for select
  to authenticated
  using (true);

create policy "anyone can submit a request"
  on public.requests for insert
  to anon, authenticated
  with check (hidden = false);

create policy "admins can update requests"
  on public.requests for update
  to authenticated
  using (true)
  with check (true);

create policy "admins can delete requests"
  on public.requests for delete
  to authenticated
  using (true);

-- ─────────────────────────────────────────────────────────────
-- helpers — "I am helping" rescuer registrations
-- ─────────────────────────────────────────────────────────────
create table if not exists public.helpers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_number text not null,
  areas_covered text,
  what_given text,
  boat_available boolean,
  map_x double precision not null,
  map_y double precision not null,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists helpers_created_at_idx on public.helpers (created_at desc);
create index if not exists helpers_hidden_idx on public.helpers (hidden);

alter table public.helpers enable row level security;

create policy "public can read visible helpers"
  on public.helpers for select
  to anon, authenticated
  using (hidden = false);

create policy "admins can read all helpers"
  on public.helpers for select
  to authenticated
  using (true);

create policy "anyone can register as a helper"
  on public.helpers for insert
  to anon, authenticated
  with check (hidden = false);

create policy "admins can update helpers"
  on public.helpers for update
  to authenticated
  using (true)
  with check (true);

create policy "admins can delete helpers"
  on public.helpers for delete
  to authenticated
  using (true);

-- ─────────────────────────────────────────────────────────────
-- helplines — control room numbers shown in the footer
-- ─────────────────────────────────────────────────────────────
create table if not exists public.helplines (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  phone_number text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists helplines_sort_order_idx on public.helplines (sort_order);

alter table public.helplines enable row level security;

create policy "anyone can read helplines"
  on public.helplines for select
  to anon, authenticated
  using (true);

create policy "admins can insert helplines"
  on public.helplines for insert
  to authenticated
  with check (true);

create policy "admins can update helplines"
  on public.helplines for update
  to authenticated
  using (true)
  with check (true);

create policy "admins can delete helplines"
  on public.helplines for delete
  to authenticated
  using (true);

-- ─────────────────────────────────────────────────────────────
-- news_updates — admin-posted "Latest updates" shown on every page
-- ─────────────────────────────────────────────────────────────
create table if not exists public.news_updates (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists news_updates_created_at_idx on public.news_updates (created_at desc);

alter table public.news_updates enable row level security;

create policy "anyone can read news updates"
  on public.news_updates for select
  to anon, authenticated
  using (true);

create policy "admins can insert news updates"
  on public.news_updates for insert
  to authenticated
  with check (true);

create policy "admins can delete news updates"
  on public.news_updates for delete
  to authenticated
  using (true);

-- Note: admin accounts are created manually in the Supabase dashboard
-- (Authentication -> Users). There is no public sign-up — any authenticated
-- user is treated as an admin, matching the prototype's "Supabase Auth,
-- no public sign-up" design.
