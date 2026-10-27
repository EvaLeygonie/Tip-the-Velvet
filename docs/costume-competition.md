# Costume competition — print sheets, public voting, jury page

Written 2026-10-26. **Not built yet** — this is the design to build from. Requested right after
Pandaemonium; replaces the Google Form "Dräkttävling! - Costume competition!" and the
costume question in the post-show survey.

## What the board does today

- Doors 19:00. Contestants sign up at the contest table until 20:45 and get photographed.
- After the first act they are presented on stage; a QR code opens the vote (Google Form).
  Voting closes at the end of Act 2.
- Jury picks winners in the evening-specific categories (usually Theme of the night,
  Creativity, Originality); Audience Choice is decided by votes. If the audience favourite
  already won a jury prize, the audience prize goes to the next highest (see `ContestCard.tsx`).
- Categories change per event. Pandaemonium combined theme + craftiness and had two
  originality spots. So categories must be **free text per event**, never a fixed enum.

## The evening as it will run (decided 2026-10-26)

New volunteer category: **costume competition volunteers, 2 per event.** (Setup: at least 6, takedown is a
separate category (ask the setup people if they can stay); door: at least 4. See `event-day-checklist.md`.)

1. **First 2 hours of doors, registration.** One volunteer stands at the registration booth with the iPad
   (name, comment, photo); the other goes around the party, mingles and sends people to the booth.
   They swap places after 1 hour.
2. **After the first act:** the volunteers run around handing out and setting up the **voting QR codes**.
   Meanwhile the board announces the competition and calls out everyone on the list so the jury
   can take a good look at them.
3. **Deliberation:** the board retires privately and uses the admin page on the iPad (the list of all
   registered contestants) to mark their picks.
4. **During Act 2:** the system keeps track of the jury's winners and updates the public's choice and the
   possible honorable mention live.
5. **After Act 2:** the board brings a single **result page** (large type, announcement order) up on
   the stage and announces the winners from it.
6. **Review QR codes:** the volunteers go around once more and put up the review QR codes on walls and
   tables; the board announces that guests can leave a review, and that the link is on the website and
   will be shared on social media within a few days.

This adds two screens to the build: a **registration mode** of the contestants tab (big buttons, one
contestant at a time, usable standing up on an iPad) and a **stage result page** with no admin chrome.

## Part 1 — Two new "to print" documents (build first, small)

Both are generated PDFs added to `EVENT_DOCUMENTS` in `src/lib/eventDocuments.ts`
(new ids, e.g. `costumeSignup`, `costumeResults`) and to the standard rows in
`print_standard_items` (a new `docs/*.sql`, same pattern as `to-print.sql`), so they appear
on every event's "To print" card.

### Costume sign-up sheet

- Table of numbered rows 1–40, prefilled numbers, blank "Name" column (plus an optional
  narrow "Costume / note" column).
- Check the Drive first for the existing sheet (a search for "costume"/"kostym" found only
  the form and "costuming for the stage.odt"; ask the board if they have a printed one) and
  mirror its layout if so.
- Default copies: 2 (two people at the table). Bilingual header, event title and date.

### Costume results sheet

- **Jury winners:** 5 rows. Columns: Category (blank, written by hand), No., Name, Note.
  Fixed at 5 slots; the board writes the category names, since they change per evening.
