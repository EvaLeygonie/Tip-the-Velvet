-- Run in the Supabase SQL editor BEFORE opening the Dashboard's new "To print" card. Safe to run
-- again, and it also upgrades the earlier version of these tables (label_sv/label_eng -> label).
-- print_standard_items : the standard "to print" rows every event starts with
-- event_print_items     : per event — ticked-off state, custom rows, and standard rows that were
--                         removed for that event only
-- A new event has no rows in event_print_items, so everything starts unticked (= automatic reset).

create table if not exists public.print_standard_items (
  id uuid primary key default gen_random_uuid(),
  -- written in whatever language the board prefers
  label text not null,
  -- true = needs to be printed professionally (print shop), false = we print it ourselves
  professional boolean not null default false,
  -- how many copies to print
  copies integer not null default 1,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.event_print_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  -- set for a standard row's state (ticked / hidden for this event); null for a custom row
  standard_id uuid references public.print_standard_items(id) on delete cascade,
  -- custom rows only
  label text,
  done boolean not null default false,
  hidden boolean not null default false,
  -- for custom rows: professional or not. For a standard row's state: null = use the standard's
  -- setting, otherwise this event's own choice.
  professional boolean,
  -- for custom rows: number of copies. For a standard row's state: null = use the standard's.
  copies integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint event_print_items_has_label check (standard_id is not null or label is not null)
);

create unique index if not exists event_print_items_one_state_per_standard
  on public.event_print_items (event_id, standard_id) where standard_id is not null;

-- Upgrade from the earlier version that had label_sv + label_eng: keep the Swedish text as label.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'print_standard_items'
               and column_name = 'label_sv') then
    alter table public.print_standard_items rename column label_sv to label;
    alter table public.print_standard_items drop column label_eng;
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'event_print_items'
               and column_name = 'label_sv') then
    alter table public.event_print_items rename column label_sv to label;
    alter table public.event_print_items drop column label_eng;
  end if;
end $$;

alter table public.event_print_items drop constraint if exists event_print_items_has_label;
alter table public.event_print_items
  add constraint event_print_items_has_label check (standard_id is not null or label is not null);

alter table public.print_standard_items enable row level security;
alter table public.event_print_items enable row level security;

drop policy if exists "Admins full access print_standard_items" on public.print_standard_items;
create policy "Admins full access print_standard_items" on public.print_standard_items
  for all to authenticated using (true) with check (true);
drop policy if exists "Admins full access event_print_items" on public.event_print_items;
create policy "Admins full access event_print_items" on public.event_print_items
  for all to authenticated using (true) with check (true);

-- The standard rows every event starts with (label, copies, printed professionally?).
-- More can be added from the "To print" card itself (+ button, "make standard").
-- The single test row from the earlier version is replaced.
delete from public.print_standard_items where label = 'Dörrpass (gästlistan)';

insert into public.print_standard_items (label, copies, professional, sort_order)
select v.label, v.copies, v.professional, v.sort_order
from (values
  ('QR-kod för tävlingsenkät', 8, false, 0),
  ('Direktionsskyltar till tävling', 3, false, 1),
  ('Direktionsskyltar till Fotohörna', 3, false, 2),
  ('"Privat" skylt för Loge', 1, false, 3),
  ('Setlist', 5, false, 4),
  ('Körschema', 1, false, 5),
  ('Matlista', 1, false, 6),
  ('Artistlista', 1, false, 7),
  ('Ljud & Ljus', 1, false, 8),
  ('Dörr shifts', 1, false, 9),
  ('Event poster', 1, true, 10)
) as v(label, copies, professional, sort_order)
where not exists (select 1 from public.print_standard_items p where p.label = v.label);
