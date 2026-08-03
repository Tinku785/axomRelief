-- Watermark for the WhatsApp CSV export. One row, id 'requests_export', holding
-- the newest request that has actually been delivered to the group.
--
-- The exporter only advances this after a successful send, so a failed query or
-- a failed send leaves the watermark where it was and the next run retries the
-- same batch. Losing a flood request from the export is worse than sending one
-- twice.

create table if not exists public.export_state (
  id text primary key default 'requests_export',
  last_exported_id uuid,
  last_exported_created_at timestamptz,
  updated_at timestamptz not null default now()
);

insert into public.export_state (id) values ('requests_export')
on conflict (id) do nothing;

-- No policies: RLS on with none defined means the table is unreachable through
-- the public API. The exporter reaches it with the service role key, which
-- bypasses RLS by design.
alter table public.export_state enable row level security;
