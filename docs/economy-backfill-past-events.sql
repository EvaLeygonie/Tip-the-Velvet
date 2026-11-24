-- Run in the Supabase SQL editor, AFTER docs/event-ticket-payout.sql. Safe to run again.
--
-- Fills in the bills of the four older shows from the invoices and receipts in Drive
-- (Ekonomi / Kvitton och fakturor / <year> - <show>). Read from the documents on 2026-11-23.
--
-- * Once Upon a Time and Creatures of the Night had no bills: every row is added. Rows tied to a
--   performer, a staff member or the venue use the same keys the Economy tab makes itself, so the
--   tab does not add a second, unpaid row when it is opened.
-- * Desserted Island and Dark Carnival already had rows the tab made from the lineup (every artist at
--   the placeholder 999 kr, the venue at 30,000 kr): those rows are updated to the real amounts.
-- * Everything is marked paid. The paid date is a week after the show, or the date on the document
--   when that is later. These are stand-in dates, not the real payment dates.
-- * A person with no document in Drive is left without an amount (the tab warns about it) and a note
--   says so. Someone who was covered by another person's invoice, or who has no document at all in a
--   show where the tab expected a row, is added as a hidden row so the tab does not recreate it.
-- * Amounts include VAT. The Drive path of every document is in the row's note.

update public.event_payables set amount = 1500, vat_rate = null, payment_route = 'invoice', advanced_by = null, paid_on = '2025-09-13', note = 'Host fee: never paid at the time; settled later, see the "Ekonomi och Budget" doc in Drive'
 where event_id = (select id from public.events where title = 'Desserted Island')
   and source_type = 'performer' and source_id = 'f39c0356-8ae8-47e3-8264-387de9b4dc48';

update public.event_payables set amount = 7500, vat_rate = 25, payment_route = 'invoice', advanced_by = null, paid_on = '2025-12-09', note = 'Drive: 25 - Desserted Island/Fakturor/8521117.pdf | FrilansFinans, for both Tommy Boy and Bubblegum Bitch (2 solos + 1 duo)'
 where event_id = (select id from public.events where title = 'Desserted Island')
   and source_type = 'performer' and source_id = '980b5d3f-1c94-4c11-b42d-9c7bfd583dcc';

update public.event_payables set amount = 0, vat_rate = null, payment_route = 'invoice', advanced_by = null, paid_on = '2025-09-13', note = 'Paid on the invoice for Tommy Boy (7,500 kr for both)'
 where event_id = (select id from public.events where title = 'Desserted Island')
   and source_type = 'performer' and source_id = '03e36af8-03cc-4e72-b246-3b7374bd787e';

update public.event_payables set amount = 2000, vat_rate = 0, payment_route = 'invoice', advanced_by = null, paid_on = '2025-09-29', note = 'Drive: 25 - Desserted Island/Fakturor/Faktura- Maidens of the Deep 6 september.pdf'
 where event_id = (select id from public.events where title = 'Desserted Island')
   and source_type = 'performer' and source_id = 'e269dfa7-3be3-4d34-b602-67b5a605c468';

update public.event_payables set amount = 4500, vat_rate = 0, payment_route = 'invoice', advanced_by = null, paid_on = '2025-09-13', note = 'Drive: 25 - Desserted Island/Fakturor/18 Fräulein Frauke Tip the Velvet 6 sep.pdf'
 where event_id = (select id from public.events where title = 'Desserted Island')
   and source_type = 'performer' and source_id = '2d8f15f4-6c78-46ea-95cf-eb318bf8611b';

update public.event_payables set amount = null, vat_rate = null, payment_route = 'invoice', advanced_by = null, paid_on = '2025-09-13', note = 'No invoice or receipt found in Drive: enter the amount if there was one'
 where event_id = (select id from public.events where title = 'Desserted Island')
   and source_type = 'performer' and source_id = 'e6c8a6fb-5e19-4829-a23d-6ef76dab8694';

update public.event_payables set amount = null, vat_rate = null, payment_route = 'invoice', advanced_by = null, paid_on = '2025-09-13', note = 'No invoice or receipt found in Drive: enter the amount if there was one'
 where event_id = (select id from public.events where title = 'Desserted Island')
   and source_type = 'performer' and source_id = '83d5760f-e220-4700-bc5b-d88d4f14de7b';

update public.event_payables set amount = 1000, vat_rate = 25, payment_route = 'invoice', advanced_by = null, paid_on = '2025-09-20', note = 'Drive: 25 - Desserted Island/Fakturor/8478522.pdf | FrilansFinans (invoice from Linn Offerlind-Ljunggren)'
 where event_id = (select id from public.events where title = 'Desserted Island')
   and source_type = 'performer' and source_id = 'd2e2926c-a109-4f95-8348-5b00205eea34';

update public.event_payables set amount = 1360, vat_rate = 6, payment_route = 'invoice', advanced_by = null, paid_on = '2025-09-15', note = 'Drive: 25 - Desserted Island/Fakturor/8476095.pdf | FrilansFinans (invoice from Kima Shams)'
 where event_id = (select id from public.events where title = 'Desserted Island')
   and source_type = 'performer' and source_id = 'f3000747-7257-4d3d-acf7-4ce5f022212b';

update public.event_payables set amount = 6550, vat_rate = 25, payment_route = 'invoice', advanced_by = null, paid_on = '2025-09-13', note = 'Drive: 25 - Desserted Island/Fakturor/Faktura150114.pdf'
 where event_id = (select id from public.events where title = 'Desserted Island')
   and source_type = 'staff' and source_id = '43ca66f8-9826-4f34-965d-0164c2d3a05e';

update public.event_payables set amount = 2000, vat_rate = 0, payment_route = 'invoice', advanced_by = null, paid_on = '2025-09-13', note = 'Drive: 25 - Desserted Island/Fakturor/fakturahellnermedia0001.pdf'
 where event_id = (select id from public.events where title = 'Desserted Island')
   and source_type = 'staff' and source_id = 'f452ce8a-b64d-4e21-8792-c2272a739905';

update public.event_payables set amount = null, vat_rate = null, payment_route = 'invoice', advanced_by = null, paid_on = '2025-09-13', note = 'No invoice or receipt found in Drive: enter the amount if there was one'
 where event_id = (select id from public.events where title = 'Desserted Island')
   and source_type = 'staff' and source_id = '45526fd4-650d-4951-9035-cb1390979b8d';

update public.event_payables set amount = 31868.75, vat_rate = 25, payment_route = 'invoice', advanced_by = null, paid_on = '2025-09-13', note = 'Drive: 25 - Desserted Island/Budgetposterna hyra+mat.pdf (invoice 711) | Rent 31,250 + tablecloths 618.75'
 where event_id = (select id from public.events where title = 'Desserted Island')
   and source_type = 'venue' and source_id = 'bb5d8af3-61e7-4cb7-8c4b-b381881768ca';

update public.event_payables set amount = 2500, vat_rate = 25, payment_route = 'invoice', advanced_by = null, paid_on = '2026-03-21', note = 'Drive: 26 - Dark Carnival/Fakturor/8562067.pdf | FrilansFinans, two numbers'
 where event_id = (select id from public.events where title = 'Dark Carnival')
   and source_type = 'performer' and source_id = '6e519770-daaa-49ea-8c10-c5204518b2af';

