import type { AudioTrackItem, ReceiptItem } from '@/components/applications/BookedArtistForm'
import { supabase } from '@/lib/supabase'
import type { Json } from '@/types/database.types'
import type {
  Event,
  CastingApplication,
  CastingApplicationAct,
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

export type CastingApplicationWithActs = CastingApplication & {
  casting_application_acts: CastingApplicationAct[]
}

export const getApplicationsFromEvent = async (
  eventId: string
): Promise<CastingApplicationWithActs[]> => {
  const { data, error } = await supabase
    .from('casting_applications')
    .select('*, casting_application_acts(*)')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export const getCastingApplicationByToken = async (id: string, token: string | null) => {
  if (!token) {
    throw new Error('Access token saknas i URL:en.')
  }

  // Går via en SECURITY DEFINER-funktion (inte en direkt .select()) så att RLS aldrig
  // behöver tillåta anon att läsa tabellen rakt av — se supabase/migrations för detaljer.
  const { data, error } = await supabase.rpc('get_casting_application_by_token', {
    p_id: id,
    p_token: token,
  })

  if (error) throw error
  return data as unknown as CastingApplication
}

//=== CREATE ===///

export const submitCastingApplication = async (
  input: CreateCastingApplicationInput
): Promise<string> => {
  const { data, error } = await supabase.rpc('submit_casting_application', {
    p_application: input.application as unknown as Json,
    p_acts: input.acts as unknown as Json,
  })

  if (error) throw error
  return data as unknown as string
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

// Skickar bekräftelsemail via Netlify Edge Function (application-confirmation.ts).
// `deadline` används bara av castingflödet, men skickas alltid med — mottagaren ignorerar
// den annars.
export const sendApplicationConfirmationEmail = async (
  name: string,
  email: string,
  language: string,
  type: 'casting' | 'staff' | 'sponsor' | 'artist',
  deadline?: string
): Promise<boolean> => {
  try {
    const response = await fetch('/api/application-confirmation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, language, type, deadline }),
    })
    return response.ok
  } catch (error) {
    console.error('Nätverksfel vid sändning av mail:', error)
    return false
  }
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
  proposedFee?: number,
  needsTravelCosts?: boolean,
  travelCostAmount?: number,
  needsAccommodation?: boolean
): Promise<void> => {
  const updateData: {
    initial_reply_sent: boolean
    booking_status: CastingApplication['booking_status']
    proposed_fee?: number
    needs_travel_costs?: boolean
    travel_cost_amount?: number
    needs_accommodation?: boolean
  } = {
    initial_reply_sent: initialReplySent,
    booking_status: bookingStatus,
  }

  if (proposedFee !== undefined) {
    updateData.proposed_fee = proposedFee
  }
  if (needsTravelCosts !== undefined) {
    updateData.needs_travel_costs = needsTravelCosts
  }
  if (travelCostAmount !== undefined) {
    updateData.travel_cost_amount = travelCostAmount
  }
  if (needsAccommodation !== undefined) {
    updateData.needs_accommodation = needsAccommodation
  }

  const { error } = await supabase.from('casting_applications').update(updateData).eq('id', id)

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
  if (!app.access_token) {
    throw new Error('Access token saknas på ansökan.')
  }

  const { data, error } = await supabase.rpc('confirm_and_migrate_artist', {
    p_application_id: app.id,
    p_access_token: app.access_token,
    p_final_fee: finalFee,
    p_travel_covered: travelCovered,
  })

  if (error) {
    console.error('Kunde inte migrera och bekräfta artist:', error)
    throw error
  }

  return data as unknown as MigrationResult
}

export interface PerformerBioInput {
  bio_sv?: string
  bio_eng?: string
}

// Skiljs medvetet från performerService.updatePerformer, som ArtistForm.tsx:s separata
// (token-lösa) self-edit-flöde använder — ändra inte den för att "fixa" det här.
export const updatePerformerBioViaToken = async (
  performerId: string,
  token: string,
  bio: PerformerBioInput
): Promise<void> => {
  const { error } = await supabase.rpc('update_performer_bio_via_token', {
    p_performer_id: performerId,
    p_access_token: token,
    p_bio_sv: bio.bio_sv,
    p_bio_eng: bio.bio_eng,
  })

  if (error) throw error
}

export interface EventPerformerDetailsInput {
  dietary_requirements?: string
  travel_receipts?: ReceiptItem[]
  travel_covered?: number
  notes?: string
  plus_one_name?: string
  plus_one_email?: string
}

export const updateEventPerformerDetails = async (
  eventId: string,
  performerId: string,
  token: string,
  details: EventPerformerDetailsInput
): Promise<void> => {
  const { error } = await supabase.rpc('update_event_performer_via_token', {
    p_event_id: eventId,
    p_performer_id: performerId,
    p_access_token: token,
    p_dietary_requirements: details.dietary_requirements,
    p_travel_receipts: details.travel_receipts as unknown as Json,
    p_travel_covered: details.travel_covered,
    p_notes: details.notes,
    p_plus_one_name: details.plus_one_name,
    p_plus_one_email: details.plus_one_email,
  })

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
  token: string,
  actData: PerformerActInput
): Promise<void> => {
  const { error } = await supabase.rpc('update_performer_act_via_token', {
    p_act_id: actId,
    p_access_token: token,
    p_act_name: actData.act_name,
    p_description_sv: actData.description_sv,
    p_description_eng: actData.description_eng,
    p_audio_files: actData.audio_files as unknown as Json,
    p_stage_preparations: actData.stage_preparations,
    p_pick_up_cleaning: actData.pick_up_cleaning,
    p_act_notes: actData.act_notes,
  })

  if (error) {
    console.error('Kunde inte uppdatera akt-information:', error)
    throw error
  }
}