- **Honorable mention:** 1 row, same columns (announced after the public's choice, see below).
- **Public's top 5:** 5 rows. Columns: Rank, No., Name, Note.
- Landscape or portrait, whichever fits two tables on one A4; one page.
- Later option: pre-print the jury category names from the admin page (Part 3) once they
  are set. Blank by default.

## Part 2 — Public voting on the website

Replaces the Google Form. Visitors scan the QR code and vote on the site, per event.

### Public page `/events/:type/:slug/vote` (or `/vote/:eventId`)

- Lists contestants as large tappable cards: **number**, photo (if taken), name.
- Vote for up to **5 choices** in ranked order, or 1 favourite, decide before building.
  Recommendation: pick one favourite plus optional ranked top 3, because the board asks for a
  "public ranking" and simple plurality keeps the evening quick. Confirm with the board.
- Closed state: before opening, show "Voting opens after the first act"; after closing, show
  "Voting is closed, thank you!". Controlled by the admin's open/closed switch, with an
  optional automatic close time.
- Bilingual, mobile first (everyone is on a phone in a dark room).

### Preventing repeat voting (no login for guests)

- Anonymous, one ballot per device: random `voter_token` in `localStorage`, stored with the
  vote and a unique constraint on `(event_id, voter_token)`. Re-voting replaces the ballot
  until voting closes.
- Not bulletproof (a second browser can vote again). Accept this for a party vote; the page
  shows the board the total ballot count so a spike is visible. Do not collect names or
  emails.
- Votes are written through an Edge Function or an RPC so the table is never writable
  directly by the public. Public clients can insert only while voting is open.

## Part 3 — Admin page `/admin/costume` (event-scoped)

Added to the admin nav next to Casting and Event Plan. Uses the event picker like those pages.

### 3a. Contestants

- Add contestant by number (1–40, matches the sign-up sheet): name, optional photo
  (Cloudinary), optional note. Quick entry is key: the board types them in during the evening
  from the sheet, so number and name first, everything else optional.
- Each contestant has a jury decision, set from a row-level control:
  **Yes / Maybe / No** (same pattern as casting `review_status`).
  - "Yes" and "Maybe" show a **category dropdown**: the event's jury categories, plus
    "Honorable mention".
  - Categories are defined on the page itself per event: a small list with defaults
    pre-filled (Evening's theme, Craftiness, Originality) and an **"add category"** button
    for manual ones (e.g. a second Originality spot, or "Theme + craftiness"). Rename and
    remove allowed.
  - Several contestants can be "Maybe" for the same category until the jury decides.
  - A category with two spots (Pandaemonium's originality) is two categories with
    the same name, or one category with a `slots` count. Prefer the `slots` count.

### 3b. Public ranking

- Live table of vote totals per contestant, ranked, with number, name and vote count.
  Refreshes every few seconds with TanStack Query polling. Shows the number of ballots.
- Open / Close voting controls. **Close voting** is confirmed with a dialog, freezes the
  ranking, and stamps `voting_closed_at`. Optional scheduled close time.
- Ties: show tied contestants sharing a rank, flagged for a manual decision.

### 3c. Smart winner logic (decided 2026-10-26)

**Rules, from the board:**

- The jury picks **3 winners** (3 categories) during the interval. The public's choice is the
  priority after that: it can never be "used up" by a jury pick *except* the 3 category winners.
- The **honorable mention** is for someone the jury really wants to reward who was not
  otherwise chosen. The jury deliberates in the interval, but the public can vote longer, so at
  the time the jury decides they do not know whether the public will pick their candidate.

**So the page computes everything live and never needs a manual recalculation:**

1. The jury marks 3 category winners (Yes + category). Those contestants are excluded from the
   public prize.
2. The jury ranks their **honorable mention candidates** in order (1st choice, reserve 1,
   reserve 2). Several contestants can be marked, so the list is ready *before* going on stage.
3. **Public winner** = the highest-voted contestant who is not one of the 3 jury winners.
   Recalculated on every refresh while voting is open.
4. **Honorable mention** = the first candidate in the jury's list who is not the public winner.
   If the public's choice lands on the jury's 1st candidate, the page automatically moves to
   reserve 1 and shows "Reserve used: #12 is the public's choice". If every candidate is taken,
   it shows "No honorable mention (all candidates already won)", so announcing none is the
   fallback.
5. **Provisional vs final:** while voting is open the public winner and the honorable mention
   carry a "provisional" badge; closing the vote locks them. Announce order: 3 jury winners,
   public's choice, honorable mention. If the board announces the mention while voting is still
   open, the page warns when a late vote would change it ("#12 is 3 votes ahead of #7").
6. **Ties** at the top of the public ranking are flagged for a manual decision; nothing is
   auto-picked on a tie.
7. **Conflict warnings:** one person given two jury categories; a category with no winner; a
   contestant number with no name; voting still open when the final screen is opened.
8. **Final announcement view:** one large-type screen in announce order, each line showing
   category, number, name and note. It matches the printed results sheet (Part 1).

### Voting format

- Today: one favourite per guest. **Build it as one favourite first.** Optionally add "rank your
  top 3" (3 points / 2 / 1) as a setting per event, so it can be tried at one show without a
  rebuild. The admin ranking page shows the points total plus first-choice counts when top 3 is on.

### Registration (iPad) and paper

- The sign-up is a table: number, name (usually a first name or nickname, "something you will
  recognise yourself by when called"), and a free comment (what they made themselves).
- **iPad registration at the contest table:** big number buttons / next free number, name, comment,
  and a photo taken straight from the iPad camera and attached to that number. This is the
  admin page's Contestants tab in a "table mode" (large touch targets, no other admin chrome).
- **The paper sheet stays** as the fallback if wifi or the iPad fails; the admin page
  can enter numbers from the paper afterwards.

### Photos and winners on the event page

- **Registration photos are temporary.** They exist only so the guest can be recognised on the
  voting page. Delete them when the event's results are marked final (or after a fixed number of
  days; a "Delete photos" button plus an automatic delete 7 days after the event). Names are
  first names or nicknames only, and are kept only for the winners.
- **Winners on the event page:** show the winners with the photographer's group photo from the
  stage (already part of the event's images) plus a text list of category and nickname. Do **not**
  use the registration photos. The board adds the group photo to the event and ticks
  "show winners on page"; no extra work for the photographer.
- The event page gets a small "Costume winners" section shown after the event, fed by the final
  results (category, number, name) plus the chosen photo.

### Still open

- The old photos are still in the Google Form (not on the website). Nothing to migrate; delete
  them there when convenient.
- Guests' consent for the group photo is the same as for the other event photography.

## Suggested data model (new tables, schema via a `docs/costume-competition.sql`)

Written as SQL in `docs/`, run by hand in the Supabase editor, then regenerate
`database.types.ts` (the project's usual process; see CLAUDE.md).

- `costume_contestants`: `id`, `event_id` → events, `number int`, `name text`, `photo_public_id
  text null`, `note text null`, `jury_status` (`undecided | yes | maybe | no`),
  `jury_category_id uuid null`, `is_reserve bool default false`, unique `(event_id, number)`.
- `costume_categories`: `id`, `event_id`, `name text`, `slots int default 1`, `sort_order int`,
  `kind` (`jury | honorable_mention`).
- Honorable mention candidates are `costume_contestants` rows with `mention_rank int null` (1 = first
  choice, 2 = reserve 1, ...). The page derives who is actually announced; nothing is stored for that.
- On `costume_contestants` also: `comment text null` (what they made), `photo_path text null` (deleted
  when results are final).
- On `events`: `costume_show_winners bool default false`, `costume_winner_photo_id text null` (the
  photographer's group photo).
- `costume_votes`: `id`, `event_id`, `voter_token text`, `choice_1`..`choice_3` →
  `costume_contestants` (or a child table of ranked choices), `created_at`, unique
  `(event_id, voter_token)`.
- On `events`: `costume_voting_status` (`not_open | open | closed`), `costume_voting_closes_at
  timestamptz null`.
- RLS: admins full access (as in `to-print.sql`). Public can read contestants only (name,
  number, photo) via a view while voting is open, and can insert/update their own vote only
  through the RPC/Edge Function while `costume_voting_status = 'open'`. Totals are
  admin-only.

## Other places this touches

- `ContestCard.tsx` (marketing text) and `EveningScheduleCard.tsx`: swap the "QR code for
  voting" wording to point at the new page; the four-category text stays valid but should
  read the event's real categories once they exist.
- Standard print rows "QR-kod för tävlingsenkät" and "Direktionsskyltar till tävling": the QR
  should resolve to the new vote page (generate it from the event link).
- Run of show: `costume_intro` / `costume_winners` in `event-plan/constants.ts` already
  schedule the presentations; could link to this page from those rows.
- Post-show survey: remove the costume question once voting moves here.

## Suggested build order

1. SQL + the two print documents (small, usable at the next event even without the rest).
2. `/admin/costume` contestants + jury decisions + categories (works on paper-sheet data).
3. Public vote page + admin ranking + open/close.
4. Smart winner logic + final announcement view.
5. Small follow-ups: ContestCard text, QR target, retention rule, survey question removal.
