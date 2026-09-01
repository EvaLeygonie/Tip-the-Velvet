import { supabase } from '@/lib/supabase'
import type {
  Event,
  OldEvent,
  CreateEventInput,
  CreateEventImageInput,
  Performer,
  EventPerformer,
  StaffVolunteers,
  Sponsors,
  PerformerAct,
  DietaryCategory,
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

export interface EventMarketingData {
  id: string
  title: string
  subtitle: string | null
  slug: string
  imageId: string | null
  descriptionSv: string | null
  descriptionEng: string | null
  ticketUrl: string | null
  hashtags: string | null
  location: string | null
  eventStart: string | null
  revealDate: string | null
  castingCallDeadline: string | null
  castingCallStart: string | null
  ticketReleaseDate: string | null
  pinterestLink: string | null
}

// The event-level half of the Marketing tab (AdminMarketing.tsx) — the templated posts'
// content/image, plus event_start (for computing every post's suggested date) and each
// fixed post type's own relevant date, in one light read.
export const getEventMarketingData = async (eventId: string): Promise<EventMarketingData | null> => {
  const { data, error } = await supabase
    .from('events')
    .select(
      'id, title, subtitle, slug, image_id, description_sv, description_eng, ticket_url, hashtags, location, event_start, reveal_date, casting_call_deadline, casting_call_start, ticket_release_date, pinterest_link'
    )
    .eq('id', eventId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return {
    id: data.id,
    title: data.title,
    subtitle: data.subtitle,
    slug: data.slug,
    imageId: data.image_id,
    descriptionSv: data.description_sv,
    descriptionEng: data.description_eng,
    ticketUrl: data.ticket_url,
    hashtags: data.hashtags,
    location: data.location,
    eventStart: data.event_start,
    revealDate: data.reveal_date,
    pinterestLink: data.pinterest_link,
    castingCallDeadline: data.casting_call_deadline,
    castingCallStart: data.casting_call_start,
    ticketReleaseDate: data.ticket_release_date,
  }
}

export interface AdminEventPerformerRow extends EventPerformer {
  performer: Performer
  // The promo image submitted with THIS event's casting application, not
  // performer.promo_image_id — a returning performer's profile picture is left untouched
  // at confirm time, so it can be a completely different (often older) image than what
  // they submitted for this specific event/act. Falls back to the profile picture only if
  // no matching application row exists (e.g. a performer added by hand).
  eventPromoImageId: string | null
  // Same reasoning as eventPromoImageId — the photo credit for THAT image, not
  // performer.photographer (a different, possibly stale credit tied to their profile pic).
  eventPhotographer: string | null
}

export interface AdminEventPlanData {
  performers: AdminEventPerformerRow[]
  ticketUrl: string | null
  hashtags: string | null
}

export const getEventPerformersForAdmin = async (eventId: string): Promise<AdminEventPlanData> => {
  const [lineup, applications, eventRow] = await Promise.all([
    supabase
      .from('event_performers')
      .select('*, performer:performers(*)')
      .eq('event_id', eventId)
      .order('display_order', { ascending: true }),
    supabase
      .from('casting_applications')
      .select('performer_id, promo_image_id, photographer')
      .eq('event_id', eventId)
      .not('performer_id', 'is', null),
    supabase.from('events').select('ticket_url, hashtags').eq('id', eventId).maybeSingle(),
  ])

  if (lineup.error) throw lineup.error
  if (applications.error) throw applications.error
  if (eventRow.error) throw eventRow.error

  const appByPerformerId = new Map(
    (applications.data || []).map((a) => [a.performer_id as string, a])
  )

  const performers = ((lineup.data || []) as unknown as AdminEventPerformerRow[]).map((row) => {
    const app = appByPerformerId.get(row.performer_id)
    return {
      ...row,
      eventPromoImageId: app?.promo_image_id ?? row.performer?.promo_image_id ?? null,
      eventPhotographer: app?.photographer ?? null,
    }
  })

  return {
    performers,
    ticketUrl: eventRow.data?.ticket_url ?? null,
    hashtags: eventRow.data?.hashtags ?? null,
  }
}

export interface AdminEventStaffRow {
  id: string
  role: StaffVolunteers['role']
  role_details: string | null
  needs_food: boolean
  dietary_category: DietaryCategory | null
  dietary_notes: string | null
  staff: StaffVolunteers
}

// Confirmed staff/volunteers for one event, joined with their roster contact info — the
// Event Planning tab's operational view (who's actually confirmed for *this* show), as
// opposed to Contacts' global roster. Assigning someone new still happens on Contacts;
// this is read/edit-details/remove only.
export const getEventStaffForAdmin = async (eventId: string): Promise<AdminEventStaffRow[]> => {
  const { data, error } = await supabase
    .from('event_staff_volunteers')
    .select(
      'id, role, role_details, needs_food, dietary_category, dietary_notes, staff:staff_volunteers(*)'
    )
    .eq('event_id', eventId)

  if (error) throw error
  return (data || []) as unknown as AdminEventStaffRow[]
}

export interface AdminEventSponsorRow {
  sponsor_id: string
  role: Sponsors['sponsor_type']
  details: string | null
  sponsor: Sponsors
}

// Confirmed sponsors for one event, joined with their roster contact info — same shape/
// reasoning as getEventStaffForAdmin above.
export const getEventSponsorsForAdmin = async (eventId: string): Promise<AdminEventSponsorRow[]> => {
  const { data, error } = await supabase
    .from('event_sponsors')
    .select('sponsor_id, role, details, sponsor:sponsors(*)')
    .eq('event_id', eventId)

  if (error) throw error
  return (data || []) as unknown as AdminEventSponsorRow[]
}

export interface AdminEventActRow extends PerformerAct {
  performer: Pick<Performer, 'id' | 'performer_name'>
}

// Show Planning's data source — performer_acts already collects everything a real running
// order needs (stage_preparations/pick_up_cleaning/act_notes, per the org's own "Set list"
// documents), it just never had an admin-facing view before.
export const getEventActsForAdmin = async (eventId: string): Promise<AdminEventActRow[]> => {
  const { data, error } = await supabase
    .from('performer_acts')
    .select('*, performer:performers(id, performer_name)')
    .eq('event_id', eventId)
    .order('display_order', { ascending: true })

  if (error) throw error
  return (data || []) as unknown as AdminEventActRow[]
}

export const updatePerformerActOrder = (id: string, displayOrder: number) =>
  updateRow('performer_acts', id, { display_order: displayOrder })

export const updatePerformerActNotes = (
  id: string,
  patch: Partial<Pick<PerformerAct, 'stage_preparations' | 'pick_up_cleaning' | 'act_notes'>>
) => updateRow('performer_acts', id, patch)

export const updateEventPerformerDietary = async (
  eventId: string,
  performerId: string,
  category: DietaryCategory | null
): Promise<void> => {
  const { error } = await supabase
    .from('event_performers')
    .update({ dietary_category: category })
    .eq('event_id', eventId)
    .eq('performer_id', performerId)

  if (error) throw error
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
// when performer.is_approved is still false. Also used to walk a too-early reveal back
// (isRevealed: false) — deliberately doesn't touch is_approved either way when hiding again:
// a first-timer's profile was already approved by the initial reveal and staying approved
// is harmless, and a returning performer's profile was already approved regardless.
export const setPerformerRevealed = async (
  eventId: string,
  performerId: string,
  isRevealed: boolean
): Promise<void> => {
  const { error } = await supabase
    .from('event_performers')
    .update({ is_revealed: isRevealed })
    .eq('event_id', eventId)
    .eq('performer_id', performerId)

  if (error) throw error
}

// A separate flag from is_revealed on purpose — is_revealed gates the public site, this
// just tracks the board's own checklist of who's had their reveal actually posted to
// social media, which can lag behind (or, via the failsafe above, get un-done) independent
// of site visibility.
export const setPerformerSocialPosted = async (
  eventId: string,
  performerId: string,
  socialPosted: boolean
): Promise<void> => {
  const { error } = await supabase
    .from('event_performers')
    .update({ social_posted: socialPosted })
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

// CurrentEventContext only fetches id/title/event_start (fetchEventsForAdmin) — this is a
// light dedicated read for Contacts' venue-highlight feature, which needs the actual
// venue_id and shouldn't widen that shared context's query just for one consumer.
export const getEventVenueId = async (eventId: string): Promise<string | null> => {
  const { data, error } = await supabase
    .from('events')
    .select('venue_id')
    .eq('id', eventId)
    .maybeSingle()

  if (error) throw error
  return data?.venue_id ?? null
}

// Marketing's asset panel is the only place hashtags get edited now (removed from
// EventEditor.tsx as redundant — it's only ever needed here).
export const saveEventHashtags = async (eventId: string, hashtags: string): Promise<void> => {
  const { error } = await supabase.from('events').update({ hashtags }).eq('id', eventId)
  if (error) throw error
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

// Keeps event_staff_volunteers' photographer row in sync with EventEditor's
// photographer_id dropdown (the EventEditor -> Contacts direction — the reverse direction
// is handled by contactsService.confirmStaffForEvent). Only one photographer per event, so
// any existing role='photographer' row is removed before (optionally) inserting the new
// one; staffId of null just clears it.
export const setEventPhotographer = async (
  eventId: string,
  staffId: string | null
): Promise<void> => {
  const { error: deleteError } = await supabase
    .from('event_staff_volunteers')
    .delete()
    .eq('event_id', eventId)
    .eq('role', 'photographer')
  if (deleteError) throw deleteError

  if (staffId) {
    const { error } = await supabase
      .from('event_staff_volunteers')
      .insert({ event_id: eventId, staff_id: staffId, role: 'photographer' })
    if (error) throw error
  }
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
