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

### Clubs — built 2026-09-01

Sourced from `docs/old-work-documents/Kontakter.xlsx` — a real directory of other
Scandinavian burlesque clubs/organizers (potential collaboration partners) the org has
been informally tracking, plus a "Hantverkare" (craftspeople) list of individuals who
could sponsor with prizes. The two needed different homes: Hantverkare are just sponsors
(`sponsor_type: 'prize'`, no new schema — the existing "what they are" gap on `sponsors`
doesn't block this), but most clubs have never sponsored anything — forcing them into
`sponsors` would either lose the "just a directory" case or require fake/empty sponsor
rows for the common case.

**New `clubs` table** (`id, name, organizers, instagram_link, location, region, notes,
created_at`) — its own directory, RLS-restricted to `authenticated` (no public form ever
touches it, unlike `sponsors`). `sponsors` gained a nullable `club_id` FK: a club that
*does* sponsor an event (e.g. free tickets to their own show) gets a real sponsor row
linked back to it, so it shows up in both the collaborator directory and the sponsor list
without duplicating its info. Deliberately kept out of the public sponsor form (`SponsorForm.tsx`)
— exposing a club picker publicly would leak the org's own research; linking only happens
admin-side.

**Contacts tab**: new "Klubbar" tab (`ClubRow.tsx`, mirrors `VenueRow.tsx` — no email
field, since clubs has none), filterable by `region` (plain text, not an enum — only
"Sverige"/"Norden" exist today but the field doesn't need a migration to grow). A club
row shows a "Sponsrar oss" badge when a sponsor is linked to it. `SponsorRow.tsx` gained
a "Linked club" dropdown (only rendered when clubs exist) to create that link.

Real data loaded: 12 clubs (10 Swedish, 2 Nordic) and 10 Hantverkare-as-sponsors. A
second, separate section further down the same spreadsheet ("i Norden"/"Internationellt"/
"Fotografer") turned out to be potential artists/photographers to book, not clubs —
explicitly left alone, since that's a different concern (casting outreach, not
collaboration/sponsorship).

Also added while touching sponsors: `instagram_link`/`other_link` columns (same
formatting helpers as performers), on both the public sponsor form and the admin sponsor
card — the public form had no way to leave a social link at all before this.

**Follow-up same day**: `clubs` also gained its own `website` column (Instagram alone
wasn't enough) — and once the `club_id` link existed, it turned out the board had already
been using it: two sponsor rows ("Bouvardia Burlesque", "Fraulein Frauke Presents") were
already manually linked to their matching clubs via the new dropdown, with real
Instagram/website data on the sponsor side that the club rows didn't have yet. Backfilled
Frauke's club row from its linked sponsor (Bouvardia's was already copied over by hand).
Confirmed via direct Supabase MCP query rather than assumption — this is the kind of thing
that's easy to get wrong by guessing at what "connected" means without checking the actual
data first.

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

**Contacts page — built 2026-09-01.** `AddToEventPopover.tsx`'s "Confirm" action now
carries an optional `needsRoleSelection` config (only staff's `confirm` action sets it —
sponsors have no role concept, so `SponsorRow.tsx` is untouched): a role dropdown
defaulting to the contact's roster role, a shift-preset dropdown (setup/door_guestlist/
takedown/driving, per the design above — still free text into `role_details`, just
prefilled from a suggested list, not a new column) shown only when `volunteer` is picked,
and a "already confirmed as: X, Y" chip list with per-role remove buttons. Confirming
never auto-closes the popover — "Klar" does — so adding a second or third role for the
same event is just picking another role and confirming again, fulfilling the "add another
role" affordance.

This forced a real fix, not just new UI: `confirmStaffForEvent`/`removeStaffFromEvent`
(`contactsService.ts`) still assumed the *old* composite `(event_id, staff_id)` PK
(`.upsert(..., { onConflict: 'event_id,staff_id' })`), which the earlier staffing PK fix
had already removed — confirming would have hard-failed the moment someone tried it. Now
keyed on `(event_id, staff_id, role)`: confirming the same role again updates its details,
confirming a different role adds a second row instead of overwriting the first, and
removal is scoped to one specific role rather than deleting every role a person holds at
that event. New `getStaffRolesForEvent` powers the chip list. Verified live against a
real, pre-confirmed-clean contact (checked first via direct DB query, not assumed) —
two roles added independently, one removed without touching the other, full cleanup
confirmed via a fresh query afterward.

**One real incident during this build, worth recording**: an earlier verification pass
picked a contact row without checking its existing status first, and its cleanup step
deleted a genuine pre-existing confirmation (a photographer assignment, including
`events.photographer_id`/`photographer`) that had nothing to do with the test. Caught via
direct DB query, restored via SQL handed to the user (role_details couldn't be recovered
with certainty — the roster default was empty, used as the best available restore value).
Lesson applied immediately: every verification pass against real data now checks a
contact's current state first and confirms cleanup via a fresh query after, not just by
trusting what the UI shows.

**Event Planning restructure — fully built 2026-09-01.** `AdminEventPlan.tsx` now mirrors
`AdminContacts.tsx`'s tabbed shape, but event-scoped instead of the global roster: the
original bare artist list moved into its own "Artister" tab unchanged, plus three new
tabs.

**Staff/Volunteers & Sponsors tabs**: read confirmed assignments via two new joined
queries (`getEventStaffForAdmin`/`getEventSponsorsForAdmin` in `eventService.ts`) —
`EventStaffRow.tsx`/`EventSponsorRow.tsx` (new, `src/components/admin/event-plan/`) let
the board edit the logistics note and remove someone from *this* event; everything else
about the contact (name/role itself) is still only editable via Contacts, which stays the
one place assignments actually get created. Role/sponsor-type label switch statements
were duplicated in `AdminContacts.tsx` — extracted to `src/lib/contactLabels.ts` once a
second file needed them, rather than copy-pasting an 8-case switch again.

