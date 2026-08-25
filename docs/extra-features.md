# Extra features — lower-priority backlog

Started 2026-08-25. Things worth building eventually but not urgent enough to block
current deadlines — moved here instead of living as loose "not designed yet" notes inside
`multi-act-casting-plan.md`, so that doc can actually be closed out as done. Add to this
doc freely; nothing here needs to be built until there's time and appetite for it.

## Travel cost — estimate vs. actual as two real columns

Moved from `multi-act-casting-plan.md` (originally added 2026-08-19; moved here
2026-08-25, closing out that doc). Deferred deliberately, not just parked by default:
unlike the other items in this doc, nothing is currently broken — the sharper pain point
(an artist not being told travel is even part of their offer) already shipped as a
display-only fix in that doc. What's left is a bookkeeping-precision gap, not wrong
output, and the one real open question below doesn't have an answer yet, so building this
now would mean guessing rather than deciding from real usage.

**The issue**: `travel_cost_amount`/`travel_covered` is one column doing two jobs. At
offer time it's the admin's negotiated *estimate*. At confirm time that exact number is
copied verbatim into `event_performers.travel_covered`. `BookedArtistForm.tsx` then lets
the artist edit that *same* column, intending it to become the *actual* post-trip cost.
Nothing distinguishes "this is still just the original estimate, never touched" from "the
artist reviewed it and confirmed this number is correct" — if the real cost happens to
match the estimate, or the artist never revisits the field, the two states look identical.

Also confirmed at the time: a sharper instance of the general post-offer-changes bug
above — editing `casting_applications.travel_cost_amount` in the admin panel *after*
confirmation never reached `event_performers.travel_covered` on its own. (Since fixed,
separately — `AdminCasting.tsx` now syncs confirmed-booking terms on every logistics
save, so this specific propagation gap no longer exists; what's still open here is purely
the "can't tell estimate from confirmed-actual" ambiguity, not a stale-data bug.)

**Proposed solution, not built**: split into two real columns — keep `travel_cost_amount`
as the estimate, add something like `event_performers.actual_travel_cost` for the real
figure.

**Open question, unresolved**: should the actual-cost field start pre-filled with the
estimate, or blank? Real risk either way — pre-filled risks people leaving it unchanged
and never entering the true number; blank risks it just never getting filled in at all.
Worth deciding with real usage patterns in mind rather than guessing now.

## Post-offer changes & re-confirmation flow

Moved from `multi-act-casting-plan.md` Phase 11 (originally added 2026-08-18; moved here
2026-08-25). A lighter-weight version already shipped — see that doc's Phase 11 entry for
what's live today (an admin correcting fee/travel/role on an already-confirmed
application now syncs onto `event_performers` automatically). What follows is the fuller
version that was never built: actively notifying the artist and asking them to
re-approve when the terms of an already-sent or already-confirmed offer change.

