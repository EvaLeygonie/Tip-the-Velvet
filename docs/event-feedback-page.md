# Event feedback page — replaces the Google "Enkät" form

Planned 2026-10-26. **Built 2026-10-26 (steps 1-5 below); run `docs/event-feedback.sql` first, then regenerate `database.types.ts`** and replace the untyped client in `feedbackService.ts`. Updated same day: feedback now opens automatically at 23:00 on the event day (`docs/event-feedback-auto-open.sql`), all aspects are ticked by default, and `/admin/feedback` has a guest preview. The post template and print QR are done; step 7 (retire the Google form) is still to do. Replaces the Google Form the board publishes after every
event ("Enkät - Creatures of the Night", "Enkät - Desserted Island", "Enkät - Dark Carnival"...).

## Recommendation: yes, build it

Reasons it beats Google Forms:

- One public link per event, in our own look, bilingual, no Google branding.
- Stars first: someone who only taps 1–5 stars still counts. The questions come after and are
  optional, so we get more ratings and the comments from people who care to write them.
- Every rating and comment lives in our own database next to the event, so we can compare
  events over time instead of exporting a new spreadsheet each time.
- A public average per event on tipthevelvet.nu, with the link to leave your own.
- An admin view where the board reads all comments, filters "what can we do better", and turns
  a comment into a to-do.

Things to handle deliberately:

- **No login for guests**, so anyone can submit. Limit abuse: one rating per device (random token
  in `localStorage`, unique per event, a later submit replaces the earlier one), a hidden honeypot
  field, and a time window (the page opens when the event ends; it still accepts answers for a long
  while, but the board can close it). A determined person can still vote twice, which is fine for a
  feedback page; never present the average as anything stricter than "from guests who answered".
- **Show the public average only from 5+ ratings** (configurable), so one angry guest does not
  define a small event. Below that the page shows "Be one of the first to rate".
- **Comments are private by default.** Admin sees everything; nothing is shown publicly unless the
  board marks a comment "okay to quote" (guest also ticks a "may we quote this anonymously?" box).
- **Personal data:** no name, email or IP stored. The free-text answers can still contain
  personal details, so the admin view has a delete button and the privacy text says so.

## What the old form asked (from the Creatures of the Night response sheet)

Ratings 1–5 on: theme, photo booth, costume competition, information before the party,
information during the party, more ticket options (early bird, support ticket), shopping,
entrance entertainment. Then: how did you find the party, what did you like, what can we do
better, what did you think of the public's choice in the costume competition, would you
recommend Tip the Velvet to others.

(The Dark Carnival form was not readable through the Drive connector; check it for newer
questions when building and compare with this list.)

## The page `/events/:type/:slug/feedback`

Mobile first, reached by QR code or link in the thank-you post and the post-show email.

1. **Big stars 1–5.** Tapping a star immediately saves the rating (the answers below update that
   same row). Short thank-you line appears right away.
2. **Optional questions**, shown under "Want to tell us more?":
   - A rating row per **aspect** (theme, costume competition, photo booth, info before, info
     during, entrance entertainment, shop, ticket options). Which aspects appear is chosen
     **per event** by the board (not every event has a cellist or a costume contest). Defaults come
     from a list in code.
   - "What did you like?" free text.
   - "What can we do better?" free text.
   - "How did you hear about us?" dropdown (friends/family, Facebook, Instagram, poster, other).
   - "Would you recommend us?" Yes / Maybe / No.
   - "May we quote you anonymously on the website?" checkbox, unticked.
3. **Submit** shows a thank-you and a "Join the newsletter" prompt (existing `subscribe.ts`).
4. Before the event ends: "Feedback opens after the show". After the board closes it: "Thanks,
   feedback is closed".
5. Everything bilingual with the `t(sv, eng)` pattern. No new i18n library.

## Showing the score on the public pages

- **EventDetail (past events):** a stars summary ("4.6 from 41 guests") with a link to leave
  feedback and, optionally, 1–3 quotes the board approved.
- **Events list:** a small stars line on past event cards.
- **Home/About:** an overall average across all events later.
- **External scores (later, see `ticket-sales.md`):** each rating has a `source`
  (`site`, `billeto`, `diversia`), so scores from the ticket platform and Diversia can sit next to
  ours, clearly labelled. Do not merge them into one number; show them as separate badges.

## Data model (schema via `docs/event-feedback.sql`, run by hand, then regenerate types)

