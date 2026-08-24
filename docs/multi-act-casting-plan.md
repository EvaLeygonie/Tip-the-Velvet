# Multi-act casting applications — migration plan

**Status: closed 2026-08-25 — all 11 phases shipped and live-verified.** The
casting → booking → confirm pipeline fully supports multiple acts per application,
end to end, deployed to prod. Everything that came up along the way but wasn't part of
getting there — lower-priority features, deferred design questions — has been moved to
`docs/extra-features.md`; what stayed in this doc is done work, kept as history/context.
Nothing further is expected here.

Drafted 2026-08-18. Check items off as we go; leave notes inline (like
`docs/audit-findings.md` does) when a step turns out different than planned.

**Implementation note (added 2026-08-19, refined 2026-08-21):** schema/RPC changes (new
tables, columns, constraints, function bodies — mainly Phases 1 and 2) are delivered here
as exact SQL rather than run directly, since Claude Code's DB access is genuinely
read-only (verified, not just self-imposed — see chat history 2026-08-19). Application-
layer code (React/TS) still gets written and edited directly as usual — this only applies
to raw schema/DDL/RPC/data-migration work.

Split by whether real judgment is involved, not just DDL-vs-data: plain DDL (create table,
add column, RLS policies) *and* fully deterministic data operations (a plain
`INSERT ... SELECT` with no ambiguity, already verified safe against the live data) both
go to the user to paste directly into Supabase's own SQL editor. Lovable — also connected
to the same live database — is reserved for migration steps that genuinely need judgment
mid-process (e.g. the Eden/Florence consolidation in Phase 1 below: deciding what survives
when merging specific rows). Learned why the hard way on 2026-08-21: handed the Phase 1
backfill to Lovable as a "data migration," it regenerated its own version of the SQL
instead of running the exact script given, and reconstructed a stale reference
(`display_order`) to a column that had already been removed from the corrected schema
sketch. For anything fully deterministic, direct execution is more predictable than
relaying through a second model that restates rather than runs the instructions verbatim.

**Deployment-safety note (added 2026-08-19):** the database is shared with the live
production site — there's no separate dev/staging DB, so every schema change lands in
prod immediately. The frontend, however, only redeploys when a feature is actually
complete (Netlify free tier — limited deploy budget, currently ~1/day until the next
billing cycle in 8 days). That gap matters: **additive changes (new tables, new nullable
columns) are safe any time**, since currently-deployed code simply doesn't know they
exist. **Destructive changes (dropping/renaming columns, tightening constraints on
existing data) must wait until after the frontend code that stops depending on the old
shape has actually been deployed** — doing it earlier would break the live site instantly,
including for the casting/booking portal, which real artists may be using at any moment
(unlike the public casting form, which is currently closed to new submissions, so that
specific write path is lower-risk to change right now). Every phase below should be read
with this in mind — "done in the database" and "safe to build on in the frontend" are not
the same milestone as "safe to remove the old path."

## Problem

Right now one `casting_applications` row = one artist = one act, for one event. An artist
with more than one act to offer has to fill out the entire application form again for
each act (duplicate contact info, promo image, bio, terms agreement — everything except
the act fields), which:

- is a bad experience for the artist (confirmed real: `edenlostmodeling@gmail.com` has 3
  separate applications for the same event today, `florence.shimmermore.burlesque@gmail.com`
  has 2 — this is already happening, not hypothetical)
- clutters the admin casting review page with multiple rows per artist
- will actively break once we support multiple confirmed acts per performer per event,
  since `confirm_and_migrate_artist`'s `event_performers` upsert is keyed on
  `(event_id, performer_id)` — a second confirmed application for the same artist/event
  **silently overwrites** the first one's fee/travel data today. This plan fixes that as a
  side effect, not just works around it.

## Confirmed design decisions (2026-08-18)

1. **Review stays per-application, not per-act.** `review_status` (pending/yes/maybe/no)
   is one decision for the whole artist submission. The admin card gets tabs so each act's
   description/video can be read individually while deciding, but there's one status, not
   one per act.
2. **Which acts actually get booked is decided later, only for `review_status: yes`
   applications**, inside the "Offer Terms & Logistics" panel (today's fee/travel/
   accommodation editor in `CastingApplicationRow.tsx`). That panel should probably only
   be shown/relevant once `review_status = 'yes'`. Add a row of checkboxes — one per
   submitted act — at the top of that panel. Checking/unchecking an act live-recomputes
   the total offered fee.
3. **One fee value on the application, treated as the artist's rate "per act".** No
   per-act fee field on the public form. Total offer = `requested_fee × number of acts
   selected`, prefilled but still editable by the admin (matches today's behavior where
   `proposed_fee` can diverge from `requested_fee`).
4. **The offer email must list all the selected acts**, not just one act title — the
   `defaultYesBody`/mail-modal templates in `CastingApplicationRow.tsx` need to interpolate
   a list instead of a single `act_title`.

## What's already fine (don't touch)

Traced the whole pipeline before planning this — two tables already support what we need
and shouldn't need structural changes:

- **`performer_acts`** already allows many rows per `performer_id` — the *booked* side of
  the pipeline is basically ready for multi-act performers today.
- **`event_performers`** is already performer-level-per-event, not act-level — fee,
  travel, accommodation, dietary requirements, plus-one all already live here, keyed on
  `(event_id, performer_id)`. One artist with several acts at the same event should still
  only need one `event_performers` row. Good — no schema change needed here either.

The entire bottleneck is upstream: `casting_applications` (1 row = 1 act = 1 application)
and the two RPCs that assume that shape (`get_casting_application_by_token`,
`confirm_and_migrate_artist`).

## Proposed data model

