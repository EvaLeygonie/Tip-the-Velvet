-- Run in the Supabase SQL editor AFTER docs/event-payables-v2.sql. Safe to run again. Afterwards
-- regenerate src/types/database.types.ts (the file holds a hand-written copy until then).
--
-- VAT is now filled in as a percentage (vat_rate) instead of an amount in kronor. The amount on a
-- row includes the VAT, so the VAT part is amount * rate / (100 + rate) and is worked out when
-- needed. Amounts already typed into vat_amount are turned into a rate; vat_amount itself is left
-- in place, unused.

alter table public.event_payables add column if not exists vat_rate numeric;

update public.event_payables
set vat_rate = round((vat_amount / nullif(amount - vat_amount, 0)) * 100, 2)
where vat_rate is null and vat_amount is not null and amount is not null;
