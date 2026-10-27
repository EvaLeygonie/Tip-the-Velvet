# Ticket sales — notes for a proper section (not built)

Written 2026-10-26. Notes only; nothing here is designed in detail.

## The problem

`events.tickets_sold` (a single number, also `tickets_price`) is edited in the Event Editor. That is
the wrong place for it and the wrong shape: one number says nothing about **which ticket categories**
(early bird, regular, support ticket, VIP, door) sold, at what price, or how many of each.
Revenue, capacity and the "what price works" question all need the breakdown.

## What a real ticket-sales section needs

- A table of **ticket types per event**: name (sv/eng), price, capacity (optional), sold, channel
  (online platform / door / complimentary), sale dates (release date already exists on `events`).
- Totals computed from it: tickets sold, revenue, fill rate, per-category share. The single
  `tickets_sold`/`tickets_price` columns on `events` become derived or are retired.
- Compare across events (the planned economy page reads this).
- A home for it that is not the Event Editor: a "Tickets" tab in the event-scoped admin (next to
  Event Plan), or a section of the economy page. Decide when designing.
- Entry first by hand or by CSV import from the platform's export; an API sync later if available.

Decision: the "Night numbers" item in the To Do Next doc keeps `attendance` and `after_show_notes`
on `events` but has **no `ticket_revenue` column**. Revenue is always calculated from the ticket
types, so the two numbers can never disagree.

## Switching ticket platform

- Simplesignup has not performed to the board's satisfaction. Candidate: **Billeto**; hoped
  benefit: no need for Stripe (check Billeto's payout/fee model, and that it supports the
  ticket categories above and a discount/guest-list code for VIP and ticket-winner entries).
- Wanted from the new platform:
  - Reviews on events (guests can rate after the show).
  - An **API** (or a feed) to read ticket counts by category and, if possible, review scores.
- Also wanted: an API for **Diversia.se** reviews, so tipthevelvet.nu can show their score next to
  our own. Both are **to be researched**: whether Billeto and Diversia expose an API/feed, whether it
  is public or needs a partner agreement, and whether showing their scores is allowed by their terms.
  Do not build against an API until that is confirmed.
- Anything that needs an API key goes through a Netlify Edge Function (like `subscribe.ts`),
  never from the client.

## How it connects to the feedback page

`docs/event-feedback-page.md` gives each rating a `source` (`site`, `billeto`, `diversia`). Our own
feedback page works regardless of the platform. External scores are shown as separate labelled
badges, never merged into our average.

## Order

1. Settle platform (Billeto or other) and read its API docs.
2. Ticket types table + manual/CSV entry; remove `tickets_sold` from the Event Editor.
3. Ticket section page; feed the economy page.
4. External review scores on the event pages, once an API is confirmed.