update public.event_payables set amount = null, vat_rate = null, payment_route = 'invoice', advanced_by = null, paid_on = '2026-03-21', note = 'No invoice or receipt found in Drive: enter the amount if there was one'
 where event_id = (select id from public.events where title = 'Dark Carnival')
   and source_type = 'performer' and source_id = 'bdd3aef9-3a15-42de-9053-1265bfd765c3';

update public.event_payables set amount = 3000, vat_rate = 0, payment_route = 'invoice', advanced_by = null, paid_on = '2026-03-21', note = 'Drive: 26 - Dark Carnival/Fakturor/Faktura uppträdande 14_3-26.docx.pdf | Invoice from Göta studentkår'
 where event_id = (select id from public.events where title = 'Dark Carnival')
   and source_type = 'performer' and source_id = 'f57e405c-879b-4a77-a197-d29dcf22f9f5';

update public.event_payables set amount = null, vat_rate = null, payment_route = 'invoice', advanced_by = null, paid_on = '2026-03-21', note = 'No invoice or receipt found in Drive: enter the amount if there was one'
 where event_id = (select id from public.events where title = 'Dark Carnival')
   and source_type = 'performer' and source_id = '59c97e65-2a3d-4c64-ac97-355fcc26abfa';

update public.event_payables set amount = null, vat_rate = null, payment_route = 'invoice', advanced_by = null, paid_on = '2026-03-21', note = 'No invoice or receipt found in Drive: enter the amount if there was one'
 where event_id = (select id from public.events where title = 'Dark Carnival')
   and source_type = 'performer' and source_id = 'c783af83-f140-4c7c-92a8-ed39b08dff46';

update public.event_payables set amount = 936, vat_rate = 25, payment_route = 'invoice', advanced_by = null, paid_on = '2026-04-08', note = 'Drive: 26 - Dark Carnival/Fakturor/Att betala, Yvette Les Fesses.pdf | FrilansFinans'
 where event_id = (select id from public.events where title = 'Dark Carnival')
   and source_type = 'performer' and source_id = 'e0b66386-85c2-427c-9f01-decfd9db4999';

update public.event_payables set amount = 2000, vat_rate = 0, payment_route = 'invoice', advanced_by = null, paid_on = '2026-03-21', note = 'Drive: 26 - Dark Carnival/Fakturor/api_faktura_4220736_6.pdf | Invoice from Clowning & More (Finansia)'
 where event_id = (select id from public.events where title = 'Dark Carnival')
   and source_type = 'performer' and source_id = '7b1b4ff9-7383-4231-a8c3-e9b6b0ac1c56';

update public.event_payables set amount = 4000, vat_rate = 0, payment_route = 'invoice', advanced_by = null, paid_on = '2026-03-24', note = 'Drive: 26 - Dark Carnival/Fakturor/Faktura 4 Lilith Heels AB (1).pdf, Fakturor/Faktura 46 Andersson, Emma.pdf | Two invoices of 2,000: Lilith Heels AB and Emma Andersson'
 where event_id = (select id from public.events where title = 'Dark Carnival')
   and source_type = 'performer' and source_id = '0a5a50f0-5290-47c3-8d1e-6f2a1e1f4718';

update public.event_payables set amount = null, vat_rate = null, payment_route = 'invoice', advanced_by = null, paid_on = '2026-03-21', note = 'No invoice or receipt found in Drive: enter the amount if there was one'
 where event_id = (select id from public.events where title = 'Dark Carnival')
   and source_type = 'performer' and source_id = '31add92d-0ae8-485a-bd8b-d2341dd25f19';

update public.event_payables set amount = null, vat_rate = null, payment_route = 'invoice', advanced_by = null, paid_on = '2026-03-21', note = 'No invoice or receipt found in Drive: enter the amount if there was one'
 where event_id = (select id from public.events where title = 'Dark Carnival')
   and source_type = 'performer' and source_id = 'dba5e63c-944c-4f64-8977-14cfa8961f71';

update public.event_payables set amount = 5000, vat_rate = null, payment_route = 'invoice', advanced_by = null, paid_on = '2026-03-21', note = 'No invoice in Drive: the amount is the agreed fee on the contact card'
 where event_id = (select id from public.events where title = 'Dark Carnival')
   and source_type = 'staff' and source_id = '1db70897-d9af-4303-86e3-a65e4b5a3f4a';

update public.event_payables set amount = 2000, vat_rate = 0, payment_route = 'invoice', advanced_by = null, paid_on = '2026-04-24', note = 'Drive: 26 - Dark Carnival/Fakturor/Hellner, rättad, redan betald.pdf'
 where event_id = (select id from public.events where title = 'Dark Carnival')
   and source_type = 'staff' and source_id = 'd338b048-989f-44e8-8c17-4be27313d270';

update public.event_payables set amount = 38231.25, vat_rate = 25, payment_route = 'invoice', advanced_by = null, paid_on = '2026-03-21', note = 'Drive: 26 - Dark Carnival/Fakturor/Faktura_907.pdf | Rent 30,000 + tablecloths 585, ex VAT'
 where event_id = (select id from public.events where title = 'Dark Carnival')
   and source_type = 'venue' and source_id = 'bb5d8af3-61e7-4cb7-8c4b-b381881768ca';

insert into public.event_payables (event_id, section, label, tag, note, amount, agreed_amount, vat_rate, payment_route, advanced_by, paid_on, source_type, source_id, dismissed, sort_order)
select e.id, 'artists', 'Fräulein Frauke', 'Host', 'Drive: 24 - Once Upon a Time/Fakturor/20 Fräulein Frauke Tip the Velvet.pdf', 4500, 999, 0, 'invoice', null, '2024-09-09', 'performer', '2d8f15f4-6c78-46ea-95cf-eb318bf8611b', false, 902
  from public.events e where e.title = 'Once Upon a Time' and not exists (select 1 from public.event_payables x where x.event_id = e.id and x.label = 'Fräulein Frauke' and x.source_type is not distinct from 'performer' and x.source_id is not distinct from '2d8f15f4-6c78-46ea-95cf-eb318bf8611b');

insert into public.event_payables (event_id, section, label, tag, note, amount, agreed_amount, vat_rate, payment_route, advanced_by, paid_on, source_type, source_id, dismissed, sort_order)
select e.id, 'artists', 'Mr Victor Victoria', 'Performer', 'Drive: 24 - Once Upon a Time/Fakturor/Mr Victor Victoria.pdf | FrilansFinans', 1250, 999, 25, 'invoice', null, '2024-09-19', 'performer', '9b0460d3-ee56-4005-8cf4-c12851d395de', false, 904
  from public.events e where e.title = 'Once Upon a Time' and not exists (select 1 from public.event_payables x where x.event_id = e.id and x.label = 'Mr Victor Victoria' and x.source_type is not distinct from 'performer' and x.source_id is not distinct from '9b0460d3-ee56-4005-8cf4-c12851d395de');

