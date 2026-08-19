# Admin portal roadmap — light overview

Drafted 2026-08-19. **This is deliberately not a phased implementation plan** like
`multi-act-casting-plan.md` — it's a wishlist/overview, written now specifically to catch
schema-level overlaps early. Detailed phasing for each tab happens later, once the
multi-act casting/booking work has actually shipped and the data shapes it introduces
(multi-act performers, roles, returning-vs-newcomer) are real — designing this in full
detail today risks building against a shape that's about to change.

Sequencing: multi-act casting/booking work first (already phased in the other doc), then
this. Within this doc, the order below is also roughly the intended build order:
foundation → Casting (already covered elsewhere) → Contacts → Event Planning → Dashboard
last.

## Foundation: event-scoped admin shell

Right now the event picker lives inside `AdminCasting.tsx` alone. Since the board plans
one event at a time, the proposal is to lift it out into a shared spot in the admin
chrome (nav bar, side or directly under it), so every `/admin/*` tab reads from one
"currently selected event" instead of each tab (or none of them) having its own picker.
Include past events in the same picker, for comparison.

This is infrastructure that every other tab below depends on — probably worth building
first among the event-plan work, before Contacts/Event Planning/Dashboard, rather than
building those tabs first and retrofitting a shared picker under them. Likely shape:
a `CurrentEventContext` (mirroring how `AuthContext`/`LanguageContext` already work),
wrapped around the admin routes, with the picker itself living once in the shared admin
layout instead of being duplicated per page.

## Casting tab

Already being redesigned in `multi-act-casting-plan.md` — no new notes here except: it
adopts the shared event picker above instead of keeping its own local one, and the
"preliminary budget" number you want visible here is the same yes-section total already
sketched in that doc (Phase 5). A full, dedicated **Budget tab** (tracking total funds,
all expenses, not just casting fees) is explicitly deferred — noted for later, not
designed now.

## Contacts tab (rename candidate)

Visual CRUD for `staff_volunteers`, `sponsors`, and **`venues`** — worth calling out that
**venues currently has no admin UI at all**: `EventEditor.tsx` only has a read-only
`<select>` populated by `getAllVenues()`; there's no create/edit path anywhere in the app
today, so this tab would be the first place venues become manageable without touching the
database directly.

- List every entry per table (a reusable roster, not scoped to one event), each with an
  "assign to the current event" action + a role picker.
- For staff/volunteers, the role enum already exists and is already exactly what this
  needs: `staff_volunteers`/`event_staff_volunteers` (join) with roles `photographer |
  technician | doorman | artistic | volunteer | musician | entertainment | other` — modeled
  in the schema already, per `CLAUDE.md`, waiting on a UI. Good news, no new schema for
  this part.
- **Flag**: `events` already has both `photographer_id` (uuid, no enforced FK constraint
  in the DB — worth confirming at build time what it's actually meant to point at) and a
  free-text `photographer` column, and separately `performers`/`casting_applications` each
  have their *own* free-text `photographer` field too. These are likely two genuinely
  different concepts — "who's staffed to shoot this event" (event-level, assignable from
  the roster, what this tab is for) vs. "photo credit for this specific promo image"
  (per-performer, could be anyone, doesn't need to be on staff) — worth confirming that
  distinction explicitly before merging them into one mechanism.
- Needs to stay in sync with wherever venue/photographer already get set on an event
  (`EventEditor.tsx`'s dropdowns) — one source of truth, not two competing UIs writing the
  same relationship.

## Event Planning tab (the big one)

### Artist list + promo downloads
Builds directly on the `promo_text_sv`/`promo_text_eng` split already logged in
`multi-act-casting-plan.md`'s "Future phase" section — no new notes, just confirming the
dependency is already accounted for.

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

### Staffing & sponsor positions overview

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

### Show ordering, prep/cleanup/music/notes per act — mostly already covered
Good news here too: `performer_acts` already collects `stage_preparations`,
`pick_up_cleaning`, `act_notes`, and `audio_files` — all via the artist's own
`BookedArtistForm`, already part of the multi-act plan. `event_performers.display_order`
already exists for ordering. This piece of Event Planning is mostly a new **admin-facing
read/reorder UI** on data that's already being collected, not new schema.

### Full evening schedule / setlist
The most open-ended piece — doors time, intermission, host segments, sponsor shoutouts,
and the acts themselves interleaved into one running order. Nothing in the current schema
fits this shape (it's not just "acts in order," it's a mixed timeline of acts and
non-act items). Needs its own dedicated design pass once we're actually there — not
forcing a table shape from this description alone. Likely candidate shape to consider
later: a single ordered `event_schedule_items` table mixing act references and freeform
entries, but that's a placeholder thought, not a decision.

## Dashboard tab (last, by design)

Correctly sequenced last — it's a pure rollup (what's left to do, unfilled positions,
missing booking-form info from artists, etc.) over data that only exists once the tabs
above are built. No new schema of its own expected.
