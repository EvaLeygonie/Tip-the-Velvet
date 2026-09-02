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
  VolunteerShift,
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

// 'invited' as a raw DB status now only ever means "we've got an invitation row purely to
// hold invited_at, no real decision yet" — it's never shown as a status in its own right
// (see StaffEventStatus below), so callers should never see it.
export type StaffResponseStatus = Exclude<EventStaffInvitationStatus, 'invited'>

// Two independent signals, not one: `status` is the person's actual decision (or lack of
// one) — interested/declined/not_needed/confirmed. `contactedAt` is just "have we reached
// out," true regardless of status, since being asked and having answered are different
// facts. Surfaced by feedback: "interested" alone couldn't distinguish someone who
// self-reported via the Join Us checkbox from someone the board had actually emailed.
export interface StaffEventStatus {
  status?: StaffResponseStatus
  contactedAt: string | null
}

// One event's worth of "where does each staff/volunteer stand" — keyed by staff_id.
// Merges the invitation table (status + invited_at) with the confirmed roster
// (event_staff_volunteers); a confirmed assignment always wins over whatever the
// invitation row's status says, since it's the more definitive state — but contactedAt
// always comes from the invitation row regardless, since confirming someone doesn't erase
// the fact that they were (or weren't) emailed first.
export const getStaffEventStatuses = async (
  eventId: string
): Promise<Record<string, StaffEventStatus>> => {
  const [invitations, confirmed] = await Promise.all([
    supabase
      .from('event_staff_invitations')
      .select('staff_id, status, invited_at')
      .eq('event_id', eventId),
    supabase.from('event_staff_volunteers').select('staff_id').eq('event_id', eventId),
  ])

  if (invitations.error) throw invitations.error
  if (confirmed.error) throw confirmed.error

  const map: Record<string, StaffEventStatus> = {}
  for (const row of invitations.data || []) {
    map[row.staff_id] = {
      status: row.status === 'invited' ? undefined : row.status,
      contactedAt: row.invited_at,
    }
  }
  for (const row of confirmed.data || []) {
    map[row.staff_id] = { status: 'confirmed', contactedAt: map[row.staff_id]?.contactedAt ?? null }
  }
  return map
}

