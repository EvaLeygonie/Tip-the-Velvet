-- Run in the Supabase SQL editor AFTER docs/event-payables-v3.sql. Safe to run again. Afterwards
-- regenerate src/types/database.types.ts (the file holds a hand-written copy until then).
--
-- 1. due_on: the deadline of an invoice (a receipt has no deadline, it is simply paid back).
-- 2. payment_route is now invoice | receipt | private. The two old invoice kinds
--    (company_invoice, frilansfinans) become plain invoice. A row with no route chosen is not
--    changed: the page picks invoice for artists, venue and paid staff, and receipt for the rest.

alter table public.event_payables add column if not exists due_on date;

update public.event_payables
set payment_route = 'invoice'
where payment_route in ('company_invoice', 'frilansfinans');
