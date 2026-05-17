import { supabase } from '@/lib/supabase'
import type { Event, CreateEventInput, CreateEventImageInput } from '@/types'
import { deleteFromCloudinary, getCloudinaryImagesByTag } from './cloudinaryService'

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
    .single()

  if (error) throw error

  return {
    ...data,
    images: data[imagesRelation] || [],
  }
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

export const deleteEventImage = async (
  imageId: string,
  publicId: string,
  isOldEvent: boolean,
  accessToken: string
) => {
  const table = isOldEvent ? 'old_event_images' : 'event_images'
  const { error } = await supabase.from(table).delete().eq('id', imageId)
  if (error) throw error

  await deleteFromCloudinary(publicId, accessToken)
}

// == SYNC EXTRAS! ===///

// Sync images from Cloudinary to Supabase
export const syncImagesToEvent = async (eventId: string, slug: string, isOldEvent: boolean) => {
  const imageIds = await getCloudinaryImagesByTag(slug)
  const table = isOldEvent ? 'old_event_images' : 'event_images'
  const rowsToInsert = imageIds.map((imageId: string) => ({
    event_id: eventId,
    event_slug: slug,
    image_id: imageId,
  }))

  const { data, error } = await supabase.from(table).insert(rowsToInsert).select('*')

  if (error) {
    console.error('Could not sync rows to Supabase:', error.message)
    throw error
  }
  return data.length
}

// Remove row images deleted from Cloudinary
export const purgeOrphanedImages = async (slug: string, isOldEvent: boolean): Promise<number> => {
  const table = isOldEvent ? 'old_event_images' : 'event_images'
  const { data, error } = await supabase.from(table).select('id, image_id').eq('event_slug', slug)

  if (error) throw error
  if (!data?.length) return 0

  const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  const deadIds: string[] = []

  await Promise.all(
    data.map(async (row) => {
      const url = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${row.image_id}`
      try {
        const res = await fetch(url, { method: 'HEAD' })
        if (!res.ok) deadIds.push(row.id)
      } catch {
        deadIds.push(row.id)
      }
    })
  )

  if (!deadIds.length) return 0

  const { error: deleteError } = await supabase.from(table).delete().in('id', deadIds)

  if (deleteError) throw deleteError
  return deadIds.length
}