insert into public.event_payables (event_id, section, label, tag, note, amount, agreed_amount, vat_rate, payment_route, advanced_by, paid_on, source_type, source_id, dismissed, sort_order)
select e.id, 'artists', 'Dopamine Dolly', 'Performer', 'Drive: 24 - Once Upon a Time/Fakturor/Hanne Juhl.pdf | Danish invoice (Hanne Juhl), reverse charge', 2000, 999, 0, 'invoice', null, '2024-09-07', 'performer', 'c7807f88-1954-4178-99b8-b58c07a313e4', false, 906
  from public.events e where e.title = 'Once Upon a Time' and not exists (select 1 from public.event_payables x where x.event_id = e.id and x.label = 'Dopamine Dolly' and x.source_type is not distinct from 'performer' and x.source_id is not distinct from 'c7807f88-1954-4178-99b8-b58c07a313e4');

insert into public.event_payables (event_id, section, label, tag, note, amount, agreed_amount, vat_rate, payment_route, advanced_by, paid_on, source_type, source_id, dismissed, sort_order)
select e.id, 'artists', 'Unsung Strongman', 'Performer', 'Drive: 24 - Once Upon a Time/Fakturor/Ragnar Linkros.pdf | FrilansFinans (invoice in the name Ragnar Linkros)', 1250, 999, 25, 'invoice', null, '2024-10-04', 'performer', 'c783af83-f140-4c7c-92a8-ed39b08dff46', false, 908
  from public.events e where e.title = 'Once Upon a Time' and not exists (select 1 from public.event_payables x where x.event_id = e.id and x.label = 'Unsung Strongman' and x.source_type is not distinct from 'performer' and x.source_id is not distinct from 'c783af83-f140-4c7c-92a8-ed39b08dff46');

insert into public.event_payables (event_id, section, label, tag, note, amount, agreed_amount, vat_rate, payment_route, advanced_by, paid_on, source_type, source_id, dismissed, sort_order)
select e.id, 'artists', 'Salty Punch', 'Performer', 'Drive: 24 - Once Upon a Time/Fakturor/Salty Punch.pdf | FrilansFinans; includes 1,475 kr travel (ex VAT)', 3844, 999, 25, 'invoice', null, '2024-10-17', 'performer', '0265e1eb-4888-45ec-93cb-42258e1985fe', false, 910
  from public.events e where e.title = 'Once Upon a Time' and not exists (select 1 from public.event_payables x where x.event_id = e.id and x.label = 'Salty Punch' and x.source_type is not distinct from 'performer' and x.source_id is not distinct from '0265e1eb-4888-45ec-93cb-42258e1985fe');

insert into public.event_payables (event_id, section, label, tag, note, amount, agreed_amount, vat_rate, payment_route, advanced_by, paid_on, source_type, source_id, dismissed, sort_order)
select e.id, 'artists', 'The Ligaya', 'Performer', 'Drive: 24 - Once Upon a Time/Fakturor/Gabriella Manaois Carlson.pdf | FrilansFinans', 1250, 999, 25, 'invoice', null, '2024-09-09', 'performer', 'bc782533-1e59-42aa-9cfb-231b10a98f46', false, 912
  from public.events e where e.title = 'Once Upon a Time' and not exists (select 1 from public.event_payables x where x.event_id = e.id and x.label = 'The Ligaya' and x.source_type is not distinct from 'performer' and x.source_id is not distinct from 'bc782533-1e59-42aa-9cfb-231b10a98f46');

insert into public.event_payables (event_id, section, label, tag, note, amount, agreed_amount, vat_rate, payment_route, advanced_by, paid_on, source_type, source_id, dismissed, sort_order)
select e.id, 'artists', 'Tender Lumpling', 'Performer', 'Drive: 24 - Once Upon a Time/Fakturor/Tender Lumpling.pdf', 1000, 999, 0, 'invoice', null, '2024-09-13', 'performer', '16ed67d7-a6d6-4efd-840f-f45b4bd8d2cd', false, 914
  from public.events e where e.title = 'Once Upon a Time' and not exists (select 1 from public.event_payables x where x.event_id = e.id and x.label = 'Tender Lumpling' and x.source_type is not distinct from 'performer' and x.source_id is not distinct from '16ed67d7-a6d6-4efd-840f-f45b4bd8d2cd');

insert into public.event_payables (event_id, section, label, tag, note, amount, agreed_amount, vat_rate, payment_route, advanced_by, paid_on, source_type, source_id, dismissed, sort_order)
select e.id, 'artists', 'Jo de Morgan', 'Performer', 'No invoice or receipt found in Drive: enter the amount if there was one', null, 999, null, 'invoice', null, '2024-09-07', 'performer', 'cbe67199-ec95-405d-8185-134431017426', true, 916
  from public.events e where e.title = 'Once Upon a Time' and not exists (select 1 from public.event_payables x where x.event_id = e.id and x.label = 'Jo de Morgan' and x.source_type is not distinct from 'performer' and x.source_id is not distinct from 'cbe67199-ec95-405d-8185-134431017426');

insert into public.event_payables (event_id, section, label, tag, note, amount, agreed_amount, vat_rate, payment_route, advanced_by, paid_on, source_type, source_id, dismissed, sort_order)
select e.id, 'artists', 'Travel: Elena Sperner (fuel)', 'Travel', 'Drive: 24 - Once Upon a Time/Kvitton/Reseersättning, Elena Sperner, 2 kvitton | Not matched to a performer in the lineup: check who this was for', 1061.12, null, 25, 'receipt', 'Elena Sperner', '2024-09-07', null, null, false, 918
  from public.events e where e.title = 'Once Upon a Time' and not exists (select 1 from public.event_payables x where x.event_id = e.id and x.label = 'Travel: Elena Sperner (fuel)' and x.source_type is not distinct from null and x.source_id is not distinct from null);

insert into public.event_payables (event_id, section, label, tag, note, amount, agreed_amount, vat_rate, payment_route, advanced_by, paid_on, source_type, source_id, dismissed, sort_order)
select e.id, 'venue', 'Venue: Bellmans Salonger', 'Venue', 'Drive: 24 - Once Upon a Time/Fakturor/Bellmans, betald.pdf | Rent', 20000, 30000, 0, 'invoice', null, '2024-09-07', 'venue', 'c507c2e2-73b1-4200-9db2-3b52dce428af', false, 902
  from public.events e where e.title = 'Once Upon a Time' and not exists (select 1 from public.event_payables x where x.event_id = e.id and x.label = 'Venue: Bellmans Salonger' and x.source_type is not distinct from 'venue' and x.source_id is not distinct from 'c507c2e2-73b1-4200-9db2-3b52dce428af');

insert into public.event_payables (event_id, section, label, tag, note, amount, agreed_amount, vat_rate, payment_route, advanced_by, paid_on, source_type, source_id, dismissed, sort_order)
select e.id, 'venue', 'Food: 15 dinners (Bellmans)', null, 'Drive: 24 - Once Upon a Time/Fakturor/Bellmans, betald.pdf | On the same invoice as the rent', 1650, null, 12, 'invoice', null, '2024-09-07', null, null, false, 904
  from public.events e where e.title = 'Once Upon a Time' and not exists (select 1 from public.event_payables x where x.event_id = e.id and x.label = 'Food: 15 dinners (Bellmans)' and x.source_type is not distinct from null and x.source_id is not distinct from null);

