import { supabase } from '@/lib/supabase'
import type {
  Event,
  CastingApplication,
  CreateCastingApplicationInput,
  CreateStaffVolunteerInput,
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

export const getCastingApplicationById = async (id: string): Promise<CastingApplication | null> => {
  const { data, error } = await supabase
    .from('casting_applications')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

//=== CREATE ===///

export const submitCastingApplication = async (
  application: CreateCastingApplicationInput
): Promise<void> => {
  const { error } = await supabase.from('casting_applications').insert(application)

  if (error) throw error
}

export const submitJoinApplication = async (
  application: CreateStaffVolunteerInput
): Promise<void> => {
  const { error } = await supabase.from('staff_volunteers').insert(application)

  if (error) throw error
}

export const submitSponsorApplication = async (application: CreateSponsorInput): Promise<void> => {
  const { error } = await supabase.from('sponsors').insert(application)

  if (error) throw error
}

//=== UPDATE ===///

export const updateApplicationStatus = async (
  id: string,
  newStatus: CastingApplication['review_status']
): Promise<void> => {
  const { error } = await supabase
    .from('casting_applications')
    .update({ review_status: newStatus })
    .eq('id', id)

  if (error) throw error
}

export const updateApplicationNotes = async (id: string, notes: string): Promise<void> => {
  const { error } = await supabase
    .from('casting_applications')
    .update({ admin_notes: notes })
    .eq('id', id)

  if (error) throw error
}

export const updateApplicationLogistics = async (
  id: string,
  initialReplySent: boolean,
  bookingStatus: CastingApplication['booking_status']
): Promise<void> => {
  const { error } = await supabase
    .from('casting_applications')
    .update({
      initial_reply_sent: initialReplySent,
      booking_status: bookingStatus,
    })
    .eq('id', id)

  if (error) throw error
}

export const submitArtistCounterOffer = async (
  id: string,
  updates: {
    requested_fee: number
    needs_travel_costs: boolean
    travel_cost_amount: number | null
    needs_accommodation: boolean
    accommodation_notes: string | null
  }
): Promise<void> => {
  const { error } = await supabase
    .from('casting_applications')
    .update({
      ...updates,
      booking_status: 'pending_confirmation',
    })
    .eq('id', id)

  if (error) throw error
}

export const confirmAndMigrateArtist = async (
  app: CastingApplication,
  finalFee: number
): Promise<void> => {
  const { error } = await supabase.rpc('confirm_and_migrate_artist', {
    p_application_id: app.id,
    p_final_fee: finalFee,
  })

  if (error) {
    console.error('Kunde inte migrera och bekräfta artist:', error)
    throw error
  }
}
