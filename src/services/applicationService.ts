import type { AudioTrackItem, ReceiptItem } from '@/components/applications/BookedArtistForm'
import { supabase } from '@/lib/supabase'
import type { Json } from '@/types/database.types'
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

export const getCastingApplicationByToken = async (id: string, token: string | null) => {
  if (!token) {
    throw new Error('Access token saknas i URL:en.')
  }

  const { data, error } = await supabase
    .from('casting_applications')
    .select(
      `
      *,
      events (
        id,
        title,
        event_start
      ),
      performers (
        id,
        bio_sv,
        bio_eng
      ),
      performer_acts (
        id,
        act_name,
        description_sv,
        description_eng,
        audio_files,
        stage_preparations,
        pick_up_cleaning,
        act_notes
      )
    `
    )
    .eq('id', id)
    .eq('access_token', token)
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
  bookingStatus: CastingApplication['booking_status'],
  proposedFee?: number
): Promise<void> => {
  const updateData: {
    initial_reply_sent: boolean
    booking_status: CastingApplication['booking_status']
    proposed_fee?: number
  } = {
    initial_reply_sent: initialReplySent,
    booking_status: bookingStatus,
  }

  if (proposedFee !== undefined) {
    updateData.proposed_fee = proposedFee
  }

  const { error } = await supabase.from('casting_applications').update(updateData).eq('id', id)

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

export interface MigrationResult {
  performer_id: string
  act_id: string
}

export const confirmAndMigrateArtist = async (
  app: CastingApplication,
  finalFee: number,
  travelCovered: number
): Promise<MigrationResult> => {
  const { data, error } = await supabase.rpc('confirm_and_migrate_artist', {
    p_application_id: app.id,
    p_final_fee: finalFee,
    p_travel_covered: travelCovered,
  })

  if (error) {
    console.error('Kunde inte migrera och bekräfta artist:', error)
    throw error
  }

  return data as unknown as MigrationResult
}

export interface EventPerformerDetailsInput {
  dietary_requirements?: string
  arrival_time?: string
  travel_receipts?: ReceiptItem[]
  travel_covered?: number
  notes?: string
  plus_one_name?: string
  plus_one_email?: string
}

export const updateEventPerformerDetails = async (
  eventId: string,
  performerId: string,
  details: EventPerformerDetailsInput
): Promise<void> => {
  const { error } = await supabase
    .from('event_performers')
    .update({
      ...details,
      travel_receipts: details.travel_receipts as unknown as Json,
    })
    .eq('event_id', eventId)
    .eq('performer_id', performerId)

  if (error) throw error
}

export interface PerformerActInput {
  act_name?: string
  description_sv?: string
  description_eng?: string
  audio_files?: AudioTrackItem[]
  stage_preparations?: string
  pick_up_cleaning?: string
  act_notes?: string
}

export const updatePerformerAct = async (
  actId: string,
  actData: PerformerActInput
): Promise<void> => {
  const { error } = await supabase
    .from('performer_acts')
    .update({
      ...actData,
      audio_files: actData.audio_files as unknown as Json,
    })
    .eq('id', actId)

  if (error) {
    console.error('Kunde inte uppdatera akt-information:', error)
    throw error
  }
}
