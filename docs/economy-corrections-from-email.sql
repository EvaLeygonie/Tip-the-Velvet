-- Run in the Supabase SQL editor, AFTER docs/economy-backfill-past-events.sql. Safe to run again.
--
-- Corrections from the board's email (agreements and payments) and from the board, 2026-11-23/24.
-- Everything here either moves money between the right rows, fills in a note, or adds a fee that was
-- agreed by email. Dark Carnival's open question is at the bottom, commented out, until it is confirmed.

-- Desserted Island, Mym LaFox: she was paid her fee as a hotel reimbursement (email 2025-09-15 to
-- 2025-09-17: "the 1,500 for the hotel covers both the act and the travel"). The hotel receipt is
-- already on her travel row, so the fee row is 0 and no longer "without an amount".
update public.event_payables
   set amount = 0,
       note = 'Fee paid as the hotel reimbursement on the travel row (agreed by email 2025-09-17)'
 where event_id = (select id from public.events where title = 'Desserted Island')
   and source_type = 'performer' and source_id = '83d5760f-e220-4700-bc5b-d88d4f14de7b';

-- Dark Carnival, Alexander of Hellsingland: of the two train receipts (444 + 1,952 = 2,396), 891 kr was
-- his partner's ticket and not his own travel. Per email (2026-03-24, 2026-04-09, 2026-04-21) the
-- 891 kr was passed on to Nicole for her travel. His own travel is 1,505 kr.
update public.event_payables
   set amount = 1505,
       note = 'Train receipts 444 + 1,952 = 2,396; 891 of it was passed on to Nicole (see her travel row). Email 2026-03-24'
 where event_id = (select id from public.events where title = 'Dark Carnival')
   and source_type = 'performer_travel' and source_id = '59c97e65-2a3d-4c64-ac97-355fcc26abfa';

insert into public.event_payables (event_id, section, label, tag, note, amount, vat_rate, payment_route,
                                   advanced_by, paid_on, source_type, source_id, dismissed, sort_order)
select e.id, 'artists', 'Nicole', 'Performer',
       'Paid via Alexander of Hellsingland, who passed on the remaining 891 kr of his train receipts (email 2026-04-21)',
       891, null, 'receipt', 'Alexander of hellsingland', '2026-04-21', 'performer_travel',
       '31add92d-0ae8-485a-bd8b-d2341dd25f19', false, 990
  from public.events e
 where e.title = 'Dark Carnival'
   and not exists (select 1 from public.event_payables x
                    where x.event_id = e.id and x.source_type = 'performer_travel'
                      and x.source_id = '31add92d-0ae8-485a-bd8b-d2341dd25f19');

-- Desserted Island, Ember Raven (host): her invoice 37 (6,500 kr, dated 2026-04-30, due 2026-05-30) says it
-- is for Erotikmässan and for hosting Desserted Island. The Desserted Island share is the 1,500 kr from the
-- "Ekonomi och Budget" doc, so the amount stays; only the date and note change. (To be confirmed with Pontus.)
update public.event_payables
   set paid_on = '2026-05-30',
       note = 'Part of invoice 37 from Anna Hedman (6,500 kr, 2026-04-30), shared with Erotikmässan. This job: 1,500 kr, per the Ekonomi och Budget doc'
 where event_id = (select id from public.events where title = 'Desserted Island')
   and source_type = 'performer' and source_id = 'f39c0356-8ae8-47e3-8264-387de9b4dc48';

-- Desserted Island, Isla Belle: she accepted the standard fee of 1,000 kr in writing (email 2025-05-23).
-- No invoice or payment was found, the board confirmed the fee.
update public.event_payables
   set amount = 1000, payment_route = 'invoice',
       note = 'Standard fee 1,000 kr, agreed by email 2025-05-23. No invoice found. Her travel was only Landvetter to the city'
 where event_id = (select id from public.events where title = 'Desserted Island')
   and source_type = 'performer' and source_id = 'e6c8a6fb-5e19-4829-a23d-6ef76dab8694';

-- Desserted Island, Daddelicious: a volunteer, never paid. Fee 0 on the staffing row means "not paid"
-- (the Economy tab then makes no row for it), and the row that exists is hidden.
update public.event_staff_volunteers set fee = 0 where id = '45526fd4-650d-4951-9035-cb1390979b8d';
update public.event_payables
   set dismissed = true, amount = null, note = 'Volunteer: not paid'
 where event_id = (select id from public.events where title = 'Desserted Island')
   and source_type = 'staff' and source_id = '45526fd4-650d-4951-9035-cb1390979b8d';

-- Dark Carnival: five performers have no bill of their own (Lord Beaverbottom, Alexander's fee, Unsung
-- Strongman, Nicole, Bunny Bordeaux's fee). Decided 2026-11-24, TO BE CHECKED with Pontus: their fees were
-- covered by Bunny Bordeaux's materials reimbursement (4,658.85 kr, already counted on the show as
-- "Materials: Bunny Bordeaux"), split between them (about 932 kr each). Costs do not change.
-- The alternative that was considered: 6,500 kr paid to Ember Raven and split, 1,300 kr each.
-- Dark Carnival is known to have made a loss, so some cost is probably still missing: see the notes.
update public.event_payables
   set amount = 0, payment_route = 'receipt',
       note = 'TO CHECK: fee assumed covered by the materials reimbursement (4,658.85 kr), split between the performers without a bill'
 where event_id = (select id from public.events where title = 'Dark Carnival')
   and source_type = 'performer'
   and source_id in ('bdd3aef9-3a15-42de-9053-1265bfd765c3', '59c97e65-2a3d-4c64-ac97-355fcc26abfa',
                     'c783af83-f140-4c7c-92a8-ed39b08dff46', '31add92d-0ae8-485a-bd8b-d2341dd25f19',
                     'dba5e63c-944c-4f64-8977-14cfa8961f71');
