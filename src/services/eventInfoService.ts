import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database.types'
import {
  DEFAULT_INFO_ITEMS,
  INFO_AUDIENCES,
  showStartMinutesFromItems,
  type DoorSlot,
  type EventInfoItem,
  type EventInfoItemInput,
  type InfoAudience,
  type InfoTemplateItem,
} from '@/lib/eventInfo'

//=== PUBLIC (token) ===//

export interface EventInfoPayload {
  audience: InfoAudience
  event: { id: string; title: string; slug: string; event_start: string; event_end: string | null }
  access: {
    door_code: string | null
    has_door_code: boolean
    reveal_at: string
    // Door staff only: the SimpleSignup guest list, withheld until 6h before start.
    checkin_url: string | null
    has_checkin_url: boolean
    checkin_reveal_at: string
  } | null
  // Who to call, picked per group by get_event_info: the volunteers' generals first (volunteer
  // link only), then the board member(s) for that area, backups, and the guard last.
  contacts: {
    name: string
    phone: string
    kind: 'general' | 'primary' | 'backup' | 'guard'
    // Generals only: the shift they are in charge of (setup, guestlist, takedown…).
    shift?: string | null
  }[]
  venue: {
    name: string
    location: string
    map_link: string
    nearest_stop?: string | null
    practical_info_sv: string | null
    practical_info_eng: string | null
  } | null
  items: EventInfoItem[]
  // Technician link only: the ambient playlists for the evening (empty ones are left out).
  playlists?: {
    before: string | null
    intermission: string | null
    afterparty: string | null
  } | null
  // Only sent to the volunteer link.
  door_slots: DoorSlot[] | null
  // Volunteer link only: how many door staff there are (for the "about X each" guidance).
  door_people?: number | null
  // Volunteer link only: names of the door staff, for the sign-up dropdown.
  door_names?: string[] | null
  // Is door shift booking open on the volunteer link? (off until the board switches it on)
  door_signup_open?: boolean
}

export const getEventInfoByToken = async (token: string): Promise<EventInfoPayload> => {
  const { data, error } = await supabase.rpc('get_event_info', { p_token: token })
  if (error) throw error
  return data as unknown as EventInfoPayload
}

// The running order for a role's page — acts in order with the break between the sets, names
// only (no stage notes). Comes from the same function the set list PDF uses, so it only works
// once the board has released the set list to this link; otherwise there is no order to show.
export interface ShowOrderRow {
  position: number
  setNumber: number
  performer: string | null
  act: string
}

export const getShowOrder = async (token: string): Promise<ShowOrderRow[] | null> => {
  const { data, error } = await supabase.rpc('get_event_document_data', {
    p_token: token,
    p_doc: 'setList',
  })
  if (error) return null
  const acts = ((data as unknown as { acts?: unknown[] })?.acts ?? []) as {
    set_number: number
    act_name: string | null
    performer: { performer_name: string } | null
  }[]
  const rows: ShowOrderRow[] = []
  for (const setNumber of [1, 2]) {
    for (const a of acts.filter((x) => x.set_number === setNumber)) {
      rows.push({
        position: rows.length + 1,
        setNumber,
        performer: a.performer?.performer_name ?? null,
        act: a.act_name ?? '',
      })
    }
  }
  return rows
}

export const claimDoorSlot = async (token: string, slotId: string, name: string) => {
  const { error } = await supabase.rpc('claim_door_slot', {
    p_token: token,
    p_slot_id: slotId,
    p_name: name,
  })
  if (error) throw error
}

// VIP list tick-offs, shared between everyone with the volunteer link. The rpcs are not in
// database.types.ts yet, so they are called through a loosely typed handle until it is regenerated.
type LooseRpc = (fn: string, args: object) => Promise<{ data: unknown; error: Error | null }>
const looseRpc = supabase.rpc.bind(supabase) as unknown as LooseRpc

export const getVipCheckins = async (token: string): Promise<string[]> => {
  const { data, error } = await looseRpc('get_vip_checkins', { p_token: token })
  if (error) throw error
  return (data as string[] | null) ?? []
}

export const setVipCheckin = async (token: string, key: string, checked: boolean) => {
  const { error } = await looseRpc('set_vip_checkin', {
    p_token: token,
    p_key: key,
    p_checked: checked,
  })
  if (error) throw error
}

// Adds a second spot to a one-person door shift (only allowed once every time slot has someone).
export const addDoorSpot = async (token: string, slotStart: string) => {
  const { error } = await supabase.rpc('add_door_spot', {
    p_token: token,
    p_slot_start: slotStart,
  })
  if (error) throw error
}

export const releaseDoorSlot = async (token: string, slotId: string) => {
  const { error } = await supabase.rpc('release_door_slot', { p_token: token, p_slot_id: slotId })
  if (error) throw error
}

