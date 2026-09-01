import { supabase } from '@/lib/supabase'
import type {
  StaffVolunteers,
  Sponsors,
  Venue,
  Club,
  CreateStaffVolunteerInput,
  CreateSponsorInput,
  CreateVenueInput,
  CreateClubInput,
  StaffVolunteerType,
  SponsorType,
  EventStaffInvitationStatus,
  DietaryCategory,
} from '@/types/types'

//=== READ ===///

export const getStaffVolunteers = async (): Promise<StaffVolunteers[]> => {
  const { data, error } = await supabase
    .from('staff_volunteers')
    .select('*')
    .order('role')
    .order('name')

  if (error) throw error
  return data || []
}

export const getSponsors = async (): Promise<Sponsors[]> => {
  const { data, error } = await supabase.from('sponsors').select('*').order('name')

  if (error) throw error
  return data || []
}

export const getClubs = async (): Promise<Club[]> => {
  const { data, error } = await supabase.from('clubs').select('*').order('name')

  if (error) throw error
  return data || []
}

export const getVenues = async (): Promise<Venue[]> => {
  const { data, error } = await supabase.from('venues').select('*').order('name')

  if (error) throw error
  return data || []
}

// One event's worth of "where does each staff/volunteer stand" — keyed by staff_id.
// Merges the invitation table (interested/invited/declined/not_needed) with the confirmed
// roster (event_staff_volunteers); a confirmed assignment always wins over whatever the
// invitation row says, since it's the more definitive state.
export const getStaffEventStatuses = async (
  eventId: string
): Promise<Record<string, EventStaffInvitationStatus>> => {
  const [invitations, confirmed] = await Promise.all([
    supabase.from('event_staff_invitations').select('staff_id, status').eq('event_id', eventId),
    supabase.from('event_staff_volunteers').select('staff_id').eq('event_id', eventId),
  ])

  if (invitations.error) throw invitations.error
  if (confirmed.error) throw confirmed.error

  const map: Record<string, EventStaffInvitationStatus> = {}
  for (const row of invitations.data || []) {
    map[row.staff_id] = row.status
  }
  for (const row of confirmed.data || []) {
    map[row.staff_id] = 'confirmed'
  }
  return map
}

// Every role one specific person is confirmed under for one specific event — powers the
// "already confirmed as: X, Y" list in the Confirm popover's role picker, now that a
// person can hold more than one role per event.
export const getStaffRolesForEvent = async (
  eventId: string,
  staffId: string
): Promise<{ role: StaffVolunteerType; roleDetails: string | null }[]> => {
  const { data, error } = await supabase
    .from('event_staff_volunteers')
    .select('role, role_details')
    .eq('event_id', eventId)
    .eq('staff_id', staffId)

  if (error) throw error
  return (data || []).map((row) => ({ role: row.role, roleDetails: row.role_details }))
}

//=== CREATE ===///

// Admin-created rows skip the public join-form/confirmation-email flow entirely — consent
// only happens when a board member enters someone with their actual agreement, so it's
// forced true here rather than left to the caller.
export const createStaffVolunteer = async (
  input: Omit<CreateStaffVolunteerInput, 'agreed_to_terms'>
): Promise<StaffVolunteers> => {
  const { data, error } = await supabase
    .from('staff_volunteers')
    .insert({ ...input, agreed_to_terms: true })
    .select()
    .single()

  if (error) throw error
  return data
}

export const createSponsor = async (
  input: Omit<CreateSponsorInput, 'agreed_to_terms'>
): Promise<Sponsors> => {
  const { data, error } = await supabase
    .from('sponsors')
    .insert({ ...input, agreed_to_terms: true })
    .select()
    .single()

  if (error) throw error
  return data
}

export const createVenue = async (input: CreateVenueInput): Promise<Venue> => {
  const { data, error } = await supabase.from('venues').insert(input).select().single()

  if (error) throw error
  return data
}

export const createClub = async (input: CreateClubInput): Promise<Club> => {
  const { data, error } = await supabase.from('clubs').insert(input).select().single()

  if (error) throw error
  return data
}

//=== EVENT ASSIGNMENT ===///

// Quick manual annotation — "this person told me by email/in person they want to help" —
// not an email trigger. Upserts so re-clicking updates in place rather than erroring
// against the (event_id, staff_id) unique constraint.
export const markStaffInterested = async (eventId: string, staffId: string): Promise<void> => {
  const { error } = await supabase
    .from('event_staff_invitations')
    .upsert(
      { event_id: eventId, staff_id: staffId, status: 'interested' },
      { onConflict: 'event_id,staff_id' }
    )

  if (error) throw error
}

// Skips the invitation record entirely and writes straight onto the confirmed roster, for
// when the admin already knows for certain. `event_staff_volunteers` moved from a
// composite (event_id, staff_id) PK to a surrogate `id` specifically so one person can hold
// several roles at the same event — so this can no longer be a blind upsert-by-person. It's
// keyed on (event_id, staff_id, role) instead: confirming the same role again just updates
// its details, confirming a *different* role adds a second row rather than overwriting the
// first.
//
// Photographer is special-cased: events.photographer_id/photographer (set from
// EventEditor.tsx) and this roster are two views onto the same fact — confirming a
// photographer here needs to update both, and since there's only one photographer per
// event, any other photographer's roster row for this event is removed first.
export const confirmStaffForEvent = async (
  eventId: string,
  staffId: string,
  staffName: string,
  role: StaffVolunteerType,
  roleDetails: string | null
): Promise<void> => {
  const { data: existing, error: selectError } = await supabase
    .from('event_staff_volunteers')
    .select('id')
    .eq('event_id', eventId)
    .eq('staff_id', staffId)
    .eq('role', role)
    .maybeSingle()
  if (selectError) throw selectError

  if (existing) {
    const { error } = await supabase
      .from('event_staff_volunteers')
      .update({ role_details: roleDetails })
      .eq('id', existing.id)
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('event_staff_volunteers')
      .insert({ event_id: eventId, staff_id: staffId, role, role_details: roleDetails })
    if (error) throw error
  }

  if (role === 'photographer') {
    const { error: cleanupError } = await supabase
      .from('event_staff_volunteers')
      .delete()
      .eq('event_id', eventId)
      .eq('role', 'photographer')
      .neq('staff_id', staffId)
    if (cleanupError) throw cleanupError

    const { error: eventError } = await supabase
      .from('events')
      .update({ photographer_id: staffId, photographer: staffName })
      .eq('id', eventId)
    if (eventError) throw eventError
  }
}

