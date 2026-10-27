-- Run once in the Supabase SQL editor. Safe to run again. Afterwards regenerate
-- src/types/database.types.ts.
--
-- Lets the show producer lock each set's running order on the Show planning tab: a locked set's
-- rows can still be opened and edited, but not dragged, nudged or moved to the other set.
alter table public.events
  add column if not exists show_set1_locked boolean not null default false,
  add column if not exists show_set2_locked boolean not null default false;
