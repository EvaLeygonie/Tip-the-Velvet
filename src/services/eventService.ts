import { supabase } from '@/lib/supabase'
import type { Event, CreateEventInput, CreateEventImageInput } from '@/types'
import { deleteFromCloudinary } from './cloudinaryService'

//=== READ ===///

//! Probably not needed
export const fetchEvents = async (isOldEvent: boolean) => {
  const table = isOldEvent ? 'old_events' : 'events'
  const orderColumn = isOldEvent ? 'date' : 'event_start'
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .order(orderColumn, { ascending: false })
  if (error) throw error
  return data || []
}

export const getEventWithImages = async (slug: string, isOldEvent: boolean) => {
  const table = isOldEvent ? 'old_events' : 'events'
  const imagesRelation = isOldEvent ? 'old_event_images' : 'event_images'

  const { data, error } = await supabase
    .from(table)
    .select(`*, ${imagesRelation}(*)`)
    .eq('slug', slug)
    .eq(`${imagesRelation}.is_visible`, true)
    .single()

  if (error) throw error

  return {
    ...data,
    images: data[imagesRelation] || [],
  }
}

export const getImageGalleryBySlug = async (slug: string, isOldEvent: boolean) => {
  const table = isOldEvent ? 'old_event_images' : 'event_images'

  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('event_slug', slug)
    .eq('is_visible', true)
    .order('display_order', { ascending: true })

  if (error) throw error
  return data || []
}

//=== CREATE ===///

export const createEvent = async (eventData: CreateEventInput): Promise<Event> => {
  const { data, error } = await supabase.from('events').insert([eventData]).single()

  if (error) throw error
  return data
}

export const createEventImage = async (eventData: CreateEventImageInput, isOldEvent: boolean) => {
  const table = isOldEvent ? 'old_event_images' : 'event_images'

  const { data, error } = await supabase.from(table).insert([eventData]).single()

  if (error) throw error
  return data
}

//=== UPDATE ===///

// Generic update — works for any table, matches on id
export const updateRecord = async (
  table: string,
  id: string,
  updatedData: Record<string, unknown>
) => {
  const { data, error } = await supabase
    .from(table)
    .update(updatedData)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateEvent = (id: string, updatedData: Partial<CreateEventInput>) =>
  updateRecord('events', id, updatedData as Record<string, unknown>)

export const toggleImageVisibility = (id: string, isVisible: boolean, isOldEvent: boolean) =>
  updateRecord(isOldEvent ? 'old_event_images' : 'event_images', id, { is_visible: isVisible })

export const updateImageOrder = (id: string, displayOrder: number, isOldEvent: boolean) =>
  updateRecord(isOldEvent ? 'old_event_images' : 'event_images', id, {
    display_order: displayOrder,
  })

//=== DELETE ===///

//generic delete — works for any table, matches on id
export const deleteRecord = async (id: string, table: string) => {
  const { error } = await supabase.from(table).delete().eq('id', id)

  if (error) throw error
}

export const deleteImageEverywhere = async (
  imageId: string, // Supabase row id
  publicId: string, // Cloudinary public_id
  isOldEvent: boolean,
  accessToken: string
) => {
  const table = isOldEvent ? 'old_event_images' : 'event_images'
  const { error } = await supabase.from(table).delete().eq('id', imageId)
  if (error) throw error

  await deleteFromCloudinary(publicId, accessToken)
}