//=== ADMIN ===//

// Creates whichever per-role links don't exist yet for this event, then returns audience → token.
export const ensureInfoLinks = async (eventId: string): Promise<Record<InfoAudience, string>> => {
  const { data, error } = await supabase
    .from('event_info_links')
    .select('audience, token')
    .eq('event_id', eventId)
  if (error) throw error

  const existing = new Set<string>((data ?? []).map((r) => r.audience))
  const missing = INFO_AUDIENCES.filter((a) => !existing.has(a))
  let rows = (data ?? []) as { audience: InfoAudience; token: string }[]

  if (missing.length > 0) {
    const { data: created, error: insertError } = await supabase
      .from('event_info_links')
      .upsert(
        missing.map((audience) => ({ event_id: eventId, audience })),
        { onConflict: 'event_id,audience', ignoreDuplicates: true }
      )
      .select('audience, token')
    if (insertError) throw insertError
    rows = [...rows, ...((created ?? []) as typeof rows)]
  }

  return Object.fromEntries(rows.map((r) => [r.audience, r.token])) as Record<InfoAudience, string>
}

// Read-only lookup (the Dashboard must not create links just by loading); null if none yet.
export const getInfoLinkToken = async (
  eventId: string,
  audience: InfoAudience
): Promise<string | null> => {
  const { data, error } = await supabase
    .from('event_info_links')
    .select('token')
    .eq('event_id', eventId)
    .eq('audience', audience)
    .maybeSingle()
  if (error) throw error
  return (data?.token as string | undefined) ?? null
}

export const infoLinkUrl = (token: string): string => `${window.location.origin}/info/${token}`

export const getInfoItems = async (eventId: string): Promise<EventInfoItem[]> => {
  const { data, error } = await supabase
    .from('event_info_items')
    .select('*')
    .eq('event_id', eventId)
    .order('sort_order')
    .order('created_at')
  if (error) throw error
  return (data ?? []) as EventInfoItem[]
}

export const createInfoItem = async (
  eventId: string,
  input: EventInfoItemInput
): Promise<EventInfoItem> => {
  const { data, error } = await supabase
    .from('event_info_items')
    .insert({ ...input, event_id: eventId })
    .select()
    .single()
  if (error) throw error
  return data as EventInfoItem
}

export const updateInfoItem = async (
  id: string,
  patch: Partial<EventInfoItemInput>
): Promise<EventInfoItem> => {
  const { data, error } = await supabase
    .from('event_info_items')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as EventInfoItem
}

export const deleteInfoItem = async (id: string): Promise<void> => {
  const { error } = await supabase.from('event_info_items').delete().eq('id', id)
  if (error) throw error
}

//=== TEMPLATE ===//

const toTemplate = (row: Tables<'info_template_items'>): InfoTemplateItem => ({
  key: row.key,
  kind: row.kind as InfoTemplateItem['kind'],
  audiences: row.audiences as InfoAudience[],
  sort_order: row.sort_order,
  time_text: row.time_text,
  title_sv: row.title_sv,
  title_eng: row.title_eng,
  body_sv: row.body_sv,
  body_eng: row.body_eng,
  doc_key: null,
})

// The built-in defaults, overridden row by row by whatever the board has saved as the new
// template, plus any rows the board added to it. Works before the template table exists.
export const getTemplateItems = async (): Promise<InfoTemplateItem[]> => {
  const defaults: InfoTemplateItem[] = DEFAULT_INFO_ITEMS.map(({ template_key, ...rest }, i) => ({
    ...rest,
    sort_order: i,
    key: template_key as string,
  }))
  const { data, error } = await supabase.from('info_template_items').select('*')
  if (error) return defaults
  const saved = new Map<string, InfoTemplateItem>((data ?? []).map((r) => [r.key, toTemplate(r)]))
  const merged = defaults.map((d) => saved.get(d.key) ?? d)
  const extra = [...saved.values()].filter((r) => !defaults.some((d) => d.key === r.key))
  return [...merged, ...extra]
}

// Just the saved row for one key (null if the template still uses the built-in default) —
// kept so "undo" can put it back exactly.
export const getSavedTemplateItem = async (key: string): Promise<InfoTemplateItem | null> => {
  const { data, error } = await supabase
    .from('info_template_items')
    .select('*')
    .eq('key', key)
    .maybeSingle()
  if (error) throw error
  return data ? toTemplate(data) : null
}

export const saveTemplateItem = async (item: InfoTemplateItem): Promise<void> => {
  // The template table has no doc_key column (documents aren't part of the template).
  const { doc_key, ...row } = item
  void doc_key
  const { error } = await supabase
    .from('info_template_items')
    .upsert({ ...row, updated_at: new Date().toISOString() })
  if (error) throw error
}

