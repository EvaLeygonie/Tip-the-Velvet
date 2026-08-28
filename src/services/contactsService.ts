import { supabase } from '@/lib/supabase'
import type {
  StaffVolunteers,
  Sponsors,
  Venue,
  CreateStaffVolunteerInput,
  CreateSponsorInput,
  CreateVenueInput,
  StaffVolunteerType,
  SponsorType,
  EventStaffInvitationStatus,
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
// when the admin already knows for certain. Upserts against event_staff_volunteers's
// composite PK so re-clicking updates in place rather than erroring.
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
  const { error } = await supabase
    .from('event_staff_volunteers')
    .upsert(
      { event_id: eventId, staff_id: staffId, role, role_details: roleDetails },
      { onConflict: 'event_id,staff_id' }
    )

  if (error) throw error

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