insert into public.event_payables (event_id, section, label, tag, note, amount, agreed_amount, vat_rate, payment_route, advanced_by, paid_on, source_type, source_id, dismissed, sort_order)
select e.id, 'staff', 'Tobias Walka', 'Photographer', 'Drive: 24 - Once Upon a Time/Fakturor/Walka, betald.pdf', 6550, 6600, 25, 'invoice', null, '2024-09-07', 'staff', '72cd2ec9-ba18-45df-98f5-3d9617cfcec4', false, 902
  from public.events e where e.title = 'Once Upon a Time' and not exists (select 1 from public.event_payables x where x.event_id = e.id and x.label = 'Tobias Walka' and x.source_type is not distinct from 'staff' and x.source_id is not distinct from '72cd2ec9-ba18-45df-98f5-3d9617cfcec4');

insert into public.event_payables (event_id, section, label, tag, note, amount, agreed_amount, vat_rate, payment_route, advanced_by, paid_on, source_type, source_id, dismissed, sort_order)
select e.id, 'staff', 'Karolina Hellner', 'Technician', 'No invoice or receipt found in Drive: enter the amount if there was one', null, 2000, null, 'invoice', null, '2024-09-07', 'staff', 'bfbfd4b9-e370-4bf7-b001-984ab2f07d97', true, 904
  from public.events e where e.title = 'Once Upon a Time' and not exists (select 1 from public.event_payables x where x.event_id = e.id and x.label = 'Karolina Hellner' and x.source_type is not distinct from 'staff' and x.source_id is not distinct from 'bfbfd4b9-e370-4bf7-b001-984ab2f07d97');

insert into public.event_payables (event_id, section, label, tag, note, amount, agreed_amount, vat_rate, payment_route, advanced_by, paid_on, source_type, source_id, dismissed, sort_order)
select e.id, 'staff', 'Severina', 'Entertainment', 'No invoice or receipt found in Drive: enter the amount if there was one', null, null, null, 'invoice', null, '2024-09-07', 'staff', 'ad75f881-6cc3-4140-9dba-5763b611009c', true, 906
  from public.events e where e.title = 'Once Upon a Time' and not exists (select 1 from public.event_payables x where x.event_id = e.id and x.label = 'Severina' and x.source_type is not distinct from 'staff' and x.source_id is not distinct from 'ad75f881-6cc3-4140-9dba-5763b611009c');

insert into public.event_payables (event_id, section, label, tag, note, amount, agreed_amount, vat_rate, payment_route, advanced_by, paid_on, source_type, source_id, dismissed, sort_order)
select e.id, 'staff', 'Coralynn Remning (DJ)', 'DJ', 'Drive: 24 - Once Upon a Time/Fakturor/Faktura01tipthevelvet2024Remning.pdf', 400, null, 25, 'invoice', null, '2024-12-30', null, null, false, 908
  from public.events e where e.title = 'Once Upon a Time' and not exists (select 1 from public.event_payables x where x.event_id = e.id and x.label = 'Coralynn Remning (DJ)' and x.source_type is not distinct from null and x.source_id is not distinct from null);

insert into public.event_payables (event_id, section, label, tag, note, amount, agreed_amount, vat_rate, payment_route, advanced_by, paid_on, source_type, source_id, dismissed, sort_order)
select e.id, 'decor', 'IKEA: candles and boxes', null, 'Drive: 24 - Once Upon a Time/Kvitton/Dekoration, Tip, IKEA', 1170, null, 25, 'card', null, '2024-09-07', null, null, false, 902
  from public.events e where e.title = 'Once Upon a Time' and not exists (select 1 from public.event_payables x where x.event_id = e.id and x.label = 'IKEA: candles and boxes' and x.source_type is not distinct from null and x.source_id is not distinct from null);

insert into public.event_payables (event_id, section, label, tag, note, amount, agreed_amount, vat_rate, payment_route, advanced_by, paid_on, source_type, source_id, dismissed, sort_order)
select e.id, 'decor', 'Björkå Frihet: fabric and curtains', null, 'Drive: 24 - Once Upon a Time/Kvitton/Dekoration, Tip, Björkå Frihet Emmaus', 1175, null, 0, 'card', null, '2024-09-07', null, null, false, 904
  from public.events e where e.title = 'Once Upon a Time' and not exists (select 1 from public.event_payables x where x.event_id = e.id and x.label = 'Björkå Frihet: fabric and curtains' and x.source_type is not distinct from null and x.source_id is not distinct from null);

insert into public.event_payables (event_id, section, label, tag, note, amount, agreed_amount, vat_rate, payment_route, advanced_by, paid_on, source_type, source_id, dismissed, sort_order)
select e.id, 'decor', 'Gårda Textil', null, 'Drive: 24 - Once Upon a Time/Kvitton/Dekoration, Tip, Gårda Textil', 355.5, null, 25, 'card', null, '2024-09-07', null, null, false, 906
  from public.events e where e.title = 'Once Upon a Time' and not exists (select 1 from public.event_payables x where x.event_id = e.id and x.label = 'Gårda Textil' and x.source_type is not distinct from null and x.source_id is not distinct from null);

insert into public.event_payables (event_id, section, label, tag, note, amount, agreed_amount, vat_rate, payment_route, advanced_by, paid_on, source_type, source_id, dismissed, sort_order)
select e.id, 'decor', 'ÖB: luggage trolley, sweets', null, 'Drive: 24 - Once Upon a Time/Kvitton/Dekoration, Tip, ÖB | VAT 12% and 25%', 685, null, null, 'card', null, '2024-09-07', null, null, false, 908
  from public.events e where e.title = 'Once Upon a Time' and not exists (select 1 from public.event_payables x where x.event_id = e.id and x.label = 'ÖB: luggage trolley, sweets' and x.source_type is not distinct from null and x.source_id is not distinct from null);

insert into public.event_payables (event_id, section, label, tag, note, amount, agreed_amount, vat_rate, payment_route, advanced_by, paid_on, source_type, source_id, dismissed, sort_order)
select e.id, 'decor', 'Clas Ohlson: cord, pins, batteries', null, 'Drive: 24 - Once Upon a Time/Kvitton/Dekoration, Pontus Lindhé', 329.4, null, 25, 'receipt', 'Pontus Lindhé', '2024-09-07', null, null, false, 910
  from public.events e where e.title = 'Once Upon a Time' and not exists (select 1 from public.event_payables x where x.event_id = e.id and x.label = 'Clas Ohlson: cord, pins, batteries' and x.source_type is not distinct from null and x.source_id is not distinct from null);

insert into public.event_payables (event_id, section, label, tag, note, amount, agreed_amount, vat_rate, payment_route, advanced_by, paid_on, source_type, source_id, dismissed, sort_order)
select e.id, 'decor', 'Corset for Jordan Martin (Rebel Madness)', null, 'Drive: 24 - Once Upon a Time/Kvitton/Kvitto, Jordan Martin, Kvitton/Jordan Martin Korsett Eurokurs 2024-09-26.JPG | EUR 119.72 (corset 100.28 + shipping 19.44). SEK amount is on the exchange-rate picture in Drive: enter it', null, null, null, 'receipt', 'Jordan Martin', '2024-09-26', null, null, false, 912
  from public.events e where e.title = 'Once Upon a Time' and not exists (select 1 from public.event_payables x where x.event_id = e.id and x.label = 'Corset for Jordan Martin (Rebel Madness)' and x.source_type is not distinct from null and x.source_id is not distinct from null);