// Every role (and, for volunteer rows, shift) one specific person is confirmed under for
// one specific event — powers the "already confirmed as: X, Y" list in the Confirm
// popover's role picker, now that a person can hold more than one role (or more than one
// volunteer shift) per event.
export const getStaffRolesForEvent = async (
  eventId: string,
  staffId: string
): Promise<{ role: StaffVolunteerType; roleDetails: string | null; shift: VolunteerShift | null }[]> => {
  const { data, error } = await supabase
    .from('event_staff_volunteers')
    .select('role, role_details, shift')
    .eq('event_id', eventId)
    .eq('staff_id', staffId)

  if (error) throw error
  return (data || []).map((row) => ({
    role: row.role,
    roleDetails: row.role_details,
    shift: row.shift,
  }))
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
// Volunteer rows are additionally keyed by `shift`: role alone can't distinguish "this
// volunteer on the setup shift" from "this volunteer on the guestlist shift" — both are
// role: 'volunteer' — so without matching on shift too, confirming a second shift would
// just overwrite the first shift's row instead of adding one, and a person could never
// actually hold two shifts (a real gap reported directly: "I don't seem to be able to add
// the same person in several roles").
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
  roleDetails: string | null,
  shift: VolunteerShift | null = null
): Promise<void> => {
  let existingQuery = supabase
    .from('event_staff_volunteers')
    .select('id')
    .eq('event_id', eventId)
    .eq('staff_id', staffId)
    .eq('role', role)
  // PostgREST rejects .eq(col, null) outright (it tries to cast the literal "null" to the
  // column's type) — .is() is the only correct way to filter for an actual null.
  if (role === 'volunteer') {
    existingQuery = shift === null ? existingQuery.is('shift', null) : existingQuery.eq('shift', shift)
  }

  const { data: existing, error: selectError } = await existingQuery.maybeSingle()
  if (selectError) throw selectError

  if (existing) {
    const { error } = await supabase
      .from('event_staff_volunteers')
      .update({ role_details: roleDetails, shift })
      .eq('id', existing.id)
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('event_staff_volunteers')
      .insert({ event_id: eventId, staff_id: staffId, role, role_details: roleDetails, shift })
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

// Fired automatically when the Contacts "email" button successfully sends to a staff/
// volunteer (see AdminContacts.tsx's handleMailSent) — not a manual popover action. Only
// ever touches `invited_at`, deliberately never `status`: unlike markStaffInterested/
// Declined/NotNeeded (which upsert `status` and, by only listing that column, leave
// `invited_at` untouched on an existing row), this only writes `invited_at`, so emailing
// someone who's already interested/declined/not_needed/confirmed can never quietly
// downgrade their real answer. Read-then-write rather than a blind upsert because a plain
// upsert would need to name a `status` value for the insert-path row to exist at all —
// 'invited' is used for that fallback-only case, but only ever seen here, never elsewhere
// (see StaffResponseStatus above).
export const markStaffContacted = async (eventId: string, staffId: string): Promise<void> => {
  const { data: existing, error: selectError } = await supabase
    .from('event_staff_invitations')
    .select('id')
    .eq('event_id', eventId)
    .eq('staff_id', staffId)
    .maybeSingle()
  if (selectError) throw selectError

  const invitedAt = new Date().toISOString()
  if (existing) {
    const { error } = await supabase
      .from('event_staff_invitations')
      .update({ invited_at: invitedAt })
      .eq('id', existing.id)
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('event_staff_invitations')
      .insert({ event_id: eventId, staff_id: staffId, status: 'invited', invited_at: invitedAt })
    if (error) throw error
  }
}

// Toggle-off twin of markStaffContacted — only ever touches invited_at, same reasoning:
// un-contacting someone should never disturb whatever status they separately hold. Only
// ever called when a row is already known to exist (the row's own contacted icon is only
// shown/clickable-to-clear when contactedAt is already set), so a plain update is enough.
export const clearStaffContacted = async (eventId: string, staffId: string): Promise<void> => {
  const { error } = await supabase
    .from('event_staff_invitations')
    .update({ invited_at: null })
    .eq('event_id', eventId)
    .eq('staff_id', staffId)

  if (error) throw error
}

// Resets `status` back to the neutral placeholder ('invited' — see markStaffContacted's
// comment on why that value means "no real decision," not "invited" in the literal sense)
// without touching `invited_at` — the toggle-off twin of markStaffDeclined/NotNeeded, and
// also used for un-marking "interested" specifically (the one status with no icon of its
// own, per the popover's now-decluttered button/icon split). Same "only called when a row
// already exists" reasoning as clearStaffContacted above.
export const clearStaffResponseStatus = async (eventId: string, staffId: string): Promise<void> => {
  const { error } = await supabase
    .from('event_staff_invitations')
    .update({ status: 'invited' })
    .eq('event_id', eventId)
    .eq('staff_id', staffId)

  if (error) throw error
}

// Undoes confirmStaffForEvent. `role` omitted removes every role this person holds at the
// event (used by the top-level "Remove from event" action — its label means the whole
// event relationship, not one role, and blindly assuming their staff_volunteers.role would
// be wrong for anyone confirmed under a *different* role than their default one). `role`
// given removes just that assignment; for volunteers, `shift` narrows it further to one
// specific shift row, since role alone can't tell two shifts apart (see
// confirmStaffForEvent's note) — omitting shift for a volunteer role removes every shift
// row they hold. Mirrors confirmStaffForEvent's photographer special-case: clears
// events.photographer_id/photographer too, whenever a photographer row could have been
// among the ones just deleted (guarded by matching photographer_id so this can't clobber a
// different photographer who's since been confirmed instead).
export const removeStaffFromEvent = async (
  eventId: string,
  staffId: string,
  role?: StaffVolunteerType,
  shift?: VolunteerShift | null
): Promise<void> => {
  let query = supabase
    .from('event_staff_volunteers')
    .delete()
    .eq('event_id', eventId)
    .eq('staff_id', staffId)
  if (role) {
    query = query.eq('role', role)
    if (role === 'volunteer' && shift !== undefined) {
      query = shift === null ? query.is('shift', null) : query.eq('shift', shift)
    }
  }
  const { error } = await query
  if (error) throw error

  if (!role || role === 'photographer') {
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

// A merch/sales table is independent of a sponsor's main role for the event — a prize
// sponsor can also run one, without that counting as a second sponsor slot (they're still
// the same event_sponsors row; this only flips one column on it). Direct request,
// 2026-09-02: "one can be in several spots, but not count as 'more sponsors'."
export const setSponsorMerchTable = async (
  eventId: string,
  sponsorId: string,
  hasMerchTable: boolean
): Promise<void> => {
  const { error } = await supabase
    .from('event_sponsors')
    .update({ has_merch_table: hasMerchTable })
    .eq('event_id', eventId)
    .eq('sponsor_id', sponsorId)

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

// Lets the Bemanning tab move a volunteer between shift subsections after the fact, not
// just at confirm time — same single-column-update shape as updateEventStaffRoleDetails.
// Meaningless for non-volunteer roles, but not restricted here; the UI only ever calls this
// from a volunteer row.
export const updateEventStaffShift = async (
  id: string,
  shift: VolunteerShift | null
): Promise<void> => {
  const { error } = await supabase.from('event_staff_volunteers').update({ shift }).eq('id', id)

  if (error) throw error
}

// A plain, uncoupled toggle — appointing an experienced volunteer to guide others on their
// shift. Nothing enforces one-per-shift; the board decides operationally.
export const setStaffInCharge = async (id: string, inCharge: boolean): Promise<void> => {
  const { error } = await supabase
    .from('event_staff_volunteers')
    .update({ in_charge: inCharge })
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
