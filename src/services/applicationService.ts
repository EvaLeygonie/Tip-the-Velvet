import { supabase } from '@/lib/supabase'
import type {
  Event,
  CastingApplication,
  CreateCastingApplicationInput,
  StaffVolunteers,
  CreateStaffVolunteerInput,
  Sponsors,
  CreateSponsorInput,
} from '@/types/types'

//=== READ ===///

export const getEventWithCasting = async (): Promise<Event[]> => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('has_casting_call', true)
    .order('casting_call_deadline', { ascending: false })

  if (error) throw error
  return data || []
}

export const getApplicationsFromEvent = async (eventId: string): Promise<CastingApplication[]> => {
  const { data, error } = await supabase
    .from('casting_applications')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

//=== CREATE ===///

export const submitCastingApplication = async (
  application: CreateCastingApplicationInput
): Promise<CastingApplication> => {
  const { data, error } = await supabase
    .from('casting_applications')
    .insert(application)
    .select()
    .single()

  if (error) throw error
  return data
}

export const submitJoinApplication = async (
  application: CreateStaffVolunteerInput
): Promise<StaffVolunteers> => {
  const { data, error } = await supabase
    .from('staff_volunteers')
    .insert(application)
    .select()
    .single()

  if (error) throw error
  return data
}

export const submitSponsorApplication = async (
  application: CreateSponsorInput
): Promise<Sponsors> => {
  const { data, error } = await supabase.from('sponsors').insert(application).select().single()

  if (error) throw error
  return data
}
