import type { AdminEventStaffRow } from '@/services/eventService'

export interface PlaylistFlags {
  hasBeforePlaylist: boolean
  hasIntermissionPlaylist: boolean
  hasAfterpartyPlaylist: boolean
}

// What "music is covered for this event" means — shared by StaffingCoverageStrip's "Musik"
// card and EventProgressOverview's, so the two (and now the Dashboard, which reuses
// EventProgressOverview directly) can't drift on the rule. Afterparty is the one slot a
// booked DJ can cover instead of a playlist; before/intermission only ever have the playlist
// option. Returns the specific slots still missing (empty array = fully covered) rather than
// a plain boolean, so callers can show exactly what's left instead of just a checkmark.
export const missingMusicItems = (
  t: (sv: string, en: string) => string,
  staffRows: AdminEventStaffRow[],
  playlists: PlaylistFlags
): string[] => {
  const djCount = new Set(staffRows.filter((r) => r.role === 'dj').map((r) => r.staff.id)).size
  const afterpartyCovered = djCount > 0 || playlists.hasAfterpartyPlaylist
  return [
    !playlists.hasBeforePlaylist ? t('Före showen', 'Before the show') : null,
    !playlists.hasIntermissionPlaylist ? t('Mellanakt', 'Intermission') : null,
    !afterpartyCovered ? t('Efterfest', 'Afterparty') : null,
  ].filter((v): v is string => v !== null)
}