**VIP list tab**: real open questions got real answers before building, not guessed at:
- *Arrangörer* — the 4 standing organizers are a hardcoded constant (name + email pairs),
  confirmed against the org's own real VIP list sheets (`docs/old-work-documents/VIP lista
  *.xlsx`, re-parsed directly rather than trusting memory) — the same 4 people/emails on
  every historical sheet: Andrea Jensen, Krister Johansson, Eva Leygonie, Pontus Lindhé.
  ("Drea" in the raw sheet data is a nickname for Andrea, corrected per the user.)
- *Staff's own +1* — deliberately **not** built: the board's call was that staff/
  volunteers don't usually get a +1, and the rare exception goes through the manual-entry
  mechanism below instead of a schema addition.
- *Manual entries* — new `vip_manual_entries` table (`event_id, name, email, category
  (ticket_winner | contest_winner | other), note`) — email was added to the design
  specifically because a real guest list always needs one. `VipManualEntryRow.tsx` (new)
  is the CRUD UI, mirroring `ClubRow.tsx`'s pattern.
- *Download* — an actual downloadable `.txt` file (not clipboard copy), built client-side
  with a `Blob` + object URL, no new dependency. Sectioned to match the real historical
  sheets' structure exactly (Arrangörer → Artister → Arbetare & volontärer → Artisternas
  +1 → manual entries grouped by category).

Auto-derived sections (Artister, Arbetare & volontärer, Artisternas +1) reuse data already
loaded for the other three tabs — no extra queries needed. Verified end-to-end against
real event data via Supabase MCP (now connected — queried table/RLS state directly rather
than assuming a migration applied cleanly) and Playwright: all four sections render
correctly, a manual entry can be added/downloaded/deleted with the DB confirmed clean
after, and the downloaded file's content was read back and checked line-by-line against
what the real sections should contain. One real bug caught by that verification, not
shipped: the manual-entry create path initially left `event_id` out of the insert payload
entirely (correctly rejected by the table's `NOT NULL` constraint rather than writing bad
data) — fixed by explicitly setting it in `handleSaveVipEntry` rather than relying on the
draft object's fields alone.

**Follow-up same day — A4 printable door-checklist format, then consolidated to one
button.** First pass added a second button (print, opened a new tab) alongside the
original plain-text download. Per feedback, collapsed back to a single download
(`handleDownloadVipList`): the checkbox/A4 format is strictly better than plain text (both
printable *and* shareable as a file), so there's no reason to keep two. Downloads a real
`.html` file (not just opened in a tab) so it can be emailed/sent to someone, printed via
`@page { size: A4 }` CSS from whoever opens it (no PDF library needed), or reopened later.
The checkboxes are real `<input type="checkbox">` elements (custom-styled, not a plain
`<span>`) — genuinely clickable per-device, just not synced between devices (see below).
Prompted a related fix: `performers.email`/`staff_volunteers.email` were already being
fetched via the existing joins but never displayed anywhere on the VIP list (screen,
download, or print) — added everywhere, since a door checklist needs an email for every
person on it, not just the sections that already had one (artist +1s, manual entries).
Verified live: 24/24 entries render with both a checkbox and an email, and the downloaded
file's checkbox genuinely toggles when clicked (confirmed by actually opening the saved
file and clicking one, not just inspecting the markup).

**Explicitly asked about and deliberately not built in this round: a live, multi-device
shared checklist** (one link, several volunteers' phones, checking someone off updates
everywhere in real time). Real, meaningfully bigger feature than a file format — needs a
public token-gated route (same shape as the existing artist booking portal's
`?token=` pattern), a genuine "checked in at the door" state model separate from VIP-list
membership itself, and live sync across viewers (Supabase Realtime, or an Artifact with
shared-state capability). Recommendation given back to the user: worth doing as its own
deliberate feature later, not a quick add-on to this one — revisit if/when there's
appetite for it.

**Follow-up 2026-08-31 — on-screen breathing room + a real PDF download.** User confirmed
the single-download-file approach (above) is sufficient for their actual use (≤50 people,
printed or opened on one iPad at the door) — the live-sync idea stays parked. Two fixes:

- The downloaded `.html`'s `@page { size: A4; margin: 15mm }` rule only ever applied when
  *printing* — opened directly in a browser (the iPad-at-the-door case), the content ran
  edge-to-edge with no breathing room. Fixed by wrapping the body content in a `.page` div
  (`max-width: 640px; margin: 0 auto;` plus body padding) with a `@media print` override
  that resets both back to `none`/`0`, so print keeps relying solely on `@page`'s own
  margin rather than stacking both.
- Added a second button, "Ladda ner som PDF" — a genuine vector `.pdf` (not a
  screenshot/raster of the HTML version), built directly with `jsPDF`'s own `text()`/
  `rect()`/`line()`/`addPage()` calls rather than pulling in `html2canvas` as a second
  dependency, since the layout (section headers + rows of name/email/role) is simple
  enough to lay out by hand with manual y-position tracking and page-break checks. Both
  formats now share one `buildVipSections()` helper so the two exports can't drift apart
  from each other or from the on-screen tab.

Verified live: the on-screen HTML render is centered with real margins (confirmed via a
bounding-box check — 640px content column inside a 1280px viewport, not full-width), and
the PDF download produces a valid, non-trivial file (correct `%PDF-` header, ~12.8KB for
Pandaemonium's 24 real entries).

### Event Planning page restructure — built 2026-08-31

Prompted directly by feedback: with Staffing/Sponsors/VIP added as flat tabs (above), the
page had come to visually mirror Contacts — a directory of clickable rows — when its actual
job is running one show end-to-end, which needs far more than four equal-weight lists. Asked
to propose a plan first rather than jumping to code; researched the org's own real working
documents before designing anything:

- **`docs/old-work-documents/Uppgifter och tidsramar.xlsx`** ("Tasks and timeframes") — the
  org's own pre-existing event checklist (long-before tasks through after-event teardown) —
  effectively the org's own definition of "everything that needs to be done for the event,"
  used to shape the progress overview's categories below.
- **`docs/old-work-documents/Set list - Dark Carnival.docx`** — a real per-act stage plan,
  confirming `performer_acts` (`display_order`/`stage_preparations`/`pick_up_cleaning`/
  `act_notes`, already collected via the artist's own `BookedArtistForm`) was exactly the
  right data source for a running-order view that had never had an admin-facing UI before.

**Shipped, all five pieces from the plan**:

- **`EventProgressOverview.tsx`** — a row of 5 status cards, always visible above the tabs,
  each a pure read-time computation (no new stored state beyond the food schema below):
  Showplanering (acts without notes/missing entirely), Bemanning (the 3 fixed-role coverage
  check below), Sponsorer (X/4), VIP-lista (plain headcount), Mat (categorization progress
  → real headcount once done). Clicking a card jumps to that tab.
- **Showplanering tab (new)** — `ShowPlanningActRow.tsx` reads `performer_acts` (previously
  never fetched by the admin at all), ordered list with move-up/move-down buttons (plain
  buttons, not drag-and-drop — no reorder library exists anywhere in this codebase, matches
  the session's existing lightweight-first pattern) writing `display_order`, expand-to-edit
  for the 3 note fields.
- **Bemanning tab (reworked)** — `StaffingCoverageStrip.tsx` adds the 3-fixed-role check
  (Fotograf/Tekniker/Entrévärd — `admin-portal-roadmap.md`'s own already-decided design from
  2026-08-19, just never built) above the existing role-grouped list.
- **Sponsorer tab (reworked)** — `SponsorSlotGrid.tsx` renders `role: 'prize'` sponsors as a
  real 4-slot grid (always exactly 4 — one per the competition's 4 winning categories) with
  visible empty-slot placeholders, instead of burying them in a scrolling list with every
  other sponsor type.
- **VIP & Mat tab (condensed)** — the four list sections (Arrangörer/Artister/Arbetare &
  volontärer/Artisternas +1) became collapsed-by-default `<details>` groups; gained the
  computed food summary line at top. Everything built in the prior VIP round (both download
  buttons, manual-entry CRUD) kept working unchanged.

**Schema** (small, food/dietary only — the rest needed no new columns): `dietary_category`
enum (`all_eater | vegetarian | vegan`) added to `event_performers` (every confirmed
performer eats) and, alongside `needs_food boolean` + `dietary_notes text`, to
`event_staff_volunteers` (only staff/volunteers explicitly flagged need categorizing).
**Scope decision, deliberate**: category is admin-set from a small `DietaryCategoryPicker`
inline on the Artister/Bemanning rows, not captured on the public `BookedArtistForm` — kept
this round scoped to the admin page; wiring the public form to set it at the source is a
natural fast-follow, not bundled in here.

**Bug caught by live verification, not shipped**: the new inline `DietaryCategoryPicker`
initially rendered with its containing row's artist name completely invisible — traced to a
global `select { @apply w-full ... }` base rule in `index.css` (intended for full-width form
selects) silently overriding the compact picker's own width, since it had no `w-*` utility
of its own to win against it. Fixed by adding `w-auto` explicitly. Worth remembering for any
future compact inline `<select>` in this codebase — the global base style wins by default
unless overridden.

Verified live against Pandaemonium's real data end-to-end: progress cards show real counts
(0 utan akt/6 utan scenanteckningar, Saknas: 2 roll(er), 3/4, 24 personer, Behöver
kategoriseras); confirmed the Tobias Walka photographer restore from the earlier incident
still holds (green check, not a warning); reordered two acts with genuinely different
`display_order` values and confirmed the swap *and* the restore via direct DB query
afterward (ties among untouched real acts, mostly still at `display_order: 0`, made a
same-value round-trip look like a no-op in an earlier pass — not a bug, just degenerate
data); set a real performer's `dietary_category` via the picker, confirmed the write via DB
query, then had it reset back to `NULL` via SQL (the picker itself has no "clear" option, and
guessing at someone's real dietary preference for test purposes isn't something to leave
behind).

### Food/dietary redesign — built 2026-08-31, see restructure above

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

**Built 2026-09-01 — `declined`/`not_needed` statuses, on Contacts (not Event Planning).**
Smaller and sooner than the full system above: the `event_staff_invitations.status` enum
already had `declined`/`not_needed` values sitting unused (only `interested` was ever
written) — prompted by the user wanting to mark someone who specifically can't work an
event, so the board stops re-asking them, plus a distinct "not needed this time" for
admin-side bookkeeping (who's been considered/talked to, without implying they said no —
exactly who to ask first next time).
- `contactsService.ts`: added `markStaffDeclined`/`markStaffNotNeeded` (same upsert shape as
  the existing `markStaffInterested`), reused `removeStaffInterest` as the generic "clear
  whichever status is set" action (it already deletes by `event_id`+`staff_id` regardless
  of status, so no change needed there beyond the comment).
- `StaffVolunteerRow.tsx`: row tint + badge for both new statuses (red for declined, amber
  for not_needed, alongside the existing emerald/sky for confirmed/interested);
  `buildPopoverActions()` now branches on all 4 non-empty statuses plus the no-status case,
  always including "Confirm" — **decided with the user: a can't-work/not-needed mark is
  informational, never a lock**, so plans changing later doesn't require clearing the mark
  first.
- `AddToEventPopover.tsx` gained a third button variant, `'neutral'` (amber, new `.btn-amber`
  class in `index.css` mirroring `.btn-red`'s shape) — the first action that isn't a clean
  positive/negative distinction.
- `AdminContacts.tsx`: `byEventStatusFirst` sort now ranks declined/not_needed *below*
  no-status rows (previously tied with "no status" in the same catch-all bucket) — keeps
  people who are settled either way out of the way, below anyone still worth asking. Status
  bar gained matching count pills (amber "ej aktuella" / red "kan inte").

Verified live: no-status popover shows all 4 actions per the user's preferred layout;
marking declined red-tints the row, shows the badge, and updates the live count; re-opening
the popover on a declined row correctly offers switching to interested/not-needed, clearing,
or confirming; cleared via "Ta bort markering" and confirmed gone after a full page reload
(not just optimistic local state).

**Fix 2026-09-01 — volunteer email greeting uses first name only.** `openMailModalFor` in
`AdminContacts.tsx` (shared by staff/sponsor/venue email buttons) always used the full
`row.name`. Per feedback, full name reads too formal specifically for volunteers — split
into a second handler, `openMailModalForVolunteer`, used only by `StaffVolunteerRow`'s two
call sites; sponsors/venues keep the full-name greeting unchanged. No schema for first
name — `staff_volunteers.name` is one string column, so it's a plain
`row.name.trim().split(/\s+/)[0]`.

**Built 2026-09-01 — `invited` status, set automatically by the Contacts email button.**
Prompted by a real problem the user caught themselves: they'd been (ab)using "mark
interested" as a stand-in for "I emailed this person," which broke once the public
application form gained its own self-service interest checkbox — an email sent and an
applicant's own "yes, I'm interested" both landed in the same bucket, indistinguishable.
`event_staff_invitations.status`'s `invited` enum value (and its `invited_at` column) had
been sitting completely unused since the table was first built — exactly the right fit,
no new schema needed.
- `ContactMailModal.tsx` gained an `onSent?: () => void` prop, fired only after a real
  successful send (`response.ok` from `send-casting-email`, the same edge function this
  modal already used) — not on clicking Send, and not on failure (the modal has always
  stayed open + shown an error toast on failure, unchanged).
- `AdminContacts.tsx`: `mailTarget` now carries `staffId` (only set by
  `openMailModalForVolunteer`, left undefined for sponsors/venues — this status has no
  meaning for them). New `handleMailSent`, wired as `onSent`, calls the new
  `markStaffInvited(eventId, staffId)` — **but only when the person currently has no
  status at all** (checked against the already-loaded `staffEventStatuses` map), so
  emailing someone who's already interested/declined/not_needed/confirmed never silently
  downgrades a real answer back to "just contacted." Uses `statusEventId` (the event the
  Contacts status bar is currently showing), not the separate globally-selected event, so
  what gets marked always matches what's on screen.
- `StaffVolunteerRow.tsx`: `invited` joins the row-tint/badge system (violet, "Kontaktad"/
  "Contacted") alongside confirmed/interested/declined/not_needed — and, per the user's own
  suggested simplest-version ("change the color of the email icon"), the mail button itself
  re-tints violet and its title changes to "Already contacted — send again?" when set.
  `buildPopoverActions()` gained an explicit `invited` branch (5 buttons, one more than the
  usual 4) — unlike the other statuses, none of the 3 "mark X" actions is redundant with
  "invited" itself, so all three stay alongside "Ta bort markering" and Confirm.
- `AdminContacts.tsx` sort/tally: `invited` ranks between interested and no-status in
  `byEventStatusFirst`, and the status bar gained a violet "kontaktade" count pill.

Verified live end-to-end **without sending a real email** — Playwright intercepted the
`/api/send-casting-email` request and fulfilled it with a fake `200 {success:true}` so the
real client-side success path still ran (toast, the mark-contacted write, row/badge/icon
update) but nothing actually reached Resend or a real volunteer's inbox. Confirmed the
intercepted request body used the first-name-only greeting from the fix above; confirmed
the badge/icon appear immediately; confirmed "Ta bort markering" clears it and the clear
survives a full page reload.

**Revised same day — "contacted" decoupled from status entirely.** The design above
(shipped first) still stored "contacted" as `status: 'invited'`, so it was mutually
exclusive with interested/declined/not_needed/confirmed — the user caught this immediately:
"it's important to know which of the interested people I've written to or not," since
someone can now self-report interested via the public form's own checkbox without ever
being contacted. Reworked so the two are independent signals on the same
`event_staff_invitations` row: `status` stays the decision (or none),
`invited_at` alone means "contacted," regardless of what `status` holds.
- `contactsService.ts`: `getStaffEventStatuses` now returns `{ status?, contactedAt }` per
  staff id (new exported type `StaffEventStatus`) instead of a bare status string; `status:
  'invited'` is normalized to `undefined` here so no downstream code ever sees it as a real
  status again. `markStaffInvited` renamed to `markStaffContacted` and rewritten as a
  read-then-write that only ever touches `invited_at` — never `status` — so contacting an
  already-interested/declined/not_needed/confirmed person can no longer downgrade their
  real answer (the original version's "only call this if no status yet" guard in
  `handleMailSent` is gone; it's unconditionally safe now).
- `StaffVolunteerRow.tsx`: the violet row-tint/text-badge for "invited" is gone (row tint is
  status-only again); in its place, a small violet mail-glyph icon renders next to the name
  whenever `contactedAt` is set, **independent of and alongside** any status badge — so
  "Intresserad" (sky) and the contacted icon can and do appear together. The mail button
  itself still re-tints violet on `contactedAt`, unchanged. `buildPopoverActions()` reverted
  to its pre-invited 4-branch shape (no more special 'invited' case), since `status` is now
  never `'invited'`.

Verified live: marked a volunteer interested, then contacted them (network-intercepted, no
real email) — confirmed the row stayed sky-tinted with "Intresserad" *and* gained the
violet mail-glyph icon simultaneously; confirmed the mail button itself re-tinted violet;
cleared via "Ta bort markering," confirmed both signals gone after a full reload.

**Built 2026-09-01 — volunteer shift subcategories, admin note instead of role label,
"in charge" marker.** The Bemanning tab's Volontär section was one flat list, every row
showing "Volontär" redundantly next to the name. `AddToEventPopover.tsx`'s `SHIFT_PRESETS`
already existed as free-text prefill suggestions for `role_details` (setup/door&guestlist/
takedown/driving) — not a real field, just prose dropped into the same note textarea. Made
it real:
- New `event_staff_volunteers` columns: `shift` (enum `driving | setup | guestlist |
  takedown`, nullable — only meaningful for `role: 'volunteer'`) and `in_charge` (boolean,
  default false). Both optional/settable-later, matching this app's existing "no fixed
  requirement system" staffing philosophy.
- Renamed shift labels per the user's exact wording/order — Driving/Transport,
  Setup/Setup, Guestlist/Gästlista, Takedown/Städ — replacing the old verbose sv/en prose
  entirely (`volunteerShiftLabel` in `contactLabels.ts`, `VOLUNTEER_SHIFT_ORDER` in
  `event-plan/constants.ts`).
- `AddToEventPopover.tsx`'s shift picker converted from a preset-button-that-prefills-text
  into a genuine `<select>` bound to its own field — the "Detaljer" textarea is now purely
  free-text specifics, no longer double-duty as a shift-prefill target.
  `confirmStaffForEvent` gained a `shift` parameter threaded through from the popover.
- `EventStaffRow.tsx`, scoped to `role === 'volunteer'` only (every other role's row is
  untouched): dropped the redundant `staffRoleLabel` display, widened `role_details`'s
  display slot in its place (it was already shown, just secondary before); added a
  clickable `Crown` icon toggling `in_charge` immediately (no expand-then-save — a
  lightweight marker, not a form field); added a small `worked_with` ✓ indicator (not
  asked for outright, but directly supports the user's own stated reasoning — "appoint
  volunteers who've worked with us before" — at near-zero cost since the field was already
  fetched); expanded panel gained a `shift` `<select>` so it's editable after the fact, not
  just at confirm time.
- New `VolunteerShiftGroups.tsx` — splits the Volontär section's rows into the 4 shift
  subsections in order, plus a final "Inget pass tilldelat"/"No shift assigned" bucket for
  anyone without one (all pre-existing real volunteers landed here, as expected — none had
  a real shift value before this, only the old free-text prose in their notes).
  `AdminEventPlan.tsx`'s `ROLE_ORDER.map` loop special-cases `role === 'volunteer'` to
  render this instead of the flat list every other role still uses.

Verified live against Pandaemonium's real volunteer roster (8 people): confirmed
non-volunteer rows (Fotograf/Tekniker) render exactly as before; confirmed all 8 existing
volunteers correctly fell into "Inget pass tilldelat" with their old free-text shift notes
now showing as plain notes; assigned one volunteer's shift to Gästlista via the expanded
panel, confirmed she moved subsections and it survived a reload, then reset her back to no
shift and confirmed via a fresh reload (count still 8, no data loss, her original note
untouched); toggled "in charge" on another volunteer, confirmed the crown filled gold and
persisted, then toggled back off and confirmed via reload; confirmed the Contacts popover's
new shift `<select>` renders the 4 options in the exact requested order/labels (backed out
via Cancel, nothing saved).

**Built 2026-09-02 — manual "mark as contacted" button.** Prompted directly: the user had
already been contacting volunteers before this feature existed (and some contact happens
outside the app entirely — social media, in person), so the auto-mark-on-email-send from
the previous round couldn't cover that history. Added `markStaffContacted` as a fifth
button in the same "Add to event" popover the other manual markers already live in
(Markera intresserad/Kan inte jobba/Inte aktuell), rather than inside the email-compose
modal — since this isn't about sending anything, and the popover is already the app's one
place for manual event-relationship markings. Reuses the exact write the email button
already triggers (`markStaffContacted` was already independent of `status`, so this needed
no new backend logic) — only shown while not already marked, since the row's own violet
icon already shows once it is. New 4th `PopoverAction` variant, `'info'` (violet-tinted,
new `.btn-violet` class mirroring `.btn-red`/`.btn-amber`'s shape), matching the row-level
violet convention for "contacted" everywhere else.

**Bug caught by live verification, not shipped**: someone contacted-but-with-no-other-status
had no way to undo it — `buildPopoverActions()`'s no-status branch never offered
`clearStatus` (there was nothing to clear there before contacted became a thing). Fixed by
offering `clearStatus` in the no-status branch too whenever `contactedAt` is set. Caught
during verification (a test row got stuck contacted-only with no popover action to reverse
it) before it could reach the user.

Verified live: the button appears (violet-styled, 5th in the no-status set), marks
`contactedAt` on click, disappears once already marked (replaced by "Ta bort markering"),
and clearing + a full reload confirms it's genuinely gone. Also caught and cleaned up two
real roster entries (Emelie Björkman, Stephanie Behre) left contacted-only from earlier
verification passes this session, confirmed via a fresh reload of the status bar (0
kontaktade before wrapping up).

**Redesigned 2026-09-02 — popover decluttered: 2 buttons + a row of self-toggling icons.**
Direct feedback the very next day: the popover from the round above had grown to 5 stacked,
differently-colored buttons (Markera intresserad/Kan inte jobba/Inte aktuell/Bekräfta/
Markera kontaktad) and felt crowded. Redesigned around the two real decisions staying as
buttons — **Interested** and **Confirm** — with the three secondary, freely-combinable
flags (contacted/not needed/can't work) demoted to a row of small icons underneath
(`Mail`/`CircleMinus`/`Ban`, violet/amber/red when active, muted outline when not).
- Each icon is now genuinely self-toggling — clicking an active one undoes it — which
  needed two new granular service functions: `clearStaffContacted` (clears just
  `invited_at`) and `clearStaffResponseStatus` (resets `status` back to the neutral
  `'invited'` placeholder). This made the old catch-all `removeStaffInterest` (full-row
  delete) obsolete everywhere it was used, so it was deleted rather than left as dead code.
- The one status left without an icon — "interested" — keeps a single plain-text link
  ("Ta bort markering", not a colored button) at the bottom, shown only while
  `status === 'interested'`.
- `AddToEventPopover.tsx` gained a new `ToggleAction` type/render path (a `toggleActions`
  prop, rendered as a small icon row) and a `clearAction` prop (rendered as a muted text
  link) alongside the existing `actions` (full buttons) — the popover itself stays generic/
  agnostic of what each represents, same as before. The now-unused `'info'` `PopoverAction`
  variant and its `.btn-violet` CSS class were removed along with it.
- Clicking a toggle icon deliberately does **not** close the popover (unlike the main
  buttons) — several flags can be flipped in one visit without reopening it each time.

Verified live: popover now shows exactly 2 gold buttons + 3 small muted icons (screenshot-
confirmed dramatically less crowded); clicked the "Inte aktuell" icon — it filled amber,
the popover stayed open, a toast confirmed, and the row behind it updated live; clicked the
same icon again — reverted to muted, confirmed gone after a full reload.

**Also fixed same day, from the same feedback:**
- **Role label dropped from every row, not just Volontär.** The earlier round (2026-09-01)
  only removed the redundant `staffRoleLabel` display for volunteer rows; the user pointed
  out every other role (Fotograf, Tekniker, etc.) has the exact same redundancy against its
  own section header. `EventStaffRow.tsx`'s `!isVolunteer` gate around that removal is
  gone — every row now shows its note in that slot instead, universally.
- **Staffing coverage strip rebuilt — one card per role, a count instead of names.**
  Previously only showed the 3 fixed roles (photographer/technician/doorman) by name, and
  had no card at all for DJ/Stage kitten/Entertainment/Other. `ROLE_ORDER` moved from a
  local constant in `AdminEventPlan.tsx` into `event-plan/constants.ts` so both it and the
  new `StaffingCoverageStrip.tsx` share one source of truth. Now renders all 8 categories
  as `{label}` + `{count}` cards; the checkmark/warning distinction stays scoped to
  `FIXED_STAFF_ROLES` (the 3 roles with a real 1-person target) — every other card is a
  plain, judgment-free number, matching the "no stored requirement system" philosophy
  already decided for staffing generally.

Verified live against Pandaemonium: coverage strip now shows all 8 role cards (Fotograf 1 ✓,
Tekniker 1 ✓, Entrévärd 0 ⚠, DJ 0, Stage kitten 1, Underhållning 0, Volontär 8, Övrigt 0);
confirmed Tobias Walka's (Fotograf) row no longer shows a role label next to his name,
matching the volunteer rows' existing treatment.

**Revised again same day — coverage strip made more compact, "Other" dropped.** Immediate
follow-up feedback: 8 cards still didn't fit on one row, and "Other" is a card no one will
ever actually fill (worst case an unassigned volunteer, not an "other"). `COVERAGE_CARD_ROLES`
now filters `'other'` out of the shared `ROLE_ORDER` (still valid everywhere else — the
Contacts role dropdown, the role-grouped list below — just not given a card here). Grid
widened to `sm:grid-cols-7` with tighter padding/gaps; a new card-local `shortLabel` helper
shortens just the two widest labels ("Entrévärd"/"Host" → "Värd"/"Host", "Stage kitten" →
"Stage") without touching `staffRoleLabel` itself, which stays full-length everywhere else.
The checkmark/warning icon moved off the label row and onto the count row, next to the
number, to save horizontal width. Verified live at 1300px: all 7 remaining cards
(Fotograf 1 ✓, Tekniker 1 ✓, Värd 0 ⚠, DJ 0, Stage 1, Underhållning 0, Volontär 8) fit on
one row.

**Built 2026-09-02 — phone number on casting applications.** Direct request: applicants'
phone numbers weren't being collected at all, and the board needs them to reach artists
directly (not just email). New nullable `phone text` column on `casting_applications`
(SQL handed to the user to run, not written directly — see `CLAUDE.md`/standing rule).
- **Public form** (`CastingForm.tsx`): new required `tel` input, paired with Email in its
  own "EMAIL & PHONE" row (Language, previously grouped with Email, now stands alone) —
  wired into `formData`/submission payload/reset exactly like every other field there.
  Required client-side only, matching how the user described it ("mandatory in the
  frontend") — the DB column itself stays nullable so older rows aren't retroactively
  invalid.
- **Admin backfill** (`CastingApplicationRow.tsx`/`AdminCasting.tsx`): a small editable
  phone field + save button next to Admin Notes (`onSavePhone` → `handleSavePhone` →
  `updateApplicationPhone`, mirroring the existing `onSaveNotes` pattern exactly) — lets
  the board fill in phone numbers for applications submitted before this field existed,
  which the user said they'd do by hand after contacting those artists directly. When a
  phone number exists, it's also shown as a `tel:` link next to the email link under Media
  & Links.
- **Known gap, not yet resolved**: neither the `submit_casting_application` nor the
  `confirm_and_migrate_artist` Postgres RPC has been updated to read/write `phone` — no SQL
  body for either function exists anywhere in this repo to safely diff against (confirmed
  via a full grep of `docs/*.md`; `database.types.ts` only documents table columns, not
  function bodies, per `CLAUDE.md`). Until the user shares each function's current
  definition (e.g. `select pg_get_functiondef(oid) from pg_proc where proname = '...'` in
  the Supabase SQL editor) so a precise, non-destructive update can be written, phone is
  captured on the form but **not actually persisted through the RPC**, and does **not**
  carry over to the `performers` profile on confirm — `performers.phone` already existed
  and is unaffected, just not auto-filled from the application yet.
- `npx tsc -b` and `npm run lint` both clean. Live-verified via Playwright that the public
  form's JSX/required attribute are wired correctly by reading the rendered source; could
  not click through an actual submission, since there was no open casting call event to
  test against at the time (`getEventWithCasting()` returned none) and creating one would
  mean writing test data to a real, publicly-visible table.

**Reverted same day — admin-side phone backfill removed.** Direct follow-up: the board will
add phone numbers via Supabase directly or the performer profile itself (`performers.phone`
already existed and is the field that actually matters long-term), so the editable field +
save button next to Admin Notes on `CastingApplicationRow.tsx` was unnecessary — removed
along with `onSavePhone`/`handleSavePhone` (both `CastingApplicationRow.tsx` and
`AdminCasting.tsx`) and the now-dead `updateApplicationPhone` service function. The rest of
the phone-number work above is untouched: the DB column, the required public-form field, and
the read-only `tel:` link shown next to email under Media & Links when a phone is present all
stay — this only removes the manual-backfill editing path specifically.

**Revised 2026-09-02 — staffing coverage cards, three bespoke per-role rules.** Direct
follow-up on the cards above:
- **Värd (Host) no longer warns when empty** — it's a voluntary position. `doorman` was
  removed from `FIXED_STAFF_ROLES` (now just `['photographer', 'technician']`), which also
  fixes `EventProgressOverview.tsx`'s "key roles" checklist to match, since it reads off the
  same constant. Still shows a checkmark when filled — only the warning was unwanted.
- **Stage (stage kitten) now needs ≥2 people, not just 1**, to show as covered — a new
  `STAGE_KITTEN_MIN = 2` local to `StaffingCoverageStrip.tsx`, warns below that threshold.
- **DJ is covered by either an assigned DJ or a stored playlist.** Reuses the existing
  `events.afterparty_playlist` field (already free-text, with a "Link or 'DJ'" placeholder
  on `EventEditor.tsx` — the only playlist-shaped field anywhere in the schema, confirmed via
  a full grep) as the playlist signal — no new column. `AdminEventPlan.tsx` passes a new
  `hasPlaylist` prop down, computed from the currently-selected event's
  `afterparty_playlist`. When DJ count is 0 but a playlist exists, the card shows a green
  `Music2` icon instead of the usual checkmark (so it's visible *how* it's covered, not just
  that it is); with neither a DJ nor a playlist, it warns as before.

Verified live against Pandaemonium (no playlist set, 1 stage kitten, 0 doorman): Värd shows
`0` with no icon (previously warned); Stage shows `1 ⚠` (previously showed `1 ✓`, incorrectly
reading as fully covered); DJ shows `0 ⚠` (unchanged, correctly warning — no playlist and no
DJ). The playlist-covered branch (DJ green via `Music2`) was verified by code review only —
its condition is the direct boolean-flip of the just-confirmed warning branch, and exercising
it live would have meant editing a real, publicly-linked event's playlist field beyond what
was asked.

**Built 2026-09-02 — Afterparty section on Bemanning, playlist editable in-place.** Direct
follow-up: the DJ-covered-by-playlist logic above only reads `events.afterparty_playlist`,
but that field previously only had one editor — a page in the Event Editor separate from
Event Planning — so it stayed empty in practice even for events that do have a real playlist.
New `AfterpartySection.tsx` replaces the plain `dj`-role block in the Bemanning tab's
role-grouped list: unlike every other role's section (hidden entirely when its count is 0),
this one always renders, since the playlist field needs to be reachable regardless of DJ
headcount. It holds the existing DJ roster (still real `event_staff_volunteers` rows, still
counted on the coverage strip above it, added the normal way via Contacts) plus a small
inline text field + save button for `afterparty_playlist`, mirroring the Admin Notes
edit-in-place pattern already used elsewhere. Saving goes through the existing
`updateEvent()` (no new service function needed); `AdminEventPlan.tsx` tracks the saved
value as a small local eventId-scoped override so both this field and the coverage strip's
DJ card update immediately, without needing `CurrentEventContext` itself to refetch.

Verified live against Pandaemonium: entered a test playlist link, saved — toast confirmed,
the DJ coverage card immediately switched from an amber warning to a green `Music2` note
icon (proving the playlist-covered branch noted above as "code review only" actually works
live); reverted the field back to empty afterward and confirmed the card returned to warning
state, leaving the real event's data untouched.

**Partly resolved 2026-09-02 — `submit_casting_application` fix drafted, `confirm_and_migrate_artist`
still blocked.** The user pulled `submit_casting_application`'s real body via
`pg_get_functiondef` — it inserts via an explicit named-column list, not
`jsonb_populate_record`, so the earlier "might already flow through" possibility is ruled
out: `phone` was genuinely being silently dropped. Drafted a minimal diff (added `phone` to
both the column list and the `VALUES` list, reading `p_application->>'phone'`, no other
change) and handed it to the user as a `CREATE OR REPLACE FUNCTION` to run themselves — not
run directly, per standing rule. The user also confirmed `confirm_and_migrate_artist` is the
function that creates the `performers` row and still needs a `phone` copy added — its body
hasn't been shared yet, so that half is still blocked on the same `pg_get_functiondef` ask.

**Reverted 2026-09-02 — admin phone backfill on casting applications, see above.** (Recorded
here again for date-order clarity: this is the same removal already logged under the phone-
number entry above, done in this same round.)

**Fixed 2026-09-02 — Acts column centered on the casting page's collapsed row.** Purely
cosmetic, per direct request: `CastingApplicationRow.tsx`'s "Akter"/"Acts" value (the
`chosenActsCount/acts.length` or plain count) now has `text-center` added to it specifically
— the label above it and every other column stay exactly as they were.

**Fixed 2026-09-02 — "No consent on record" no longer flashes on new admin-added staff.**
`createStaffVolunteer` (`contactsService.ts`) already force-sets `agreed_to_terms: true` on
every admin-created row — a board member only adds a real person here after already getting
their actual verbal/written consent, never speculatively — so this was never really a gap in
enforcement. The bug was purely cosmetic: `AdminContacts.tsx`'s `blankStaff()` (the client-
side draft shown before that first save) defaulted `agreed_to_terms` to `null`, so the
in-progress add-contact form briefly showed "Inget samtycke registrerat" / "No consent on
record" for a value that was always going to be forced true on save regardless. Changed the
draft's default to `true` to match. Scoped to staff/volunteers only, per the request —
`SponsorRow.tsx`/`blankSponsor()` has the identical pattern but wasn't asked about, so it's
untouched.

**Fixed 2026-09-02 — Afterparty section moved to the top of Bemanning, and a real bug in
reading its playlist.** Two direct follow-ups on the section built earlier the same day:
- **Moved to the top** of the role-grouped list (above Fotograf/Tekniker/etc.), since its
  aesthetic (a text field, not a roster) doesn't match the rest — it no longer renders
  inside the `ROLE_ORDER.map` loop at all; `dj` is filtered out of that loop and the section
  is rendered once, directly after `StaffingCoverageStrip`.
- **Real bug, not cosmetic: the playlist never actually displayed, regardless of what was
  saved via Event Editor.** Root cause, once asked directly whether a joined view was in
  play — no view; the actual bug was that `CurrentEventContext` (`selectedEvent`, what
  `AdminEventPlan.tsx` was reading `afterparty_playlist` from) is a deliberately narrow
  shared query — `fetchEventsForAdmin()` only ever selects `id, title, event_start` — so
  `selectedEvent?.afterparty_playlist` was `undefined` no matter what the database held.
  This is an existing, intentional pattern in this codebase: `getEventVenueId()` in
  `eventService.ts` already does a small dedicated fetch for the same reason (Contacts'
  venue-highlight feature needs `venue_id`, which isn't in the shared query either, so it
  gets its own light read instead of widening the shared one). Added the matching
  `getEventAfterpartyPlaylist(eventId)`, fetched alongside the rest of Event Planning's data
  in `AdminEventPlan.tsx`'s existing per-event `Promise.all`, replacing the broken
  context-read entirely — `afterpartyPlaylist` is now real local state, set from the fetch on
  load and updated directly after a successful save (no more of the eventId-scoped-override
  workaround from earlier the same day, since the state is now fetched fresh per event
  rather than derived from a context value that never had it).
- **Checked directly against the database while debugging this**: Pandaemonium's
  `afterparty_playlist` is currently `null` — confirmed via a direct read-only Supabase
  query, bypassing the app entirely, to rule out any remaining app-layer bug before
  reporting back. So the fetch fix above is real and necessary, but it isn't why the user's
  own playlist isn't showing for Pandaemonium specifically — that value was never persisted
  to begin with (Event Editor's save presumably didn't go through, or it was entered against
  a different event). Flagged back to the user rather than assumed.

**Fixed 2026-09-02 — Acts column centering, second pass.** The first attempt only centered
the value (`text-center` on the number itself), which left it centered under the *column*,
not under the left-aligned "Akter"/"Acts" label above it — reported as "way off to the
right." Moved `text-center` to the column's wrapping `<div>` instead, so the label and the
value are centered as one unit and stay aligned with each other. Other columns untouched.

**Fixed 2026-09-02 — Acts column position, third pass.** Still looked off after centering:
the grid gave it too little width (`md:col-span-2`) sitting hard against a wide, left-hugging
Location column, so its centered content read as shoved toward Offered Fee. Swapped the two
columns' spans — Location `md:col-span-3` → `2`, Acts `2` → `3` — so Acts starts a column
earlier and has more room, landing visibly between Location and Offered Fee instead of
crowded against the latter.

**Built 2026-09-02 — several requests on the staff booking flow and Event Planning, all from
one message.** In order:

- **Popover "Confirm" renamed to "Assign role."** The button opens a role picker and
  actually assigns a role — "Confirm" undersold what it does, especially now that it's
  reusable for adding a *second* role to someone already on the roster. `StaffVolunteerRow.tsx`'s
  `confirm.label` changed; nothing else about the action changed.
- **A small "Confirm" button added next to "Cancel" in the popover's main view.** Reported
  directly: after flipping a toggle like "contacted," the only way to close the popover was
  "Avbryt" (Cancel), which reads as undoing something rather than being done. The
  role-selection sub-view already had exactly this pattern (a "Klar"/"Done" link below its
  own submit button) — added the equivalent to the main view: a small gold "Bekräfta"/
  "Confirm" button beside Avbryt. Both just call `onClose()` — every toggle already saves
  live as it's clicked, so there's nothing left to "confirm"; this is purely about not
  making the exit door read as a rejection.
- **Real bug fixed: a person genuinely couldn't hold two volunteer shifts at once.**
  Reported directly ("I don't seem to be able to add the same person in several roles").
  `event_staff_volunteers` was already keyed by (event_id, staff_id, role) specifically so
  one person could hold several *roles* — but a volunteer's two shifts are both
  `role: 'volunteer'`, so `confirmStaffForEvent`'s existing-row lookup matched on role alone
  and silently overwrote the first shift with the second instead of adding a row. Fixed by
  also matching on `shift` for volunteer rows specifically (a real PostgREST gotcha found
  along the way: `.eq('shift', null)` throws — `column "shift" is of type volunteer_shift`
  can't compare against the literal `null` — `.is('shift', null)` is required instead).
  `getStaffRolesForEvent` now returns `shift` too, so the popover's "Redan bekräftad som"
  chips show `Volontär — Setup` / `Volontär — Transport` as two distinct, individually
  removable chips instead of one ambiguous "Volontär." `removeStaffFromEvent` gained an
  optional `shift` param for that per-chip removal, and a separate fix: `role` itself is
  now optional — omitting it removes *every* role the person holds, used by the top-level
  "Remove from event"/"downgrade to interested" actions, which previously deleted only
  `row.role` (the contact's own default role from Contacts, not necessarily what they were
  actually confirmed as for this specific event — a second latent bug caught while fixing
  the first).
  - **Verified live** against a real volunteer (Arzon Einevik, Pandaemonium): added a second
    shift via the popover, confirmed both "Volontär — Setup" and "Volontär — Transport"
    chips appeared distinctly; removed the Setup chip specifically and confirmed only
    Transport remained, both in the popover and after a full page reload (nothing left
    behind — the standing verify-cleanup rule).
- **Volunteer headcount no longer double-counts someone on 2 shifts.** Direct follow-up
  concern on the fix above. `StaffingCoverageStrip`'s card count, `EventProgressOverview`'s
  "X volontärer" line, and the Bemanning tab's own per-role count badge all switched from
  `rows.length` to `new Set(rows.map(r => r.staff.id)).size` — distinct people, not rows.
  Harmless no-op for every other role (only volunteers can ever hold 2 rows).
- **"Add" buttons directly on Event Planning**, for both Bemanning and Sponsors — new
  `InlineAddPicker.tsx`: a small "+" that expands into a searchable list of existing
  contacts/sponsors not yet in that specific category; picking one confirms them
  immediately via the same service calls the Contacts popover already uses. No "create a
  brand-new contact" path here on purpose (stays on Contacts, so that whole form isn't
  duplicated) — a note under the list says so. Every Bemanning role section (including the
  Afterparty section's DJ list) and both new Sponsors sections got one. A side effect,
  needed to make empty categories reachable at all: role sections on Bemanning no longer
  hide themselves when they have 0 people — they now show "Ingen tillagd ännu"/"Nobody added
  yet" instead, so there's always somewhere to click "+".
- **Event Planning tab order changed**: Bemanning, Sponsorer, Showplanering, Artister,
  VIP & Mat (previously Artister, Showplanering, Bemanning, Sponsorer, VIP & Mat). The
  default `activeTab` on load changed from `'artists'` to `'staff'` to match.
- **Prize sponsor slots: 4 stays the expected count, not a hard cap.** `PRIZE_SLOT_COUNT`
  (still 4) now only drives the grid's default slot count and the "filled" badge threshold
  — the new "+" picker on Pris-sponsorer doesn't stop at 4, so a 5th (or more) just adds
  another real card; the counter reads e.g. "5/4," which is a fine, honest way to say "more
  than the usual number," not a bug.
- **New "Sales" section for merch-table sponsors — orthogonal to prize status, same pattern
  as the Afterparty section's DJ-or-playlist logic.** New `event_sponsors.has_merch_table`
  boolean column (SQL below), completely independent of `role`/`sponsor_type` — a sponsor
  can be `role: 'prize'` (one of the 4 slots) *and* `has_merch_table: true` at the same
  time, without that counting as a second sponsor. `EventSponsorRow.tsx` gained a checkbox
  ("Sätter upp merchbord på eventet") in its expanded panel for toggling this on any
  already-confirmed sponsor regardless of role; `SponsorSlotGrid.tsx`'s new Sales section
  lists everyone with the flag set, plus its own "+" picker for someone brand-new to the
  event (confirms them with `role: 'sales'` and the flag together in one action — picking
  an already-confirmed sponsor from that picker only flips the flag, never touches their
  existing role). "Övriga sponsorer" now excludes anyone already shown in Sales, so a
  sales-type sponsor with the flag set doesn't also duplicate into that bucket.
  - **Also requested**: a merch table means salespeople on-site, which the VIP list should
    know about. Not enforced (matches this app's standing "no stored requirement system"
    philosophy) — a small "Lägg till säljare i VIP-listan"/"Add salesperson to VIP list"
    button appears under each Sales-section sponsor, switches to the VIP tab and drops in a
    blank manual-entry draft pre-noted `Säljare — <sponsor name>`, ready for the board to
    fill in the actual name(s).
  - **Not yet verified live** — blocked on the SQL below actually being run; confirmed via
    a live test that the whole Event Planning page's data load currently fails outright
    with the new column missing (`getEventSponsorsForAdmin`'s select names
    `has_merch_table`, and the single `Promise.all` covering every tab's data means one
    missing column blanks out the *entire* page, not just Sponsors — caught this via a
    real Postgres 42703 error during this same round's verification pass, not by the user).

```sql
ALTER TABLE public.event_sponsors
  ADD COLUMN has_merch_table boolean NOT NULL DEFAULT false;
```

**Answered directly, not a code change — does an `event_staff_invitations` row get deleted
once someone's added to an event?** No. `confirmStaffForEvent` only ever writes to
`event_staff_volunteers` (the confirmed roster) — it never touches or deletes the
`event_staff_invitations` row. Both persist side by side; `getStaffEventStatuses` just lets
the confirmed roster's status override what's *displayed*, while `contactedAt` always still
comes from the invitation row regardless of confirmation, exactly so that fact isn't lost.

**Verified live 2026-09-02, after the SQL above was run**: the whole Event Planning page
loads real data again; toggling Mshop's merch-table checkbox made it appear in both
Pris-sponsorer *and* the merch section at once without moving the Sponsorer summary card off
"3/4" (proving the flag really is independent of prize-slot count); the VIP nudge button
switched to VIP & Mat and dropped in a blank draft pre-noted "Säljare — Mshop." Everything
reverted afterward (flag back off, draft cancelled unsaved) and confirmed gone on a fresh
reload — no residue left on real event data. (Section is labeled "Säljbord," not "Sales
(merchbord)" as first built — simplified straight in the file after this round, no separate
request needed.)

**Simplified 2026-09-02 — popover's main view down to one "Close" button.** Immediate
follow-up: the two-button pair added earlier the same day (gold "Bekräfta"/Confirm + muted
"Avbryt"/Cancel) was itself judged one button too many — every toggle already saves the
moment it's clicked, so there was never anything to actually "confirm" before closing.
Replaced both with a single muted "Stäng"/"Close" link, same style Avbryt already had.
Considered a corner "×" too but left it out — one discreet close affordance already covers
it without adding a second way to do the same thing.

### Show ordering, prep/cleanup/music/notes per act — built 2026-08-31 (Showplanering tab)
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

**v4, 2026-09-01** — three small additions to the Artists section (`ArtistOverviewCard.tsx`):
- **Copy Instagram handle** — a new `@`-icon button next to download/copy, greyed out for
  anyone without an Instagram link. New `extractInstagramHandle()` in `utils.ts` (reverse of
  the existing `formatInstagramLink`) pulls the handle back out of the stored profile URL
  and formats it `@handle`, for pasting straight into an Instagram tag.
- **Reveal failsafe** — the green "Avslöjad" badge is now itself a button: clicking it
  again flips `event_performers.is_revealed` back to false (walking back a too-early
  reveal), turning red on hover as a visual cue. Deliberately simple per the request —
  doesn't touch `performers.is_approved` either way, since staying approved is harmless
  whichever direction the toggle goes. `eventService.ts`'s `revealPerformerNow` was renamed
  `setPerformerRevealed(eventId, performerId, isRevealed)` to serve both directions.
- **"Posted on social media" checkbox** — a second, independent flag from `is_revealed`
  (which only gates the public site) for the board's own checklist of who's actually been
  posted about. New `event_performers.social_posted` column (boolean, default false) +
  `setPerformerSocialPosted`; a small label ("Postat på sociala medier") sits top-right of
  the Artists section header, over the checkbox column.

**Known small gaps, not yet acted on**: unrelated (non-event) posts (`event_id` nullable
already supports it, no UI); richer templates for the 11 checklist-only post types if real
source text ever gets supplied for them.

**Fix 2026-09-01 — "Artisterna, alla tillsammans" now lists artists in reveal order.**
`buildArtistsAllTogetherText` (`ArtistsAllTogetherCard.tsx`) was passed the raw `performers`
state — `event_performers.display_order` order — for both the name list and the hashtags,
while the on-screen artist cards above it already use `sortArtistsForReveal` (reveal_date
ascending, role as a tiebreaker for undated performers). One-line fix in
`AdminMarketing.tsx`: `buildArtistsAllTogetherText(eventData, sortArtistsForReveal(performers))`.
Verified live against Pandaemonium's real reveal dates — before the fix the name list and
hashtag list didn't even agree with each other (the row's `draft` initializes from
previously-saved DB content, generated pre-fix); after clicking "Återställ till mall" to
force a fresh generate, both lists now open with Seymour Bottoms (earliest reveal_date) and
end with Storm Dunder (latest), matching the reveal order shown elsewhere on the page.

## Email / Newsletter tab — future, not yet started

Noted 2026-09-01, same source document as the Marketing tab's posting schedule
(`docs/old-work-documents/Social Media & Emails/Marknadsföringsmodell mail & posts.docx`) —
that doc's "Mail att skicka" (emails to send) section, never acted on when the Marketing
tab was built, since that round focused on social posts only.

**What it would be**: the same principle as the Marketing tab, applied to the newsletter
instead of social posts — a schedule of which emails go out per event, a checkbox for
"sent or not," and templates to work from. Emails themselves would still be composed and
sent through Mailchimp as they are today (this doesn't send anything, same non-automation
boundary the Marketing tab already has) — the admin side is purely tracking + template
prep, not a Mailchimp integration.

**The org's real email list**, per that doc — one email per event, roughly in this order:
event announcement + casting call open, ticket release (1 week out), ticket release (day
of), venue/logistics info (elevator, bar, food, etc.), artist promo (host & headliner),
artist promo (everyone together), sponsors/sales-table + contest/photobooth, evening
schedule + event page link, and a reminder the day before. Plus one that isn't
per-event/scheduled: "Viktig & samlad information" (important/collected info — e.g. a new
website, a new venue), sent ad hoc rather than on the show calendar.

**The doc's own wishlist for this** (worth keeping verbatim as a starting brief, not
reinterpreting): its own admin tab; a schedule of every email due per event; a sent/not-sent
checkbox per email; a ready template per email type with customizable variables and
uploadable images; a notification to the board when it's time to send one and something's
missing (e.g. an image); pulling in images from the artists automatically; and a reminder
system for when each step should go out, possibly emailing the board itself as the
reminder.

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

**First real piece built, 2026-09-01 — new applications (last 7 days).** Started ahead of
the rest of this tab, per direct request — the org-wide overview bullet below, in its
smallest useful form. Two columns (staff/volunteers, sponsors), each a count + list of
name/role/date, filtered by `created_at` within a rolling 7-day window. Reuses the existing
`getStaffVolunteers()`/`getSponsors()` — no new service functions or schema. **Known
limitation, not a bug**: neither table has a reviewed/seen flag, so "new" is a fixed rolling
window rather than "since you last checked" — the honest lowest-effort option; a real
seen-tracking mechanism (e.g. a per-admin-device `localStorage` timestamp) would need to be
added later if a fixed window turns out to miss things.

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
