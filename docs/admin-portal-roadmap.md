# Admin portal roadmap — light overview

Drafted 2026-08-19. **Written deliberately as a wishlist/overview, not a phased
implementation plan** like `multi-act-casting-plan.md` — the original reasoning was to
catch schema-level overlaps early without designing in detail against a data shape
(multi-act performers, roles, returning-vs-newcomer) that was still about to change.

**That's no longer the case — multi-act casting/booking shipped and closed 2026-08-25**
(see that doc). This is the next thing to build. The sections below are still genuinely
just an overview, not real phases — whoever picks this up next should feel free to turn
the relevant section into a proper phased plan (mirroring `multi-act-casting-plan.md`'s
structure) once work actually starts, rather than treating this doc's current shape as final.

Within this doc, the order below is roughly the intended build order: foundation →
Casting (done, see `multi-act-casting-plan.md`) → Contacts → Event Planning → Dashboard
last.

## Foundation: event-scoped admin shell

**Built 2026-08-25, then revised same day after a first pass.** First attempt put the
picker in the shared nav bar (global chrome, every `/admin/*` page), on the assumption
that "the board plans one event at a time" meant every tab wanted the same "currently
selected event" framing. Reconsidered once the actual planned tabs were laid out
end-to-end: **only Casting and Event Planning are genuinely 100%-event-scoped.** Contacts
is a plain roster (staff/volunteers/sponsors/venues, not tied to one event), Dashboard is
explicitly cross-event (org-wide to-dos, a calendar of meetings/lifecycle milestones,
incoming applications overview), and the new Budget/Economy tab below is explicitly
*comparative across* events. A global nav picker forced that one-event frame onto pages
where it didn't apply, looked visually heavy competing with the nav links, and caused a
layout-shift flicker on login (the nav is one always-mounted component, so it rendered
once without the picker, then jumped in size the instant the event fetch resolved).

**Current shape**: kept `CurrentEventContext` (`src/contexts/CurrentEventContext.tsx`,
mirrors `AuthContext`) as the shared state — Casting and Event Planning (and wherever the
event-specific Budget section above ends up) read/write one selection without each
re-fetching or re-picking independently. Dropped the picker from `Navigation.tsx`
entirely. The picker itself is a plain reusable component
(`src/components/admin/EventPicker.tsx`) rendered locally at the top of each event-scoped
page instead — restoring the original placement/feel from `AdminCasting.tsx` (under the
page title, with the artist/act counts reacting live right underneath it), which turned
out to already be the right pattern rather than something to lift out of. Casting has
adopted it; Event Planning should do the same once built, rather than each page
reinventing its own local event state. Dashboard and Contacts intentionally get **no**
picker — see each tab's own section for why.

## Casting tab

**Done** — see `multi-act-casting-plan.md` (closed 2026-08-25). Adopted the shared
`CurrentEventContext`/`EventPicker` from the Foundation section above, replacing its
former local event state. The "preliminary budget" number visible here is the same
yes-section total already shipped in that doc (Phase 5). A full, dedicated **Budget /
Economy tab** (tracking total funds, all expenses, not just casting fees) is still
deferred — see that section below, now a nearer-term priority than a "later" placeholder.

## Contacts tab (rename candidate)

Visual CRUD for `staff_volunteers`, `sponsors`, and **`venues`** — worth calling out that
**venues currently has no admin UI at all**: `EventEditor.tsx` only has a read-only
`<select>` populated by `getAllVenues()`; there's no create/edit path anywhere in the app
today, so this tab would be the first place venues become manageable without touching the
database directly.