**On `display_order` (corrected 2026-08-21)**: originally put on this new table, moved to
`performer_acts` instead after thinking it through with the user. The two tables mean
genuinely different things — `casting_application_acts` is a submission record (every act
anyone proposed, most never booked); `performer_acts` is the operational record (only
confirmed acts, already carrying the music/prep/notes that make a show run). Show order
belongs with the second group, for the same reason those other fields do: it isn't
meaningful — might not even be final — until an act is actually confirmed, and
`is_selected` here is set during offer negotiation, before the artist has even accepted.
Also worth naming: this isn't redundant with the already-existing `event_performers.
display_order`, which is *performer*-level lineup order — once one performer can have
multiple acts, that's a different axis from the actual show running order, since acts
from different performers typically interleave rather than group by performer.
Consequence for the Event Planning admin view (`admin-portal-roadmap.md`): once an act is
confirmed, everything it needs — name, description, video, music, prep notes, and now
running order — lives on `performer_acts` alone. No join back to
`casting_application_acts` needed for show-planning purposes at all; that table's job ends
once `performer_act_id` is set.

New child table:

```sql
create table casting_application_acts (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references casting_applications(id) on delete cascade,
  act_title text not null,
  act_description text not null,
  video_url text,
  is_selected boolean not null default false,  -- checked = included in the booking offer
  performer_act_id uuid references performer_acts(id),  -- set on confirm; links to the resulting booked act
  created_at timestamptz not null default now()
);

create index casting_application_acts_application_id_idx
  on casting_application_acts(application_id);
