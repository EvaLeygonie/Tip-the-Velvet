# Ticket-win registration — replaces the Google "ticket win" forms

Written 2026-10-26. **Not built yet.** Notes for the next build after the feedback page.

## Today's problem

We give free tickets to partners and giveaways (e.g. sponsoring Bouvardia with free tickets to our
shows). A winner scans a QR code and writes their name in a Google Form; the board then copies the
names to the VIP list by hand. There is no notification when someone registers, so names get
forgotten: this event, people who had registered in the form never made it onto the VIP list.

## What it should do

1. **Winner registers on the website.** The QR code opens a small page (`/win/:code`), the winner
   enters their name (and optionally an email), and the name goes straight onto that event's VIP
   list (`vip_manual_entries` already exists, with the `ticket_winner` category in the
   `vip_entry_category` enum, so the list and the door's VIP page need no changes).
2. **Exactly the right number of people.** Giving out 4 tickets must allow exactly 4 names. Two
   ways, and the board should be able to choose per batch:
   - **One code, N uses:** a single QR code usable to register a new name N times. After N, the
     page says "all tickets from this code are taken". Easy to print once on a flyer or post.
   - **N single-use codes:** 4 separate QR codes, one per ticket. Each works once. Best when
     tickets are handed to different people individually (e.g. on physical tickets).
   Recommendation: build the "one code, N uses" model first and make single-use codes the same thing
   with N = 1, so there is one data model: a *ticket batch* with `max_uses`, plus a *claim* per name.
3. **Automatic confirmation.** If the winner gave an email, an automated email says "You are on the
   list for <event>" (Netlify Edge Function with Resend, like `application-confirmation.ts`). Without an
   email, the page itself shows a clear confirmation they can screenshot.
4. **Dashboard visibility.** The Dashboard shows new registrations: "3 new ticket-win names for
   Pandaemonium" (per event, with the names and which batch/partner), so nothing waits unseen. This
   is the fix for "I get no notification": the Dashboard card, plus an optional email to the board
   when a batch is used up or a new name arrives.
5. **Downloadable QR codes for the tickets.** In admin, each batch has a "Download QR code" button
   (PNG/SVG, and a print sheet with the event name, partner name and "scan to claim your
   ticket"), to put on the physical tickets or flyers handed out.

## Suggested data model (schema via `docs/ticket-win.sql`, run by hand)

- `ticket_batches`: `id`, `event_id`, `code` (short random string used in the URL), `label` (e.g.
  "Bouvardia giveaway"), `max_uses int`, `created_at`, `is_active bool`.
- `ticket_claims`: `id`, `batch_id`, `name text`, `email text null`, `vip_entry_id` (the row in
  `vip_manual_entries`), `created_at`.
- RPC `claim_ticket(p_code, p_name, p_email)`: security definer; in one transaction, locks the
  batch row, checks `is_active` and `count(claims) < max_uses`, inserts the claim and the VIP
  entry. The lock makes it impossible to over-claim even if two people scan at once.
- The Dashboard and a small admin list read claims directly (admins only). Guests only ever call the
  RPC.
- A claim can be removed by the board (frees the slot and removes the VIP entry).

## Safeguards

- The code in the QR is the only secret: long enough to not be guessable (10+ characters).
- A batch can be switched off at any time, and has an optional expiry (e.g. the event date).
- One device claiming several names from a multi-use code is limited by `max_uses`; optionally
  stop repeated claims from one browser (same `localStorage` token trick as the feedback page).
- Only a name is required; email is optional and only used for the confirmation.

## Build order

1. SQL + RPC + the public `/win/:code` page (works with printed QR codes made elsewhere).
2. Admin "ticket batches" list on the event's page: create a batch (label, number of tickets),
   see claims, download the QR code, switch off.
3. Dashboard card for new claims; confirmation email.
4. Retire the Google ticket-win forms.

QR generation: add a small client-side QR library (no server needed), same one used for the
print-sheet QR codes.
