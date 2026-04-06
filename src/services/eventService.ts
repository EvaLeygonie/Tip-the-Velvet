import { supabase } from '@/lib/supabase'
import { getCloudinaryImagesByTag } from './cloudinaryService'
import type {
  Event,
  EventImage,
  CreateEventInput,
  CreateEventImageInput,
  OldEvent,
  OldEventImage,
  CreateOldEventImageInput,
  CreateOldEventInput,
} from '@/types'

//=== READ ===///

export const getEvents = async (): Promise<OldEvent[]> => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('date', { ascending: false })

  if (error) {
    console.error('Could not fetch events:', error.message)
    throw error
  }
  return data || []
}

export const getImageGalleryBySlug = async (slug: string) => {
  const { data, error } = await supabase
    .from('event_images')
    .select('*')
    .eq('event_slug', slug)
    .eq('is_visible', true)

  if (error) {
    console.error('Could not fetch image gallery:', error.message)
    throw error
  }
  return data || []
}

export const getEventWithImages = async (slug: string) => {
  const { data, error } = await supabase
    .from('events')
    .select(
      `
      *,
      event_images (*)
    `
    )
    .eq('slug', slug)
    .eq('event_images.is_visible', true)
    .single()

  if (error) {
    console.error('Could not fetch events with images:', error.message)
    throw error
  }
  return data
}

export const getOldEvents = async (): Promise<OldEvent[]> => {
  const { data, error } = await supabase
    .from('old_events')
    .select('*')
    .order('date', { ascending: false })

  if (error) {
    console.error('Could not old fetch events:', error.message)
    throw error
  }
  return data || []
}

export const getOldImageGalleryBySlug = async (slug: string) => {
  const { data, error } = await supabase
    .from('old_event_images')
    .select('*')
    .eq('event_slug', slug)
    .eq('is_visible', true)

  if (error) {
    console.error('Could not fetch old image gallery:', error.message)
    throw error
  }
  return data || []
}

export const getOldEventWithImages = async (slug: string) => {
  const { data, error } = await supabase
    .from('old_events')
    .select(
      `
      *,
      old_event_images (*)
    `
    )
    .eq('slug', slug)
    .eq('old_event_images.is_visible', true)
    .single()

  if (error) {
    console.error('Could not fetch old events with images:', error.message)
    throw error
  }
  return data
}

//=== CREATE ===///

export const createEvent = async (eventData: CreateEventInput): Promise<Event> => {
  const { data, error } = await supabase.from('events').insert([eventData]).single()

  if (error) {
    console.error('Could not create event:', error.message)
    throw error
  }
  return data
}

export const createEventImage = async (eventData: CreateEventImageInput): Promise<EventImage> => {
  const { data, error } = await supabase.from('event_images').insert([eventData]).single()
  if (error) {
    console.error('Could not create event image:', error.message)
    throw error
  }
  return data
}

export const createOldEventImage = async (
  eventData: CreateOldEventImageInput
): Promise<OldEventImage> => {
  const { data, error } = await supabase.from('old_event_images').insert([eventData]).single()

  if (error) {
    console.error('Could not create old event image:', error.message)
    throw error
  }
  return data
}

//=== UPDATE ===///

export const updateEvent = async (id: string, updatedData: Partial<CreateEventInput>) => {
  const { data, error } = await supabase.from('events').update(updatedData).eq('id', id).single()

  if (error) {
    console.error('Could not update events:', error.message)
    throw error
  }
  return data
}

export const ToggleEventImageVisibility = async (id: string, isVisible: boolean) => {
  const { data, error } = await supabase
    .from('event_images')
    .update({ is_visible: isVisible })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Could not update image visibility:', error.message)
    throw error
  }
  return data
}

export const ToggleOldEventImageVisibility = async (id: string, isVisible: boolean) => {
  const { data, error } = await supabase
    .from('old_event_images')
    .update({ is_visible: isVisible })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Could not toggle old event image visibility:', error.message)
    throw error
  }
  return data
}

export const updateOldEvent = async (id: string, updatedData: Partial<CreateOldEventInput>) => {
  const { data, error } = await supabase
    .from('old_events')
    .update(updatedData)
    .eq('id', id)
    .single()

  if (error) {
    console.error('Could not update old event:', error.message)
    throw error
  }
  return data
}

//=== DELETE ===///

export const deleteEvent = async (id: string) => {
  const { error } = await supabase.from('events').delete().eq('id', id)

  if (error) {
    console.error('Could not delete event:', error.message)
    throw error
  }
}

export const deleteEventImage = async (imageId: string) => {
  const { error } = await supabase.from('event_images').delete().eq('id', imageId)

  if (error) {
    console.error('Could not delete event image:', error.message)
    throw error
  }
}

export const deleteOldEvent = async (id: string) => {
  const { error } = await supabase.from('old_events').delete().eq('id', id)

  if (error) {
    console.error('Could not delete old event:', error.message)
    throw error
  }
}

export const deleteOldEventImage = async (imageId: string) => {
  const { error } = await supabase.from('old_event_images').delete().eq('id', imageId)

  if (error) {
    console.error('Could not delete old event image:', error.message)
    throw error
  }
}

//=== SYNC ===///

// CLoudinary => Supabase
export const syncImagesToEvent = async (eventId: string, slug: string, altText: string) => {
  const imageIds = await getCloudinaryImagesByTag(slug)
  const rowsToInsert = imageIds.map((imageId: string) => ({
    event_id: eventId,
    event_slug: slug,
    image_id: imageId,
    alt_text: altText,
  }))

  const { data, error } = await supabase.from('old_event_images').insert(rowsToInsert).select('*')

  if (error) {
    console.error('Could not sync rows to Supabase:', error.message)
    throw error
  }
  return data.length // Antal bilder som synkats
}

export const syncOldImagesToEvent = async (eventId: string, slug: string) => {
  const imageIds = await getCloudinaryImagesByTag(slug)
  const rowsToInsert = imageIds.map((imageId: string) => ({
    old_event_id: eventId,
    event_slug: slug,
    image_id: imageId,
  }))

  const { data, error } = await supabase.from('old_event_images').insert(rowsToInsert).select('*')

  if (error) {
    console.error('Could not sync rows to Supabase:', error.message)
    throw error
  }
  return data.length // Antal bilder som synkats
}
