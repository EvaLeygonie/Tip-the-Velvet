-- Run once in the Supabase SQL editor. Adds "QR code for the feedback page" to the standard
-- "To print" list every event starts with (to put up at the event, so guests can scan on site or
-- on their way out). Safe to run again. Download the QR code itself from /admin/feedback.
insert into public.print_standard_items (label, copies, professional, sort_order)
select 'QR-kod för omdömen (feedback)', 3, false, 11
where not exists (
  select 1 from public.print_standard_items where label = 'QR-kod för omdömen (feedback)'
);
