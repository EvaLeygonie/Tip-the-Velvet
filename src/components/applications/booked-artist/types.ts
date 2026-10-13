import type { DietaryCategory } from '@/types/types'

export interface AudioTrackItem {
  id: string
  title: string
  artist: string
  fileName?: string
  fileUrl?: string
  filePath?: string
}

export interface ReceiptItem {
  id: string
  name: string
  url: string
}

// A song uploaded to storage but not yet added to the act.
export interface PendingTrackFile {
  name: string
  url: string
  path: string
}

export interface ActFormState {
  key: string
  actId: string | null
  label: string
  act_name: string
  act_description_sv: string
  act_description_eng: string
  stage_preparations: string
  pick_up_cleaning: string
  act_notes: string
  audioTracks: AudioTrackItem[]
}

// The shared (not per-act) fields of the form: promo texts and logistics.
export interface BookedFormData {
  bio_sv: string
  bio_eng: string
  dietary_requirements: string
  dietary_category: DietaryCategory | ''
  plus_one_name: string
  plus_one_email: string
  plus_one_needs_accommodation: boolean
  travel_covered: number | string
  travels_by_car: boolean
  artist_note: string
}

export type FormChangeEvent = React.ChangeEvent<
  HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
>

// Type Guards for Supabase Json/Jsonb conversion
export const isAudioTrackItemArray = (data: unknown): data is AudioTrackItem[] => {
  if (!Array.isArray(data)) return false
  return data.every(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      'id' in item &&
      'title' in item &&
      'artist' in item
  )
}

export const isReceiptItemArray = (data: unknown): data is ReceiptItem[] => {
  if (!Array.isArray(data)) return false
  return data.every(
    (item) =>
      typeof item === 'object' && item !== null && 'id' in item && 'name' in item && 'url' in item
  )
}