insert into public.event_payables (event_id, section, label, tag, note, amount, agreed_amount, vat_rate, payment_route, advanced_by, paid_on, source_type, source_id, dismissed, sort_order)
select e.id, 'artists', 'Lady Rivet', 'Host', 'Drive: 24 - Creatures of the Night/Fakturor/Faktura101162.pdf | Fee 4,000 + travel 1,025', 5025, 999, 0, 'invoice', null, '2024-11-18', 'performer', 'c7dac34e-c4ba-4f7b-89fb-36052eb3c459', false, 902
  from public.events e where e.title = 'Creatures of the Night' and not exists (select 1 from public.event_payables x where x.event_id = e.id and x.label = 'Lady Rivet' and x.source_type is not distinct from 'performer' and x.source_id is not distinct from 'c7dac34e-c4ba-4f7b-89fb-36052eb3c459');

insert into public.event_payables (event_id, section, label, tag, note, amount, agreed_amount, vat_rate, payment_route, advanced_by, paid_on, source_type, source_id, dismissed, sort_order)
select e.id, 'artists', 'Kiki Chérie', 'Performer', 'Drive: 24 - Creatures of the Night/Fakturor/invoice_2024_10547.pdf | Fee 2,500 + travel 1,185', 3685, 999, 0, 'invoice', null, '2024-11-19', 'performer', 'e5e810f9-7929-4999-a9bc-a5c99d50454e', false, 904
  from public.events e where e.title = 'Creatures of the Night' and not exists (select 1 from public.event_payables x where x.event_id = e.id and x.label = 'Kiki Chérie' and x.source_type is not distinct from 'performer' and x.source_id is not distinct from 'e5e810f9-7929-4999-a9bc-a5c99d50454e');

insert into public.event_payables (event_id, section, label, tag, note, amount, agreed_amount, vat_rate, payment_route, advanced_by, paid_on, source_type, source_id, dismissed, sort_order)
select e.id, 'artists', 'Briar The VaudeVillain', 'Performer', 'Drive: 24 - Creatures of the Night/Fakturor/Faktura1113.pdf | Fee and travel on one invoice', 2720, 999, 0, 'invoice', null, '2024-12-05', 'performer', 'e9550a69-e94c-4a64-99fe-ff5dd5f26ae3', false, 906
  from public.events e where e.title = 'Creatures of the Night' and not exists (select 1 from public.event_payables x where x.event_id = e.id and x.label = 'Briar The VaudeVillain' and x.source_type is not distinct from 'performer' and x.source_id is not distinct from 'e9550a69-e94c-4a64-99fe-ff5dd5f26ae3');

insert into public.event_payables (event_id, section, label, tag, note, amount, agreed_amount, vat_rate, payment_route, advanced_by, paid_on, source_type, source_id, dismissed, sort_order)
select e.id, 'artists', 'Feriah Fangs', 'Performer', 'No invoice or receipt found in Drive: enter the amount if there was one', null, 999, null, 'invoice', null, '2024-11-16', 'performer', 'bb8598b7-cb02-4b77-ac89-bc3da26b6f57', true, 908
  from public.events e where e.title = 'Creatures of the Night' and not exists (select 1 from public.event_payables x where x.event_id = e.id and x.label = 'Feriah Fangs' and x.source_type is not distinct from 'performer' and x.source_id is not distinct from 'bb8598b7-cb02-4b77-ac89-bc3da26b6f57');

insert into public.event_payables (event_id, section, label, tag, note, amount, agreed_amount, vat_rate, payment_route, advanced_by, paid_on, source_type, source_id, dismissed, sort_order)
select e.id, 'artists', 'Feriah Fangs', 'Performer', 'Drive: 24 - Creatures of the Night/Kvitton/Feriah Fangs/1000043033.jpg, Kvitton/Feriah Fangs/SJ-receipt-booking-W68BQPN9 | Hotel Vasa 1,295.19 (12% VAT) + SJ train 610 (6% VAT)', 1905.19, null, null, 'receipt', 'Elena Sperner', '2024-11-16', 'performer_travel', 'bb8598b7-cb02-4b77-ac89-bc3da26b6f57', false, 910
  from public.events e where e.title = 'Creatures of the Night' and not exists (select 1 from public.event_payables x where x.event_id = e.id and x.label = 'Feriah Fangs' and x.source_type is not distinct from 'performer_travel' and x.source_id is not distinct from 'bb8598b7-cb02-4b77-ac89-bc3da26b6f57');

insert into public.event_payables (event_id, section, label, tag, note, amount, agreed_amount, vat_rate, payment_route, advanced_by, paid_on, source_type, source_id, dismissed, sort_order)
select e.id, 'artists', 'Yvette Les Fesses', 'Performer', 'Drive: 24 - Creatures of the Night/Fakturor/8343816.pdf | FrilansFinans', 3250, 999, 25, 'invoice', null, '2024-11-27', 'performer', 'e0b66386-85c2-427c-9f01-decfd9db4999', false, 912
  from public.events e where e.title = 'Creatures of the Night' and not exists (select 1 from public.event_payables x where x.event_id = e.id and x.label = 'Yvette Les Fesses' and x.source_type is not distinct from 'performer' and x.source_id is not distinct from 'e0b66386-85c2-427c-9f01-decfd9db4999');

insert into public.event_payables (event_id, section, label, tag, note, amount, agreed_amount, vat_rate, payment_route, advanced_by, paid_on, source_type, source_id, dismissed, sort_order)
select e.id, 'artists', 'Foxy', 'Performer', 'Drive: 24 - Creatures of the Night/Fakturor/Faktura_1030.pdf', 1000, 999, 0, 'invoice', null, '2024-11-28', 'performer', '4be9ef10-c898-4f47-b0e7-ba007e03c395', false, 914
  from public.events e where e.title = 'Creatures of the Night' and not exists (select 1 from public.event_payables x where x.event_id = e.id and x.label = 'Foxy' and x.source_type is not distinct from 'performer' and x.source_id is not distinct from '4be9ef10-c898-4f47-b0e7-ba007e03c395');

insert into public.event_payables (event_id, section, label, tag, note, amount, agreed_amount, vat_rate, payment_route, advanced_by, paid_on, source_type, source_id, dismissed, sort_order)
select e.id, 'artists', 'Ribflare Faboylous', 'Performer', 'No invoice or receipt found in Drive: enter the amount if there was one', null, 999, null, 'invoice', null, '2024-11-16', 'performer', '5b887b33-ef8d-4a91-a800-bc0fc86f3b12', true, 916
  from public.events e where e.title = 'Creatures of the Night' and not exists (select 1 from public.event_payables x where x.event_id = e.id and x.label = 'Ribflare Faboylous' and x.source_type is not distinct from 'performer' and x.source_id is not distinct from '5b887b33-ef8d-4a91-a800-bc0fc86f3b12');

