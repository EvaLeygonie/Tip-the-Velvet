import { supabase } from '@/lib/supabase'
import type {
  StaffVolunteers,
  Sponsors,
  Venue,
  CreateStaffVolunteerInput,
  CreateSponsorInput,
  CreateVenueInput,
  StaffVolunteerType,
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
export const confirmStaffForEvent = async (
  eventId: string,
  staffId: string,
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
}
