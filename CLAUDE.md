# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

The website for Tip the Velvet, a volunteer-run burlesque event organization. It has two halves:

- **Public site** — promotes the org, its events, and its performers; lets visitors apply to perform (casting calls), volunteer/staff, or sponsor a show.
- **Admin side** (`/admin/*`, behind Supabase auth) — used by the board to run the org: review casting applications, negotiate and confirm bookings, manage performers/events, and (in progress) plan the show itself.

The board does this alongside full-time jobs, so the guiding goal for admin work is: **reduce manual effort and add safeguards against missed deadlines** (e.g. forgetting to open casting calls or start promo in time), not just digitize a checklist. When building admin features, prefer automating a step or surfacing a due-date warning over adding another manual toggle.

Current focus: finishing the casting → booking flow, then building out `/admin/event-plan` (currently a stub) to organize a show end-to-end — staff/volunteers, schedule, and whatever else running a show needs.

## Commands

```bash
npm run dev             # start Vite dev server
npm run build            # tsc -b && vite build (type-checks, then builds)
npm run lint              # eslint .
npm run preview           # preview production build
npm run tailwind:build     # standalone Tailwind CSS build (rarely needed; Vite handles CSS in dev/build)
```

There is no test runner configured in this project.

## Architecture

**Stack**: React 19 + TypeScript + Vite, React Router v7, TanStack Query, Tailwind CSS v3 (via PostCSS — `@tailwindcss/vite` is present in `package.json` but unused, the actual build path is `postcss.config.js` + `@tailwind` directives in `index.css`), Supabase (Postgres + Auth + Storage + Edge Functions), Cloudinary (image hosting), Resend (transactional email) and Mailchimp (newsletter), deployed on Netlify (with Netlify Edge Functions for anything needing a server-side API key).

**Path alias**: `@/*` → `src/*` (configured in `vite.config.ts` and `tsconfig`).

### Layered structure

- `src/pages/` — route-level components (public pages, `src/pages/admin/*` for board-only pages).
- `src/components/` — shared/presentational components, grouped by domain (`applications/`, `admin/`, `events/`, `performers/`).
- `src/services/` — plain functions that talk to Supabase/Cloudinary. No React imports, no hooks, no component state. Grouped by domain: `eventService`, `performerService`, `applicationService`, `cloudinaryService`, plus `databaseService.ts` for generic `updateRow`/`deleteRow`/storage-upload helpers reused across the others.
- `src/contexts/` — `AuthContext` (Supabase session) and `LanguageContext` (see i18n below), both app-wide providers wrapped around the router in `App.tsx`.
- `src/types/` — `database.types.ts` is **generated** from the Supabase schema (via Supabase CLI) — don't hand-edit it, regenerate it after a schema change. `types.ts` re-exports friendlier aliases (`Event`, `Performer`, `CastingApplication`, `CreateXInput`, enums, etc.) built on top of it — import from `@/types/types`, not directly from `database.types`.

This Service (data access) vs. Hook (React state) split is intentional — see `notes.md` for the reasoning the project settled on: a service is "just functions that send/fetch data"; reach for a hook only when something needs `useState`/`useEffect` (loading flags, etc.).

### Data model (Supabase/Postgres)

Schema is managed remotely in Supabase (no local `.sql` migrations in this repo — `supabase/` only holds CLI config); `database.types.ts` is the source of truth for current tables/columns/enums.

Core tables:

