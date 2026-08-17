# Audit findings — casting/booking flow, admin pages, public forms

Findings from a full-codebase pass (2026-08-17). Trimmed on this date — small, mechanical,
low-risk items were split out into `cleanup-tasks.md` so this file holds only what needs
real judgment: security verification, product decisions, or multi-file refactors with a
design choice attached.

## 🔴 Systemic Supabase issues — verify first, can't be fixed in code alone

- [x] **Booking-portal writes weren't token-scoped, only the initial read was — CONFIRMED and
      fixed 2026-08-17.** The four RLS policies (`Token-protected read/update
      casting_applications`, `Allow update event_performers via token`, `Allow update
      performer_acts via token`) never actually compared the row's `access_token` to anything
      the client supplied — RLS `USING` clauses can't see a `.eq()` filter value, so they
      degenerated into `access_token IS NOT NULL` (true for almost every row) and existence
      checks. `confirm_and_migrate_artist` was worse: it took no token at all and did zero
      authorization in the function body — anyone with the public anon key could confirm any
      application with any fabricated fee. Fix: `supabase/migrations/20260817134451_secure_token_based_booking_portal.sql`
      moves every write (and the one read) behind `SECURITY DEFINER` functions that validate
      the token server-side, and drops the broken policies. Client code
      (`applicationService.ts`, `BookedArtistForm.tsx`) updated to match, tests updated,
      `npm run build`/`npm run lint`/`npx vitest run` all pass.
      **Remaining steps (yours — I didn't touch the live database):**
      - [ ] Run the preflight query at the top of the migration file to confirm
            `confirm_and_migrate_artist`'s current numeric parameter types match the
            `DROP FUNCTION` line, then apply the migration (SQL editor, or `supabase db push`).
      - [ ] Run the post-migration `pg_policies` query in the same file to confirm the
            un-pasted `event_performers` insert-via-token and `performer_acts` read-via-token
            policies (same broken pattern, not shown to me in full) are gone too.
      - [ ] Regenerate `src/types/database.types.ts` against the updated schema and remove the
            `as any` casts left as placeholders in `applicationService.ts` (marked with `TODO`
            comments) now that the new RPCs are in the generated types.
      - [ ] Smoke-test the real booking portal end to end (accept offer → fill in
            `BookedArtistForm` → save) against the migrated database before trusting it for a
            real artist.
- [ ] **No admin allowlist — "authenticated" == "board member."** `ProtectedRoute.tsx:14`
      gates purely on `if (!user)`. `RegisterAdmin.tsx` itself is safe (only calls
      `updateUser({password})` against an already-valid invite session, never `signUp`), but
      nothing in the repo rules out public sign-up being enabled on the Supabase project.
      **Confirm "Enable email signups" is OFF in Supabase Auth settings, and that RLS
      policies check real board membership, not merely `authenticated`.**
- [ ] **`GalleryEditor.tsx` gated only by `{user && ...}`** in `EventDetail.tsx` — same class
      of issue as the two above: client-side gate isn't a security boundary. Verify RLS on
      `event_images`/`old_event_images` requires auth for writes.

## Casting → booking pipeline

- [ ] **Decision needed: `submitArtistCounterOffer`.** Defined in `applicationService.ts`,
      never imported/called anywhere (confirmed via grep). `BookingDecisionCard.tsx` only has
      "Accept & Confirm" + a `mailto:` link — no counter-offer UI exists. This isn't a cleanup
      task, it's a product call: **wire up the counter-offer feature, or deliberately delete
      the dead code.** (Note: as of the 2026-08-17 RLS fix, its backing RPC
      `submit_artist_counter_offer` is now token-validated same as the rest of the flow, so
      it's safe to wire up whenever you decide — just not currently reachable from the UI.)
- [ ] **Edge functions duplicate ~40 lines of HTML email wrapper 3x**
      (`application-confirmation.ts`, `send-casting-email.ts`, `subscribe.ts`) — a styling
      tweak means editing three files. Extract a shared template helper.

## Admin pages

- [ ] **`RegisterAdmin.tsx` duplicates page chrome from `AdminLogin.tsx`** verbatim
      (`page-full`/header/footer block) — candidate for a shared `<AuthLayout>`. Touches the
      login flow, so worth a deliberate component design rather than a quick extraction.
- [ ] **Minor race in `RegisterAdmin.tsx`:** a hardcoded 2.5s timeout can flip `localLoading`
      false before a slow invite-session resolves, briefly showing "link expired" to a
      legitimately-invited board member. Needs a real understanding of the invite-session
      resolution flow to fix properly (replace the timeout with a state-driven check), not a
      mechanical patch.
- [ ] *(FYI, not a bug)* `AddPerformer.tsx` lives in `pages/admin/` but is mounted at public
      routes `/hall-of-fame-form(/:slug)`, intentionally ungated — just a naming trap if
      someone assumes everything in that folder requires login.

## Public forms & components

- [ ] **Cross-form duplication: confirmation-email sender.** `JoinUsForm.tsx`,
      `SponsorForm.tsx`, and `ArtistForm.tsx` each re-implement an identical
      `sendConfirmEmail`/`sendCastingEmail` fetch-to-`/api/application-confirmation` helper.
      Extract to one shared helper.
- [ ] **Cross-form duplication: `blob:` URL submit guard** — same defensive check pasted in
      all three forms above. Extract to one helper (e.g. `isUnresolvedBlobUrl()`).
- [ ] **Cross-form duplication: upload try/catch/toast wrapper** around `uploadToCloudinary`,
      repeated in the three forms above plus `GalleryEditor.tsx`. Candidate for a shared
      `useCloudinaryUpload()` hook.
- [ ] **`ArtistForm.tsx` — likely copy-paste field bug:** both `other_link` and `third_link`
      render with the identical label "Annan länk (frivilligt)" — looks unintentional, worth
      checking against what `third_link` is actually meant to be. Needs a decision on intended
      copy/purpose, not just a code fix.
- [ ] **Duplicated ticket-release-date/button logic** between `EventInfo.tsx` and
      `featuredEventCard.tsx` — near-identical block in both; extract to a shared
      `getTicketButtonState()` util or `<TicketButton>` component.

## Clean — no action needed

`AdminDashboard.tsx`, `AdminContacts.tsx`, `AdminLogin.tsx`, `CastingForm.tsx` (main flow),
`CastingInfoAccordion.tsx`, `OldEventInfo.tsx`, `archivedEventCard.tsx`, `performerCard.tsx`,
`CloudinaryImage.tsx`, `Navigation.tsx`, `footer.tsx`, `ScrollToTop.tsx`. The public Supabase
views (`public_performers`, `public_photographers`, `public_venues`) also consistently strip
PII/financial columns (`email`, `phone`, `fee`, `price`, `contact_person`) from their
underlying admin tables — good pattern, applied consistently.

## Suggested fix order

1. ~~Verify the three 🔴 Supabase/RLS items in the dashboard~~ — the booking-portal one is
   fixed in code (2026-08-17); apply its migration and finish its checklist above. Two 🔴
   items remain (admin allowlist, `GalleryEditor` gate) — those still need dashboard
   verification, nothing in code can fix them.
2. Decide on `submitArtistCounterOffer` (wire up vs. delete) and the `ArtistForm` `third_link`
   field — both need a product answer before any code changes.
3. Duplication cleanup pass (shared email helper, blob-guard helper, upload hook,
   ticket-button util, edge-function HTML wrapper).
4. `RegisterAdmin` shared `<AuthLayout>` + the invite-session race condition.