**Confirmed real bug this was written to fix, not hypothetical**: editing fee/travel/
accommodation in the "Offer Terms & Logistics" panel has zero gating on `booking_status`
— the admin can change the numbers freely after the offer's been sent, or even after the
artist has confirmed, with no warning and no notification to the artist.

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
     to decide whether to show `BookingDecisionCard` or `BookedArtistForm` — so reverting
     the status is enough to automatically kick the artist back to the decision card with
     no portal restructuring needed. Only need to adjust `BookingDecisionCard`'s copy to
     distinguish "new offer" vs. "updated offer, please re-confirm."
  4. `CastingApplicationRow.tsx`'s existing `isAwaitingConfirmation` boolean is
     `review_status === 'yes' && initial_reply_sent && booking_status !== 'confirmed'` —
     already exactly true the moment `booking_status` moves off `confirmed`, so the row
     automatically goes back to the existing amber "awaiting confirmation" styling for
     free too.
  5. Admin-side: don't just silently allow the edit — surface a confirmation prompt when
     editing terms on an application that's `pending_confirmation` or `confirmed`
     ("This artist already confirmed different terms — saving will ask them to
     re-approve before they can continue"), so it's a deliberate action, not an accident.
- **Open question**: what happens to the already-created `performer_acts`/
  `event_performers` rows (and anything the artist already filled into
  `BookedArtistForm` — audio tracks, stage prep notes) while a re-confirmation is
  pending? Recommend: leave them untouched until the artist actually re-confirms — a new
  "reconfirm" action reconciles everything atomically then (adds `performer_acts` rows
  for newly-added acts, updates `event_performers.final_fee`/`travel_covered` to the new
  total). Don't half-apply changes on save — avoids a state where the DB reflects
  unconfirmed terms if the artist never responds.

**Real case that originally motivated this (resolved manually, 2026-08-21)**: Florence
Shimmermore had one act confirmed and a second sitting as a separate, never-contacted
application. Rather than wait for this flow to exist: emailed her the new combined terms,
she confirmed in writing, then the admin reconciled `performer_acts`/`event_performers`
by hand. That whole manual sequence — email new terms, get written confirmation,
reconcile records by hand — is exactly what this flow would automate.

### Should be designed alongside: an artist retracting/declining after selection

Moved from `multi-act-casting-plan.md` (2026-08-21) — explicitly flagged there as "worth
designing alongside [this flow] rather than separately," since both are "something
changed after the offer was sent, and downstream state needs to react correctly."

Surfaced by a real case — Eden had an act (`is_selected`) chosen and an offer sent, then
backed out. The admin's only lever today is flipping `review_status` back to `no`, which
does nothing to `casting_application_acts.is_selected` — the two are independent columns
with no logic linking them, so the act kept reading as chosen until manually corrected by
hand. In Eden's case nothing had been confirmed yet, so it was just a stale flag.

**The post-confirmation half is now built (2026-08-25)** — see
`multi-act-casting-plan.md`'s "removing a confirmed artist" addendum: a new
`cancel_confirmed_booking` RPC unwinds `performer_acts`/`event_performers` (and the
`performers` row too, if the artist has no footprint left anywhere else) when the admin
moves a *confirmed* booking's review_status away from `'yes'`, triggered via a
confirmation modal on the existing status `<select>` rather than a separate button. The
FK constraint on `casting_application_acts.performer_act_id` (`ON DELETE SET NULL`,
fixed earlier specifically to enable this) is what lets that delete happen cleanly.

**Eden's original case — an artist backing out *before* confirming — is still open**:
that path never reaches the new RPC (it only triggers when `booking_status ===
'confirmed'`), so flipping review_status away from 'yes' on a not-yet-confirmed
application still leaves `casting_application_acts.is_selected` stale, exactly as before.
Worth closing this gap the same way if it comes up again.

## Returning artists' promo content vs. their existing profile

Moved from `multi-act-casting-plan.md` (originally added 2026-08-19, design finalized the
same day; moved here 2026-08-25 — the user confirmed all performers for the current
season are already cast and any returning artists among them kept their existing profile
untouched, so this is no longer time-pressured). Originally noted as overlapping with
`confirm_and_migrate_artist`, which the multi-act work was rewriting anyway — that's no
longer true now that the multi-act work has shipped, so this would need its own pass on
that function rather than riding along with other changes.

**Verified still real, 2026-08-25**: checked live data for two returning performers
(Ribflare Faboylous, Seymour Bottoms) — their `performers.bio_sv/eng` still holds older
text, genuinely different from what they wrote on their current casting application
(e.g. Seymour's profile says "16 years of experience," his application says "17" — a real
difference, not a copy). Confirms the bug this design fixes is exactly as described below:
a returning performer's new application content is silently orphaned, never touched.

**What's true today** (traced from the live RPC body, not guessing): `performers` has its
own `promo_image_id`/`bio_sv`/`bio_eng`, and the entire public site (Hall of Fame, performer
detail, event lineup) reads exclusively from `performers`/`public_performers`, never from
`casting_applications`. On confirm, a brand-new performer gets `promo_image_id`/bio copied
in from the application (fine, it's their first profile). A **returning** performer match
only ever gets `photographer` patched — their new application's image/text are never
touched, silently orphaned on the now-confirmed application row, never shown anywhere.
`BookedArtistForm.tsx` already renders `bio_sv`/`bio_eng` as two always-visible textareas
side by side and already saves them to `performers` via `update_performer_bio_via_token`
— this existing dual-textarea pattern is what the design below reuses, just repointed.

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
- **Data-integrity gap found while checking a "one application had no promo text"
  observation, confirmed real**: the `promo_text` textarea in `CastingForm.tsx` has
  `required` on it and the label shows an asterisk — but that's purely an HTML
  client-side attribute with nothing backing it in the database. Found exactly one
  existing row with `promo_text IS NULL` (`Madame Dragonfly`), a `NULL` value (not even an
  empty string) strongly suggesting it didn't come through the real form at all — likely a
  manually inserted test/admin row. **Recommend adding an actual `NOT NULL` (or non-empty
  `CHECK`) constraint** on the new `promo_text_sv`/`promo_text_eng` columns once split —
  cheap, low-risk, closes the gap between what the form claims is required and what the
  database actually enforces.
- **Cloudinary folder consistency** (a minor polish point): recommend skipping a physical
  move — real effort for a cosmetic win, and risks touching a live public-id. If it's ever
  worth doing, just adding an `artist-promo` tag to an asset once it's copied onto a
  profile (via the new "use this as my profile" button, or at newcomer-migration time)
  gets it discoverable the same way without moving anything. Optional, low-priority polish.

### Dependency: event-plan promo downloads

Moved alongside the above (originally added 2026-08-19 in `multi-act-casting-plan.md`) —
**the idea**: on `/admin/event-plan`, show an event's booked artists with a download
button per artist for their promo picture + text **in both Swedish and English**, so the
board can quickly grab ready-to-post content for social media announcements leading up to
a show. This needs the `promo_text_sv`/`promo_text_eng` split above to exist first —
sourced from the application (not the performer profile, since a returning artist's
application content is deliberately kept separate from their profile unless they choose
to merge it, per the design above). No further design work done on this piece yet; just
noting the dependency so it isn't rediscovered later.

## Marketing planning: newsletter templates, scheduled sends, social media tracking

Added 2026-08-25, per user request — a new admin page/section beyond what's already
scoped in `admin-portal-roadmap.md`, without a firm timeline yet, so it lives here instead.

**The idea**, roughly:
- A page for building newsletter templates and setting up an automatic email-sending
  schedule — presumably built on the existing Mailchimp integration
  (`netlify/edge-functions/subscribe.ts`), though no design done yet on how a
  template/schedule system would actually connect to it.
- A way to keep track of what needs to get posted on social media (no platform, format, or
  workflow decided).
- Like most of the admin side, a mix of event-related content (promo for a specific show)
  and general/org content not tied to any one event — same event-vs-general split called
  out for Dashboard's to-do lists in `admin-portal-roadmap.md`.

No further design done — this is a backlog placeholder, not a plan. Revisit once there's
time and appetite, same as everything else in this doc.

## Performer mailing list for casting call announcements

Added 2026-08-25. Requested by several artists already, not high priority given current
deadlines.

**The idea**: a dedicated opt-in mailing list (separate from — or a segment/tag within —
the existing general newsletter Mailchimp integration, `netlify/edge-functions/
subscribe.ts`) that performers can join to get emailed whenever a new casting call opens.
The email should link to the casting call page **and** spell out the `casting_info_sv`/
`casting_info_eng` content directly in the email body, not just link to it — so a
performer can decide whether to apply without needing to click through first.

**Two ways to join**:
- A checkbox on the public `CastingForm.tsx` (opt in while applying) — for someone
  already in the middle of applying to also sign up for future announcements.
- A separate, standalone sign-up entry point elsewhere on the site (a button/small form)
  for performers who want to join the list without currently applying to anything.

**Open implementation questions, not resolved yet**:
- Separate Mailchimp audience vs. a tag/segment on the existing newsletter list? Affects
  whether this reuses `subscribe.ts` or needs a sibling edge function.
- What triggers the send — `events.has_casting_call` flipping to `true` automatically, or
  a deliberate admin action ("send casting announcement now")? Given this is explicitly
  low-priority, a manual admin-triggered send is probably the right starting scope rather
  than building automation for it up front.
- Needs a way to track opt-in status per performer (a new column, or this may live
  entirely in Mailchimp's own audience/tag data with no new column needed — depends on
  the audience-vs-tag decision above).