- `events` / `old_events` (+ `event_images` / `old_event_images`) — a show, with `status` (`draft | published | cancelled | archived`) and casting-call fields (`has_casting_call`, `casting_call_deadline`, `casting_info_sv/eng`).
- `performers` (admin-facing) / `public_performers` (a view — public-safe subset) and `performer_acts`.
- `casting_applications` — a performer's application to a specific event's casting call. Carries both a `review_status` (`pending | yes | maybe | no`, the board's casting decision) and a `booking_status` (`not_contacted | negotiating | pending_confirmation | confirmed | declined`, the fee/logistics negotiation with the artist) as separate concerns.
- `event_performers` — join table for a performer _confirmed and booked_ onto an event's lineup (fee, travel, accommodation, reveal state, plus-one).
- `event_staff_volunteers` (join) / `staff_volunteers` — roles (`photographer | technician | doorman | artistic | volunteer | musician | entertainment | other`) already modeled for future staffing/volunteer admin UI.
- `sponsors` / `event_sponsors` (join), `venues`.

**The casting → booking → lineup pipeline**, the flow currently being refined:

1. Public `CastingForm` → `submitCastingApplication` inserts a `casting_applications` row (`review_status: pending`).
2. Board reviews in `AdminCasting` / `CastingApplicationRow` → sets `review_status` and, once "yes", negotiates fee/travel via `updateApplicationLogistics` (`booking_status` moves `not_contacted → negotiating → pending_confirmation`).
3. The artist gets a link to `/casting/confirm/:id?token=...` (`ArtistBookingPortal`), authenticated by `access_token` on the row rather than a login — `getCastingApplicationByToken` checks both `id` and `token` match. There they see `BookingDecisionCard` (accept fee / counter-offer via `submitArtistCounterOffer`) or, once `booking_status: confirmed`, `BookedArtistForm` (fill in act/logistics details).
4. Confirming a booking calls the `confirm_and_migrate_artist` Postgres RPC (not plain client-side inserts) — it atomically migrates the application into `performers`/`performer_acts`/`event_performers`. Keep using the RPC for this step rather than reimplementing the migration in the client.

### Auth

Board members authenticate via Supabase Auth (`AuthContext`); `ProtectedRoute` gates every `/admin/*` route and redirects to `/admin/login`. There's no role/permission system beyond "logged in or not" — any authenticated user is a full admin.

### i18n

No i18n library. `LanguageContext` provides `t(swedishText, englishText)`, and Swedish/English strings are passed inline at each call site (`t('Öppnar ridån...', 'Opening the curtain...')`) rather than kept in translation files. Follow this pattern for new copy — every user-facing string needs both a `sv` and `eng` (note: `eng`, not `en`, is the `language` enum/context value... except the `casting-confirmation` edge function's `type`/body field uses `'en'`, so check which layer you're in). Db columns follow `_sv`/`_eng` suffixes (e.g. `description_sv`, `casting_info_eng`).

### Images

Cloudinary is the image host (`cloudinaryService.ts`): direct unsigned upload from the client via `VITE_CLOUDINARY_UPLOAD_PRESET`, tag-based listing via a Supabase Edge Function (`get-images-by-tag`), and deletes proxied through another Edge Function (`cloudinary-delete`, requires an authenticated session) so the Cloudinary API secret never reaches the client. `CloudinaryImage.tsx` renders images by public ID. Only some general file uploads (not the main image pipeline) go through Supabase Storage (`databaseService.uploadStorageFile`).

### Email

Netlify Edge Functions (`netlify/edge-functions/*`, Deno runtime) are the only place `RESEND_API_KEY`/`MAILCHIMP_API_KEY` are used — never call Resend/Mailchimp directly from client code:

- `application-confirmation.ts` — confirmation email after any application type (`casting | staff | sponsor | artist`) is submitted.
- `send-casting-email.ts` — board-triggered emails to an artist during the booking flow (e.g. sending the booking-portal link).
- `subscribe.ts` — newsletter opt-in to Mailchimp.

### Styling conventions

Tailwind, with the recurring dark/gold "velvet" theme expressed as reusable component classes in `src/index.css` (`@layer components`) rather than repeated utility soup — e.g. `.page-shell`, `.gold-divider`, `.callout-panel`, `.form-label-gold`, `.velvet-warning-box`, `.loading-container`. Reuse these classes for new admin/public pages instead of rebuilding the look with raw Tailwind. Color palette (deep wine background, cream foreground, red primary, gold accent) is documented in `notes.md`.

### Code style

Prettier is configured (no semicolons, single quotes, 100-char width) — this differs from many defaults, so trust `.prettierrc` over habit. ESLint (`eslint.config.js`) covers `react-hooks` and `react-refresh` rules on top of the TS defaults.

### Extra notes

See docs/audit-findings.md for known issues being worked through — check this before flagging duplicate issues.
