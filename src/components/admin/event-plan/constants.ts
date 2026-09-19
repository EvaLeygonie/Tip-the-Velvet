import type { VipEntryCategory, StaffVolunteerType, VolunteerShift } from '@/types/types'

// The 4 standing organizers — a fixed, rarely-changing set of real people, not worth a
// table for (confirmed against the org's own real VIP list sheets, which list the same 4
// people/emails every time). Shared between the VIP & Mat tab and the progress overview's
// VIP count.
export const STANDING_ORGANIZERS: { name: string; email: string }[] = [
  { name: 'Andrea Jensen', email: 'andrealuciajensen@gmail.com' },
  { name: 'Krister Johansson', email: 'lillqrill@gmail.com' },
  { name: 'Eva Leygonie', email: 'eva.leygonie@hotmail.fr' },
  { name: 'Pontus Lindhé', email: 'pontus.lioh@gmail.com' },
]

export const VIP_CATEGORY_ORDER: VipEntryCategory[] = ['ticket_winner', 'contest_winner', 'other']

// The typical number of prize sponsors per event — one per the competition's 4 winning
// categories — used as the grid's default slot count and the "filled" threshold. Not a
// hard cap: more can be added (SponsorSlotGrid.tsx's "+" picker doesn't stop at 4), per
// direct feedback (2026-09-02) that some events do have extra prize sponsors.
export const PRIZE_SLOT_COUNT = 4

// The 2 roles that historically need exactly one person, per the org's real event
// checklist and admin-portal-roadmap.md's 2026-08-19 decision — no stored requirement
// system, just a computed presence check. Doorman was dropped from this list 2026-09-02:
// it's a voluntary position, so StaffingCoverageStrip.tsx gives it its own bespoke rule
// (checkmark if filled, never a warning) instead of this shared missing-role check.
export const FIXED_STAFF_ROLES: StaffVolunteerType[] = ['photographer', 'technician']

// Shared section/card order for both the Bemanning tab's role-grouped list
// (AdminEventPlan.tsx) and its coverage strip (StaffingCoverageStrip.tsx) — keeping one
// source of truth so the two can't drift out of sync with each other.
export const ROLE_ORDER: StaffVolunteerType[] = [
  'photographer',
  'technician',
  'doorman',
  'dj',
  'stage_kitten',
  'entertainment',
  'volunteer',
  'other',
]

// Order these appear in on the Bemanning tab's Volontär section, and in the shift picker
// in AddToEventPopover.tsx — driving/setup/guestlist/takedown, per the org's real shift
// order for running a show.
export const VOLUNTEER_SHIFT_ORDER: VolunteerShift[] = ['driving', 'setup', 'guestlist', 'takedown']
