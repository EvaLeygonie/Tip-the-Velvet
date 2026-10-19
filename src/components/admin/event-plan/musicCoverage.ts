import type { AdminEventStaffRow } from '@/services/eventService'

export interface PlaylistFlags {
  // The pre-party playlist: before the show and between the acts.
  hasPrePartyPlaylist: boolean
  hasAfterpartyPlaylist: boolean
}

// What "music is covered for this event" means — shared by StaffingCoverageStrip's "Musik"
// card and the Dashboard's, so they can't drift on the rule. Two things are needed: a pre-party
// playlist (before the show and between the acts), and the afterparty covered by either its own
// playlist or a booked DJ. Returns the specific items still missing (empty array = covered)
// rather than a plain boolean, so callers can show exactly what's left.
export const missingMusicItems = (
  t: (sv: string, en: string) => string,
  staffRows: AdminEventStaffRow[],
  playlists: PlaylistFlags
): string[] => {
  const djCount = new Set(staffRows.filter((r) => r.role === 'dj').map((r) => r.staff.id)).size
  const afterpartyCovered = djCount > 0 || playlists.hasAfterpartyPlaylist
  return [
    !playlists.hasPrePartyPlaylist ? t('Pre-party', 'Pre-party') : null,
    !afterpartyCovered ? t('After-party', 'After-party') : null,
  ].filter((v): v is string => v !== null)
}
