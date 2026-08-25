import { supabase } from '@/lib/supabase'
import type {
  StaffVolunteers,
  Sponsors,
  Venue,
  CreateStaffVolunteerInput,
  CreateSponsorInput,
  CreateVenueInput,
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
