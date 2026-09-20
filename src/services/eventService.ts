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
  VolunteerShift,
} from '@/types/types'
import { deleteFromCloudinary } from './cloudinaryService'
import { updateRow, deleteRow } from './databaseService'
import {
  STANDING_ORGANIZERS,
  SHOW_CONSTANT_SEGMENTS,
} from '@/components/admin/event-plan/constants'

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
export const getNearestUpcomingEvent = async (): Promise<Pick<
  Event,
  'id' | 'title' | 'event_start' | 'staff_recruitment_open'
> | null> => {
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
export const getEventMarketingData = async (
  eventId: string
): Promise<EventMarketingData | null> => {
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
  // Only meaningful for role: 'volunteer' — every other role leaves both null/false.
  shift: VolunteerShift | null
  in_charge: boolean
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
      'id, role, role_details, needs_food, dietary_category, dietary_notes, shift, in_charge, staff:staff_volunteers(*)'
    )
    .eq('event_id', eventId)

  if (error) throw error
  return (data || []) as unknown as AdminEventStaffRow[]
}

export interface AdminEventOrganizerFoodRow {
  staff_id: string
  needs_food: boolean
  dietary_category: DietaryCategory | null
  dietary_notes: string | null
  staff: StaffVolunteers
}

// The 4 standing organizers' food/dietary for one event — a separate table from
// event_staff_volunteers (event_staff_food, keyed on event_id+staff_id with no role at
// all) since organizers don't hold an event-specific staffing role the way everyone else
// on the Food tab does; they're just always there. Rows are seeded automatically by
// createEvent below and by the one-off backfill for events that already existed, so this
// should normally never come back empty for an event created after 2026-09-21.
//
// Explicitly scoped to STANDING_ORGANIZERS' staff_ids rather than "every row in
// event_staff_food for this event" — turns out that table already held 14 leftover rows
// for Pandaemonium's real staff/volunteers (a stale mirror of their event_staff_volunteers
// dietary data from an earlier, abandoned migration attempt, discovered 2026-09-21 while
// chasing a food-count bug). Without this filter, those rows got counted as if they were
// organizers, inflating "X people need food" well past reality.
export const getEventOrganizerFood = async (
  eventId: string
): Promise<AdminEventOrganizerFoodRow[]> => {
  const { data: organizerStaff, error: organizerError } = await supabase
    .from('staff_volunteers')
    .select('id')
    .in(
      'email',
      STANDING_ORGANIZERS.map((o) => o.email)
    )
  if (organizerError) throw organizerError
  const organizerIds = organizerStaff.map((sv) => sv.id)
  if (organizerIds.length === 0) return []

  const { data, error } = await supabase
    .from('event_staff_food')
    .select('staff_id, needs_food, dietary_category, dietary_notes, staff:staff_volunteers(*)')
    .eq('event_id', eventId)
    .in('staff_id', organizerIds)

  if (error) throw error
  return (data || []) as unknown as AdminEventOrganizerFoodRow[]
}

export interface AdminEventSponsorRow {
  sponsor_id: string
  role: Sponsors['sponsor_type']
  details: string | null
  has_merch_table: boolean
  // Whether this prize sponsor has actually handed over their competition prize yet — only
  // meaningful for role: 'prize', but stored on every row same as has_merch_table. Drives
  // the Dashboard's 2-state "Sponsorer" card: red/orange while slots are unfilled, then a
  // second orange state once all 4 are filled but not all have this set. 2026-09-22.
  has_gotten_price: boolean
  // Separate from `details` (which is the prize note) — a merch table's own practical
  // logistics note (space needed, etc.), independent of what prize a sponsor is providing.
  // Direct feedback 2026-09-22: the two were sharing one field, which didn't make sense for
  // a sponsor who's both a prize sponsor and running a table.
  merch_table_notes: string | null
  sponsor: Sponsors
}

// Confirmed sponsors for one event, joined with their roster contact info — same shape/
// reasoning as getEventStaffForAdmin above.
export const getEventSponsorsForAdmin = async (
  eventId: string
): Promise<AdminEventSponsorRow[]> => {
  const { data, error } = await supabase
    .from('event_sponsors')
    .select(
      'sponsor_id, role, details, has_merch_table, has_gotten_price, merch_table_notes, sponsor:sponsors(*)'
    )
    .eq('event_id', eventId)

  if (error) throw error
  return (data || []) as unknown as AdminEventSponsorRow[]
}

export interface AdminEventActRow extends PerformerAct {
  // null for a manual/constant segment (performer_id is null on that row) — see
  // SHOW_CONSTANT_SEGMENTS and createManualShowSegment below.
  performer: Pick<Performer, 'id' | 'performer_name'> | null
}

// Show Planning's data source — performer_acts already collects everything a real running
// order needs (stage_preparations/pick_up_cleaning/act_notes, per the org's own "Set list"
// documents), it just never had an admin-facing view before. Also holds manual/constant
// segments now (performer_id: null) — see the 2026-09-21 Show Planning overhaul.
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

