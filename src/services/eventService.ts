import { supabase } from '@/lib/supabase'
import type { Event, OldEvent, CreateEventInput, CreateEventImageInput } from '@/types/types'
import { deleteFromCloudinary } from './cloudinaryService'
import { updateRow } from './databaseService'

//=== READ ===///

export async function fetchEvents(isOldEvent: false): Promise<Event[]>
export async function fetchEvents(isOldEvent: true): Promise<OldEvent[]>
export async function fetchEvents(isOldEvent: boolean): Promise<Event[] | OldEvent[]> {
  const table = isOldEvent ? 'old_events' : 'events'
  const orderColumn = isOldEvent ? 'date' : 'event_start'
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .order(orderColumn, { ascending: false })
  if (error) throw error
  return (data || []) as Event[] | OldEvent[]
}

export const getEventWithImages = async (slug: string, isOldEvent: boolean) => {
  if (isOldEvent) {
    const { data, error } = await supabase
      .from('old_events')
      .select('*, old_event_images(*)')
      .eq('slug', slug)
      .single()

    if (error) throw error

    return {
      ...data,
      images: data.old_event_images || [],
    }
  } else {
    const { data, error } = await supabase
      .from('events')
      .select('*, event_images(*)')
      .eq('slug', slug)
      .single()

    if (error) throw error

    return {
      ...data,
      images: data.event_images || [],
    }
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

export const updateEvent = (id: string, updatedData: Partial<CreateEventInput>) =>
  updateRow('events', id, updatedData as Record<string, unknown>)

export const toggleImageVisibility = (id: string, isVisible: boolean, isOldEvent: boolean) =>
  updateRow(isOldEvent ? 'old_event_images' : 'event_images', id, { is_visible: isVisible })

export const updateImageOrder = (id: string, displayOrder: number, isOldEvent: boolean) =>
  updateRow(isOldEvent ? 'old_event_images' : 'event_images', id, {
    display_order: displayOrder,
  })

//=== DELETE ===///

export const deleteEventImage = async (imageId: string, publicId: string, isOldEvent: boolean) => {
  const table = isOldEvent ? 'old_event_images' : 'event_images'
  const { error } = await supabase.from(table).delete().eq('id', imageId)
  if (error) throw error

  await deleteFromCloudinary(publicId)
}
