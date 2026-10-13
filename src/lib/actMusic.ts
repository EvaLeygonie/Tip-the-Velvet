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

// A song counts as delivered once it has an uploaded file; title + artist alone is not enough.
export const trackIsDelivered = (track: ActTrack): boolean => Boolean(trackFileUrl(track))

// An act "has music" when it has at least one song and every song is delivered.
export const actHasMusic = (audioFiles: Json | null | undefined): boolean => {
  const tracks = parseActTracks(audioFiles)
  return tracks.length > 0 && tracks.every(trackIsDelivered)
}