- `event_feedback`: `id`, `event_id` → events, `rating smallint check (1..5)`, `aspect_ratings
  jsonb` (e.g. `{"theme":5,"photo_booth":4}`), `liked text`, `improve text`, `how_found text`,
  `would_recommend text`, `may_quote boolean default false`, `voter_token text`, `language text`,
  `source text default 'site'`, `is_hidden boolean default false`, `is_actioned boolean default
  false`, `created_at`, unique `(event_id, voter_token)`.
- On `events`: `feedback_open boolean default false`, `feedback_aspects text[]` (the aspect keys
  to show), optional `feedback_closes_at timestamptz`.
- RLS: admins full access on `event_feedback`. Public has **no** direct read or write; all public
  access goes through RPCs:
  - `submit_event_feedback(...)`: security definer, checks `feedback_open`, validates 1–5, upserts
    on `(event_id, voter_token)`.
  - `get_event_feedback_summary(event_id)`: returns count, average, 1–5 distribution and per-aspect
    averages, only when the count meets the minimum, plus the `may_quote` comments the board
    approved (`is_hidden = false`).
  Follows the same pattern as `submit_casting_application` and the token RPCs.

## Admin view `/admin/feedback` (or a tab in Event Plan, decide when building)

- **Per event:** average, distribution bars, number of answers, per-aspect averages, and a list of
  comments split into "Liked" and "Can do better".
- **Filters:** by rating, by aspect, by language, unread/actioned, with a search box.
- **Row actions:** hide, delete, "approve as public quote", and **"Make a to-do"** (creates a
  `todos` row for that event with the comment as the details, so the board's improvements do not get
  lost; ties into the "reduce manual effort" goal in CLAUDE.md).
- **Across events:** a small table or chart of average rating per event over time, and the most
  frequent "can do better" themes (just the comments side by side for now).
- **Reminders:** a dashboard to-do "Open feedback for X" generated the day after the event, and
  "Read the feedback for X" a week later, rather than relying on someone remembering.

## Build plan (one afternoon per step)

1. **SQL + types.** `docs/event-feedback.sql` (table, RLS, the two RPCs, event columns), run it,
   regenerate `database.types.ts`, add aliases in `types/types.ts`.
2. **Service.** `src/services/feedbackService.ts`: `submitFeedback`, `getFeedbackSummary` (public),
   `listFeedback`, `updateFeedback`, `deleteFeedback` (admin), reusing `databaseService` helpers.
3. **Public page.** `src/pages/EventFeedback.tsx` and small components in
   `src/components/feedback/` (`StarRating`, `AspectRatings`, `FeedbackForm`). Register the route in
   `App.tsx`. Use the existing velvet classes (`.page-shell`, `.callout-panel`, ...).
4. **Event page summary.** A `FeedbackSummary` component on `EventDetail.tsx` and `Events.tsx` for past
   events. Both files already have uncommitted changes, so do this step in its own commit.
5. **Admin page.** `src/pages/admin/AdminFeedback.tsx`, with a row component per comment, plus the
   per-event settings (open/close, aspect checkboxes) in the Event Editor.
6. **Marketing/print tie-in.** Point `ThankYouCard.tsx` at the new link; add a standard "To print"
   row "QR-kod för feedback" (replaces "QR-kod för tävlingsenkät"); the QR resolves to the feedback
   page.
7. **Retire the Google Form** for the next event; keep the old response sheets in the Drive and
   optionally import them as `source = 'google_form'` so the history is in one place (rating
   columns need mapping; many old forms had no overall star question, so use the average of the
   aspect ratings or leave blank).

## Open questions

- Open the page on the event's end time automatically, or only when the board switches it on?
  Recommendation: opens automatically the day after the event; board can close it.
- Minimum number of ratings before showing the public average (suggested 5).
- Should the page also ask for an email to enter a small draw? It would raise answers but adds personal
  data; skip for the first version.
- Whether guests who bought a ticket through Billeto can be invited by email from the platform
  once the switch is made (see `ticket-sales.md`).

## Decision 2026-10-26: reviews stay open

Nothing closes the page by itself. Once feedback has opened (23:00 on the event day) it stays open until
the board switches it off with "Closed" on `/admin/feedback`, so guests who only notice it when the
photos come out can still review. (The "14 days" in `event-feedback-auto-open.sql` is a one-time
step: it only closed events that were already old when the SQL was run.) How to handle it long term
(auto-close after a number of months, or keep going and show recent reviews first) is still to decide.
