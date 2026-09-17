import type { AdminEventPerformerRow } from '@/services/eventService'
import type { GroupedStaffPerson } from '@/lib/staffRowGrouping'
import type { DietaryCategory } from '@/types/types'
import { staffPersonRoleSummary, type Translate } from '@/lib/contactLabels'

// One shared shape for "someone who might need feeding at this event," merging two tables
// that don't otherwise agree on field names: performers always eat (event_performers has no
// needs_food flag — they're simply always counted) and their own submitted dietary_requirements
// text is read-only here; staff/volunteers opt in via needs_food and their dietary_notes is
// something the board writes themselves, so it's editable.
export interface FoodPerson {
  key: string
  name: string
  email: string | null
  subtitle: string
  category: DietaryCategory | null
  notes: string | null
  notesEditable: boolean
  kind: 'performer' | 'staff'
  performerId?: string
  staffId?: string
}

export const buildFoodRoster = (
  t: Translate,
  performers: AdminEventPerformerRow[],
  groupedStaff: GroupedStaffPerson[]
): FoodPerson[] => [
  ...performers.map(
    (p): FoodPerson => ({
      key: `performer:${p.performer_id}`,
      name: p.performer.performer_name,
      email: p.performer.email,
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
        subtitle: staffPersonRoleSummary(t, p.rows),
        category: p.dietary_category,
        notes: p.dietary_notes,
        notesEditable: true,
        kind: 'staff',
        staffId: p.staff.id,
      })
    ),
]