export const deleteSavedTemplateItem = async (key: string): Promise<void> => {
  const { error } = await supabase.from('info_template_items').delete().eq('key', key)
  if (error) throw error
}

// New events start from the template. Placeholders in [brackets] mark what's still to fill in.
export const seedDefaultInfoItems = async (
  eventId: string,
  startOrder: number
): Promise<EventInfoItem[]> => {
  const template = await getTemplateItems()
  const { data, error } = await supabase
    .from('event_info_items')
    .insert(
      template.map(({ key, ...item }, i) => ({
        ...item,
        template_key: key,
        event_id: eventId,
        sort_order: startOrder + i,
      }))
    )
    .select()
  if (error) throw error
  return (data ?? []) as EventInfoItem[]
}

//=== DOOR SHIFTS (admin) ===//

// When the show starts, in minutes after midnight (Swedish time), read from the schedule row
// titled "Showen börjar"/"Show starts" on the info page. Null when there is no such row.
export const getShowStartMinutes = async (eventId: string): Promise<number | null> => {
  const { data, error } = await supabase
    .from('event_info_items')
    .select('time_text, title_sv, title_eng')
    .eq('event_id', eventId)
    .eq('kind', 'schedule')
  if (error) throw error
  return showStartMinutesFromItems(data ?? [])
}

export const getDoorSlots = async (eventId: string): Promise<DoorSlot[]> => {
  const { data, error } = await supabase
    .from('door_shift_slots')
    .select('id, slot_start, slot_end, volunteer_name')
    .eq('event_id', eventId)
    .order('slot_start')
    .order('created_at')
  if (error) throw error
  return (data ?? []) as DoorSlot[]
}

export const createDoorSlots = async (
  eventId: string,
  slots: { slot_start: string; slot_end: string }[]
): Promise<DoorSlot[]> => {
  const { data, error } = await supabase
    .from('door_shift_slots')
    .insert(slots.map((s) => ({ ...s, event_id: eventId })))
    .select('id, slot_start, slot_end, volunteer_name')
  if (error) throw error
  return (data ?? []) as DoorSlot[]
}

export const setDoorSlotName = async (id: string, name: string | null): Promise<void> => {
  const { error } = await supabase
    .from('door_shift_slots')
    .update({ volunteer_name: name })
    .eq('id', id)
  if (error) throw error
}

export const deleteDoorSlots = async (ids: string[]): Promise<void> => {
  const { error } = await supabase.from('door_shift_slots').delete().in('id', ids)
  if (error) throw error
}

//=== EVENT ACCESS (admin) ===//

export interface EventAccessFields {
  event_start: string | null
  door_signup_open: boolean
  venue: {
    id: string
    name: string
    location: string | null
    door_code: string | null
    nearest_stop: string | null
    practical_info_sv: string | null
    practical_info_eng: string | null
  } | null
  checkin_url: string | null
}

export const getEventAccessFields = async (eventId: string): Promise<EventAccessFields> => {
  const { data, error } = await supabase
    .from('events')
    .select(
      'event_start, checkin_url, door_signup_open, venue:venues(id, name, location, door_code, nearest_stop, practical_info_sv, practical_info_eng)'
    )
    .eq('id', eventId)
    .maybeSingle()
  if (error) throw error
  return {
    event_start: data?.event_start ?? null,
    door_signup_open: data?.door_signup_open ?? false,
    venue: data?.venue ?? null,
    checkin_url: data?.checkin_url ?? null,
  }
}

export const setDoorSignupOpen = async (eventId: string, open: boolean): Promise<void> => {
  const { error } = await supabase
    .from('events')
    .update({ door_signup_open: open })
    .eq('id', eventId)
  if (error) throw error
}

export type VenueInfoPatch = {
  door_code: string | null
  nearest_stop: string | null
  practical_info_sv: string | null
  practical_info_eng: string | null
}

export const updateVenueInfo = async (venueId: string, patch: VenueInfoPatch): Promise<void> => {
  const { error } = await supabase.from('venues').update(patch).eq('id', venueId)
  if (error) throw error
}

// Seeds a fresh event once even if two loads race (React StrictMode runs effects twice in dev).
const seeding = new Map<string, Promise<EventInfoItem[]>>()
export const seedIfEmpty = (eventId: string): Promise<EventInfoItem[]> => {
  let pending = seeding.get(eventId)
  if (!pending) {
    pending = getInfoItems(eventId)
      .then((existing) => (existing.length > 0 ? existing : seedDefaultInfoItems(eventId, 1)))
      .finally(() => seeding.delete(eventId))
    seeding.set(eventId, pending)
  }
  return pending
}
