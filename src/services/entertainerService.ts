import { supabase } from '@/lib/supabase'
import type { EventStaffVolunteer, PublicEventEntertainer } from '@/types/types'

// Pre-show entertainers (role 'entertainment' on event_staff_volunteers) carry a small
// public profile and the same reveal mechanics as lineup artists — see the
// public_event_entertainers view, which only ever exposes revealed ones, with a stage name
// and nothing private.

export type EventEntertainer = EventStaffVolunteer & {
  staff: { id: string; name: string; email: string | null }
}

// The fields the profile modal edits — what the public site shows, minus reveal state.
export type EntertainerProfilePatch = Pick<
  EventStaffVolunteer,
  | 'display_name'
  | 'title_sv'
  | 'title_eng'
  | 'bio_sv'
  | 'bio_eng'
  | 'image_id'
  | 'instagram_link'
  | 'other_link'
  | 'photo_credit'
>

const PROFILE_FIELDS =
  'display_name, title_sv, title_eng, bio_sv, bio_eng, image_id, instagram_link, other_link, photo_credit'

export const getEventEntertainers = async (eventId: string): Promise<EventEntertainer[]> => {
  const { data, error } = await supabase
    .from('event_staff_volunteers')
    .select('*, staff:staff_volunteers(id, name, email)')
    .eq('event_id', eventId)
    .eq('role', 'entertainment')
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data || []) as unknown as EventEntertainer[]
}

// One person can in principle hold several entertainment rows at an event (the unique index
// allows different role_details) — the profile lives on the first one.
export const getEntertainerAssignment = async (
  eventId: string,
  staffId: string
): Promise<EventStaffVolunteer | null> => {
  const { data, error } = await supabase
    .from('event_staff_volunteers')
    .select('*')
    .eq('event_id', eventId)
    .eq('staff_id', staffId)
    .eq('role', 'entertainment')
    .order('created_at', { ascending: true })
    .limit(1)

  if (error) throw error
  return data?.[0] ?? null
}

// A returning entertainer's most recent profile at *another* event, to prefill the modal.
export const getPreviousEntertainerProfile = async (
  staffId: string,
  excludeEventId: string
): Promise<EntertainerProfilePatch | null> => {
  const { data, error } = await supabase
    .from('event_staff_volunteers')
    .select(PROFILE_FIELDS)
    .eq('staff_id', staffId)
    .eq('role', 'entertainment')
    .neq('event_id', excludeEventId)
    .not('display_name', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) throw error
  return (data?.[0] as EntertainerProfilePatch | undefined) ?? null
}

// The contact roster's own link for a person — often their Instagram, used to prefill the
// public profile so it doesn't have to be typed in twice.
export const getStaffLink = async (staffId: string): Promise<string | null> => {
  const { data, error } = await supabase
    .from('staff_volunteers')
    .select('link')
    .eq('id', staffId)
    .maybeSingle()

  if (error) throw error
  return data?.link?.trim() || null
}

const updateAssignment = async (id: string, patch: Partial<EventStaffVolunteer>): Promise<void> => {
  const { error } = await supabase.from('event_staff_volunteers').update(patch).eq('id', id)
  if (error) throw error
}

export const updateEntertainerProfile = (id: string, patch: EntertainerProfilePatch) =>
  updateAssignment(id, patch)

export const setEntertainerRevealed = (id: string, isRevealed: boolean) =>
  updateAssignment(id, { is_revealed: isRevealed })

export const scheduleEntertainerReveal = (id: string, date: string | null) =>
  updateAssignment(id, { reveal_date: date })

export const setEntertainerSocialPosted = (id: string, socialPosted: boolean) =>
  updateAssignment(id, { social_posted: socialPosted })

export const getPublicEventEntertainers = async (
  eventId: string
): Promise<PublicEventEntertainer[]> => {
  const { data, error } = await supabase
    .from('public_event_entertainers')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}
