# Multi-act casting applications — migration plan

Drafted 2026-08-18. Not started yet — this is the plan to work through phase by phase.
Check items off as we go; leave notes inline (like `docs/audit-findings.md` does) when a
step turns out different than planned.

**Implementation note (added 2026-08-19):** schema/RPC changes (new tables, columns,
constraints, function bodies — mainly Phases 1 and 2) will be delivered here as exact,
ready-to-paste SQL for the user to run through their Lovable prototype, which is
connected to the same live database, rather than executed directly during this planning
work. Application-layer code (React/TS) still gets written and edited directly as usual —
this only applies to raw schema/DDL/RPC changes.

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

New child table:

```sql
create table casting_application_acts (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references casting_applications(id) on delete cascade,
  act_title text not null,
  act_description text not null,
  video_url text,
  display_order int not null default 0,
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

**Unique constraint**: today's `unique_artist_act_per_event` is `(email, event_id, slug)`
— it allows multiple applications specifically *because* the slug embeds the act name.
Once one application can hold every act, this should become `(email, event_id)` — one
open application per artist per event. **Before applying this**, the two existing
duplicate-application artists above need their rows manually merged (their extra acts
copied into `casting_application_acts` under one surviving application, the duplicate
application rows deleted) — do this as a one-time step in Phase 1, not something the
schema migration can do automatically.

## Phased plan

### Phase 1 — Schema
- [ ] Manually consolidate the 2 existing duplicate-application artists (3 apps → 1, 2
      apps → 1) before adding the constraint.
- [ ] Create `casting_application_acts` (SQL above).
- [ ] Backfill: one row per existing `casting_applications` row, copying
      `act_title`/`act_description`/`video_url`, `display_order = 0`, `is_selected = true`
      if `booking_status IN ('pending_confirmation','confirmed')` else `false`.
- [ ] For already-`confirmed` applications, backfill `performer_act_id` by matching the
      existing `casting_applications.act_id`.
- [ ] Drop `act_title`, `act_description`, `video_url`, `act_id` from `casting_applications`
      (only after all code in later phases stops reading them).
- [ ] Change unique constraint to `(email, event_id)`.
- [ ] Regenerate `database.types.ts`.

### Phase 2 — RPCs
- [ ] New RPC to replace the plain insert in `submitCastingApplication` — needs to insert
      one `casting_applications` row + N `casting_application_acts` rows atomically (a
      client-side two-step insert risks an application with zero acts if the second call
      fails).
- [ ] `get_casting_application_by_token`: return `acts` as a JSON array (join
      `casting_application_acts`), each with its nested `performer_acts` row once
      confirmed (for `BookedArtistForm`), instead of the current singular
      `performer_acts` object.
- [ ] `confirm_and_migrate_artist`: loop over `casting_application_acts WHERE
      is_selected = true`, insert one `performer_acts` row per act (instead of always
      exactly one), set each `performer_act_id` back on the act row. `performers` upsert
      and `event_performers` upsert stay single-row, unchanged shape.
- [ ] `update_performer_act_via_token`: authorization currently checks
      `casting_applications.act_id = p_act_id`. Since `act_id` goes away, re-check
      authorization via `performer_acts.performer_id = casting_applications.performer_id
      AND performer_acts.event_id = casting_applications.event_id AND
      casting_applications.access_token = p_access_token` instead.
- [ ] New admin-side function (plain authenticated update, no token RPC needed — admin is
      already behind Supabase Auth): toggle `casting_application_acts.is_selected`.

### Phase 3 — Types & services
- [ ] Add `CastingApplicationAct` type (`Tables<'casting_application_acts'>`) to
      `src/types/types.ts`.
- [ ] Update `CreateCastingApplicationInput` shape — now `{ application: ..., acts: [...] }`
      rather than one flat row.
- [ ] `applicationService.ts`: rewrite `submitCastingApplication`,
      `getApplicationsFromEvent` (now needs to also fetch each application's acts —
      probably a join), `confirmAndMigrateArtist`, `updatePerformerAct` call sites.

### Phase 4 — Public casting form (`CastingForm.tsx`)
- [ ] Replace the single act_title/act_description/video_url block with a repeatable list
      of act blocks + an "Add another act" button (and a remove button per block, but
      never allow removing the last one).
- [ ] Reframe the fee field's label/helper text to make "this is per act" explicit, since
      the form no longer visually ties one fee to one act.
- [ ] Update the duplicate-submission error handling for the new constraint shape.

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
- **Immediate trigger for this phase: Florence Shimmermore.** She already has "The
  Lightbringer" confirmed (`booking_status: confirmed`, fee 1000) and a second act "The
  Lure" sitting as a separate, still-`maybe`, never-contacted application
  (`cae73b32-aacf-47a5-a837-25592f0d7c22`). **Do not push "The Lure" through the current
  single-act flow to add it to her booking** — confirming it today would run the existing
  `confirm_and_migrate_artist` RPC a second time for the same `(event_id, performer_id)`
  and *overwrite* her already-confirmed `final_fee`/`travel_covered` instead of adding to
  them (the exact bug above). Either wait until Phases 1/2/8/11 ship and let the real flow
  handle her, or if it's urgent before then, do a one-off manual fix (insert a
  `performer_acts` row for "The Lure" directly, add its fee to the existing
  `event_performers.final_fee`) rather than using the current UI/RPC — happy to do that by
  hand right now if you want it sooner than the migration.

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

## Florence: on hold

Confirmed with the user (2026-08-18) — nothing happens with Florence Shimmermore's second
application until Phase 11 (post-offer changes/re-confirmation) ships. Not doing the
manual one-off fix either; she waits for the real flow.

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
