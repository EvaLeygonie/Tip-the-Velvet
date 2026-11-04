-- Run in the Supabase SQL editor BEFORE opening the Economy page's "One event" tab. Safe to run
-- again. Afterwards regenerate src/types/database.types.ts (the file already holds a hand-written
-- copy of event_payables so the app builds; regenerating replaces it with the real one).
--
-- event_payables : one row per bill to pay for one event. The page fills most rows itself from
--                  what the system already knows (lineup fees and travel, paid staff, the venue,
--                  a standard "Uber home" row); the board adds the rest by hand.
-- event-invoices : a private storage bucket for the invoice or receipt behind each row.

create table if not exists public.event_payables (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  -- artists | staff | venue | decor | print | transport | other
  section text not null default 'other',
  -- who or what is paid, written in whatever language the board prefers
  label text not null,
  note text,
  -- what we actually pay, VAT included (null = not known yet)
  amount numeric(10,2),
  -- what the system said it would be (fee + travel, staff fee, venue rate); null on manual rows
  agreed_amount numeric(10,2),
  vat_amount numeric(10,2),
  -- company_invoice | frilansfinans | private | receipt
  payment_route text,
  -- a board member who paid out of pocket and is to be repaid
  advanced_by text,
  -- storage path in the event-invoices bucket, and the file's original name
  invoice_path text,
  invoice_name text,
  -- set = paid on that date
  paid_on date,
  -- performer | staff | venue | standard on rows the page created itself; null on manual rows
  source_type text,
  source_id text,
  -- hidden from the list and the totals ("not needed")
  dismissed boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- the page re-checks the event every time it opens; this keeps it from adding a row twice.
  -- Postgres treats nulls as different, so manual rows never clash with each other.
  constraint event_payables_source_unique unique (event_id, source_type, source_id)
);

create index if not exists event_payables_event_idx on public.event_payables (event_id, sort_order);

alter table public.event_payables enable row level security;
drop policy if exists "Admins full access event_payables" on public.event_payables;
create policy "Admins full access event_payables" on public.event_payables
  for all to authenticated using (true) with check (true);

-- Private bucket for the invoices and receipts
insert into storage.buckets (id, name, public)
values ('event-invoices', 'event-invoices', false)
on conflict (id) do nothing;

drop policy if exists "Admins read event-invoices" on storage.objects;
create policy "Admins read event-invoices" on storage.objects
  for select to authenticated using (bucket_id = 'event-invoices');

drop policy if exists "Admins upload event-invoices" on storage.objects;
create policy "Admins upload event-invoices" on storage.objects
  for insert to authenticated with check (bucket_id = 'event-invoices');

drop policy if exists "Admins update event-invoices" on storage.objects;
create policy "Admins update event-invoices" on storage.objects
  for update to authenticated using (bucket_id = 'event-invoices');

drop policy if exists "Admins delete event-invoices" on storage.objects;
create policy "Admins delete event-invoices" on storage.objects
  for delete to authenticated using (bucket_id = 'event-invoices');
