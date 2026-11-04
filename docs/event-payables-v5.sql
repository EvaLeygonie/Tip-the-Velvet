-- Run in the Supabase SQL editor AFTER docs/event-payables-v4.sql. Safe to run again. Afterwards
-- regenerate src/types/database.types.ts (the file holds a hand-written copy until then).
--
-- payment_account: where to transfer the money for a personal payment (a bank account; for
-- someone living abroad, an IBAN or whatever they send us). One free-text field for now.

alter table public.event_payables add column if not exists payment_account text;
