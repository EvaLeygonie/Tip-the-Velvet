import type {
  VipEntryCategory,
  StaffVolunteerType,
  VolunteerShift,
  DietaryCategory,
} from '@/types/types'

// The 4 standing organizers — a fixed, rarely-changing set of real people, not worth a
// table for (confirmed against the org's own real VIP list sheets, which list the same 4
// people/emails every time). Shared between the VIP & Mat tab, the progress overview's VIP
// count, and (2026-09-21) as the default dietary category seeded for each of them on every
// event's Food tab — see getEventOrganizerFood/createEvent in eventService.ts. Real
// staff_volunteers rows for these 4 people (same name/email as here) must exist in the DB
// for the food-seeding join to find them; they were added via a one-off SQL script rather
// than through the app, since the app has no "add a staff member with no event role" flow.
export const STANDING_ORGANIZERS: { name: string; email: string; defaultDiet: DietaryCategory }[] =
  [
    { name: 'Andrea Jensen', email: 'andrealuciajensen@gmail.com', defaultDiet: 'vegetarian' },
    { name: 'Krister Johansson', email: 'lillqrill@gmail.com', defaultDiet: 'all_eater' },
    { name: 'Eva Leygonie', email: 'eva.leygonie@hotmail.fr', defaultDiet: 'all_eater' },
    { name: 'Pontus Lindhé', email: 'pontus.lioh@gmail.com', defaultDiet: 'all_eater' },
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
  'dj',
  'stage_kitten',
  'doorman',
  'entertainment',
  'volunteer',
  'other',
]

// Order these appear in on the Bemanning tab's Volontär section, and in the shift picker
// in AddToEventPopover.tsx — driving/setup/guestlist/takedown, per the org's real shift
// order for running a show.
export const VOLUNTEER_SHIFT_ORDER: VolunteerShift[] = ['driving', 'setup', 'guestlist', 'takedown']

// Minimum number of people each volunteer shift needs before the Volunteers card on the staffing
// strip counts as covered (StaffingCoverageStrip.tsx). Setup 6, driving 1, guestlist (the door) 4 and
// takedown 4 — set 2026-10-26. A shift missing here has no minimum and never warns.
export const VOLUNTEER_SHIFT_MIN: Partial<Record<VolunteerShift, number>> = {
  driving: 1,
  setup: 6,
  guestlist: 4,
  takedown: 4,
}

// Needs at least 2 stage kittens, not just 1 — direct feedback 2026-09-02.
export const STAGE_KITTEN_MIN = 2

// How many people each role is expected to have; the count badge on a role section and its card turn
// from orange to green once that number is reached. Volunteers are judged shift by shift instead
// (VOLUNTEER_SHIFT_MIN). Roles not listed here have no expected number and show a plain count.
export const STAFF_ROLE_MIN: Partial<Record<StaffVolunteerType, number>> = {
  photographer: 1,
  technician: 1,
  stage_kitten: STAGE_KITTEN_MIN,
}

// People on one volunteer shift (a person on two rows still counts once).
export const shiftPeopleCount = (
  staffRows: { role: StaffVolunteerType; shift: VolunteerShift | null; staff: { id: string } }[],
  shift: VolunteerShift
): number =>
  new Set(
    staffRows.filter((r) => r.role === 'volunteer' && r.shift === shift).map((r) => r.staff.id)
  ).size

// True once every shift that has a minimum has that many people.
export const allVolunteerShiftsCovered = (
  staffRows: { role: StaffVolunteerType; shift: VolunteerShift | null; staff: { id: string } }[]
): boolean =>
  VOLUNTEER_SHIFT_ORDER.every(
    (shift) => shiftPeopleCount(staffRows, shift) >= (VOLUNTEER_SHIFT_MIN[shift] ?? 0)
  )

// The 3 show-program segments that exist on every single show, regardless of lineup — the
// board's own two costume-competition appearances and the closing all-artists thank-you
// bow. Stored as performer_acts rows with performer_id: null and constant_key set to one of
// these keys (is_constant: true), same table real acts live in — see the Show Planning
// overhaul plan, 2026-09-21. Seeded on every new event by createEvent (below) and, for
// events that already existed, via a one-off SQL backfill instead of this code path — same
// split as STANDING_ORGANIZERS' food seeding above. setNumber is just the sensible default
// position; the board can freely drag any of these to the other set afterward.
// "Board" used to be baked into costume_intro/costume_winners' own title text
// ("Board: Presentera kostymtävlingen") — moved down into ShowProgramRow.tsx's subtitle
// instead (next to "Fast moment"/"Constant segment"), so the title itself reads clean.
// Direct feedback 2026-09-22.
export const SHOW_CONSTANT_SEGMENTS: { key: string; title: string; setNumber: 1 | 2 }[] = [
  { key: 'costume_intro', title: 'Presentera kostymtävlingen', setNumber: 1 },
  { key: 'costume_winners', title: 'Presentera kostymtävlingens vinnare', setNumber: 2 },
  { key: 'thank_you', title: 'Alla artister upp på scen för att tacka', setNumber: 2 },
]

// The Event Plan page's tabs (the Dashboard deep-links into them). 'food' is the combined
// Food & VIP tab. Show planning and Travel & accommodation live on the Artist booking page.
export type EventPlanTab = 'staff' | 'sponsors' | 'food' | 'info'
