-- Run once in the Supabase SQL editor. Safe to run again. Afterwards regenerate
-- src/types/database.types.ts.
--
-- 1. A general "To print" list that belongs to no event (event_id null), for things to print all year.
-- 2. A past event's print list stays on the dashboard until it is archived (events.print_archived).
alter table public.event_print_items alter column event_id drop not null;

alter table public.events add column if not exists print_archived boolean not null default false;

-- Shows already-past events as archived, except the one that just happened (the last two weeks), so
-- the dashboard doesn't suddenly list every old show.
update public.events
set print_archived = true
where event_start < now() - interval '14 days' and not print_archived;
