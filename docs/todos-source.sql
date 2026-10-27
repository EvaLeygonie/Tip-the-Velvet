-- Run once in the Supabase SQL editor. Safe to run again. Afterwards regenerate
-- src/types/database.types.ts.
--
-- Marks where a to-do came from, so the dashboard can show the ones made from guest feedback in their
-- own "Feedback" section (with a subsection per event) instead of mixed into the event's list.
-- 'feedback' = made with the "Make a to-do" button on /admin/feedback; null = a normal to-do.
alter table public.todos add column if not exists source text;

-- The to-dos already made from feedback comments start with "Förbättra: " or "Improve: ".
update public.todos
set source = 'feedback'
where source is null
  and event_id is not null
  and (title like 'Förbättra: %' or title like 'Improve: %');