// Manual/constant segments only — a real act's act_name is artist-submitted and stays
// read-only in the admin UI, unlike a manual segment's title which the board writes itself.
export const updateShowSegmentTitle = (id: string, actName: string) =>
  updateRow('performer_acts', id, { act_name: actName })

// One-off host bits, board appearances, etc. that aren't a submitted act — a performer_acts
// row with no performer. Added at the end of its set; the board repositions it via drag and
// drop afterward like any other segment.
export const createManualShowSegment = async (
  eventId: string,
  setNumber: 1 | 2
): Promise<AdminEventActRow> => {
  const { data: existing, error: existingError } = await supabase
    .from('performer_acts')
    .select('display_order')
    .eq('event_id', eventId)
    .order('display_order', { ascending: false })
    .limit(1)
  if (existingError) throw existingError
  const nextOrder = (existing?.[0]?.display_order ?? -1) + 1

  const { data, error } = await supabase
    .from('performer_acts')
    .insert([
      {
        event_id: eventId,
        performer_id: null,
        act_name: '',
        set_number: setNumber,
        display_order: nextOrder,
      },
    ])
    .select('*, performer:performers(id, performer_name)')
    .single()
  if (error) throw error
  return data as unknown as AdminEventActRow
}

export const deleteManualShowSegment = (id: string) => deleteRow('performer_acts', id)

// Persists a drag-and-drop result — the moved item's new set plus every row's recomputed
// display_order (kept as one global sequence spanning both sets, same as before this
// feature; set_number is purely a grouping tag layered on top of it). Same "no bulk RPC,
// just Promise.all the row updates" pattern as the rest of this file.
export const reorderShowProgram = async (
  rows: { id: string; display_order: number; set_number: number }[]
): Promise<void> => {
  await Promise.all(
    rows.map((r) =>
      updateRow('performer_acts', r.id, {
        display_order: r.display_order,
        set_number: r.set_number,
      })
    )
  )
}

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

export interface EventPlaylists {
  before_playlist: string | null
  intermission_playlist: string | null
  afterparty_playlist: string | null
}

// Same reasoning as getEventVenueId above — Event Planning's Music section needs all three
// playlist fields, which CurrentEventContext's shared query doesn't carry. One row, all three
// columns, rather than three separate round trips.
export const getEventPlaylists = async (eventId: string): Promise<EventPlaylists> => {
  const { data, error } = await supabase
    .from('events')
    .select('before_playlist, intermission_playlist, afterparty_playlist')
    .eq('id', eventId)
    .maybeSingle()

  if (error) throw error
  return {
    before_playlist: data?.before_playlist ?? null,
    intermission_playlist: data?.intermission_playlist ?? null,
    afterparty_playlist: data?.afterparty_playlist ?? null,
  }
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
  const { data: insertedRow, error } = await supabase.from('events').insert([eventData]).single()

  if (error) throw error
  // supabase-js's array-literal insert() form loses the Row generic (typed as `never`) even
  // once `error` is ruled out above — cast once here instead of on every field access below.
  const data = insertedRow as Event

  // Seed each standing organizer's food row on this brand-new event, so the Food tab has
  // something to show/edit right away instead of starting empty for them every time —
  // direct feedback 2026-09-21 that the 4 show producers eat at every event too. Looked up
  // by email since staff_volunteers has no other link to STANDING_ORGANIZERS; best-effort
  // only — a hiccup here shouldn't fail event creation itself, and existing events got the
  // same seeding via a one-off SQL backfill instead of this code path.
  try {
    const { data: organizers, error: organizersError } = await supabase
      .from('staff_volunteers')
      .select('id, email')
      .in(
        'email',
        STANDING_ORGANIZERS.map((o) => o.email)
      )
    if (organizersError) throw organizersError
    if (organizers.length > 0) {
      const foodRows = organizers.map((sv) => ({
        event_id: data.id,
        staff_id: sv.id,
        needs_food: true,
        dietary_category:
          STANDING_ORGANIZERS.find((o) => o.email === sv.email)?.defaultDiet ?? 'all_eater',
      }))
      const { error: foodError } = await supabase.from('event_staff_food').insert(foodRows)
      if (foodError) throw foodError
    }
  } catch (err) {
    console.error('Kunde inte förifylla mat för arrangörer:', err)
  }

  // Seed the 3 show-program constants (see SHOW_CONSTANT_SEGMENTS) on this brand-new event
  // too — same best-effort, never-fail-event-creation approach as the organizer food
  // seeding above. Existing events got these via a one-off SQL backfill instead.
  try {
    const constantRows = SHOW_CONSTANT_SEGMENTS.map((segment, index) => ({
      event_id: data.id,
      performer_id: null,
      act_name: segment.title,
      set_number: segment.setNumber,
      is_constant: true,
      constant_key: segment.key,
      display_order: index,
    }))
    const { error: segmentsError } = await supabase.from('performer_acts').insert(constantRows)
    if (segmentsError) throw segmentsError
  } catch (err) {
    console.error('Kunde inte förifylla showens fasta moment:', err)
  }

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
