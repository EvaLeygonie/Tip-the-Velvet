-- Run in the Supabase SQL editor. Safe to run again. Afterwards regenerate
-- src/types/database.types.ts (the file holds a hand-written copy of this column until then).
--
-- ticket_payout: what the ticket sales actually brought into the bank account for one show, in
-- SEK, typed in by hand once the show is over. Deliberately a stored number and not calculated:
-- the ticket platform changes (SimpleSignup + Stripe now, maybe Billeto later), and each has its
-- own fees and payout rhythm. This is "money received", separate from the ticket-type statistics
-- described in docs/ticket-sales.md.

alter table public.events add column if not exists ticket_payout numeric(12, 2);

-- Figures entered 2026-11-23 from Stripe's payouts export and SimpleSignup's event overview.
-- Stripe-era shows: the sum of every payout Stripe made for the show (in 2025 Stripe paid out in many
-- small amounts). Earlier shows went through Payson, so SimpleSignup's "Försäljningsintäkt"
-- (after SimpleSignup's fee) is the best number there is.
update public.events set ticket_payout = 85137.16 where title = 'Pandaemonium';
update public.events set ticket_payout = 78294.75 where title = 'Dark Carnival';
update public.events set ticket_payout = 87559.35 where title = 'Desserted Island';
update public.events set ticket_payout = 79950
  where title = 'Creatures of the Night';
update public.events set ticket_payout = 79222.54
  where title = 'Once Upon a Time';

-- The first version of this file also added ticket_payout_note, since dropped as unneeded. If it was
-- already run, remove the leftover column:
alter table public.events drop column if exists ticket_payout_note;
