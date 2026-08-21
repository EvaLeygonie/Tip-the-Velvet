# Multi-act casting applications — migration plan

Drafted 2026-08-18. Not started yet — this is the plan to work through phase by phase.
Check items off as we go; leave notes inline (like `docs/audit-findings.md` does) when a
step turns out different than planned.

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
- [ ] **Still deferred until the frontend phases (4-9) are built *and deployed*** (deployment-
      safety note above): drop `act_title`, `act_description`, `video_url`, `act_id` from
      `casting_applications` — the currently-deployed `CastingForm`/`AdminCasting`/
      `BookingDecisionCard`/`BookedArtistForm` all still read/write these columns directly
      today; dropping them now would break the live site immediately, not just once we
      redeploy.
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

- [ ] `AdminCasting.tsx`: mostly unaffected structurally — it already renders one row per
      `casting_applications` row, and that row now naturally represents "one artist,
      possibly several acts" without needing new grouping logic.
- [ ] **Yes-section header, expanded to 3 numbers**: artist count (row count, already
      exists) · **chosen-act count (new — `sum(is_selected) across every act in every
      "yes" application)`** · total expected price (`totalBudget`, already exists, still
      correct since `proposed_fee` already holds the bundled total). Point of this: "do we
      have enough acts lined up for the show," which the artist count alone can't answer
      once one artist can carry 2+ acts.
- [ ] **Maybe-section header, mirrored but lighter**: artist count + chosen/waitlisted-act
      count. No price — nothing's been formally offered at `maybe`.
- [ ] **Per-row act counter**, format `chosen/total` (e.g. Florence submitted 2 acts, 1
      is wanted → `1/2`). Shown on rows in the **yes** and **maybe** sections (selection
      is meaningful in both, see Phase 6). An application nobody has acted on yet reads
      `0/x` — not `x/x` — so the counter only climbs as a deliberate admin choice, never
      starts pre-filled (this is the source of the Phase 6 default change below).
      `pending`/`no` rows can still show the plain submitted-act count for at-a-glance
      info (`x acts`), just without the "chosen/" framing, since selection isn't
      actionable there yet.
- [ ] `CastingApplicationRow.tsx`: add tabs (or an accordion) for act description/video
      when `acts.length > 1`. Show all act titles in the collapsed header, not just one.

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

- [ ] Fee/travel/accommodation editing and the send-offer flow stay gated to
      `review_status === 'yes'`, as originally planned.
- [ ] The act-selection checkbox row itself is available for both `yes` and `maybe`
      (different surrounding UI/copy per status — full panel for yes, bare checklist for
      maybe — same underlying `is_selected` column and toggle action).
- [ ] Recompute displayed total fee live as `requested_fee × checked-count` (yes only),
      while keeping the field editable (admin can still hand-override the total).
- [ ] Update `defaultYesBody`/mail templates to list the selected acts instead of one
      `act_title`.
- [ ] Persist `is_selected` per act alongside the existing `updateApplicationLogistics`
      call (or a sibling call) for yes; a simpler direct toggle (no fee recompute) for
      maybe.

### Phase 7 — Artist decision portal
- [ ] `BookingDecisionCard.tsx`: show the list of selected act titles instead of one, next
      to the bundled total fee. Accept/decline flow otherwise unchanged.

### Phase 8 — Confirm & migrate
- [ ] Covered by the Phase 2 RPC change — verify end-to-end that accepting creates one
      `performer_acts` row per selected act and exactly one `event_performers` row.

### Phase 9 — Booked artist form

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

- [ ] `BookedArtistForm.tsx`: fetch/display the array of confirmed `performer_acts` for
      this application (via the updated token RPC) instead of one. Add tabs — one per act
      — for the act-specific fields (act name/description already fixed at this point,
      but audio tracks, stage preparations, pick-up/cleaning, act notes are still
      per-act and need their own tab each). Bio, dietary/plus-one/travel-receipts stay
      shared, outside the tabs, exactly as now.
- [ ] **New: show the agreed price breakdown at the bottom of the form**, read-only —
      something like `fee (1000) × acts (2) + travel (300) = Total: 2300`. Needs the
      per-act base rate to still be known at display time, not just the collapsed total —
      see the open question below about persisting it explicitly rather than
      reverse-dividing `final_fee` by act count (division breaks the moment an admin
      hand-adjusts the total for a discount/bonus that isn't an even multiple).

### Phase 10 — Cleanup & testing
- [ ] Drop the now-unused columns from `casting_applications` (see Phase 1, deferred here
      since code must stop reading them first).
- [ ] Full smoke test: submit a 3-act application → review as yes → select 2 of 3 acts →
      send offer → confirm as artist → verify 2 `performer_acts` rows + 1
      `event_performers` row → fill in `BookedArtistForm` per-act tabs → save.
- [ ] Re-run `npm run build` / `npm run lint`.

### Phase 11 — Post-offer changes & re-confirmation (added 2026-08-18)

**Confirmed real bug, not hypothetical**: I checked — today, editing fee/travel/
accommodation in the "Offer Terms & Logistics" panel (`CastingApplicationRow.tsx:554-653`)
has **zero gating on `booking_status`**. The admin can change the numbers freely after the
offer's been sent, or even after the artist has already confirmed, with no warning and no
notification to the artist. Worse: since `confirm_and_migrate_artist`'s `event_performers`
upsert is `ON CONFLICT (event_id, performer_id) DO UPDATE SET final_fee=…` (a full
overwrite, not additive), editing `proposed_fee` post-confirmation changes the number the
admin sees in `AdminCasting`'s budget total (which reads `proposed_fee` off the
application row) **without touching the artist's actual booked `event_performers.final_fee`
at all** — the two numbers silently diverge. This needs fixing regardless of the multi-act
work, but the multi-act work makes it urgent, since "add another act to an already-
confirmed artist" is now a real, expected operation, not an edge case.

Proposed flow:
- Any of: changing which acts are selected, changing the fee, or changing travel/
  accommodation terms, **after `initial_reply_sent = true`**, should:
  1. Revert `booking_status` away from `confirmed` (or `pending_confirmation`) to
     `negotiating` — this enum value already exists on `booking_status` and is currently
     defined-but-never-used anywhere in the app, so this is a free, semantically correct
     re-use rather than a new column.
  2. Send the artist a new email (new edge function template, or a variant of the
     existing offer email) pointing at their same portal link, explaining the terms
     changed and asking them to review again.
  3. `ArtistBookingPortal.tsx` already branches purely on `booking_status === 'confirmed'`
     (`isConfirmed`, line 73) to decide whether to show `BookingDecisionCard` or
     `BookedArtistForm` — so reverting the status is enough to automatically kick the
     artist back to the decision card with no portal restructuring needed. Only need to
     adjust `BookingDecisionCard`'s copy to distinguish "new offer" vs. "updated offer,
     please re-confirm."
  4. `CastingApplicationRow.tsx`'s existing `isAwaitingConfirmation` boolean is
     `review_status === 'yes' && initial_reply_sent && booking_status !== 'confirmed'` —
     already exactly true the moment `booking_status` moves off `confirmed`, so the row
     automatically goes back to the existing amber "awaiting confirmation" styling for
     free too (this is what "the row should get back to orange" already maps to — no new
     color needed).
  5. Admin-side: don't just silently allow the edit — surface a confirmation prompt when
     editing terms on an application that's `pending_confirmation` or `confirmed`
     ("This artist already confirmed different terms — saving will ask them to
     re-approve before they can continue"), so it's a deliberate action, not an accident.
- **Open question**: what happens to the already-created `performer_acts`/
  `event_performers` rows (and anything the artist already filled into
  `BookedArtistForm` — audio tracks, stage prep notes) while a re-confirmation is
  pending? Recommend: leave them untouched until the artist actually re-confirms — a new
  "reconfirm" action (extends the Phase 2 RPC work) reconciles everything atomically then
  (adds `performer_acts` rows for newly-added acts, updates `event_performers.final_fee`/
  `travel_covered` to the new total). Don't half-apply changes on save — avoids a state
  where the DB reflects unconfirmed terms if the artist never responds.
- **Immediate trigger for this phase, resolved manually 2026-08-21 — what this phase
  needs to eventually automate.** Florence Shimmermore had "The Lightbringer" confirmed
  (fee 1000) and a second act "The Lure" sitting as a separate, never-contacted
  application. Held per the original decision until asked to move on it: emailed her the
  new combined terms (2000 SEK total for both acts, 700 SEK travel unchanged — travel
  doesn't double just because there's a second act, she's still making one trip), she
  confirmed in writing, then by hand: re-parented "The Lure"'s act row onto the surviving
  "Lightbringer" application, created its `performer_acts` row directly (mirroring what
  `confirm_and_migrate_artist` will eventually do automatically), updated
  `event_performers.final_fee` to the new total, deleted the now-empty duplicate
  application row. Verified correct afterward via direct query, not just assumed.
  **What she can't get yet, and why this phase still matters**: her existing portal link
  still only shows "The Lightbringer" in `BookedArtistForm` — no tabs exist yet (Phase 9),
  so there's no way for her to add "The Lure"'s music/stage-prep herself through the site.
  She'll be told to send those details separately once the tabbed form actually ships,
  rather than being promised something the current deploy can't do. This whole manual
  sequence — email the new terms, get written confirmation, reconcile `performer_acts`/
  `event_performers` by hand — is exactly what Phase 11's automated re-confirmation flow
  needs to replace.

### Related, flagged but not designed yet: travel cost — estimate vs. actual (2026-08-19)

Noted before starting implementation, not solved now — a "check this later" item, related
to but distinct from Phase 11 above (same fields, different concern: Phase 11 is about the
admin changing an already-sent offer; this is about the travel number naturally being
unknown until after the artist books their trip, even when nothing else about the offer
changes).

**Confirmed the exact mechanism** (`BookingDecisionCard.tsx:19-33`): the number shown to
the artist and passed into `confirm_and_migrate_artist` as `p_travel_covered` is just
`application.travel_cost_amount` — the admin's negotiated *estimate* at offer time — read
straight through with no artist-side adjustment possible there. That becomes
`event_performers.travel_covered` verbatim. `BookedArtistForm.tsx`'s "Total Travel
Reimbursement (Adjust if needed)" field then treats that exact same column as if it were
the *actual* post-booking cost. One column is quietly standing in for two different
things — the agreed estimate and the eventual real number — with nothing distinguishing
them once confirmed.

Also confirmed, a sharper instance of the general Phase 11 bug: editing
`casting_applications.travel_cost_amount` in the admin's Offer Terms & Logistics panel
*after* confirmation never reaches `event_performers.travel_covered` — `BookedArtistForm`
keeps showing the stale, originally-confirmed number regardless of later admin edits.

Open questions for when we actually design this (not now):
- Should this become two real columns (e.g. keep `travel_cost_amount` as the estimate,
  add something like `event_performers.actual_travel_cost` for the real figure), rather
  than one field doing both jobs?
- Should the actual-cost field start pre-filled with the estimate, or blank? You flagged
  the real risk either way: pre-filled risks people leaving it unchanged and never
  entering the true number; blank risks it just never getting filled in at all. No
  instinct yet on which is worse — worth deciding with real usage patterns in mind once
  Phase 11's re-confirmation flow exists, since that flow already has to solve "how does a
  changed number reach the artist-facing form" for the general case.

### Related, flagged but not designed yet: an artist retracting/declining after selection (2026-08-21)

Surfaced by a real case — Eden had an act (`is_selected`) chosen and an offer sent, then
backed out. The admin's only lever today is flipping `review_status` back to `no`, which
does nothing to `casting_application_acts.is_selected` — the two are independent columns
with no logic linking them, so the act kept reading as chosen until manually corrected by
hand. Distinct from both items above: Phase 11 is the admin changing terms on an offer
still in play; the travel-cost item is a number that's naturally unknown yet; this is the
artist actively opting out after having been selected/contacted. No performer/
event_performers/performer_acts existed yet in Eden's case (never reached `confirmed`), so
this specific instance was just a stale flag, not a deeper cleanup — but a version of this
where the artist backs out *after* confirming would need to also unwind the created
`performer_acts` row (and possibly the `event_performers` row, if it was their only act) —
worth designing alongside Phase 11 rather than separately, since both are "something
changed after the offer was sent, and downstream state needs to react correctly."

### Related, flagged but not designed yet: accommodation_notes visibility (2026-08-21)

Noted while fixing `submit_casting_application` — `accommodation_notes` (the conditional
"allergies/travel/logistics" free text collected on the public form when travel or
accommodation is needed) currently shows up in the admin's `CastingApplicationRow` but
never reaches the artist-facing `BookedArtistForm` at all. Not designed now — flagged so
it doesn't get lost. Worth finetuning once we're back in that area of the code.

## Open questions to settle before Phase 6 (not blocking earlier phases)

- Is act selection editable by the admin right up until the artist confirms, or does it
  lock once the offer email is sent? (Leaning toward: editable until confirmed, artist
  just sees whatever the latest state is when they open the link — simplest, matches how
  fee/travel are already editable post-send today.) Phase 11 extends this same question to
  *after* confirmation too.
- Any practical cap on acts per application? Not a hard requirement, but the "Add another
  act" button probably wants a soft limit (e.g. 5) just so the form doesn't get absurd.
- Should the per-act base rate be persisted explicitly (e.g. a
  `casting_applications.agreed_fee_per_act` column) instead of only storing the collapsed
  total, so the Phase 9 price-breakdown display and any future partial-refund/discount
  logic stay accurate rather than reverse-dividing the total?

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

- [ ] **Schema**: new enum type (e.g. `event_performer_role`: `performer | host |
      headliner`), NOT NULL DEFAULT `'performer'`. Add the column to **both**
      `casting_applications` (set pre-offer) and `event_performers` (the booked record —
      copied over, not re-entered). Naming: `role` reads fine scoped to these two tables,
      but if it feels too generic once you're looking at the column list, `lineup_role` is
      the alternative (avoids any future confusion if an actual admin-permission "role"
      concept ever gets added, per `CLAUDE.md`'s "no role/permission system beyond logged
      in or not" note — currently a non-issue, but cheap to preempt).
- [ ] **`confirm_and_migrate_artist`**: copy `casting_applications.role` onto the new
      `event_performers.role` at confirm time (same treatment as `final_fee`/
      `travel_covered` — no new client param needed since the artist doesn't negotiate
      their role, just sees and accepts it).
- [ ] **Admin UI**: add a role `<select>` (Performer/Host/Headliner) to the "Offer Terms &
      Logistics" panel in `CastingApplicationRow.tsx`, alongside the fee/travel fields —
      same place, same save action, defaulting to Performer.
- [ ] **Admin list at-a-glance**: consider a small badge next to the artist name in the
      collapsed row header when role is Host or Headliner (skip it for the default
      Performer case — no need to label the common case).
- [ ] **Offer email**: when role is Host or Headliner, say so explicitly in the offer
      email (both the admin-editable default template text in `CastingApplicationRow.tsx`
      and, if it also needs the info, `netlify/edge-functions/send-casting-email.ts`).
      Skip the mention entirely for the default Performer role — don't clutter the normal
      case.
- [ ] **`BookingDecisionCard.tsx`**: same rule — only show a role callout when role is
      Host or Headliner ("You're being booked as this event's Host — thank you!"), folded
      into what they're agreeing to when they accept. Nothing extra shown for a plain
      Performer booking.
- [ ] Swedish/English copy needed for all three role labels and the two callout messages,
      per the project's `t('sv', 'eng')` convention — no translation-file lookup, inline
      at each call site as usual.

## Independent enhancement: returning artists' promo content vs. their existing profile

Added 2026-08-19, design finalized the same day. Doesn't depend on the multi-act work, but
**overlaps directly with `confirm_and_migrate_artist`**, which Phases 2 and 8 above are
already rewriting — do this in the same pass rather than touching that function twice.

**What's true today** (traced from the live RPC body, not guessing): `performers` has its
own `promo_image_id`/`bio_sv`/`bio_eng`, and the entire public site (Hall of Fame, performer
detail, event lineup) reads exclusively from `performers`/`public_performers`, never from
`casting_applications`. On confirm, a brand-new performer gets `promo_image_id`/bio copied
in from the application (fine, it's their first profile). A **returning** performer match
only ever gets `photographer` patched — their new application's image/text are never
touched, silently orphaned on the now-confirmed application row, never shown anywhere.
`BookedArtistForm.tsx` already renders `bio_sv`/`bio_eng` as two always-visible textareas
side by side (confirmed in code, `BookedArtistForm.tsx:507-537`) and already saves them to
`performers` via `update_performer_bio_via_token` — this existing dual-textarea pattern is
what the design below reuses, just repointed.

**Finalized design (2026-08-19):**

- **Public `CastingForm.tsx` is unchanged** — still asks for one promo image + one
  promo text (in the applicant's chosen language) every time, exactly as today. No new
  field needed on the public form (see below for why).
- **New column: `event_performers.is_returning_artist boolean not null default false`**
  (or `is_returning_performer` — same idea, pick whichever reads better once we're
  writing the SQL). Set at confirm time in the same branch that already exists in
  `confirm_and_migrate_artist` — `true` when the `ELSE` (existing performer matched)
  branch runs, `false` when the `IF v_performer_id IS NULL` (brand-new) branch runs. This
  has to be persisted at that exact moment — by the time `BookedArtistForm` loads, a
  `performers` row exists either way, so "new vs. returning" can't be reconstructed after
  the fact. `event_performers` is the right table for it (not `performers`): it's an
  event-scoped fact — the same performer could be a newcomer this event and returning at
  the next one.
- **New columns: `casting_applications.promo_text_sv` / `promo_text_eng`**, replacing the
  single `promo_text` (which only ever held one language). At submission time, only the
  one matching the applicant's chosen `language` gets filled — exactly mirroring how
  `performers.bio_sv`/`bio_eng` already works today. The other language gets filled in
  later, reusing the *same already-existing* dual-textarea UI in `BookedArtistForm` — this
  is why no new public-form field is needed; the "translation" step already happens at the
  booking-form stage today (that's what those two always-visible textareas are for), it
  just currently writes straight to `performers` regardless of new/returning status.
- **`BookedArtistForm.tsx`'s Artist Promo section branches on `is_returning_artist`**:
  - **Returning**: the `bio_sv`/`bio_eng` textareas edit and save to
    `casting_applications.promo_text_sv/eng` only — the existing profile is left alone.
    Add one extra explicit button: *"Use this photo & text as my profile"* — a deliberate,
    artist-triggered action (not automatic, not admin-mediated) that copies the
    application's image + both languages onto their `performers` row, overwriting what's
    there. Needs a clear "this will replace your current public profile" confirmation
    before it fires, since it's a real overwrite.
  - **Newcomer**: the same two textareas write to **both** `casting_applications.promo_text_sv/eng`
    **and** `performers.bio_sv/eng` simultaneously — no separate button needed, since
    there's no existing profile to protect yet. Add a short info note near the fields
    explaining this text becomes their public website profile too. The promo **image**
    stays locked/read-only in both cases (matches today — no upload control exists here at
    all, out of scope for this change).
- **Data-integrity gap found while checking your "one application had no promo text"
  observation, confirmed real**: the `promo_text` textarea in `CastingForm.tsx` does have
  `required` on it (`CastingForm.tsx:415`) and the label shows an asterisk — but that's
  purely an HTML client-side attribute with nothing backing it in the database. Found
  exactly one existing row with `promo_text IS NULL` (`Madame Dragonfly`,
  `3f427c7a-faf6-401a-8ca3-6eb870f4593d`) — its `NULL` value (not even an empty string)
  strongly suggests it didn't come through the real form at all, more likely a manually
  inserted test/admin row. **Recommend adding an actual `NOT NULL` (or non-empty `CHECK`)
  constraint** on the new `promo_text_sv`/`promo_text_eng` columns once split — cheap,
  low-risk, closes the gap between what the form claims is required and what the database
  actually enforces. Folding this into Phase 1's schema work.
- **Cloudinary folder consistency** (the "irks me a little" point): still recommend
  skipping a physical move — real effort for a cosmetic win, and risks touching a live
  public-id. If it's ever worth doing, just adding the `artist-promo` tag to an asset once
  it's copied onto a profile (via the new "use this as my profile" button, or at
  newcomer-migration time) gets it discoverable the same way without moving anything.
  Still optional, low-priority polish.

## Future phase (not started, deferred until after casting/booking is fixed): event-plan promo downloads

Added 2026-08-19. Explicitly **not** part of the current work — flagged now only because
it directly motivated the `promo_text_sv`/`promo_text_eng` split above, and validates that
decision rather than the other way around.

**The idea**: on `/admin/event-plan` (currently a stub per `CLAUDE.md` — the next big admin
build after this casting/booking work), show the list of an event's booked artists with a
download button per artist for their promo picture + text **in both Swedish and English**,
so the board can quickly grab ready-to-post content for social media announcements leading
up to a show.

**Why this shapes today's decision**: this feature needs both languages of promo text to
actually exist in the database ahead of time, sourced from the application (not the
performer profile, since — per the design above — a returning artist's application content
is deliberately kept separate from their profile unless they choose to merge it). Without
today's `promo_text_sv`/`promo_text_eng` split, this future feature would have nothing
proper to read from. No further design work needed now — just noting the dependency so the
schema decision above is made with this in mind, not revisited later.