```

`casting_applications` loses `act_title`, `act_description`, `video_url`, `act_id` (all
move to the child table — `act_id` is replaced by looking up
`casting_application_acts.performer_act_id` instead). Everything else on the application
row is genuinely application-level already and stays put: email, city, country,
performer_name, promo_image_id, promo_text, instagram/other links, language,
agreed_to_terms, requested_fee, proposed_fee, needs_travel_costs, needs_accommodation,
travel_cost_amount, accommodation_notes, review_status, booking_status, access_token,
initial_reply_sent, admin_notes, performer_id, slug.

**Unique constraint — done and verified 2026-08-21.** Final shape
`(event_id, email, performer_name)`, not `(email, event_id)` as originally planned.
History: originally `(email, event_id,
slug)`, allowing multiple applications only because the slug embedded the act name. First
correction (2026-08-19) was going to tighten it to `(email, event_id)` — one application
per artist per event — deferred at the time because Florence Shimmermore's second
application was intentionally on hold (see below). **Second correction (2026-08-21,
the user's call)**: `(email, event_id)` alone is wrong — the same person can legitimately
run two distinct performer identities at once (a solo act and a separate dance-group act,
same email, different `performer_name`), and locking on email alone would have blocked
that real case. Landed on `(event_id, email, performer_name)` instead, which also happens
to match how `confirm_and_migrate_artist` already matches an existing performer — by
`(email, performer_name)`, not email alone — so this isn't a new identity rule, just
making `casting_applications` consistent with a rule the system already had.

**Both Florence's and Eden's duplicate applications are confirmed consolidated** —
verified by direct query after the SQL was run: Eden is down to exactly one application
row, the `unique_artist_per_event` constraint exists with the exact intended definition,
and a full-table scan for `(event_id, email, performer_name)` duplicates returns zero
rows. One real correction made while preparing this: the plan was initially to just
*invalidate* merged/duplicate rows (token nulled, audit note added) rather than delete
them, on the assumption that was more cautious — that turned out to be wrong, since it
would leave the row physically existing and still colliding on
`(event_id, email, performer_name)`, permanently blocking the very constraint it was
meant to make room for. Confirmed nothing else references `casting_applications` via
foreign key, so the plan changed to actually deleting merged rows once their content was
safely re-parented (acts moved to `casting_application_acts` under the surviving
application) and the merge history recorded in the survivor's `admin_notes` — audit
trail preserved without the row itself sticking around to block the constraint.

## Phased plan

### Phase 1 — Schema

**SQL drafted 2026-08-19, corrected 2026-08-21 before being run** — the first draft put
`display_order` on `casting_application_acts`; caught (by the user) that it belongs on
`performer_acts` instead before any of this was actually executed, so no migration/cleanup
needed, just a corrected version of the same DDL (see "On `display_order`" note above).
RLS mirrors `casting_applications`' own existing policies exactly (checked live via
`pg_policies` rather than guessed): `authenticated` gets full `ALL` access,
`anon`+`authenticated` get `INSERT` only (dormant until Phase 4's public form actually
uses it — safe to declare now regardless). Verified beforehand that no existing row has a
blank `act_title`/`act_description`, so the table's `NOT NULL` constraints won't choke on
legacy data once the backfill runs.

- [x] Create `casting_application_acts` (corrected SQL, RLS included) — run 2026-08-21.
- [x] Add `performer_acts.display_order int not null default 0`.
- [x] Backfill `casting_application_acts` — one row per existing `casting_applications`
      row at the time, `is_selected` set from `booking_status`, `performer_act_id`
      backfilled for already-confirmed rows.
- [x] Florence's 2 applications consolidated by hand, confirmed via direct query.
- [x] Eden's 3 applications consolidated the same way (merged duplicates deleted once
      re-parented), then unique constraint changed to `(event_id, email, performer_name)`
      — not `(email, event_id)` as first planned. Run and verified 2026-08-21: Eden down
      to exactly one application row, constraint confirmed live with the exact intended
      definition, zero remaining duplicates anywhere in the table.
- [x] **Done 2026-08-23** — see Phase 10 below. Dropped `act_title`, `act_description`,
      `video_url`, `act_id` from `casting_applications` once the frontend phases were both
      built and live-verified.
- [x] Regenerate `database.types.ts` — done 2026-08-21.

**Phase 1 is complete and verified.** Next up: Phase 2 (RPCs).

### Phase 2 — RPCs

**Done and verified 2026-08-21.** Deployed as `CREATE OR REPLACE` against the exact
existing signatures for the three modified functions, so no TypeScript-side changes were
needed to apply this — the currently-deployed frontend didn't notice anything changed.

Real gap caught and fixed before handing the SQL over, worth remembering for later
phases: RPC/DB changes go live in prod *immediately*, but the frontend that would consume
a new response shape doesn't deploy until its own phase ships. `get_casting_application_by_token`
and `confirm_and_migrate_artist` both had to stay backward-compatible — keep emitting the
old singular `performer_acts` key / `act_id` column exactly as before, *and* add the new
multi-act capability alongside it, not replace it outright. `confirm_and_migrate_artist`
additionally falls back to the old single-act path for any application with zero
`casting_application_acts` rows (protects against the casting call reopening before
Phase 4 ships the new public form and someone tries to confirm a pre-Phase-4 submission).

Verified afterward: pulled all 4 function bodies back from `pg_proc` and confirmed each
matches exactly what was written. Test-called `get_casting_application_by_token` against
Florence's real application (safe — pure read despite being `SECURITY DEFINER`) and
confirmed both the old singular `performer_acts` key *and* the new `acts` array resolve
correctly — Lightbringer's music/prep data present, Lure's correctly still empty.
`confirm_and_migrate_artist` wasn't test-invoked the same way since it writes; verified by
code review only, to be confirmed live the next time an application is actually confirmed.

- [x] New RPC `submit_casting_application(p_application jsonb, p_acts jsonb)` — inserts
      one `casting_applications` row + N `casting_application_acts` rows atomically.
      Uncalled by anything yet (Phase 4 wires it up), zero risk to what's live.
- [x] `get_casting_application_by_token`: adds `acts` as a JSON array (each with its
      nested `performer_acts` once confirmed), keeps the old singular `performer_acts`
      key for backward compatibility.
- [x] `confirm_and_migrate_artist`: loops over `casting_application_acts WHERE
      is_selected = true`, inserts one `performer_acts` row per act with an
      auto-assigned `display_order` (append-to-end per event, mirroring how
      `event_performers.display_order` was already auto-assigned). Falls back to the
      legacy single-act path when an application has no act rows at all yet.
- [x] `update_performer_act_via_token`: authorization broadened from "must match this
      application's single legacy `act_id`" to "this act belongs to the performer+event
      this application's token is scoped to" — strictly more permissive, nothing that
      worked before stopped working.
- [x] Admin-side toggle for `is_selected` needs no new RPC — `authenticated` already has
      full `ALL` access via Phase 1's RLS policy, so it's a plain `.update()` call,
      deferred to Phase 3/6's TS work.

### Phase 3 — Types & services
**Done 2026-08-21.** `tsc -b` confirms it — after these changes, the only remaining type
errors are all in `CastingForm.tsx` (Phase 4, not touched yet), and the RPC-name error
from calling `submit_casting_application` before it existed in the generated types is
gone. `confirmAndMigrateArtist` and `updatePerformerAct` needed no changes at all — both
already just pass IDs/tokens straight through to RPCs whose *signatures* didn't change
(only their internal SQL did, in Phase 2).

- [x] Added `CastingApplicationAct` type (`Tables<'casting_application_acts'>`) to
      `src/types/types.ts`, plus `CastingApplicationActInput` and a redefined
      `CreateCastingApplicationInput` — now `{ application: {...}, acts: [...] }` rather
      than one flat row, matching `submit_casting_application`'s two-jsonb-param shape.
- [x] `applicationService.ts`: `submitCastingApplication` now calls the
      `submit_casting_application` RPC instead of a plain insert, returns the new
      application's id. `getApplicationsFromEvent` now joins `casting_application_acts(*)`
      (new `CastingApplicationWithActs` type) — ready for Phase 5's tabs, structurally
      compatible with existing `CastingApplication[]`-typed state so nothing downstream
      broke. `confirmAndMigrateArtist`/`updatePerformerAct`: no changes needed.

### Phase 4 — Public casting form (`CastingForm.tsx`)

**Done 2026-08-21.** `tsc -b` and `eslint` both clean. Not yet tested live in a browser —
no browser tool available here; verified by type-check/lint only. `has_casting_call` was
checked (2026-08-21, see chat) and confirmed purely cosmetic — it only filters the
`/casting-call` listing page, nothing blocks a real submission for a "closed" event, so a
live test just needs the toggle flipped back on temporarily in the admin Event Editor.

- [x] Replaced the single act_title/act_description/video_url block with a repeatable
      list of act blocks (bordered, numbered "Akt 1/2/..."), an "Add another act" button
      (soft cap of 5, `MAX_ACTS`), and a remove button per block once there's more than
      one act.
- [x] ~~Reframe the fee field's label/helper text to make "this is per act" explicit~~ —
      checked the actual form, already done: it already reads "Requested fee **per act**"
      with "Our standard compensation is 1000kr **per act**" right above it. Nothing to
      change here.
- [x] Updated the duplicate-submission error handling for the new constraint —
      `unique_artist_act_per_event` → `unique_artist_per_event` in the error-message match,
      copy changed from "already applied for this act" to "already applied to this event"
      to match the new one-application-per-artist-per-event meaning.
- [x] Also updated (not originally listed, but required by the rewrite): the promo image's
      Cloudinary tags/context and the application `slug` both used to embed the act name —
      now keyed off the *first* act (image/tags) or dropped entirely (slug is now just
      `event-artist`, no act suffix, since one application no longer maps to one act).

### Phase 5 — Admin casting review page

Expanded 2026-08-19 with a dashboard-detail requirement (see below) — this changes the
`is_selected` default from what Phase 6 originally said, see the note in Phase 6.

- [x] `AdminCasting.tsx`: mostly unaffected structurally, confirmed true — it already
      renders one row per `casting_applications` row, and that row now naturally
      represents "one artist, possibly several acts" without needing new grouping logic.
      Data plumbing done 2026-08-21: `applications` state and `renderAppSection`'s
      `appsList` param retyped from `CastingApplication[]` to the new
      `CastingApplicationWithActs[]` (moved into `types.ts` from `applicationService.ts`
      for consistency with where the other shared domain types live) so the joined act
      data flows down to the row component.
- [x] **Section headers, done and broadened 2026-08-21** — originally planned as
      yes-3-numbers + lighter-maybe-2-numbers; the user asked for it on *every* section
      while testing, so all four now show an acts count next to the artist-count badge.
      Yes/maybe show the **chosen** count (`sum(is_selected)` — "do we have enough lined
      up for the show" / "how many are on the waiting list"); pending/no show the
      **total submitted** count instead, since selection isn't a meaningful concept for
      those yet. Yes-section keeps its existing price total alongside.
- [x] **Per-row act counter, done 2026-08-21** — format `chosen/total` on yes/maybe rows
      (e.g. Florence: `1/2`), plain total-only on pending/no rows (no "chosen/" framing,
      matches the section-header logic above). Ended up sharing a column with a design
      change made in the same pass: merged the language column into Location as a
      `(SV)`/`(EN)` suffix, freeing a full column (with its own label) for this counter
      rather than squeezing both into an abbreviated sliver — cleaner than either of the
      two options floated, since it reuses the existing label+value column pattern
      exactly rather than inventing an oddly narrow one.
- [x] **Page-level total, added 2026-08-22 (not originally planned)** — a small centered
      summary under the event picker: total artists (applications) and total acts
      submitted for the currently selected event, across every status bucket. Point of it
      per the user: comparing events against each other over time, once there's more than
      one event's worth of history to compare.
- [x] **Expanded-row act tabs, done 2026-08-22** — `CastingApplicationRow.tsx`'s act
      description block now shows a tab per act (only rendered when `acts.length > 1`),
      each labeled with its title and a `✓` if `is_selected`. Opens on the same act the
      collapsed row's title/badge already pointed at (shares the `primaryAct` logic from
      the title work above), so expanding a row doesn't jump to a different act than what
      was just visible. The video link moved out of the left column's generic "Media &
      Links" list — it's act-specific now, so it lives next to the active tab's
      description instead, using whichever act is currently selected (falls back to the
      legacy `application.video_url`/`act_description` if `acts` is empty, for safety
      against any row that somehow predates the Phase 1 backfill).
- [x] **Refined 2026-08-22**: video link repositioned onto the same row as the act tabs
      (flush right), icon-only below the `sm` breakpoint so it doesn't crowd out the tabs
      when there are several acts — only renders at all when the active act actually has
      a video. **Also added the missing piece the user caught was missing**: each tab now
      has a real checkbox toggling `casting_application_acts.is_selected` (via a new
      `updateActSelection` in `applicationService.ts` — plain `.update()`, no RPC needed,
      per Phase 2's note that `authenticated` already has full RLS access), wired through
      `AdminCasting.tsx`'s `handleToggleActSelected` with the same optimistic-update/
      rollback-on-error pattern as `handleStatusChange`. This is genuinely the core
      select/deselect mechanism Phase 6 needs — that phase now only has to add the fee
      math and email-template work on top of a toggle that already exists and persists.
- [x] **Collapsed-row title, done and refined 2026-08-21** — superseded what this bullet
      used to say ("show all act titles"), talked through with the user and landed on
      something better: one act → show it, unchanged. Several acts → show the first
      *selected* act's title (falls back to first-submitted if nothing's selected yet),
      plus a small neutral `+N` pill next to it (not competing with the gold italic
      styling) hinting there's more without literally listing every title. Deliberately
      not "whichever tab is currently open" — a collapsed row's title needs to stay
      stable for visual scanning, not shift based on incidental clicks. Complements
      rather than duplicates the `chosen/total` counter above — the pill answers "is
      there more here," the counter answers "how many have we actually chosen."

### Phase 6 — Offer terms & logistics panel

**Design change (2026-08-19)**: originally planned as yes-only with all acts pre-checked.
Two things changed that:

1. **Default is now unchecked (`is_selected` starts `false`, matches the schema default
   already written above)**, not "all checked." Reasoning from the admin-dashboard work
   in Phase 5 — an untouched application needs to genuinely read `0/x`, which only works
   if nothing is selected until the admin deliberately picks acts. Minor added friction
   for the common single-act case (one extra checkbox click before sending an offer), but
   it also means an offer can never go out for an act nobody actually reviewed.
2. **Act selection isn't yes-only anymore.** For `maybe` applications, the same
   `is_selected` flag doubles as "this specific act is the one we're interested in /
   want on the waiting list" — same column, reused with different downstream meaning, not
   a second field. The full fee/logistics machinery below (checkbox → live total →
   send-offer email) still only applies to `yes`; for `maybe`, it's just the bare
   checkboxes with no fee math or email attached — a lightweight "mark relevant acts"
   control, not the full offer panel.

- [x] **Done 2026-08-24** — the whole Logistik-panel (fee/travel/accommodation/role editing
      and "Update Offer") now only renders when `application.review_status === 'yes'`; a
      single wrapping condition around the existing panel `<div>`, no changes to what's
      inside it.
- [x] **Done 2026-08-21** — act-selection checkboxes, live in both `yes` and `maybe` rows
      (same underlying `is_selected` column and toggle action, per design above). Ended up
      living on the act tabs themselves rather than a separate row, with `onToggleActSelected`
      persisting immediately (own dedicated action, not bundled into `updateApplicationLogistics`
      — see Phase 5's tab-selection entry for the full implementation).
- [x] **Done and refined 2026-08-21/22** — live fee recompute, ended up more sophisticated
      than "requested_fee × checked-count" alone:
  - The offer total auto-recomputes whenever act selection changes, but is driven by an
    editable **per-act rate** (`perActRate`) rather than the artist's `requested_fee`
    directly — starts equal to `requested_fee`, but a manual edit to the total field
    derives a new rate from it (`total ÷ current act count`, rounded), which then becomes
    what further act-count changes multiply/divide against. The artist's original ask
    stays visible as an unchanging one-line reference (`Önskat: 1000 SEK × 2 = 2000 SEK`,
    always computed from the real `requested_fee`, independent of any admin override).
  - Single-act applications are entirely unaffected — same plain editable total as
    always, no rate/multiplier concept involved.
  - **"Update Offer" now lights up gold (`btn-gold`/`btn-gold-glow-active`) when there's
    an actual unsaved change, and sits inactive/discreet (`btn-gold-inactive`, disabled)
    otherwise** — added after confirming the auto-recompute is genuinely local-only (not
    a database write); the button remains the only two ways `proposed_fee` actually
    persists (the other being send-offer, which saves internally too). Tracked via an
    explicit `isLogisticsDirty` flag (not a live comparison against `application`, since
    the initial `offerFee` is itself a computed value a naive comparison would mismatch
    on load) — set by any manual edit *and* by the auto-recompute effect, cleared on
    successful save via either path.
- [x] **Done 2026-08-22** — `defaultYesBody`/`defaultNoBody`/`defaultMaybeBody` all list the
      relevant acts (via a `formatActList` natural-join helper) instead of one `act_title`,
      with singular/plural wording based on count. "No" mentions everything submitted
      (full rejection); "yes"/"maybe" mention the selected acts (falling back to all
      submitted if none are selected yet). Subject lines only name a specific act when
      there's exactly one, to avoid an unwieldy subject with several.
- [x] **Bug found and fixed 2026-08-22/23** — two related staleness bugs in the live fee
      recompute, both found via real testing against a two-act application moved between
      review statuses:
  1. **Stale `proposed_fee` on mount.** `offerFee`'s initializer trusted any truthy saved
     `application.proposed_fee` unconditionally, before checking act count — so moving a
     row to `yes` could show a stale single-act fee (saved before any acts were selected)
     until the admin touched a checkbox and forced a recompute. Fixed: multi-act
     applications now always compute fresh from the current act selection on mount; only
     single-act rows still trust a saved `proposed_fee` directly. `isLogisticsDirty` also
     now starts `true` when the saved value doesn't match the fresh computation, so
     "Update Offer" visibly signals it needs pressing rather than the number silently
     self-correcting with no cue.
  2. **Preview/database divergence.** Even after fix 1, the corrected total was still only
     local component state until "Update Offer" (or send-offer) was actually clicked. The
     admin could open the mail-compose modal, see the correct live total in the draft (it
     reads local state), and separately check the artist's confirmation link — which reads
     `proposed_fee` straight from the database via `get_casting_application_by_token` — and
     see the old, unsaved figure. Fixed in `handleOpenMailModal`: for `yes` applications
     with unsaved changes (`isLogisticsDirty`), it now awaits `handleSaveLogisticsOnly()`
     before building the subject/opening the modal, so the database is already in sync the
     moment a draft becomes visible — not deferred until send. (Send-offer itself was
     already safe; `handleSendCastingMail` has always persisted the final fee right after a
     successful send.) Scoped to `yes` only, since `no`/`maybe` templates never reference
     the fee.

### Independent addition (2026-08-23, not originally planned): bulk-email booked artists

A mail icon in the Yes-section header (next to the artist-count badge, same `Mail` icon
and square-button styling as the per-row "Contact artist" button) opens a modal for
emailing every booked artist at once. Scoped to `booking_status === 'confirmed'`, not just
`review_status === 'yes'` — "booked" reads as actually-confirmed, not merely offered/
awaiting-response; flagged this scoping choice to the user rather than assume silently.

- Two full subject+body pairs (Swedish/English) in one modal, not one field with a
  language toggle — admin writes both versions up front, each recipient gets the one
  matching their own `application.language`.
- Default subject template: `Inför {event}` (sv) / `Regarding {event}` (en), using the
  currently-selected event's title. Default body: just the sign-off
  ("Varma hälsningar,\nTip the Velvet" / "Best regards,\nTip the Velvet") — greeting and
  content left for the admin to fill in.
- **Edge function change**: `send-casting-email.ts` always auto-prepended a personalized
  `Hej {name}!`/`Darling {name},` greeting, which doesn't fit a bulk "Hey everyone!"
  send. Added an optional `greeting` field to override it — backward compatible, the
  existing per-row single-artist flow doesn't pass it and keeps its exact prior behavior.
  Bulk send passes `Hej allihopa!` / `Hey everyone!`.
- Sends are fired via `Promise.allSettled` (one fetch per recipient) so one failed
  delivery doesn't block the rest; reports how many of N failed rather than an all-or-
  nothing error.

### Phase 7 — Artist decision portal

**Done 2026-08-23.** `tsc -b` and `eslint .` both clean. Not yet tested live in a browser.

- [x] Added `get_casting_application_by_token`'s type shape to the frontend:
      `CastingApplicationPortalData`/`CastingApplicationActFull`/`ConfirmedActDetails` in
      `types.ts`, replacing the ad hoc `ExtendedCastingApplication` interface that used to
      live only inside `BookedArtistForm.tsx` — now one shared type all three portal
      components (`ArtistBookingPortal`, `BookingDecisionCard`, `BookedArtistForm`) use.
- [x] The act list itself moved to `ArtistBookingPortal.tsx`'s header (under the artist
      name, where the old singular "Akt: X" line already lived) rather than into
      `BookingDecisionCard` — user asked for it to stay in that position. Shows every
      *selected* act (`casting_application_acts.is_selected`), joined with a gold "✦"
      separator (the same glyph already used on the Dresscode page) when there's more
      than one. **Refined 2026-08-24**: dropped the "Akt:"/"Akter:" label prefix entirely
      per user feedback — just the name(s), no longer introduced by a word first.
- [x] `BookingDecisionCard.tsx` itself: the confirmation-modal copy and the "negotiate via
      email" `mailto:` subject now both name every selected act (via a shared
      `formatActList` natural-language join, extracted from `CastingApplicationRow.tsx`
      into `lib/utils.ts` so both the admin and artist-facing sides use the exact same
      "X" / "X and Y" / "X, Y and Z" phrasing) instead of the one `act_title`. Accept/
      decline flow and fee/travel/accommodation summary otherwise unchanged — those stay
      bundled totals, not broken out per act (nothing asked for that yet).

### Phase 8 — Confirm & migrate

**Done 2026-08-23.** Verified live via the user's 3-act "Eva Leygonie" test application:
querying `performer_acts` after confirming shows exactly 3 rows (one per selected act,
sequential `display_order`), and the flow produced the single expected `event_performers`
row per Phase 2's design.

- [x] Covered by the Phase 2 RPC change — verified end-to-end that accepting creates one
      `performer_acts` row per selected act and exactly one `event_performers` row.

### Phase 9 — Booked artist form

**Tabs done 2026-08-23** (the price-breakdown line item below is still open — not asked
for yet). `tsc -b` and `eslint .` both clean. Not yet tested live in a browser.

**Architecture principle, confirmed explicitly 2026-08-21** (the user asked, worth stating
outright rather than leaving implicit): once `performer_act_id` is set on a
`casting_application_acts` row, that row is frozen — a record of what was originally
submitted/offered. All further editing happens only on `performer_acts` (and
`performers`/`event_performers` for the shared fields), never written back to
`casting_applications`/`casting_application_acts`. This isn't new behavior, just making it
explicit for the multi-act case — the single-act version of `BookedArtistForm` already
works this way today (`update_performer_act_via_token` writes to `performer_acts` only).
Keeps the two tables' meanings clean: applications/acts = what was proposed and decided,
performer-side tables = what's actually happening.

- [x] **Done 2026-08-23.** `BookedArtistForm.tsx` now derives one `ActFormState` block per
      confirmed act (`application.acts` filtered to `is_selected`, each carrying its own
      nested `performer_acts` data), with a tab bar — one pill per act, same visual
      language as the admin's act tabs (`bg-accent/20 border-accent` active /
      `bg-black/30 border-accent/20` inactive) — shown whenever there's more than one.
      Kept act name/description editable per act after all (the plan's "already fixed"
      note read as "already correctly initialized," not "should become read-only" — no
      indication the artist should lose the ability to fix a typo post-confirmation), so
      every act field ended up per-tab: name, description (sv/eng), audio tracks
      (including the whole add-track upload flow), stage preparations, pick-up/cleaning,
      and notes. The "new track" draft (title/artist/temp file) is shared scratch state
      for whichever tab is active and is explicitly cleared on tab switch, so a half-typed
      draft can never get attached to the wrong act. Falls back to a single tab sourced
      from the old singular `performer_acts`/`act_id` fields for pre-multi-act
      applications (no `casting_application_acts` rows at all) — identical to the
      form's exact original single-act behavior, no regression there. Bio,
      dietary/plus-one/travel-receipts stayed shared outside the tabs, unchanged. Submit
      now loops `actsFormData` and calls `updatePerformerAct` once per act.
- [x] **Done 2026-08-24, simplified same day per user feedback** — resolved the open
      question below by *not* persisting a separate per-act rate column: `proposed_fee`
      (fixed at offer time, no fee field exists in this form so it can't drift from what
      was agreed) is the only number shown, with the act count folded in as
      `"{fee} SEK for {N} acts"` rather than a `÷`/`≈` breakdown — no per-act rate
      displayed at all in the end, single-act just shows the plain fee with no "for N
      acts" suffix. Travel reads `formData.travel_covered` live, since that's the actual
      editable "final reimbursement" field already in this same form (Sektion 3) — the
      summary updates as the artist fills it in. **The travel line and the "=" total that
      goes with it only render when travel is actually nonzero** — nothing to add means
      nothing to calculate, so an artist with no travel reimbursement just sees the fee
      line alone, no dangling "= Total" repeating the same number.

### Phase 10 — Cleanup & testing

**Done 2026-08-23.** Frontend deployed to `main`/prod first; user then ran a real 3-act
smoke test live (create → review as yes → select acts → confirm → open `BookedArtistForm`)
and confirmed it worked end to end before anything destructive touched the DB — the
deployment-safety gate held as designed.

- [x] Full smoke test — done live by the user directly on prod (no staging exists): 3-act
      application through review → offer → artist confirm → `BookedArtistForm`. Confirmed
      working before the column drop below was even attempted.
- [x] Dropped `act_title`, `act_description`, `video_url`, `act_id` from
      `casting_applications`. Turned out not to be a plain `DROP COLUMN` — three RPCs still
      read or wrote them and had to be fixed first (`CREATE OR REPLACE`, same signatures,
      verified live via `pg_get_functiondef` afterward):
  - `submit_casting_application` stopped writing the first act's title/description/video
    onto the parent row (they only ever belonged on `casting_application_acts`).
  - `confirm_and_migrate_artist` lost its pre-Phase-4 fallback branch (provably
    unreachable — Phase 1's backfill plus `submit_casting_application` always inserting
    ≥1 act row means every application has at least one `casting_application_acts` row
    now) and stopped writing `casting_applications.act_id` in its final `UPDATE`.
  - `get_casting_application_by_token` dropped the legacy singular `'performer_acts'` key
    (resolved via the now-gone `act_id`) — `'acts'` is the only source from here on.
  - A broad `ilike` search across every function body (not just a targeted grep — the
    first regex attempt used `\b` for a word boundary, which Postgres's regex flavor
    treats as a literal backspace character, not `\y`, so it silently missed
    `get_casting_application_by_token`; re-run without it before trusting the "only 3
    functions" conclusion) also confirmed no view or trigger touched these columns.
  - Frontend fallback code that depended on these columns (`CastingApplicationRow.tsx`,
    `ArtistBookingPortal.tsx`, `BookingDecisionCard.tsx`, `BookedArtistForm.tsx`) was dead
    for the same reason the RPC branch was — removed rather than left as an inert shim,
    replaced where relevant with "fall back to every submitted/all acts if none is
    selected yet" (reusing the pattern `CastingApplicationRow.tsx` already had), not a
    reference to the dropped columns.
  - `database.types.ts` regenerated afterward and confirmed `casting_applications.Row` no
    longer lists the four columns.
- [x] Re-ran `npm run build` / `tsc -b` / `eslint .` — all clean.

### Phase 11 — Post-offer changes & re-confirmation (added 2026-08-18)

**The full proposed flow (revert to `negotiating`, notify the artist by email, force a
re-confirm) moved to `docs/extra-features.md` (2026-08-25)** — lower priority given
current deadlines, per the user. What actually shipped is the lighter fix below, which
covers the real bug that was blocking live data.

**Lighter-weight fix shipped 2026-08-24 — the sync half of this phase, not the full
re-negotiation flow.** Triggered by the exact scenario Phase 11 was written for actually
recurring: Eden backed out after being slated as headliner, Florence was offered Eden's
spot (her existing 2 acts plus the headliner role), accepted, and confirmed by email —
same out-of-band pattern as her original consolidation above. The admin then corrected her
`lineup_role` on the (already-confirmed) application via the normal Logistik-panel — and it
silently never reached her `event_performers` row, exactly the divergence bug this phase
already predicted. Separately, Seymour Bottoms' offered 800 SEK travel reimbursement had
the same gap: present on `casting_applications`, never on `event_performers`.

Didn't build the full proposed flow (revert to `negotiating`, new email, re-confirm — now
in `docs/extra-features.md`) — that's a real, separate feature (notifying the artist a
completed booking's terms changed) still worth doing, but not what was blocking real data
right now. Instead:
- New `syncConfirmedBookingTerms(eventId, performerId, { finalFee?, travelCovered?,
  lineupRole? })` in `applicationService.ts` — same conditional-field-update discipline as
  `updateApplicationLogistics`, plain `.update()` on `event_performers` (RLS already
  allows it, no RPC needed).
- Wired into `AdminCasting.tsx`'s `handleUpdateLogisticsStatus` — after
  `updateApplicationLogistics` succeeds, if the application being edited was already
  `booking_status === 'confirmed'`, immediately syncs the same fee/travel/role values onto
  its `event_performers` row. Applies uniformly to both call sites that reach this
  function ("Update Offer" and send-offer-mail), no per-call-site changes needed.
  Deliberately *not* gated behind a confirmation prompt or a status revert — for this
  narrower "keep two records in sync" fix, the admin editing the panel is already the
  deliberate action.
- Seymour's and Florence's existing wrong data corrected by hand via direct SQL (same
  established workflow as every other data fix in this doc) — not left for the sync
  mechanism to fix retroactively, since it only runs on the *next* edit.

### Travel cost — estimate vs. actual as two real columns — moved to `docs/extra-features.md` (2026-08-25)

**Display-only fix shipped 2026-08-24** (stays here as history): Luminous Starling's
portal showed "Offered fee 1000kr" with no mention of travel at all, even though
`needs_travel_costs` was true and 1000 SEK had been offered — because Sektion 4 only ever
checked `travel_covered > 0`, and hers was still 0 (real state — she hadn't booked her
trip and filled it in yet). "No travel line" and "travel not settled yet" looked identical
to the artist. Fixed in `BookedArtistForm.tsx`'s Sektion 4 — a third state between "no
travel line" (not part of the offer) and the firm "+ Travel: X SEK / = Total" (settled):
when travel is part of the offer but `travel_covered` is still 0, an italic "+ Travel
reimbursement to be added (estimated ~{offered amount} SEK)" line, deliberately with
**no** "= Total" line under it. Also updated the input field's placeholder to show the
real offered estimate.

The deeper "should this genuinely be two columns" design question — deliberately deferred,
not urgent, nothing currently broken by leaving it as one column — see `extra-features.md`
for the full writeup and the one open sub-question that's still unresolved.

### An artist retracting/declining after selection — moved to `docs/extra-features.md` (2026-08-25)

Grouped there with the Phase 11 re-confirmation flow, since both are "something changed
after the offer was sent, and downstream state needs to react correctly." Originally
surfaced by a real case (Eden backing out after being selected) — see that doc for the
full writeup.

### accommodation_notes visibility — designed 2026-08-25, see `admin-portal-roadmap.md`

Noted while fixing `submit_casting_application` (2026-08-21) — `accommodation_notes` (the
conditional "allergies/travel/logistics" free text collected on the public form when
travel or accommodation is needed) shows up in the admin's `CastingApplicationRow` but
never reaches the artist-facing `BookedArtistForm`, and has nowhere to live for a
confirmed artist. Now folded into a real design — a general, admin-editable
`event_performers.logistics_notes`, pre-filled from this field at confirm time — logged in
`admin-portal-roadmap.md`'s Event Planning section rather than here, since that's where it
belongs (operational show-running info, not a casting decision). Not built yet.

## Open questions to settle before Phase 6 (not blocking earlier phases)

- Is act selection editable by the admin right up until the artist confirms, or does it
  lock once the offer email is sent? (Leaning toward: editable until confirmed, artist
  just sees whatever the latest state is when they open the link — simplest, matches how
  fee/travel are already editable post-send today.) Phase 11 extends this same question to
  *after* confirmation too.
- Any practical cap on acts per application? Not a hard requirement, but the "Add another
  act" button probably wants a soft limit (e.g. 5) just so the form doesn't get absurd.
- ~~Should the per-act base rate be persisted explicitly...~~ **Resolved 2026-08-24, no**:
  the Phase 9 price-breakdown display reverse-divides `proposed_fee` for display only, see
  that entry above. Left open for any *future* partial-refund/discount logic, which isn't
  built yet — revisit if that ever needs a real per-act number to compute against, rather
  than just to show one.

## Florence: resolved manually 2026-08-21

Superseded — see the Phase 11 note above for the full resolution. Originally held
(2026-08-18) until Phase 11 shipped; the user decided to move on it sooner via a manual
fix plus direct email confirmation rather than wait, once it became clear the automated
flow was still several phases away.

## Independent enhancement: performer role (host/headliner)

Added 2026-08-18. **This doesn't depend on the multi-act work above and could be done
before, during, or after it** — it's a single new column plus UI touch points in the same
files, unrelated to the one-app-many-acts restructuring. Sequence wherever convenient.

**What**: mark a booked performer as `host` / `headliner` / (default) `performer`, so the
board can see at a glance who's running the show vs. headlining vs. a regular lineup slot
— directly useful for the `/admin/event-plan` work mentioned in `CLAUDE.md` as the next
big admin build.

**Where it needs to live**: the role is decided by the admin *before* the offer is sent
(so it can appear in the offer email and on the artist's accept page), but
`event_performers` — the natural home for it — doesn't exist until confirmation. So this
needs to follow the same pattern fee/travel already use: live on `casting_applications`
first, get copied onto the new `event_performers` row at confirm time.

**Done 2026-08-24** (pending the user running the schema SQL — code written assuming it
exists, verified once regenerated types confirm it does, per this doc's established
deployment-safety pattern for every prior DB change).

- [x] **Schema**: `event_performer_role` enum (`performer | host | headliner`), NOT NULL
      DEFAULT `'performer'`, added to both `casting_applications` and `event_performers`.
      Went with `lineup_role`, not the plainer `role` — exactly the preemptive reasoning
      already written above.
- [x] **`confirm_and_migrate_artist`**: copies `casting_applications.lineup_role` onto the
      new `event_performers.lineup_role` at confirm time, same `INSERT`/`ON CONFLICT DO
      UPDATE` treatment as `final_fee`/`travel_covered`. No new client param.
- [x] **Admin UI**: role `<select>` (Artist/Host/Headliner — Performer/Host/Headliner)
      added to the Logistik-panel's checkbox column in `CastingApplicationRow.tsx`, same
      save action as fee/travel (`handleSaveLogisticsOnly`/send-offer both persist it).
      Only rendered when `review_status === 'yes'`, following the gating done just above.
- [x] **Admin list at-a-glance**: small gold badge (Crown/Mic2 icon) next to the performer
      name in the collapsed row header — only for Host/Headliner, nothing shown for the
      default Performer case.
- [x] **Offer email**: `logisticsText` (the bulleted terms block `defaultYesBody` builds
      from) gets a 4th "• Roll: ..." bullet only when Host/Headliner. No changes needed in
      `send-casting-email.ts` — it just relays whatever `bodyText` the admin-side template
      already composed, it was never role-aware and doesn't need to be.
- [x] **`BookingDecisionCard.tsx`**: a role row in the offer summary box (matching the fee/
      travel/accommodation rows already there) plus folded into the confirmation modal's
      "you hereby confirm participating..." text — both only when Host/Headliner.
- [x] **`BookedArtistForm.tsx`, added 2026-08-24 per user follow-up**: role also shown in
      Sektion 4 (the same read-only "agreed compensation" card the gage lives in, "part of
      the offer" per the user) — Host/Headliner only, nothing for the default Performer.
      Centered under the fee/total lines per follow-up feedback the same day (the numeric
      breakdown above it stays left-aligned; the role reads as a status line under it, not
      another line in the same ledger).
- [x] Swedish/English copy for all three role labels — Artist/Performer, and **both
      Host and Headliner kept as the English word in Swedish too** (not
      Programledare/Huvudakt as first drafted) — per explicit user correction: these are
      the terms the local burlesque community actually uses regardless of language. Both
      ended up plain strings rather than `t()` calls at their call sites, since neither
      differs between languages.

### Independent addition (2026-08-24, not originally planned): floating back-links site-wide

While polishing `ArtistBookingPortal.tsx`, the user asked for an admin-only "back to
Casting" arrow on that page (only meaningful for an admin previewing/testing a link — the
artist themselves is never logged in and has nowhere to go back to), which grew into a
site-wide pass: every "go back" arrow on a page long enough to need it now floats in a
fixed position instead of only being reachable by scrolling back to the top.

- New shared `<FloatingBackLink to label />` component (`src/components/FloatingBackLink.tsx`)
  and one `.floating-back-link` class rather than repeating positioning utilities at each
  call site. **Bug caught by the user on first look**: the initial `top-36` (144px) sat
  right under the logged-in admin sub-nav row instead of clearing it — the unscrolled nav
  is a 100px logo plus `py-4` padding plus that ~57px sub-nav row, topping out around
  190px. Moved to `top-52` (208px) for real margin below it in every state.
- Swapped in on `EventDetail.tsx`, `PerformerDetail.tsx` (both its "back to event" and
  "back to performers" branches), `admin/AddPerformer.tsx`, `admin/EventEditor.tsx` — the
  pages with long scrollable content. Left `AdminLogin.tsx` and `NotFound.tsx` alone
  (short, centered, non-scrolling — nothing to float away from).
- `ArtistBookingPortal.tsx`: new floating link to `/admin/casting`, gated on
  `useAuth().user` being truthy — invisible to the artist, visible only when an admin is
  the one looking at the link.

## Returning artists' promo content vs. their existing profile — moved to `docs/extra-features.md` (2026-08-25)

Along with its dependent "event-plan promo downloads" idea. Verified live before moving —
two returning performers' current profiles genuinely still differ from what they wrote on
their casting applications (real content differences, not just stale copies), confirming
the underlying bug this design fixes is real. Not time-pressured: all performers for the
current season are already cast, and the two returning artists among them kept their
existing profiles untouched, exactly as the current (unfixed) code does today.