insert into public.event_payables (event_id, section, label, tag, note, amount, agreed_amount, vat_rate, payment_route, advanced_by, paid_on, source_type, source_id, dismissed, sort_order)
select e.id, 'artists', 'Gita', 'Performer', 'Drive: 24 - Creatures of the Night/Fakturor/42021 - Gita Fusion Dance - TTV.pdf | Invoice from Gita Fusion Dance', 1000, 999, 0, 'invoice', null, '2024-11-23', 'performer', 'a37465fc-37e6-452d-8fd5-62c16417bfc9', false, 918
  from public.events e where e.title = 'Creatures of the Night' and not exists (select 1 from public.event_payables x where x.event_id = e.id and x.label = 'Gita' and x.source_type is not distinct from 'performer' and x.source_id is not distinct from 'a37465fc-37e6-452d-8fd5-62c16417bfc9');

insert into public.event_payables (event_id, section, label, tag, note, amount, agreed_amount, vat_rate, payment_route, advanced_by, paid_on, source_type, source_id, dismissed, sort_order)
select e.id, 'artists', 'Amanita Thorn', 'Performer', 'No invoice or receipt found in Drive: enter the amount if there was one', null, 999, null, 'invoice', null, '2024-11-16', 'performer', '598505a0-1ada-48e3-b1a9-c3c8f21b2ba3', true, 920
  from public.events e where e.title = 'Creatures of the Night' and not exists (select 1 from public.event_payables x where x.event_id = e.id and x.label = 'Amanita Thorn' and x.source_type is not distinct from 'performer' and x.source_id is not distinct from '598505a0-1ada-48e3-b1a9-c3c8f21b2ba3');

insert into public.event_payables (event_id, section, label, tag, note, amount, agreed_amount, vat_rate, payment_route, advanced_by, paid_on, source_type, source_id, dismissed, sort_order)
select e.id, 'venue', 'Venue: Bellmans Salonger', 'Venue', 'Drive: 24 - Creatures of the Night/Fakturor/Faktura3681.pdf', 20000, 30000, 0, 'invoice', null, '2024-12-03', 'venue', 'c507c2e2-73b1-4200-9db2-3b52dce428af', false, 902
  from public.events e where e.title = 'Creatures of the Night' and not exists (select 1 from public.event_payables x where x.event_id = e.id and x.label = 'Venue: Bellmans Salonger' and x.source_type is not distinct from 'venue' and x.source_id is not distinct from 'c507c2e2-73b1-4200-9db2-3b52dce428af');

insert into public.event_payables (event_id, section, label, tag, note, amount, agreed_amount, vat_rate, payment_route, advanced_by, paid_on, source_type, source_id, dismissed, sort_order)
select e.id, 'staff', 'Tobias Walka', 'Photographer', 'Drive: 24 - Creatures of the Night/Fakturor/Faktura150094.pdf', 6550, 6600, 25, 'invoice', null, '2024-11-16', 'staff', '7f0dff57-a08d-4bf9-a2e0-ac74708771ea', false, 902
  from public.events e where e.title = 'Creatures of the Night' and not exists (select 1 from public.event_payables x where x.event_id = e.id and x.label = 'Tobias Walka' and x.source_type is not distinct from 'staff' and x.source_id is not distinct from '7f0dff57-a08d-4bf9-a2e0-ac74708771ea');

insert into public.event_payables (event_id, section, label, tag, note, amount, agreed_amount, vat_rate, payment_route, advanced_by, paid_on, source_type, source_id, dismissed, sort_order)
select e.id, 'staff', 'Karolina Hellner', 'Technician', 'No invoice or receipt found in Drive: enter the amount if there was one', null, 2000, null, 'invoice', null, '2024-11-16', 'staff', '935bdc33-c4ff-4a0c-ac99-541cdfe387ee', true, 904
  from public.events e where e.title = 'Creatures of the Night' and not exists (select 1 from public.event_payables x where x.event_id = e.id and x.label = 'Karolina Hellner' and x.source_type is not distinct from 'staff' and x.source_id is not distinct from '935bdc33-c4ff-4a0c-ac99-541cdfe387ee');

insert into public.event_payables (event_id, section, label, tag, note, amount, agreed_amount, vat_rate, payment_route, advanced_by, paid_on, source_type, source_id, dismissed, sort_order)
select e.id, 'staff', 'Alecio (door)', 'Door', 'Drive: 24 - Creatures of the Night/Fakturor/ALECIOS faktura_2024_013.pdf', 1875, null, 25, 'invoice', null, '2024-11-16', null, null, false, 906
  from public.events e where e.title = 'Creatures of the Night' and not exists (select 1 from public.event_payables x where x.event_id = e.id and x.label = 'Alecio (door)' and x.source_type is not distinct from null and x.source_id is not distinct from null);

insert into public.event_payables (event_id, section, label, tag, note, amount, agreed_amount, vat_rate, payment_route, advanced_by, paid_on, source_type, source_id, dismissed, sort_order)
select e.id, 'decor', 'Åhléns: costume and make-up (Amanita Thorn)', null, 'Drive: 24 - Creatures of the Night/Kvitton/Amanita Thorn/ÅhlénsCity-Göteborg-2024-10-19.pdf, Kvitton/Amanita Thorn/ÅhlénsCity-Stockholm-2024-09-28.pdf | 728 (Göteborg 2024-10-19) + 349 (Stockholm 2024-09-28)', 1077, null, 25, 'receipt', 'Amanita Thorn', '2024-11-16', null, null, false, 902
  from public.events e where e.title = 'Creatures of the Night' and not exists (select 1 from public.event_payables x where x.event_id = e.id and x.label = 'Åhléns: costume and make-up (Amanita Thorn)' and x.source_type is not distinct from null and x.source_id is not distinct from null);

insert into public.event_payables (event_id, section, label, tag, note, amount, agreed_amount, vat_rate, payment_route, advanced_by, paid_on, source_type, source_id, dismissed, sort_order)
select e.id, 'decor', 'Temu: props (Ribflare Faboylous)', null, 'Drive: 24 - Creatures of the Night/Kvitton/Oliver Goldkuhl/image0.png', 1245.5, null, null, 'receipt', 'Oliver Goldkuhl', '2024-11-16', null, null, false, 904
  from public.events e where e.title = 'Creatures of the Night' and not exists (select 1 from public.event_payables x where x.event_id = e.id and x.label = 'Temu: props (Ribflare Faboylous)' and x.source_type is not distinct from null and x.source_id is not distinct from null);

insert into public.event_payables (event_id, section, label, tag, note, amount, agreed_amount, vat_rate, payment_route, advanced_by, paid_on, source_type, source_id, dismissed, sort_order)
select e.id, 'print', 'Snabbtryckeriet: flyers and posters', null, 'Drive: 24 - Creatures of the Night/Fakturor/Snabbtryckeri, flyers.pdf', 286, null, 25, 'invoice', null, '2024-11-16', null, null, false, 902
  from public.events e where e.title = 'Creatures of the Night' and not exists (select 1 from public.event_payables x where x.event_id = e.id and x.label = 'Snabbtryckeriet: flyers and posters' and x.source_type is not distinct from null and x.source_id is not distinct from null);

