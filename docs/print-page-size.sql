-- Run once in the Supabase SQL editor. Safe to run again. Afterwards regenerate
-- src/types/database.types.ts.
--
-- A page size (A4, A3, ...) for each "To print" row, shown next to the number of copies.
-- null = not set. On a standard row it is the default every event starts with; a row on one event
-- can have its own.
alter table public.print_standard_items add column if not exists page_size text;
alter table public.event_print_items add column if not exists page_size text;