// Same upsert shape as markStaffInterested, just a different status — "this person can't/
// won't work this event," recorded so the board stops re-asking them for it. Distinct from
// deleting the row: the point is to remember the answer, not forget it.
export const markStaffDeclined = async (eventId: string, staffId: string): Promise<void> => {
  const { error } = await supabase
    .from('event_staff_invitations')
    .upsert(
      { event_id: eventId, staff_id: staffId, status: 'declined' },
      { onConflict: 'event_id,staff_id' }
    )

  if (error) throw error
}

// Admin-side bookkeeping, not a rejection from the person — "we had enough people this
// time," so next time this is exactly who to ask first. Kept as its own status rather than
// reusing 'declined' since the two answer different questions later.
export const markStaffNotNeeded = async (eventId: string, staffId: string): Promise<void> => {
  const { error } = await supabase
    .from('event_staff_invitations')
    .upsert(
      { event_id: eventId, staff_id: staffId, status: 'not_needed' },
      { onConflict: 'event_id,staff_id' }
    )

  if (error) throw error
}

// Undoes markStaffInterested/markStaffDeclined/markStaffNotNeeded alike — deletes the
// invitation row entirely (by event+staff, regardless of which status it currently holds)
// rather than setting some "removed" status, since nothing else needs to remember it was
// ever there.
export const removeStaffInterest = async (eventId: string, staffId: string): Promise<void> => {
  const { error } = await supabase
    .from('event_staff_invitations')
    .delete()
    .eq('event_id', eventId)
    .eq('staff_id', staffId)

  if (error) throw error
}

// Undoes confirmStaffForEvent — removes one specific role assignment, not every role this
// person might hold at the event (see confirmStaffForEvent's note on multi-role support).
// Mirrors that function's photographer special-case: if they were the event's photographer,
// clears events.photographer_id/photographer too (guarded by matching photographer_id so
// this can't clobber a different photographer who's since been confirmed instead).
export const removeStaffFromEvent = async (
  eventId: string,
  staffId: string,
  role: StaffVolunteerType
): Promise<void> => {
  const { error } = await supabase
    .from('event_staff_volunteers')
    .delete()
    .eq('event_id', eventId)
    .eq('staff_id', staffId)
    .eq('role', role)

  if (error) throw error

  if (role === 'photographer') {
    const { error: eventError } = await supabase
      .from('events')
      .update({ photographer_id: null, photographer: null })
      .eq('id', eventId)
      .eq('photographer_id', staffId)
    if (eventError) throw eventError
  }
}

//=== SPONSOR EVENT ASSIGNMENT ===///

// Sponsor "interest" is a real conversation, not a status worth tracking — this is the
// only sponsor/event write that exists, straight onto the confirmed roster
// (event_sponsors). Upserts against its composite PK so re-clicking updates in place.
export const confirmSponsorForEvent = async (
  eventId: string,
  sponsorId: string,
  sponsorType: SponsorType | null,
  details: string | null
): Promise<void> => {
  const { error } = await supabase
    .from('event_sponsors')
    .upsert(
      { event_id: eventId, sponsor_id: sponsorId, role: sponsorType, details },
      { onConflict: 'event_id,sponsor_id' }
    )

  if (error) throw error
}

export const getConfirmedSponsorIds = async (eventId: string): Promise<Set<string>> => {
  const { data, error } = await supabase
    .from('event_sponsors')
    .select('sponsor_id')
    .eq('event_id', eventId)

  if (error) throw error
  return new Set((data || []).map((r) => r.sponsor_id))
}

// Undoes confirmSponsorForEvent.
export const removeSponsorFromEvent = async (eventId: string, sponsorId: string): Promise<void> => {
  const { error } = await supabase
    .from('event_sponsors')
    .delete()
    .eq('event_id', eventId)
    .eq('sponsor_id', sponsorId)

  if (error) throw error
}

// Event Planning's Staff/Volunteers and Sponsors tabs let the board edit an already-
// confirmed assignment's logistics note in place — everything else about the contact
// (name/email/role itself) is still only editable via Contacts.
export const updateEventStaffRoleDetails = async (
  id: string,
  roleDetails: string | null
): Promise<void> => {
  const { error } = await supabase
    .from('event_staff_volunteers')
    .update({ role_details: roleDetails })
    .eq('id', id)

  if (error) throw error
}

export const updateStaffFoodInfo = async (
  id: string,
  patch: {
    needs_food?: boolean
    dietary_category?: DietaryCategory | null
    dietary_notes?: string | null
  }
): Promise<void> => {
  const { error } = await supabase.from('event_staff_volunteers').update(patch).eq('id', id)

  if (error) throw error
}

export const updateEventSponsorDetails = async (
  eventId: string,
  sponsorId: string,
  details: string | null
): Promise<void> => {
  const { error } = await supabase
    .from('event_sponsors')
    .update({ details })
    .eq('event_id', eventId)
    .eq('sponsor_id', sponsorId)

  if (error) throw error
}