insert into public.event_payables (event_id, section, label, tag, note, amount, agreed_amount, vat_rate, payment_route, advanced_by, paid_on, source_type, source_id, dismissed, sort_order)
select e.id, 'artists', 'Fräulein Frauke', 'Headliner', 'Drive: 25 - Desserted Island/Kvitton/Reseersättning Frauke1.jpg, Kvitton/Reseersättning Frauke2.jpg | Fuel 725.02 + 676.02', 1401.04, null, null, 'receipt', 'Fräulein Frauke', '2025-09-13', 'performer_travel', '2d8f15f4-6c78-46ea-95cf-eb318bf8611b', false, 902
  from public.events e where e.title = 'Desserted Island' and not exists (select 1 from public.event_payables x where x.event_id = e.id and x.label = 'Fräulein Frauke' and x.source_type is not distinct from 'performer_travel' and x.source_id is not distinct from '2d8f15f4-6c78-46ea-95cf-eb318bf8611b');

insert into public.event_payables (event_id, section, label, tag, note, amount, agreed_amount, vat_rate, payment_route, advanced_by, paid_on, source_type, source_id, dismissed, sort_order)
select e.id, 'artists', 'Mym Lafox', 'Performer', 'Drive: 25 - Desserted Island/Kvitton/Mym LaFox/image0.jpeg | Comfort Hotel. Not included: train 111 kr and costume materials 584.98 kr (see the file note in Drive)', 1506.16, null, 12, 'receipt', 'Mym Lafox', '2025-09-13', 'performer_travel', '83d5760f-e220-4700-bc5b-d88d4f14de7b', false, 904
  from public.events e where e.title = 'Desserted Island' and not exists (select 1 from public.event_payables x where x.event_id = e.id and x.label = 'Mym Lafox' and x.source_type is not distinct from 'performer_travel' and x.source_id is not distinct from '83d5760f-e220-4700-bc5b-d88d4f14de7b');

insert into public.event_payables (event_id, section, label, tag, note, amount, agreed_amount, vat_rate, payment_route, advanced_by, paid_on, source_type, source_id, dismissed, sort_order)
select e.id, 'venue', 'Food: 14 dinners (Auktionsverket)', null, 'Drive: 25 - Desserted Island/Budgetposterna hyra+mat.pdf (invoice 711)', 2119.04, null, 12, 'invoice', null, '2025-09-13', null, null, false, 902
  from public.events e where e.title = 'Desserted Island' and not exists (select 1 from public.event_payables x where x.event_id = e.id and x.label = 'Food: 14 dinners (Auktionsverket)' and x.source_type is not distinct from null and x.source_id is not distinct from null);

insert into public.event_payables (event_id, section, label, tag, note, amount, agreed_amount, vat_rate, payment_route, advanced_by, paid_on, source_type, source_id, dismissed, sort_order)
select e.id, 'venue', 'Drink tickets: 29 (Auktionsverket)', null, 'Drive: 25 - Desserted Island/Budgetposterna hyra+mat.pdf (invoice 711)', 3117.5, null, 25, 'invoice', null, '2025-09-13', null, null, false, 904
  from public.events e where e.title = 'Desserted Island' and not exists (select 1 from public.event_payables x where x.event_id = e.id and x.label = 'Drink tickets: 29 (Auktionsverket)' and x.source_type is not distinct from null and x.source_id is not distinct from null);

insert into public.event_payables (event_id, section, label, tag, note, amount, agreed_amount, vat_rate, payment_route, advanced_by, paid_on, source_type, source_id, dismissed, sort_order)
select e.id, 'staff', 'Emil Ralph (door)', 'Door', 'Drive: 25 - Desserted Island/Fakturor/Vitrin HB.pdf', 1850, null, 25, 'invoice', null, '2025-09-30', null, null, false, 902
  from public.events e where e.title = 'Desserted Island' and not exists (select 1 from public.event_payables x where x.event_id = e.id and x.label = 'Emil Ralph (door)' and x.source_type is not distinct from null and x.source_id is not distinct from null);

insert into public.event_payables (event_id, section, label, tag, note, amount, agreed_amount, vat_rate, payment_route, advanced_by, paid_on, source_type, source_id, dismissed, sort_order)
select e.id, 'decor', '4-Gott: sweets', null, 'Drive: 25 - Desserted Island/Kvitton/Chokladmynt.jpg', 165, null, 12, 'receipt', 'Pontus Lindhé', '2025-09-13', null, null, false, 902
  from public.events e where e.title = 'Desserted Island' and not exists (select 1 from public.event_payables x where x.event_id = e.id and x.label = '4-Gott: sweets' and x.source_type is not distinct from null and x.source_id is not distinct from null);

insert into public.event_payables (event_id, section, label, tag, note, amount, agreed_amount, vat_rate, payment_route, advanced_by, paid_on, source_type, source_id, dismissed, sort_order)
select e.id, 'transport', 'Uber home after the show', null, 'Drive: 25 - Desserted Island/Kvitton/Taxi, v1, Kvitton/Taxi, v2', 552, null, null, 'receipt', 'Pontus Lindhé', '2025-09-13', null, null, false, 902
  from public.events e where e.title = 'Desserted Island' and not exists (select 1 from public.event_payables x where x.event_id = e.id and x.label = 'Uber home after the show' and x.source_type is not distinct from null and x.source_id is not distinct from null);

insert into public.event_payables (event_id, section, label, tag, note, amount, agreed_amount, vat_rate, payment_route, advanced_by, paid_on, source_type, source_id, dismissed, sort_order)
select e.id, 'venue', 'Security guard (Auktionsverket)', null, 'Drive: 26 - Dark Carnival/Fakturor/Faktura_907.pdf | Ordningsvakt, 2,925 ex VAT', 3656.25, null, 25, 'invoice', null, '2026-03-21', null, null, false, 902
  from public.events e where e.title = 'Dark Carnival' and not exists (select 1 from public.event_payables x where x.event_id = e.id and x.label = 'Security guard (Auktionsverket)' and x.source_type is not distinct from null and x.source_id is not distinct from null);

insert into public.event_payables (event_id, section, label, tag, note, amount, agreed_amount, vat_rate, payment_route, advanced_by, paid_on, source_type, source_id, dismissed, sort_order)
select e.id, 'venue', 'Food: 17 dinners (Auktionsverket)', null, 'Drive: 26 - Dark Carnival/Fakturor/Faktura_907.pdf', 2504.32, null, 12, 'invoice', null, '2026-03-21', null, null, false, 904
  from public.events e where e.title = 'Dark Carnival' and not exists (select 1 from public.event_payables x where x.event_id = e.id and x.label = 'Food: 17 dinners (Auktionsverket)' and x.source_type is not distinct from null and x.source_id is not distinct from null);

insert into public.event_payables (event_id, section, label, tag, note, amount, agreed_amount, vat_rate, payment_route, advanced_by, paid_on, source_type, source_id, dismissed, sort_order)
select e.id, 'artists', 'Alexander of hellsingland', 'Performer', 'Drive: 26 - Dark Carnival/Kontodetaljer/IMG_3313.png, Kontodetaljer/IMG_3314.png, Kontodetaljer/IMG_3315.png | Train there 444 + back 1,952', 2396, null, 6, 'receipt', 'Alexander of hellsingland', '2026-03-21', 'performer_travel', '59c97e65-2a3d-4c64-ac97-355fcc26abfa', false, 902
  from public.events e where e.title = 'Dark Carnival' and not exists (select 1 from public.event_payables x where x.event_id = e.id and x.label = 'Alexander of hellsingland' and x.source_type is not distinct from 'performer_travel' and x.source_id is not distinct from '59c97e65-2a3d-4c64-ac97-355fcc26abfa');

