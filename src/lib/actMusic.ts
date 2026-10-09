import type { Json } from '@/types/database.types'
import { getPublicFileUrl } from '@/lib/utils'

// One song on an act, as saved by the artist in BookedArtistForm (performer_acts.audio_files).
// An entry is either just title + artist (so the technician can find it online) or also an
// uploaded file in the public `artist-files` bucket.
export interface ActTrack {
  id: string
  title: string
  artist: string
  fileName?: string
  fileUrl?: string
  // Meant to be a bucket path, but older entries hold the full public URL instead.
  filePath?: string
}

const isActTrack = (item: unknown): item is ActTrack =>
  typeof item === 'object' &&
  item !== null &&
  typeof (item as ActTrack).title === 'string' &&
  typeof (item as ActTrack).artist === 'string'

export const parseActTracks = (audioFiles: Json | null | undefined): ActTrack[] =>
  Array.isArray(audioFiles) ? (audioFiles as unknown[]).filter(isActTrack) : []

export const trackFileUrl = (track: ActTrack): string | null =>
  track.fileUrl || (track.filePath ? getPublicFileUrl(track.filePath) : null) || null

// An act "has music" once it has at least one song entry — title + artist is enough, an
// upload isn't required.
export const actHasMusic = (audioFiles: Json | null | undefined): boolean =>
  parseActTracks(audioFiles).length > 0
