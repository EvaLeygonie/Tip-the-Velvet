import { supabase } from '@/lib/supabase'
import type {
  Event,
  OldEvent,
  CreateEventInput,
  CreateEventImageInput,
  Performer,
  EventPerformer,
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

// Used by the public Join Us form to decide what to show about volunteer recruitment —
// returns the event regardless of staff_recruitment_open so the form can distinguish
// "open" from "closed but still worth mentioning" rather than seeing nothing either way.
export const getNearestUpcomingEvent = async (): Promise<
  Pick<Event, 'id' | 'title' | 'event_start' | 'staff_recruitment_open'> | null
> => {
  const { data, error } = await supabase
    .from('events')
    .select('id, title, event_start, staff_recruitment_open')
    .eq('status', 'published')
    .gte('event_start', new Date().toISOString())
    .order('event_start', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
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

export interface AdminEventPerformerRow extends EventPerformer {
  performer: Performer
  // The promo image submitted with THIS event's casting application, not
  // performer.promo_image_id — a returning performer's profile picture is left untouched
  // at confirm time, so it can be a completely different (often older) image than what
  // they submitted for this specific event/act. Falls back to the profile picture only if
  // no matching application row exists (e.g. a performer added by hand).
  eventPromoImageId: string | null
}

export const getEventPerformersForAdmin = async (
  eventId: string
): Promise<AdminEventPerformerRow[]> => {
  const [lineup, applications] = await Promise.all([
    supabase
      .from('event_performers')
      .select('*, performer:performers(*)')
      .eq('event_id', eventId)
      .order('display_order', { ascending: true }),
    supabase
      .from('casting_applications')
      .select('performer_id, promo_image_id')
      .eq('event_id', eventId)
      .not('performer_id', 'is', null),
  ])

  if (lineup.error) throw lineup.error
  if (applications.error) throw applications.error

  const appImageByPerformerId = new Map(
    (applications.data || []).map((a) => [a.performer_id as string, a.promo_image_id])
  )

  return ((lineup.data || []) as unknown as AdminEventPerformerRow[]).map((row) => ({
    ...row,
    eventPromoImageId:
      appImageByPerformerId.get(row.performer_id) ?? row.performer?.promo_image_id ?? null,
  }))
}

// Keyed on the composite (event_id, performer_id) — event_performers has no surrogate `id`
// column, so the generic updateRow() helper (which assumes one) can't be reused here.
export const schedulePerformerReveal = async (
  eventId: string,
  performerId: string,
  date: string | null
): Promise<void> => {
  const { error } = await supabase
    .from('event_performers')
    .update({ reveal_date: date })
    .eq('event_id', eventId)
    .eq('performer_id', performerId)

  if (error) throw error
}

// Only flips event_performers.is_revealed — a first-time performer also needs
// performers.is_approved set true (that's what actually gates the public_performers view),
// which the caller handles alongside this via performerService.togglePerformerVisibility
// when performer.is_approved is still false.
export const revealPerformerNow = async (eventId: string, performerId: string): Promise<void> => {
  const { error } = await supabase
    .from('event_performers')
    .update({ is_revealed: true })
    .eq('event_id', eventId)
    .eq('performer_id', performerId)

  if (error) throw error
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
