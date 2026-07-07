import { supabase } from '@/lib/supabase'
import type {
  Event,
  OldEvent,
  CreateEventInput,
  CreateEventImageInput,
  Performer,
} from '@/types/types'
import { deleteFromCloudinary } from './cloudinaryService'
import { updateRow } from './databaseService'

export interface EventPerformerRow {
  display_order: number
  is_revealed: boolean
  performer: Performer
}

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

export async function fetchEventsForAdmin(): Promise<Event[]> {
  const { data, error } = await supabase
    .from('events')
    .select('id, title, event_start')
    .order('event_start', { ascending: false })

  if (error) throw error
  return (data || []) as Event[]
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
      .select(
        `
        *,
        event_images(*),
        venues:venue_id (id, name, map_link),
        public_photographers:photographer_id (id, name, link)
      `
      )
      .eq('slug', slug)
      .single()

    if (error) throw error

    return {
      ...data,
      images: data.event_images || [],
    }
  }
}

export const getEventPerformers = async (eventId: string): Promise<EventPerformerRow[]> => {
  const { data, error } = await supabase
    .from('event_performers')
    .select(
      `
      display_order,
      is_revealed,
      performer:public_performers (
        id,
        performer_name,
        promo_image_id,
        slug
      )
    `
    )
    .eq('event_id', eventId)
    .order('display_order', { ascending: true })

  if (error) throw error

  return (data || []) as unknown as EventPerformerRow[]
}

export const getAdminEventDetails = async (slug: string) => {
  const { data, error } = await supabase
    .from('events')
    .select(
      `
      *,
      venues (id, name),
      public_photographers!events_photographer_id_fkey (id, name)
    `
    )
    .eq('slug', slug)
    .single()

  if (error) throw error
  return data
}

export const getAllVenues = async () => {
  const { data, error } = await supabase.from('venues').select('id, name').order('name')

  if (error) throw error
  return data
}

export const getAllPhotographers = async () => {
  const { data, error } = await supabase
    .from('public_photographers')
    .select('id, name')
    .order('name')

  if (error) throw error
  return data
}

//=== CREATE ===//

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
