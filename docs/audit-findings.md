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
      standardized to `30px`, imperceptible visually. **Confirmed working** — user tested all
      3 flows live (casting/join-us/sponsor form confirmations + newsletter signup), all fine.

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

- [x] **Image-upload pipeline audit — 2026-08-18, prompted by a real bug report.** User
      reported past incidents of `image_id` set with no matching Cloudinary asset; had already
      fixed image-size and double-extension causes. Root cause of the remaining one: `createSlug()`
      (`src/lib/utils.ts`) only handles accented Latin characters — a name written entirely in a
      non-Latin script or a stylized Unicode font (e.g. Mathematical Alphanumeric Symbols, which
      NFD normalization doesn't decompose) sanitizes down to an **empty string**, producing a
      malformed/trailing-hyphen Cloudinary `public_id` that the API likely rejects. Checked
      `CastingForm.tsx`, `ArtistForm.tsx`, `SponsorForm.tsx`, `GalleryEditor.tsx`: all correctly
      await the Cloudinary upload and block the DB save on failure (plus a `blob:` URL guard as a
      second line of defense) — so this wouldn't orphan a DB row, but it would hard-block
      submission with a generic, unhelpful "upload failed" error and no indication why. Fixed by
      making `createSlug()` fall back to a unique `namnlos-<timestamp>` slug instead of ever
      returning empty — closes the gap for every caller at once (image naming *and* actual
      routable slugs like event/performer URLs). Added `src/test/utils.test.ts` covering normal
      names, accented names, and the stylized-font/empty-input fallback. Also removed a leftover
      `console.log('Image ready for upload...')` debug statement in `CastingForm.tsx`.
      `SponsorForm.tsx`'s logo upload now also auto-compresses via `processUploadedImage`
      (same "Bearbetar bild..." pattern as `CastingForm`/`ArtistForm`) instead of hard-rejecting
      files >5MB — consistent across all three forms now.
      **Separate, unrelated bug found and fixed in the same investigation:** the "Bearbetar
      bild..." loading toast could get permanently stuck even though `handleImageUpload`
      completed correctly and called `toast.dismiss(id)` with the right ID (confirmed via
      temporary diagnostic logging, since the app code showed no error at all). Root cause was
      an upstream bug in Sonner 2.0.7 (event-listener cleanup in its internal store) — fixed in
      2.0.8, released days before this was found. `package.json` already allowed it
      (`^2.0.7`); ran `npm update sonner` to sync the lockfile. Confirmed fixed by live retest.
- [x] **Cross-form duplication: confirmation-email sender — resolved (2026-08-18).** Extracted
      to `sendApplicationConfirmationEmail(name, email, language, type, deadline?)` in
      `applicationService.ts`. Also caught and folded in `CastingForm.tsx`'s
      `sendCastingEmail` (not originally listed here, but identical apart from an extra
      `deadline` param) — the shared helper accepts it as optional so all 4 forms
      (`JoinUsForm`, `SponsorForm`, `ArtistForm`, `CastingForm`) now share one implementation.
      Bonus fix found along the way: `SponsorForm.tsx`'s logo-naming used its own bespoke
      inline slug (`.replace(/[^a-z0-9]/g, '-')`) instead of the shared `createSlug()` — meaning
      it had the same empty-slug vulnerability just fixed in the item above, via an un-hardened
      duplicate path. Switched it to use `createSlug()` directly.
- [x] **Cross-form duplication: `blob:` URL submit guard — resolved (2026-08-18).** Extracted
      `isUnresolvedBlobUrl()` to `src/lib/utils.ts`, used in `ArtistForm.tsx`, `CastingForm.tsx`,
      `SponsorForm.tsx` (the toast/`setSubmitting`/`return` around it stayed local to each form
      since that's coupled to each component's own state, not actually duplicated logic).
- [x] **Cross-form duplication: upload try/catch/toast wrapper — resolved, light-touch scope
      (2026-08-18).** Extracted `src/hooks/useCloudinaryUpload.ts` — wraps `uploadToCloudinary`,
      catches errors, shows a generic toast (or a caller-supplied `onDuplicateError` handler for
      `CastingForm`'s "already applied" case), returns `string | null` instead of throwing.
      Wired into `ArtistForm.tsx`, `CastingForm.tsx`, `SponsorForm.tsx` only — deliberately not
      `GalleryEditor.tsx`, whose batch/progress-tracking upload flow is a genuinely different
      shape, not just a copy-paste variant; forcing it into the same hook would've made the hook
      worse for everyone. Each form still owns its own `uploading` state exactly as before (the
      hook doesn't manage timing-sensitive UI state), so this only replaced the try/catch/return
      plumbing, not the component's control flow.
- [x] **`ArtistForm.tsx` copy-paste field bug — resolved (2026-08-18).** `third_link` is a
      genuine free-form field (added for an artist who wanted three links), not a bug — just
      needed a distinct label. Changed to "Ytterligare en länk (frivilligt)" / "Additional
      link (optional)".
- [x] **Duplicated ticket-release-date/button logic — resolved (2026-08-18).** Extracted to
      `src/components/events/TicketButton.tsx` (a component, not a state-util, since the
      duplicated logic returned JSX directly). Used in both `EventInfo.tsx` and
      `featuredEventCard.tsx`, byte-for-byte same rendering as before.

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
3. ~~Duplication cleanup pass~~ — all resolved 2026-08-18 (shared email helper, blob-guard
   helper, upload hook, ticket-button component, edge-function HTML wrapper). Also fixed a
   real bug found along the way (special-font/non-Latin names breaking image uploads).
4. `RegisterAdmin` shared `<AuthLayout>` + the invite-session race condition. **Only item left.**
