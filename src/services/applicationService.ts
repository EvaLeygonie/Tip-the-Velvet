import { supabase } from '@/lib/supabase'
import type {
  Event,
  CastingApplication,
  CreateCastingApplicationInput,
  CreateStaffVolunteerInput,
  CreateSponsorInput,
} from '@/types/types'
import { createSlug } from '@/lib/utils'

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
  // 1. Uppdatera ansökans status till confirmed
  const { error: updateError } = await supabase
    .from('casting_applications')
    .update({ booking_status: 'confirmed' })
    .eq('id', app.id)

  if (updateError) throw updateError

  // 2. Kolla om artisten REDAN finns med samma e-post OCH artistnamn
  let performerId = ''
  const { data: existingPerformer } = await supabase
    .from('performers')
    .select('id')
    .eq('email', app.email)
    .eq('performer_name', app.performer_name)
    .maybeSingle()

  if (existingPerformer) {
    performerId = existingPerformer.id
  } else {
    // Dynamisk spridning av bio/promotext beroende på artistens valda språk
    const isEnglish = app.language === 'eng'

    const { data: newPerformer, error: perfError } = await supabase
      .from('performers')
      .insert({
        performer_name: app.performer_name,
        email: app.email,
        city: app.city,
        country: app.country,
        instagram_link: app.instagram_link,
        other_link: app.other_link,
        language: app.language,
        promo_image_id: app.promo_image_id,
        bio_sv: isEnglish ? null : app.promo_text,
        bio_eng: isEnglish ? app.promo_text : null,
        slug: createSlug(app.performer_name),
        agreed_to_terms: true,
        is_approved: false,
      })
      .select('id')
      .single()

    if (perfError) throw perfError
    performerId = newPerformer.id
  }

  // 3. Skapa akten i `performer_acts` med beskrivning i rätt språkkolumn
  const isEnglish = app.language === 'eng'

  const { error: actError } = await supabase.from('performer_acts').insert({
    performer_id: performerId,
    event_id: app.event_id,
    act_name: app.act_title,
    description_sv: isEnglish ? null : app.act_description,
    description_eng: isEnglish ? app.act_description : null,
    video_url: app.video_url,
  })

  if (actError) throw actError

  // 4. Räkna ut nästa preliminära display_order i relationstabellen
  const { count } = await supabase
    .from('event_performers')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', app.event_id)

  const nextOrder = count ? count + 1 : 1

  // 5. Länka artisten till eventet
  const { error: linkError } = await supabase.from('event_performers').insert({
    event_id: app.event_id,
    performer_id: performerId,
    final_fee: finalFee,
    travel_covered: app.travel_cost_amount,
    is_revealed: false,
    display_order: nextOrder,
  })

  if (linkError) throw linkError
}