- List every entry per table (a reusable roster, not scoped to one event), each with an
  "assign to the current event" action + a role picker.
  **Refined 2026-08-25** — this stays true even though the page itself is deliberately
  *not* event-scoped (see Foundation above: no picker, no "viewing roster for Event X"
  framing, since browsing/searching/editing the roster isn't an event-scoped operation).
  A single per-row action can still target an event without that contradicting the page
  staying event-agnostic. Shape: an "Add to event" button per staff/volunteer row opens a
  small popover (not a page-level picker) — silently defaults to whatever
  `CurrentEventContext.selectedEventId` already is (the context still exists globally,
  it's just never rendered here), only surfacing a dropdown to override when more than one
  event genuinely qualifies (rare, per the user, but has happened). Two actions inside
  that popover, both operating on the `event_staff_invitations` table designed under
  "Volunteer outreach & response deadline" below:
  1. **Mark interested** — a quick manual annotation (the admin recording "this person
     told me by email/in person they want to help"), not an email trigger.
  2. **Confirm** — skips the invitation record entirely and inserts straight into
     `event_staff_volunteers`, for when the admin already knows for certain.
  Reuses the exact schema the checkbox below needs rather than a separate mechanism —
  worth building alongside it, not after.
- For staff/volunteers, the role enum already exists and is already exactly what this
  needs: `staff_volunteers`/`event_staff_volunteers` (join) with roles `photographer |
  technician | doorman | artistic | volunteer | musician | entertainment | other` — modeled
  in the schema already, per `CLAUDE.md`, waiting on a UI. Good news, no new schema for
  this part.
- **Flag**: `events` already has both `photographer_id` (uuid, no enforced FK constraint
  in the DB — worth confirming at build time what it's actually meant to point at) and a
  free-text `photographer` column, and separately `performers`/`casting_applications` each
  have their *own* free-text `photographer` field too. These are two genuinely different
  concepts — "who's staffed to shoot this event" (event-level, assignable from the roster,
  what this tab is for) vs. "photo credit for this specific promo image" (per-performer,
  could be anyone, doesn't need to be on staff) — worth confirming that distinction
  explicitly before merging them into one mechanism.
  **The per-performer half is now confirmed, not just suspected (2026-08-25)**: found and
  fixed a real bug where `confirm_and_migrate_artist` was overwriting a *returning*
  performer's `photographer` credit with whoever shot their *new* application's photo,
  while leaving `promo_image_id` (the still-displayed old photo) untouched — a genuine
  photo-credit mismatch risk, confirmed via `PerformerDetail.tsx` rendering `photographer`
  directly under `promo_image_id` as that specific image's credit line. Fixed by leaving a
  returning performer's row untouched entirely at confirm time. Doesn't resolve the
  event-level `photographer_id`/`photographer` question above, but confirms the
  per-performer field is exactly "credit for this specific image," not a general fact
  about the artist.
- Needs to stay in sync with wherever venue/photographer already get set on an event
  (`EventEditor.tsx`'s dropdowns) — one source of truth, not two competing UIs writing the
  same relationship.
- **Paid vs. volunteer roles — addressed 2026-08-25, no table split needed.** Real concern
  raised: photographer/technician/doorman get paid for their work via the join form,
  which is a genuinely different relationship than a general volunteer helping out — but
  they all submit through the same `staff_volunteers` table/form today. Decided: keep one
  table, don't split it. The existing `fee` column (already built, already shown per row
  in this tab) already carries the signal — paid roles have a value, general volunteers
  are `null` — and the tab's existing role-grouped layout already visually separates
  photographer/technician/doorman from volunteer/artistic/musician/entertainment/other
  without any extra work. **One nuance to know about, not to fix now**: `fee` here reads
  as that person's standing/default rate, not a per-event negotiated amount — the same
  "estimate vs. actual" shape already flagged for artist travel costs in
  `extra-features.md`. Only worth revisiting if a specific event ever needs to pay someone
  a different amount than their usual rate and that needs to be tracked.

## Event Planning tab (the big one)

### Artist list + promo downloads
Depends on the `promo_text_sv`/`promo_text_eng` split (part of the "returning artists'
promo content" design) — moved to `docs/extra-features.md` (2026-08-25) along with this
exact dependency note, since the split itself isn't built yet and isn't time-pressured
(current season is already fully cast). Check that doc before starting this piece —
without the split, there's nothing proper to download in both languages.

### Reveal mechanism — mostly already exists
Checked the actual schema/code rather than assume:
- **Correction**: `performers` has no `is_visible` column — the real equivalent is
  `is_approved` (boolean), which `confirm_and_migrate_artist` already sets to `FALSE` for
  every newly-migrated performer, and which already gates the `public_performers` view.
  Exactly matches the flow you described, just a different name.
- `event_performers.is_revealed` already exists **and is already wired up** —
  `EventLineup.tsx` already filters/hides un-revealed performers on the public event page
  (shows a "Hidden" badge to logged-in viewers, hides the card entirely otherwise). So the
  toggle mechanism itself doesn't need to be built, just a real admin-facing button for it
  plus tying it to `is_approved` for first-time performers.
- **Correction to what this doc said earlier**: I'd written that `events.reveal_date` had
  "zero automation anywhere" — that was wrong, or at least incomplete. It was based on
  grepping the app repo only; the actual automation lives entirely in the database, which a
  code search can't see. Checked directly (2026-08-19) and there's a real mechanism to
  mirror:
  - **`public.event_status_handler()`** — one `SECURITY DEFINER` Postgres function that
    runs the entire event lifecycle in a single sweep: `draft → published` once
    `reveal_date` has passed, auto-closes `has_casting_call` once `casting_call_deadline`
    has passed, and `published → archived` once `event_end` has passed.
  - It's invoked once a day via **`pg_cron`** (job `archive-finished-events-daily`,
    schedule `0 5 * * *` — 05:00 UTC), not from any app code or edge function.
  - This is exactly the pattern to reuse for artist reveal, per your ask: add
    `event_performers.reveal_date` (date, nullable), and add a 4th block to the *same*
    `event_status_handler()` function (one lifecycle sweep, one cron job, not a second
    parallel one) —
    ```sql
    -- 4. Reveal performers whose scheduled reveal date has arrived
    UPDATE public.event_performers
    SET is_revealed = true
    WHERE is_revealed = false
      AND reveal_date IS NOT NULL
      AND reveal_date <= now()::date;
    ```
  - **Also folds in your `staff_volunteers.worked_with` ask** (confirmed that column
    exists, `boolean default false`, and nothing sets it today) — same sweep, triggered at
    the moment an event transitions to `archived`. Needs to scope to *only the events that
    just archived in this run* (not rescan every already-archived event forever), so it's
    a small rewrite of block 3 rather than a bolt-on block 5:
    ```sql
    -- 3. Published → Archived (event date has passed) + mark staff/volunteers as "worked with"
    WITH newly_archived AS (
      UPDATE public.events
      SET status = 'archived', updated_at = now()
      WHERE status = 'published'
        AND event_end IS NOT NULL
        AND event_end < now()::date
      RETURNING id
    )
    UPDATE public.staff_volunteers sv
    SET worked_with = true
    WHERE sv.worked_with = false
      AND sv.id IN (
        SELECT esv.staff_id FROM public.event_staff_volunteers esv
        WHERE esv.event_id IN (SELECT id FROM newly_archived)
      );
    ```
  - (Performers don't need an equivalent flag — their accumulating `performer_acts` rows
    already *are* the "we've worked with them" record, one per event they've performed at.)

### Per-artist logistics notes (travel/accommodation/allergies) — designed 2026-08-25, not built

Surfaced by a real case: two performers carpooling to a show, only one needing a travel
reimbursement — and no field anywhere to record that they're traveling together. Also
resolves a gap `multi-act-casting-plan.md` already flagged ("Related, flagged but not
designed yet: accommodation_notes visibility") — `casting_applications.accommodation_notes`
(the artist's own free text, collected on the public form when travel/accommodation is
needed — its actual copy already asks broadly about allergies, travel, and accommodation
logistics, not just "where will you sleep") currently reaches the admin's casting review
but never the artist-facing `BookedArtistForm`, and has nowhere to live once an artist is
actually confirmed and the board needs to track operational details across the whole
lineup, not just one application at a time.

**Design**:
- **One general `event_performers.logistics_notes` (text, admin-editable)** rather than
  several narrow columns for travel/allergies/etc. separately — these genuinely overlap in
  practice (a note about carpooling is also a travel note; an allergy note affects both
  catering and, indirectly, accommodation), and the *existing* `accommodation_notes` field
  was already conceived this broadly per its own on-form copy. One flexible field the
  admin maintains beats three half-empty ones.
- **Pre-filled from `casting_applications.accommodation_notes` at confirm time**, same
  copy-on-confirm pattern already used for `final_fee`/`travel_covered`/`lineup_role` in
  `confirm_and_migrate_artist` — extend that function to copy this too. The admin then
  edits *that copy* going forward; the original application's `accommodation_notes` stays
  untouched as a frozen record of what the artist originally said (same "frozen record"
  principle used throughout `multi-act-casting-plan.md` for `casting_application_acts`).
- **Keep the existing `event_performers.accommodation` column** (already exists in the
  schema, confirmed completely unused anywhere in the app today) for a short, structured
  answer to "where is this person actually sleeping" — a scannable per-artist list, kept
  separate from the free-form `logistics_notes` blob so it stays usable as an actual list
  rather than something you have to read every note to extract.
- **Belongs on the Event Planning tab**, not the Casting review flow — this is ongoing
  "running the show" operational info (who's traveling with whom, who's sleeping where,
  allergies for catering), not a casting decision. Once Event Planning has a real artist
  overview (see "Artist list + promo downloads" above), these fields are natural additions
  to that same per-artist row/detail view.

### Staffing, VIP list & sponsor roles — redesigned 2026-08-29 from real historical data

Superseding the 2026-08-19 draft below (kept as changelog, not current design). This time
grounded in the org's actual old-work-documents (two real VIP lists — Dark Carnival,
Desserted Island — plus a general org task/timeline sheet), not assumption. Read those
sheets directly rather than going on description alone; the real category usage differs
from what a first pass would've guessed.

**`staff_volunteer_type` simplifies from the current 8 values**
(`photographer | technician | doorman | artistic | volunteer | musician | entertainment |
other`) **to:**
`photographer | technician | dj | stage_kitten | entertainment | volunteer | doorman | other`

**Decided 2026-08-29:**
- `entertainment` absorbs `musician` — confirmed both events used "entertainment between/
  before acts" as one broad bucket in practice (live music, a tarot reader, three people
  dressed as mermaids flirting at the bar for a pirate-themed show, a fire artist outside —
  genuinely anything outside the main show), not two separate categories.
- `dj` and `stage_kitten` get promoted to real top-level values — both appeared as
  distinct, always-filled roles in every real event, same standing as photographer/
  technician, not generic volunteers.
- `doorman` — **kept exactly as-is, DB value unchanged, no migration**. Display label
  becomes "Entrévärd" / "Entrance host" — an unpaid, optional role for now (venue-dependent
  whether TTV even needs one; the current venue requires paying *their* own guard
  directly instead). Deliberately *not* renamed at the DB level: the org may need a real
  paid security-guard role again in the future, and keeping the `doorman` value free for
  that keeps the door open (so to speak) rather than needing a second migration later to
  walk back an `entrance_host` rename.
- `artistic` — **removed entirely**, confirmed no live contact uses it.
- **Not a staff category at all**: "Försäljare" (seller) — appeared in both VIP lists,
  turns out to be **sponsors** running their own merch table at the event, not a
  volunteer/staff role. Belongs under the sponsor event-role redesign below instead.

**New: a shift/task classification, meaningful only for `role = 'volunteer'`**, letting one
person hold several at once (see the PK fix below):
`setup | door_guestlist | takedown | driving`

("Entrance host" is its own top-level role above, not a volunteer shift, since it's a
different kind of commitment.) Real numbers from the sheets: door/guestlist is the biggest
draw — 2 people staffed at all times, working ~2-hour rotating shifts across the room's
19:00–02:00 run (no door coverage needed the final hour), which is why 5–6 people show up
under this category per event. `setup` and `takedown` are the next most common; `driving`
(hauling decorations in a volunteer's own car, no org vehicle) showed up once but was
explicitly called out as genuinely useful to have a name for.

**Notes per assignment**: no new field needed — `role_details` (free text, already on both
`staff_volunteers` and `event_staff_volunteers`) already covers "which door shift" or any
other admin note per assignment. This was already identified in the 2026-08-19 pass below
and still holds.

**The schema blocker is unchanged from the 2026-08-19 finding** (see below) — still needs
fixing before multi-role assignment is possible: `event_staff_volunteers`'s composite PK
`(event_id, staff_id)` → surrogate `id` + `UNIQUE(event_id, staff_id, role, role_details)`.

**Sponsors — split into two dimensions**, mirroring the same "who they are" vs. "what
they're doing at this specific event" split now applied to volunteers:
- *What they are* (fewer, simpler options than today's `sponsor_type`, set once at
  application/contact time): business / club-or-organisation / individual.
- *Their role(s) at a specific event* (multi-select per event, same mechanism as staff
  roles once the PK fix lands): prize donor, merch/sales table (this is where "Försäljare"
  actually belongs), promo, partner, other.

**Contacts page**: the "Confirm" action in `AddToEventPopover.tsx` (staff and sponsor
versions) gains a role dropdown — for staff, plus a shift sub-picker when `volunteer` is
chosen — with an "add another role" affordance, rather than confirming with just whatever
`role` the contact happened to be filed under.

**VIP list (Event Planning)**: auto-derived from confirmed staff/volunteers + their plus-
ones + confirmed artists + artists' plus-ones + the 4 standing organizers, grouped into
the same sections the real sheets already use (Arrangörer → Artister → Arbetare/Volontärer
→ Artists' +1 / Staff's +1 — both get their own plus-one section, confirmed from the real
sheets), plus manual entries (ticket winners, contest winners) that don't come from any
other table. Needs a download button. Detailed design (schema, manual-entry table, event
scoping) still to be worked out — noted here as the next concrete build after roles.

**Event Planning restructure**: the current bare "Artistlogistik" list
(`AdminEventPlan.tsx`) gets folded into a proper tabbed page mirroring `AdminContacts.tsx`'s
shape (Staff/Volunteers, Sponsors, VIP list as tabs, all event-scoped instead of the global
roster Contacts shows) — more Event Planning content will land here over time, but staffing
+ VIP list is the starting scope.

### Food/dietary redesign — brainstormed 2026-08-29, not built

Prompted by realizing catering is always ordered in bulk (2–3 alternatives, e.g. pizza
varieties) — a free-text `dietary_requirements` field per artist doesn't actually match how
food gets ordered; what's needed is a headcount by category plus a short list of anything
that needs individual attention.

- **`event_performers.dietary_requirements` (free text) splits into two fields**: a
  `dietary_category` enum (`all_eater | vegetarian | vegan`, one choice) for the bulk-order
  headcount, plus a kept free-text field (same column, repurposed) for anything more
  specific — allergies, etc. — that the board needs to actually read, not just count.
  `BookedArtistForm.tsx`'s current free-text dietary input becomes a 3-way select/checkbox
  plus a "anything else? (allergies etc.)" text field underneath.
- **Same two fields extended to `event_staff_volunteers`** (doesn't have any dietary field
  today) — the VIP list / staffing tabs get a "needs food" toggle + the same category
  picker per worker, for whoever's actually going to be there at a mealtime (setup
  volunteers arriving before doors, for instance) rather than assuming only artists eat.
- **A computed summary, not a stored one**: Event Planning's practical-info area gets a
  plain generated line — "Mat: 5 allätare, 3 vegetarianer, 2 veganer + en jordnötsallergi"
  — built by counting `dietary_category` across confirmed artists + whichever staff/
  volunteers were flagged as needing food, with any non-empty free-text notes appended.
  Nothing new to store here; it's a read-time aggregation over the fields above.
- Rows on the new staffing/VIP tabs shouldn't show dietary info inline per the artist-card
  precedent already set on the Marketing tab (logistics info lives on Event Planning, not
  cluttering the row) — the aggregate summary is the point, not a per-row column.

<details>
<summary>2026-08-19 draft (superseded above, kept for the schema-blocker research trail)</summary>

Talked this through in more detail (2026-08-19) — resolves the open question from the
first draft of this doc, which assumed a formal "N required per role" system. That's not
actually what's needed:

- **No fixed requirement system** — historically it's been "take anyone who wants to
  help," and that's staying true for volunteer-type tasks: no minimum/target count, just
  an open list you populate with whoever's helping and what they're doing.
- **The only fixed expectations are 3 roles that usually need exactly one person**:
  photographer, technician, and guard (guard = the existing `doorman` enum value — worth
  using that exact term when building, not adding a redundant `guard` value). These don't
  need a stored "requirement" row at all — just a client-side nudge computed on the fly
  ("Photographer: ✓ assigned" / "⚠ not yet assigned" by checking whether any
  `event_staff_volunteers` row for this event has that role). No new schema for this part.
- **The real gap is elsewhere**: volunteers need to be split into specific tasks (setup,
  take-down, checking guests at the entrance, "stage kittens"/show helpers, etc.), and the
  same person needs to be assignable to more than one task. Checked the actual schema for
  this (2026-08-19) and found:
  - Good news: `role_details` (free text) **already exists** on both `staff_volunteers`
    and `event_staff_volunteers` — that's exactly the field to hold a specific task label
    like "Setup" or "Stage kitten," no new column needed. Role stays `volunteer`
    (or whichever of the 8 existing enum values fits), `role_details` carries the specifics.
  - Real blocker found: `event_staff_volunteers`'s primary key is the **composite**
    `(event_id, staff_id)` — meaning the database physically cannot let the same person
    be assigned twice to the same event today, regardless of what UI gets built on top.
    This needs an actual schema fix before "assign the same person to several positions"
    is possible: drop the composite PK, replace with a surrogate `id uuid primary key`.
    Worth pairing with a softer `UNIQUE(event_id, staff_id, role, role_details)` constraint
    so accidental duplicate-add-the-same-task-twice is still caught, while genuinely
    different tasks for the same person aren't.

</details>

### Volunteer outreach & response deadline — brainstormed 2026-08-25, not built

Surfaced by a real case: someone who submitted the general Join Us volunteer application
asked when they'd hear back about "their" event — revealing that applicants don't realize
`staff_volunteers` is a standing pool ("apply once, we keep you on file"), not a
per-event application with a yes/no answer coming. Deliberately **not** something to build
now — this depends on Event Planning existing first, since the whole point is reaching out
about *a specific event*. Brainstormed here so the shape isn't lost before then.

**Quick, cheap mitigation available right now, separate from everything below** — copy
drafted 2026-08-25, not yet applied. The actual root cause is that neither the public Join
Us form nor its confirmation email ever says "this is a standing application to our
volunteer pool, not tied to one show." Both are one-line-ish changes, independent of
whether the fuller system below ever gets built:

- **`src/pages/JoinUs.tsx` / `JoinUsForm.tsx`**: the marketing copy above the form (`Vad
  roligt att du vill joina vårt kollektiv` etc.) is fine as-is and doesn't need touching —
  the gap is that nothing sits right above the form fields themselves, which is what
  people actually read closely before submitting. Add a short note there:
  - SV: *"En sak att veta innan du skickar in: den här ansökan sparas i vårt kollektiv och
    är inte kopplad till ett specifikt event. Vi hör av oss så fort vi har en plats som
    passar dig — det kan ta ett tag, men vi glömmer dig inte!"*
  - EN: *"One thing to know before you apply: this application joins our general
    collective and isn't tied to one specific event. We'll reach out as soon as we have a
    spot that fits — it might take a little while, but we won't forget you!"*
- **`netlify/edge-functions/application-confirmation.ts`**, `case 'staff'` branch: already
  closer to correct than the form ("we'll let you know next time we're in need of your
  special talents") but not explicit enough. Strengthen the second paragraph:
  - SV: *"Din ansökan sparas i vårt kollektiv av volontärer och personal — den är inte
    knuten till ett specifikt event. Vi hör av oss med en konkret fråga så fort vi
    planerar ett event som passar din roll, vilket kan ta allt från några veckor till
    några månader."*
  - EN: *"Your application joins our general pool of volunteers and staff — it isn't tied
    to one specific event. We'll reach out with a concrete ask as soon as we're planning a
    show that fits your role, which could take anywhere from a few weeks to a few
    months."*

**The system itself**: mirrors the shape the casting flow already proved out, rather than
inventing something new. Casting's problem was identical in kind — a pool of people whose
relationship to *one specific event* needs tracking (invited → responded →
confirmed/declined) separately from their standing profile — and it solved it by keeping
`casting_applications` as the per-event negotiation record, only creating an
`event_performers` row once actually confirmed. Staffing has no per-event record at all
today, which is exactly the gap:

- **New per-event invitation record** (name/shape not decided —
  `event_staff_invitations` or similar), roughly: `event_id`, `staff_id`, `status`
  (`interested | invited | confirmed | declined | not_needed`), `invited_at`,
  `responded_at`, `response_deadline`. `event_staff_volunteers` keeps meaning exactly what
  it already means — the people actually working this event — and only gets a row once an
  invitation reaches `confirmed`. Simpler than casting's equivalent step: no "migration"
  of profile data is needed (`staff_volunteers` already holds the full profile, unlike
  `performers`, which doesn't exist until an artist is confirmed), so this is just a
  status update plus one row insert, not an RPC doing several things atomically.
  `interested` is the person-initiated twin of admin-initiated `invited` (see the
  Join-Us checkbox below) — both converge on the same admin review step from there, so no
  separate handling is needed downstream for "who asked first."
- **Event Planning gets a "who wants to work this event" view once it exists** — a plain
  list reading `event_staff_invitations` filtered by `event_id`, showing everyone at
  `interested`/`invited` for that event regardless of how they got there (self-checkbox,
  emailed in and marked by hand via the Contacts button above, or admin-initiated invite).
  Not built now — same "depends on Event Planning existing" reasoning as the rest of this
  subsection — but worth noting this list comes essentially for free once the schema below
  exists, since it's just a filtered read, not new tracking.
- **New applicants: an "I'm also interested in [Event]" checkbox on the Join Us form —
  brainstormed 2026-08-25, not built.** Only shows when there's something to opt into:
  needs a new `events.staff_recruitment_open` boolean (admin toggle, mirrors
  `has_casting_call`'s shape) gating whether `JoinUsForm.tsx` fetches and displays the
  currently-recruiting event's name/date next to the checkbox. On submit, checking it adds
  one more insert alongside the existing `staff_volunteers` insert — a row in the
  invitation table above with `status: 'interested'`. No RPC needed (unlike casting's
  multi-act submit), just two sequential client-side inserts, same as how this form
  already works today.
- **Existing pool members expressing interest in a new event — decided 2026-08-25:
  reply-by-email, not a self-service lookup page.** Seriously considered a public "enter
  your email, see if you're in our database, register interest" page, and rejected it:
  a public lookup-by-email surface either leaks who's in the database or needs real auth
  to do safely, and — more importantly — it cuts against the scale worry below rather than
  helping it. Zero-friction self-service invites *more* inbound interest, not less. Since
  every email this system sends already carries `reply_to: 'velvet.gbg@gmail.com'`
  (`send-casting-email.ts`'s pattern, reused for Contacts), the answer is simpler: existing
  members just reply to whatever email they last got, or email in directly, and the admin
  marks interest by hand via the Contacts page that already exists. Keeps every inbound
  expression of interest funneled through one human-reviewed channel instead of a form
  anyone can quietly submit to at any volume.
- **Scale worry — staged/waved invites, not one flat blast.** Real concern raised: at ~15
  volunteers today this is manageable, but a single "email everyone in the pool" blast
  stops scaling once the pool grows — too many replies at once becomes its own
  coordination problem. Mitigation: invite in waves rather than all at once — round one
  goes only to people already at `interested` for this event (via the checkbox above, or
  who emailed in) plus anyone with `worked_with = true` (the proven-reliable pool);
  only widen to a full general-pool blast (the "Two email sends" bullet below) if that
  round isn't enough. Caps the first round's size by construction instead of hoping the
  right number of people happen to reply to one big ask.
- **Two email sends, both reusing the bulk-mail pattern already built** (`AdminCasting.tsx`'s
  "email all booked artists" modal, `ContactMailModal.tsx` on the Contacts page) — no new
  send mechanism needed, just a new trigger context:
  1. Initial invite to the eligible pool for this event (staged per the bullet above;
     filtered by role — likely just the general volunteer-type roles, not the three paid
     ones, though worth deciding at build time whether paid roles want the same "are you
     available this time" framing with a fee attached, closer to how casting already
     negotiates).
  2. A manually-triggered "not needed this time, we'll keep you on file for next event"
     batch send to whoever's still sitting at `invited` once the admin judges they have
     enough confirmed — **a deliberate admin action, not an automatic threshold**. This
     matches, not contradicts, what the Staffing section above already decided ("no fixed
     requirement system, take anyone who wants to help") — it just adds a deliberate
     cutoff moment once the admin decides they have enough, rather than a stored target
     count anywhere. **Include an opt-out line** ("reply if you'd rather we remove you from
     our list") — cheap at current volume, handled manually via the delete button Contacts
     already has; no token-based self-service unsubscribe link needed yet.
- **The "stricter frame" ask — a real response deadline**, so people stop assuming they
  can show up and volunteer for free entry without ever having confirmed. `response_deadline`
  on the invitation record (likely computed relative to the event date, e.g. "N days
  before" — user suggested defaulting to roughly a month out, seems reasonable as a
  starting default, admin-overridable per event) is the natural home for this, and ties
  directly into the Dashboard's already-planned calendar/important-dates section
  (`## Dashboard tab` below) — a due-date warning for "volunteer responses close in 3
  days" is exactly the kind of thing that section exists for, rather than a separate
  reminder mechanism.
- **"No more volunteers needed" social post** — doesn't need anything built. It's a manual
  post whenever slots fill, same bucket as the social-media-tracking idea already parked
  in `extra-features.md`; can happen with or without that page existing.
- **Admin-facing status/"no more needed" control belongs on Event Planning, not
  EventEditor** — corrected 2026-08-26. First pass put the recruitment status line + the
  one-way cutoff button on `EventEditor.tsx` (alongside casting call, in the same "event
  details" panel). Moved out per feedback: this is ongoing "running the show" operational
  status, not a one-time event-detail field — same category of thing as the per-artist
  logistics notes and staffing overview above, which already belong on Event Planning
  rather than the editor. Removed from `EventEditor.tsx` entirely (the `events.
  staff_recruitment_open` column and its save-payload line stay untouched — only the UI
  moved, not the data); the status line + button design itself (plain "Open"/"Closed" text
  plus a button shown only while open) is unchanged, just waiting for a home once Event
  Planning exists, same as everything else in this subsection.
- **Open question, not decided**: does the "since the new website went live" backlog (
  people who already applied under the old, unclear framing) get a one-time invite blast
  once this system exists, or does it only apply going forward from whenever it's built?
  Leaning toward: yes, a one-time backlog invite makes sense precisely because those
  people are the ones currently confused — but worth deciding with the actual backlog size
  in view, not guessing now.

### Show ordering, prep/cleanup/music/notes per act — mostly already covered
Good news here too: `performer_acts` already collects `stage_preparations`,
`pick_up_cleaning`, `act_notes`, and `audio_files` — all via the artist's own
`BookedArtistForm`, already part of the multi-act plan. This piece of Event Planning is
mostly a new **admin-facing read/reorder UI** on data that's already being collected, not
new schema.

**Correction (2026-08-21)**: this used to say `event_performers.display_order` already
covers ordering — that's true for *performer*-level lineup order, but not for the actual
show running order once one performer can have multiple acts (acts from different
performers typically interleave, they don't group by performer). `performer_acts` gained
its own `display_order` instead (added alongside `multi-act-casting-plan.md`'s Phase 1,
see that doc for the reasoning) — that's the column this admin view should actually read
and let the board rearrange, not `event_performers.display_order`.

### Full evening schedule / setlist
The most open-ended piece — doors time, intermission, host segments, sponsor shoutouts,
and the acts themselves interleaved into one running order. Nothing in the current schema
fits this shape (it's not just "acts in order," it's a mixed timeline of acts and
non-act items). Needs its own dedicated design pass once we're actually there — not
forcing a table shape from this description alone. Likely candidate shape to consider
later: a single ordered `event_schedule_items` table mixing act references and freeform
entries, but that's a placeholder thought, not a decision.

## Marketing tab — built 2026-08-27/28, v2 2026-08-30, v3 2026-08-31

A real, separate admin page (`/admin/marketing`, `AdminMarketing.tsx`), split off from
Event Planning — the artist promo section that originally lived on Event Planning moved
here, since it's social-media-posting work, not event-logistics work.

**What exists today**:
- **A 21-item posting schedule** (`src/lib/marketingSchedule.ts`, `POST_SCHEDULE`), covering
  the org's actual posting calendar end to end: Save the Date, Facebook event, casting call
  open/close, ticket countdown/release, Pinterest board, volunteers-needed, artist-reveal
  teasers, "all together," sponsors/contest/photo-corner, venue rules, evening schedule,
  one-week-left, share/invite, day-of, thank-you, evaluation. Each row's suggested date is
  *computed* from `events.event_start` (calendar-aware month/week/day offsets,
  `computeSuggestedDate`) — not stored — because the schedule itself is the org's evolving
  convention, edited in code, while only *is_posted* per event needs a database row.
- **`marketing_posts` table** — deliberately minimal: `event_id`, `post_type` (a plain
  Postgres enum extended to all 21 values, `event_id` nullable for future non-event posts),
  `is_posted`, `posted_at`. That's the entire persisted state; everything else (labels,
  dates, templates) is code. `custom` is a reserved-but-unbuilt post type for one-off posts
  later (schema already supports it, no creation UI yet).
- **10 of the 21 post types have real content templates** (`src/components/admin/marketing/`
  — `SaveTheDateCard`, `FacebookEventCard`, `CastingCallOpenCard`, `CastingCallClosedCard`,
  `TicketCountdownCard`, `TicketReleaseCard`, `VolunteersNeededCard`, `PinterestBoardCard`,
  `ArtistsAllTogetherCard`, `ArtistsSoonCard` — each now just exports a plain
  `buildXText(event)` function, not a component; see "v3" below for why), built from the
  org's *actual* previously-published posts (not invented wording) — `events.
  description_sv/eng` doubles as the Facebook-event post's body (confirmed an exact wording
  match against a real post), `events.image_id` / `events.pinterest_link` / `events.
  hashtags` / `events.ticket_url` feed the rest. The remaining 11 types are plain rows with
  no generated starting text (still fully editable — see "v3") — intentionally not guessed
  at without real source text to match.
- **Four Unicode "font" converters** in `src/lib/utils.ts` (`toBoldSerif`, `toDoubleStruck`,
  `toSmallCaps`, `toFraktur`) reproduce the org's actual social-post styling conventions —
  each was verified character-by-character against real pasted post text before being
  trusted (this caught two real bugs: `toFraktur`'s offset math, and that plain NFD
  normalization is needed so Swedish å/ä/ö bold correctly — decompose to base letter +
  combining diaeresis, bold the base, leave the diaeresis untouched).
- **Artist reveal tracking is deliberately not duplicated here** — `event_performers.
  is_revealed`/`reveal_date` (built on the Marketing/Artists section itself) is the one
  source of truth for "has this artist's reveal post happened," on the reasoning that the
  site reveal *is* the social post, per how the user framed it originally.
- Artist cards on this tab sort by `reveal_date` when set (lets the board directly control
  reveal order by choosing dates), falling back to Host → Headliner → everyone else as the
  default for anyone without a date yet.

**v2, 2026-08-30** — grounded in the org's real `docs/old-work-documents/Social Media &
Emails/` history across 4 past events (not just the single Pandaemonium example used for
v1), which showed real posting practice is looser than a fixed 21-item schedule alone
implies — one-off posts (a ticket-delay explanation, a post-event recap) show up
regularly. Changes:
- **Page width matches the rest of the admin portal** (`max-w-5xl`, was `max-w-3xl`).
- **`EventAssetPanel.tsx`** — one shared block per event instead of repeating the event
  image on every templated row: event image download, "download all performer images" (see
  "v3" below for how this actually ended up working), hashtags (now edited here instead —
  **removed from `EventEditor.tsx` entirely**, redundant once Marketing had its own
  generate/copy/save), and a "copy artist profile links" action.
- **Custom posts** — `marketing_posts` gained `content` (text) and `post_date` (date),
  used only by `post_type = 'custom'` rows (the 21 scheduled types are unchanged, still
  computed/coded, no stored content). A "+" button opens a form pre-filled with the
  sv/eng-flag + hashtags/ticket-link shell every other post uses, fully editable from
  there — one-off, per-event, with normal edit/delete, not a reusable template.
- **Frontend-editable templates and a "recurring" flag were explicitly cut, not
  deferred-in-place** — real design work happened first (see the conversation this
  decision came from), landed as two entries in `docs/extra-features.md` instead of left
  half-referenced here: the full token-based template rewrite that real template-editing
  would need, and a smaller "import a past event's custom post into this one" idea as a
  lighter alternative to "recurring."

**v3, 2026-08-31** — two fixes from live use:
- **Standard-post rows are now expand-to-edit-and-save**, the same shape custom posts
  already had. `marketing_posts.content` (previously custom-only) now also holds the
  saved/edited text for the 21 fixed types — clicking a row shows the live template output
  (or the last saved edit, if one exists), fully editable, with Save (writes `content` via
  the new `saveMarketingPostContent`) and, for the 9 templated types, "Reset to template"
  (regenerates from current event data, discarding the saved edit). This is what forced the
  8 template components to become plain `buildXText(event)` functions instead of
  components — the row itself needed to call the generator directly to seed/reset the
  textarea, not just render a fixed cluster of buttons. The old shared
  `PostTemplateCard.tsx`/`PostActionCluster` (image thumbnail + download/copy buttons) is
  gone — no longer used once every row's UI moved into `StandardPostRow.tsx`.
- **"Download all performer images" actually downloads all of them now.** The v2
  implementation (staggered `window.open` calls) turned out to only ever deliver one image
  in practice. Two follow-up attempts before landing on the real fix, kept here since the
  failure mode isn't obvious from the code alone: a bare anchor click straight to the
  Cloudinary URL (no `window.open`) still only produced one file, because firing several
  same-frame navigations back-to-back cancels all but the last one to start; saving each
  image separately via a `blob:` URL improved things but was still non-deterministic (9
  images in, sometimes only 4 or 6 came through) — Chrome throttles multiple *automatic*
  downloads fired without a fresh user gesture per file, blob URLs included. The actual fix:
  fetch every image as a blob, bundle them with `jszip` (new dependency) into one zip, and
  trigger a single download — one download is never subject to that throttle. Verified with
  a real 9-artist event: all 9 files landed in the zip, byte-for-byte.
- Also fixed: the artist list's default reveal-order fallback was Headliner → Host →
  everyone else; swapped to Host → Headliner → everyone else per the board's actual
  preference (only matters for artists without a `reveal_date` set).
- **Standard-post dates are now manually adjustable**, not just computed. Reuses
  `marketing_posts.post_date` (previously custom-only, same column custom posts already
  had) — each row shows an actual `<input type="date">` instead of static text, seeded from
  the saved override if one exists, else the `POST_SCHEDULE`-computed date
  (`toLocalIsoDate`, new helper in `marketingSchedule.ts` — deliberately local-time, not
  `toISOString().slice(0, 10)`, which can land on the wrong day near midnight depending on
  the browser's timezone). Saves immediately on change via `setMarketingPostDate`, and
  clearing the input (the browser's native date-input "×") drops the override and falls
  back to the computed date again — mirrors how the artist reveal-date field already works,
  rather than requiring the row to be expanded first like content edits do.

- **The row date picker was rendering at ~998px instead of its intended ~124px width**,
  crowding the copy button and checkbox off the visible row entirely (both were still
  there, just clipped by the card's `overflow-hidden`), and squeezing the label into a
  cramped multi-line wrap. Root cause: `index.css`'s global `input[type='date'] { width:
  100% }` rule (needed for full-width fields elsewhere) beat the row's `w-[124px]` utility
  class — same specificity tie the identical pattern in `ArtistOverviewCard.tsx` happens to
  avoid only because of a nested-flex-container quirk there, so it wasn't an obvious
  regression to spot from the code alone. Fixed with an inline `style={{ width }}` (inline
  styles always win over an external stylesheet, specificity aside), plus `min-w-0
  truncate` on the label so a long title stays on one line instead of wrapping. Widened
  again shortly after (124px → 150px) once the day was still getting clipped at 124.
- **`ArtistsSoonCard.tsx`** — the "reveals starting soon" teaser now has a real template
  too (matches a real published post exactly), the last of the schedule's templatable posts
  to get one. Adds `#PerformerReveal` as this post type's own reusable hashtag on top of
  `events.hashtags`; anything event-specific and non-reusable (the real post also had
  `#Halloween`, since that particular show was Halloween-themed) is left for the board to
  add by hand after generating, via the row's edit/save.

**Known small gaps, not yet acted on**: unrelated (non-event) posts (`event_id` nullable
already supports it, no UI); richer templates for the 11 checklist-only post types if real
source text ever gets supplied for them.

## Budget / Economy tab

Added 2026-08-25, per direct request — flagged as an important feature to work on soon,
not just a "later" placeholder anymore (previously only noted as a deferred stub under the
Casting tab, above).

Two related but distinct pieces, per the user's description:

- **Org-wide Economy/Budget tab** — total organization funds, all expenses (not just
  casting fees, which is currently the only cost visible anywhere, as the Casting tab's
  preliminary yes-section total per `multi-act-casting-plan.md` Phase 5). Should let the
  board compare ticket sales and revenue **against past events**, not just look at the
  current one in isolation — a comparative/historical view, not just a live tally.
- **Event-specific budget section** — tracking a single event's own budget (income vs.
  costs for that show specifically). **Open question, not decided**: whether this lives
  directly on the Event Planning tab, or deserves its own space. Event Planning already
  covers a lot (artist list, reveal mechanism, per-artist logistics notes, staffing, show
  ordering, the full schedule) — a budget section might be one thing too many bolted onto
  that page. Needs a look once Event Planning's own shape is clearer, rather than deciding
  now.

No schema or UI design done yet — this section exists to mark it as a near-term priority,
not to plan it.

## Dashboard tab (last, by design)

Correctly sequenced last — it's a pure rollup over data that only exists once the tabs
above are built.

**Scope, per the user (2026-08-25)** — richer than originally sketched here:

- General overview of incoming applications — not just casting, also volunteers/staff and
  sponsor submissions (once Contacts exists to feed it).
- To-do lists, both event-related and general/org-level (not tied to any one event).
- A calendar / important-dates section — meetings, plus the event lifecycle's own
  timing-sensitive moments (e.g. releasing tickets, starting artist promo a set window
  before the event date). This is squarely the project's stated guiding goal (see
  `CLAUDE.md`): surfacing a due-date warning instead of relying on someone remembering.
  Unlike the rest of this tab, this piece likely **does** need new schema (recurring
  meetings, per-event milestone dates/reminders) — correcting the original "no new schema
  of its own expected" note below, which predates this fuller scope.
- **Open question, not decided**: whether Dashboard needs its own event picker/scoping at
  all. Leaning no for now — most of what's described above (org-wide to-dos, the calendar,
  the cross-application overview) is inherently cross-event, not single-event. Revisit only
  if a specific dashboard widget turns out to need a "for the currently selected event"
  framing.

Otherwise as originally scoped: what's left to do, unfilled staffing positions, missing
booking-form info from artists, etc. — no new schema expected for that part specifically.
