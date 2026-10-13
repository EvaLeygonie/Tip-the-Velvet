import type { AdminEventPerformerRow, AdminEventOrganizerFoodRow } from '@/services/eventService'
import type { GroupedStaffPerson } from '@/lib/staffRowGrouping'
import type { DietaryCategory, Language } from '@/types/types'
import { staffRoleLabel, volunteerShiftLabel, type Translate } from '@/lib/contactLabels'

// One shared shape for "someone who might need feeding at this event," merging three tables
// that don't otherwise agree on field names: performers always eat (event_performers has no
// needs_food flag — they're simply always counted) and their own submitted dietary_requirements
// text is read-only here; staff/volunteers opt in via needs_food and their dietary_notes is
// something the board writes themselves, so it's editable; standing organizers (the 4 show
// producers, always present) are their own kind since they're written to a different table
// (event_staff_food, not event_staff_volunteers — see getEventOrganizerFood's comment) but
// are otherwise editable exactly like staff.
export interface FoodPerson {
  key: string
  name: string
  email: string | null
  language: Language
  subtitle: string
  category: DietaryCategory | null
  notes: string | null
  notesEditable: boolean
  kind: 'performer' | 'staff' | 'organizer'
  performerId?: string
  staffId?: string
}

// Volunteers are described by the shift they cover rather than the generic "Volontär" —
// setup volunteers are there all day (so they eat), door/takedown volunteers arrive later,
// so the shift is the useful bit for food planning. Direct feedback 2026-10-13.
const foodRowLabel = (t: Translate, row: GroupedStaffPerson['rows'][number]): string =>
  row.role === 'volunteer' && row.shift
    ? volunteerShiftLabel(t, row.shift)
    : staffRoleLabel(t, row.role)

// Order people appear in the "Doesn't need food" list — roughly most-likely-to-eat first:
// artist, organizer, technician, photographer, transport, stage kitten, setup, entertainment,
// DJ, guard, door, takedown, other. A person with several roles sorts by their best one.
const FOOD_PRIORITY = [
  'performer',
  'organizer',
  'technician',
  'photographer',
  'driving',
  'stage_kitten',
  'setup',
  'entertainment',
  'dj',
  'doorman',
  'guestlist',
  'takedown',
]

const rankOf = (key: string): number => {
  const i = FOOD_PRIORITY.indexOf(key)
  return i === -1 ? FOOD_PRIORITY.length : i
}

export const foodPriorityRank = (kind: 'performer' | 'organizer'): number => rankOf(kind)

const rowRank = (row: GroupedStaffPerson['rows'][number]): number =>
  rankOf(row.role === 'volunteer' ? (row.shift ?? 'other') : row.role)

export const staffFoodPriorityRank = (rows: GroupedStaffPerson['rows']): number =>
  Math.min(...rows.map(rowRank))

// Labels follow the same priority as the list order (so "Setup, Städ", not the other way
// round, whichever shift was added first).
export const foodSubtitle = (t: Translate, rows: GroupedStaffPerson['rows']): string =>
  Array.from(
    new Set([...rows].sort((a, b) => rowRank(a) - rowRank(b)).map((row) => foodRowLabel(t, row)))
  ).join(', ')

export const buildFoodRoster = (
  t: Translate,
  performers: AdminEventPerformerRow[],
  groupedStaff: GroupedStaffPerson[],
  organizers: AdminEventOrganizerFoodRow[]
): FoodPerson[] => [
  ...performers
    .filter((p) => p.needs_food)
    .map(
      (p): FoodPerson => ({
        key: `performer:${p.performer_id}`,
        name: p.performer.performer_name,
        email: p.performer.email,
        language: p.performer.language,
        subtitle: t('Artist', 'Artist'),
        category: p.dietary_category,
        notes: p.dietary_requirements,
        notesEditable: false,
        kind: 'performer',
        performerId: p.performer_id,
      })
    ),
  ...groupedStaff
    .filter((p) => p.needs_food)
    .map(
      (p): FoodPerson => ({
        key: `staff:${p.staff.id}`,
        name: p.staff.name,
        email: p.staff.email,
        language: p.staff.language,
        subtitle: foodSubtitle(t, p.rows),
        category: p.dietary_category,
        notes: p.dietary_notes,
        notesEditable: true,
        kind: 'staff',
        staffId: p.staff.id,
      })
    ),
  ...organizers
    .filter((o) => o.needs_food)
    .map(
      (o): FoodPerson => ({
        key: `organizer:${o.staff_id}`,
        name: o.staff.name,
        email: o.staff.email,
        language: o.staff.language,
        subtitle: t('Arrangör', 'Organizer'),
        category: o.dietary_category,
        notes: o.dietary_notes,
        notesEditable: true,
        kind: 'organizer',
        staffId: o.staff_id,
      })
    ),
]