insert into public.event_payables (event_id, section, label, tag, note, amount, agreed_amount, vat_rate, payment_route, advanced_by, paid_on, source_type, source_id, dismissed, sort_order)
select e.id, 'artists', 'Yvette Les Fesses', 'Performer', 'Drive: 26 - Dark Carnival/Kvitton/Kvitto, resekostnader, SJ, Yvette.pdf | SJ train 1,930. A reminder fee of 66.95 kr was added by SJ and is not included', 1930, null, 6, 'receipt', 'Yvette Les Fesses', '2026-03-21', 'performer_travel', 'e0b66386-85c2-427c-9f01-decfd9db4999', false, 904
  from public.events e where e.title = 'Dark Carnival' and not exists (select 1 from public.event_payables x where x.event_id = e.id and x.label = 'Yvette Les Fesses' and x.source_type is not distinct from 'performer_travel' and x.source_id is not distinct from 'e0b66386-85c2-427c-9f01-decfd9db4999');

insert into public.event_payables (event_id, section, label, tag, note, amount, agreed_amount, vat_rate, payment_route, advanced_by, paid_on, source_type, source_id, dismissed, sort_order)
select e.id, 'artists', 'Seymour Bottoms', 'Performer', 'Drive: 26 - Dark Carnival/Kvitton/47AI78GX-kvitto.pdf | VR train there and back', 818, null, 6, 'receipt', 'Seymour Bottoms', '2026-03-21', 'performer_travel', '7b1b4ff9-7383-4231-a8c3-e9b6b0ac1c56', false, 906
  from public.events e where e.title = 'Dark Carnival' and not exists (select 1 from public.event_payables x where x.event_id = e.id and x.label = 'Seymour Bottoms' and x.source_type is not distinct from 'performer_travel' and x.source_id is not distinct from '7b1b4ff9-7383-4231-a8c3-e9b6b0ac1c56');

insert into public.event_payables (event_id, section, label, tag, note, amount, agreed_amount, vat_rate, payment_route, advanced_by, paid_on, source_type, source_id, dismissed, sort_order)
select e.id, 'artists', 'Mizzen n´Minxx', 'Performer', 'Drive: 26 - Dark Carnival/Fakturor/Faktura 4 Lilith Heels AB (1).pdf | Mileage 93.4 mil on the Lilith Heels invoice', 1926, null, 25, 'invoice', null, '2026-03-24', 'performer_travel', '0a5a50f0-5290-47c3-8d1e-6f2a1e1f4718', false, 908
  from public.events e where e.title = 'Dark Carnival' and not exists (select 1 from public.event_payables x where x.event_id = e.id and x.label = 'Mizzen n´Minxx' and x.source_type is not distinct from 'performer_travel' and x.source_id is not distinct from '0a5a50f0-5290-47c3-8d1e-6f2a1e1f4718');

insert into public.event_payables (event_id, section, label, tag, note, amount, agreed_amount, vat_rate, payment_route, advanced_by, paid_on, source_type, source_id, dismissed, sort_order)
select e.id, 'decor', 'Materials: Bunny Bordeaux (Self Made fabric)', null, 'Drive: 26 - Dark Carnival/Kvitton/Leah Englund, ersättning material', 4658.85, null, 25, 'receipt', 'Leah Englund', '2026-03-21', null, null, false, 902
  from public.events e where e.title = 'Dark Carnival' and not exists (select 1 from public.event_payables x where x.event_id = e.id and x.label = 'Materials: Bunny Bordeaux (Self Made fabric)' and x.source_type is not distinct from null and x.source_id is not distinct from null);

insert into public.event_payables (event_id, section, label, tag, note, amount, agreed_amount, vat_rate, payment_route, advanced_by, paid_on, source_type, source_id, dismissed, sort_order)
select e.id, 'decor', 'Myrorna: second-hand props', null, 'Drive: 26 - Dark Carnival/Kvitton/Eva Second hand.JPG', 395, null, 0, 'receipt', 'Eva Leygonie', '2026-03-21', null, null, false, 904
  from public.events e where e.title = 'Dark Carnival' and not exists (select 1 from public.event_payables x where x.event_id = e.id and x.label = 'Myrorna: second-hand props' and x.source_type is not distinct from null and x.source_id is not distinct from null);

insert into public.event_payables (event_id, section, label, tag, note, amount, agreed_amount, vat_rate, payment_route, advanced_by, paid_on, source_type, source_id, dismissed, sort_order)
select e.id, 'decor', 'Bodega: balloons', null, 'Drive: 26 - Dark Carnival/Kvitton/Eva Balong priser Bouvardia.JPG', 104, null, 25, 'card', null, '2026-03-21', null, null, false, 906
  from public.events e where e.title = 'Dark Carnival' and not exists (select 1 from public.event_payables x where x.event_id = e.id and x.label = 'Bodega: balloons' and x.source_type is not distinct from null and x.source_id is not distinct from null);

insert into public.event_payables (event_id, section, label, tag, note, amount, agreed_amount, vat_rate, payment_route, advanced_by, paid_on, source_type, source_id, dismissed, sort_order)
select e.id, 'decor', 'Willys: drinks and snacks', null, 'Drive: 26 - Dark Carnival/Kvitton/Willys 20260314.jpg', 174.87, null, 12, 'card', null, '2026-03-21', null, null, false, 908
  from public.events e where e.title = 'Dark Carnival' and not exists (select 1 from public.event_payables x where x.event_id = e.id and x.label = 'Willys: drinks and snacks' and x.source_type is not distinct from null and x.source_id is not distinct from null);

insert into public.event_payables (event_id, section, label, tag, note, amount, agreed_amount, vat_rate, payment_route, advanced_by, paid_on, source_type, source_id, dismissed, sort_order)
select e.id, 'other', 'Meta ads (Facebook and Instagram)', null, 'Drive: 26 - Dark Carnival/Kvitton/Meta ads stora faktura.pdf, Kvitton/2026-03-0*/10* Transaction PDFs | Five payments: 18 + 21 + 24 + 27 + 237.52', 327.52, null, 0, 'receipt', 'Eva Leygonie', '2026-03-21', null, null, false, 902
  from public.events e where e.title = 'Dark Carnival' and not exists (select 1 from public.event_payables x where x.event_id = e.id and x.label = 'Meta ads (Facebook and Instagram)' and x.source_type is not distinct from null and x.source_id is not distinct from null);

insert into public.event_payables (event_id, section, label, tag, note, amount, agreed_amount, vat_rate, payment_route, advanced_by, paid_on, source_type, source_id, dismissed, sort_order)
select e.id, 'transport', 'Taxi home after the show', null, 'Drive: 26 - Dark Carnival/Kvitton/Resekvitto, Pontus | Fare 528, of which 106 was paid by a voucher', 422, null, 6, 'receipt', 'Pontus Lindhé', '2026-03-21', null, null, false, 902
  from public.events e where e.title = 'Dark Carnival' and not exists (select 1 from public.event_payables x where x.event_id = e.id and x.label = 'Taxi home after the show' and x.source_type is not distinct from null and x.source_id is not distinct from null);
