import type { AdminEventStaffRow } from '@/services/eventService'

export interface GroupedStaffPerson {
  staff: AdminEventStaffRow['staff']
  rows: AdminEventStaffRow[]
  needs_food: boolean
  dietary_category: AdminEventStaffRow['dietary_category']
  dietary_notes: AdminEventStaffRow['dietary_notes']
}

// Collapses event_staff_volunteers rows down to one entry per person. A person can hold
// several rows for one event (multiple roles, or multiple volunteer shifts), but should only
// ever count once for the VIP list and any food/dietary headcount — this is the single place
// that dedup happens, so the VIP list, the "Mat" summary, and the progress overview can't
// drift out of sync the way they did before (headcount badges were patched to dedupe, the VIP
// list wasn't). Food status is OR'd across a person's rows — if any row is flagged, the person
// is flagged — since confirmStaffForEvent/updateStaffFoodInfoForPerson keep every row for the
// same person in sync going forward; this only has to arbitrate for rows confirmed before that
// sync existed.
export const groupStaffRowsByPerson = (rows: AdminEventStaffRow[]): GroupedStaffPerson[] => {
  const order: string[] = []
  const map = new Map<string, GroupedStaffPerson>()

  for (const row of rows) {
    let entry = map.get(row.staff.id)
    if (!entry) {
      entry = {
        staff: row.staff,
        rows: [],
        needs_food: false,
        dietary_category: null,
        dietary_notes: null,
      }
      map.set(row.staff.id, entry)
      order.push(row.staff.id)
    }
    entry.rows.push(row)
    if (row.needs_food && !entry.needs_food) {
      entry.needs_food = true
      entry.dietary_category = row.dietary_category
      entry.dietary_notes = row.dietary_notes
    }
  }

  return order.map((id) => map.get(id)!)
}
