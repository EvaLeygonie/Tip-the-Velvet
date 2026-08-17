# Cleanup tasks — safe, low-risk fixes

Split out from `audit-findings.md` (2026-08-17). These are mechanical or well-scoped enough
to fix directly or hand to Claude Code **one at a time** — don't batch them into a single
giant prompt, since that makes the diff harder to review and harder to blame if something
breaks.

For each, the pattern that's worked well: give Claude Code the *why* (from the audit),
the *scope boundary* ("don't touch anything else"), and a *verification step* — then
actually run that verification yourself before moving to the next item.

## Zero-risk (pure deletions, no behavior change)

- [ ] **`src/components/events/EventLineup.tsx:12`** — remove leftover debug
      `console.log('Här är artisterna som komponenten får:', performers)`. Fires on every
      render, ships to production console.
- [ ] **`src/components/applications/ArtistForm.tsx:236-250`** — an entire
      `if (loadingArtist) return (...)` block is pasted twice in a row. Delete the duplicate,
      keep one copy. Verify: `npm run build`, then load the artist-editing view and confirm
      the loading state still renders.

## Small, mechanical, low risk

- [ ] **`netlify/edge-functions/application-confirmation.ts`** — `switch(type)` has no
      `default` case, so an unexpected `type` silently sends a near-empty "Hej {name}!" email
      with 200 OK. Add a `default` that errors instead, matching the file's existing
      error-handling style. Don't touch the existing case branches.
- [ ] **`src/pages/admin/EventEditor.tsx` `handleDelete` (231-258)** — sets `loading=true` but
      has no `finally`, unlike `handleSave` in the same file. If delete throws, the
      Save/Delete button stays disabled until reload. Add a `finally` mirroring exactly what
      `handleSave` already does. Don't change `handleSave` itself. Verify: trigger a delete in
      the admin UI (on a test event) and confirm the button re-enables even if it fails.

## Small, but changes behavior — verify manually after each

- [ ] **`CastingApplicationRow.tsx:197-205` / `AdminCasting.tsx:57-63`** — status-change
      silent-failure bug. `onStatusChange(...)` isn't awaited inside a try/catch that can
      never catch anything real; `handleStatusChange` has no try/catch around the actual
      `await updateApplicationStatus(...)` either. Fix so a failed write shows a real error
      instead of the UI claiming "Status uppdaterad!" when it silently wasn't. Verify: force a
      failure (e.g. bad network) and confirm an error surfaces instead of a false success toast.
- [ ] **`BookedArtistForm.tsx:128-134,139-145`** — `fetchExistingData` discards `error` from
      the `performers`/`performer_acts` reads. Surface it (toast or inline message) instead of
      silently showing blank fields — an artist could otherwise save over their own bio/act
      details with blanks. Verify: force a read failure and confirm the form doesn't look like
      an empty-but-valid state.
- [ ] **`EventEditor.tsx`** — Cloudinary cleanup failures (image-replace + event-delete paths)
      are only `console.error`'d, no toast. Add one so orphaned-image failures are visible to
      the board. Verify: trigger a Cloudinary failure path and confirm a toast appears.
- [ ] **`GalleryEditor.tsx` `handleDelete`** — same pattern, swallows failures with no toast.
      Add one. Verify: same as above.

---

Want a full ready-to-paste Claude Code prompt (why + scope + verification, like the `@theme`
fix earlier) for any specific item above? Ask and I'll write it out in full.
