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
      **Remaining steps — all complete as of 2026-08-17/18:**
      - [x] SQL applied directly (no dev/stage DB, so the migration file itself was deleted
            after use). `pg_proc`/`pg_policies` verified live via MCP, including fixing a
            follow-up `uuid` vs `text` param-type bug found during real testing.
      - [x] Post-migration `pg_policies` confirmed clean via MCP.
      - [x] `database.types.ts` regenerated, all `as any`/`TODO` placeholders removed.
      - [x] Smoke-tested end to end (accept offer → fill in `BookedArtistForm` → save) —
            user confirmed working. A related bug this surfaced (`performers` table's own
            token-RLS policies broke as a side effect) was fixed with a new
            `update_performer_bio_via_token` function. That flow was later superseded anyway —
            see the `ArtistForm`/`AddPerformer` note below.
- [x] **No admin allowlist — CONFIRMED and fixed 2026-08-18.** Public sign-up was in fact
      **ON** in Supabase Auth settings — meaning anyone could self-register and get full
      admin write access to everything gated by `authenticated` (performers, events, gallery,
      bookings). User turned it **off**; email confirmation is also on. `RegisterAdmin.tsx`'s
      invite-link flow (`updateUser({password})` against an already-valid invite session,
      never `signUp`) confirmed as the only registration path — matches the invite email
      template the board actually sends.
- [x] **`GalleryEditor.tsx` gate — CONFIRMED safe via MCP (2026-08-18).** RLS on both
      `event_images` and `old_event_images` restricts all writes (`ALL`) to the `authenticated`
      role; `public`/anon gets `SELECT` only. The `{user && ...}` client-side gate in
      `EventDetail.tsx` is backed by a real database boundary. (This item and the admin-allowlist
      one were really the same underlying question — now that public signup is off,
      "authenticated" and "board member" are equivalent again.)

## Casting → booking pipeline

- [x] **Decision made: `submitArtistCounterOffer` deleted (2026-08-18).** Was dead code
      (never imported/called anywhere) — user decided the counter-offer feature is
      unnecessary rather than wiring it up. Removed from `applicationService.ts`. (Note: the
      `submit_artist_counter_offer` RPC mentioned in the original audit note was never
      actually created — it was explicitly excluded from the RLS migration per earlier
      instruction, so there's no backing SQL to clean up either.)
- [x] **Edge functions duplicate ~40 lines of HTML email wrapper 3x — resolved (2026-08-18).**
      Extracted to `netlify/edge-functions/_shared/emailLayout.ts` (`renderEmailHtml`, named
      export only, no `config`/default export, so Netlify's file-based routing won't register it
      as its own function). All 3 files now pass `{ subject, greetingHtml, bodyHtml, isSv }` —
      every diverging bit (greeting wording, `from` address, body content, and `subscribe.ts`'s
      differing swallow-and-continue Resend-failure handling) left untouched. One cosmetic
      unification: `subscribe.ts`'s divider had `margin-top: 40px` vs the other two's `30px` —
      standardized to `30px`, imperceptible visually. **Pending: deploy preview + one real send
      through all 3 flows (application-confirmation, send-casting-email, subscribe) to confirm.**

## Admin pages

- [ ] **`RegisterAdmin.tsx` duplicates page chrome from `AdminLogin.tsx`** verbatim
      (`page-full`/header/footer block) — candidate for a shared `<AuthLayout>`. Touches the
      login flow, so worth a deliberate component design rather than a quick extraction.
- [ ] **Minor race in `RegisterAdmin.tsx`:** a hardcoded 2.5s timeout can flip `localLoading`
      false before a slow invite-session resolves, briefly showing "link expired" to a
      legitimately-invited board member. Needs a real understanding of the invite-session
      resolution flow to fix properly (replace the timeout with a state-driven check), not a
      mechanical patch.
- [x] *(Now stale — resolved differently)* `AddPerformer.tsx`/`ArtistForm.tsx` used to be
      mounted ungated at public routes `/hall-of-fame-form(/:slug)` for token-based artist
      self-edit. Product decision (2026-08-18): skip token security entirely — past artists
      go through the board, future ones are added via casting application. Routes are now
      wrapped in `<ProtectedRoute>` (same pattern as `EventEditor`), and the 3 anon-facing RLS
      policies on `performers` (`Form can insert performers`, `Allow read/update performers via
      token`) were dropped, leaving only `Admins full access performers`.

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
- [x] **`ArtistForm.tsx` copy-paste field bug — resolved (2026-08-18).** `third_link` is a
      genuine free-form field (added for an artist who wanted three links), not a bug — just
      needed a distinct label. Changed to "Ytterligare en länk (frivilligt)" / "Additional
      link (optional)".
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

1. ~~Verify the three 🔴 Supabase/RLS items in the dashboard~~ — all three done (2026-08-17/18).
   The admin allowlist one turned out to be a real live gap (public signup was on) — now closed.
2. ~~Decide on `submitArtistCounterOffer` and the `ArtistForm` `third_link` field~~ — both
   resolved 2026-08-18 (deleted; relabeled).
3. Duplication cleanup pass (shared email helper, blob-guard helper, upload hook,
   ticket-button util, edge-function HTML wrapper). **Next up.**
4. `RegisterAdmin` shared `<AuthLayout>` + the invite-session race condition.
