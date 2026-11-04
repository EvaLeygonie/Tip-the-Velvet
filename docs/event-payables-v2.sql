-- Run in the Supabase SQL editor AFTER docs/event-payables.sql, BEFORE using the new Economy rows
-- (job and travel on separate rows, several files per row). Safe to run again. Afterwards
-- regenerate src/types/database.types.ts (the file holds a hand-written copy until then).
--
-- 1. A tag column: the gold role tag under each name (Host, Headliner, Technician, ...).
-- 2. event_payable_files: any number of invoices and receipts per row. Files already attached
--    with the first version are moved over, and the two old single-file columns are dropped.
--
-- Nothing else needs fixing by hand: when the page opens, it splits each artist's combined
-- "fee + travel" amount into a fee row and a travel row, and fills in the tags.

alter table public.event_payables add column if not exists tag text;

create table if not exists public.event_payable_files (
  id uuid primary key default gen_random_uuid(),
  payable_id uuid not null references public.event_payables(id) on delete cascade,
  -- path in the private event-invoices bucket
  path text not null,
  -- the file's original name
  name text,
  created_at timestamptz not null default now()
);

create index if not exists event_payable_files_payable_idx
  on public.event_payable_files (payable_id, created_at);

alter table public.event_payable_files enable row level security;
drop policy if exists "Admins full access event_payable_files" on public.event_payable_files;
create policy "Admins full access event_payable_files" on public.event_payable_files
  for all to authenticated using (true) with check (true);

do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'event_payables'
               and column_name = 'invoice_path') then
    insert into public.event_payable_files (payable_id, path, name)
    select p.id, p.invoice_path, p.invoice_name
    from public.event_payables p
    where p.invoice_path is not null
      and not exists (
        select 1 from public.event_payable_files f
        where f.payable_id = p.id and f.path = p.invoice_path
      );
    alter table public.event_payables drop column invoice_path;
    alter table public.event_payables drop column if exists invoice_name;
  end if;
end $$;
