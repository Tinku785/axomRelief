-- Drops the WhatsApp CSV export watermark from 0011. That automation is no
-- longer being built, and the table has no readers left.
--
-- No `cascade`: nothing depends on this table (no inbound FKs, no views, no
-- functions, no policies), so a plain drop is correct and will fail loudly
-- rather than quietly taking something else with it if that ever stops holding.
drop table if exists public.export_state;
