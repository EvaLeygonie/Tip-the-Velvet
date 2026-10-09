import type { AdminEventActRow, AdminEventPerformerRow } from '@/services/eventService'
import { actHasMusic } from '@/lib/actMusic'
import type { GroupedStaffPerson } from '@/lib/staffRowGrouping'
import type { CastingApplicationWithActs, Language } from '@/types/types'

export type MissingItem = 'food' | 'music' | 'notes' | 'receipt'

export interface MissingInfoPerson {
  key: string
  kind: 'artist' | 'staff'
  // Exactly one of these is set, matching `kind` — what info_reminders rows point at.
  performerId?: string
  staffId?: string
  name: string
  email: string | null
  language: Language
  items: MissingItem[]
  // Names of this artist's acts that have no music yet (filled when `items` has 'music').
  musicActs: string[]
  // The artist's personal booking-portal link, when they have a casting application with
  // an access token for this event.
  bookingLink: string | null
}

const bookingLinkFor = (
  performerId: string,
  applications: CastingApplicationWithActs[]
): string | null => {
  const app = applications.find((a) => a.performer_id === performerId && a.access_token)
  return app ? `https://tipthevelvet.nu/casting/confirm/${app.id}?token=${app.access_token}` : null
}

// Everyone at one event who still owes the board something, with *all* of what they owe in
// one place so they can be asked once. The rules mirror the Dashboard cards:
//  - food: performers with no dietary category, plus staff/volunteers who need food and
//    have none (volunteers have nothing else to give).
//  - notes: performers with an act where both stage_preparations and pick_up_cleaning are
//    empty ("N/A" counts as filled). Manual show segments (no performer_id) never count.
//  - music: performers with an act that has no song entry at all (title + artist is enough;
//    an upload isn't required). Manual show segments never count.
//  - receipt: needs travel costs covered, not travelling by car, no receipt uploaded —
//    and only once `includeReceipts` says casting is settled (see AdminDashboard).
export const collectMissingInfo = ({
  performers,
  acts,
  groupedStaff,
  applications,
  includeReceipts,
}: {
  performers: AdminEventPerformerRow[]
  acts: AdminEventActRow[]
  groupedStaff: GroupedStaffPerson[]
  applications: CastingApplicationWithActs[]
  includeReceipts: boolean
}): MissingInfoPerson[] => {
  const performerIdsMissingNotes = new Set(
    acts
      .filter((a) => a.performer_id && !a.stage_preparations && !a.pick_up_cleaning)
      .map((a) => a.performer_id)
  )

  const actsMissingMusic = acts.filter((a) => a.performer_id && !actHasMusic(a.audio_files))

  const artists: MissingInfoPerson[] = performers.flatMap((p) => {
    const items: MissingItem[] = []
    if (!p.dietary_category) items.push('food')
    const musicActs = actsMissingMusic
      .filter((a) => a.performer_id === p.performer_id)
      .map((a) => a.act_name)
    if (musicActs.length > 0) items.push('music')
    if (performerIdsMissingNotes.has(p.performer_id)) items.push('notes')
    if (
      includeReceipts &&
      p.needsTravelCosts &&
      !p.travels_by_car &&
      !(Array.isArray(p.travel_receipts) && p.travel_receipts.length > 0)
    ) {
      items.push('receipt')
    }
    if (items.length === 0) return []
    return [
      {
        key: `artist:${p.performer_id}`,
        kind: 'artist' as const,
        performerId: p.performer_id,
        name: p.performer.performer_name,
        email: p.performer.email,
        language: p.performer.language,
        items,
        musicActs,
        bookingLink: bookingLinkFor(p.performer_id, applications),
      },
    ]
  })

  const staff: MissingInfoPerson[] = groupedStaff
    .filter((p) => p.needs_food && !p.dietary_category)
    .map((p) => ({
      key: `staff:${p.staff.id}`,
      kind: 'staff' as const,
      staffId: p.staff.id,
      name: p.staff.name,
      email: p.staff.email,
      language: p.staff.language,
      items: ['food' as const],
      musicActs: [],
      bookingLink: null,
    }))

  return [...artists, ...staff]
}
