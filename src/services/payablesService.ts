import { supabase } from '@/lib/supabase'
import { deleteRow, updateRow, uploadStorageFile } from '@/services/databaseService'
import {
  expectedPayables,
  planPayablesSync,
  type PayableSection,
  TRAVEL_SUFFIX,
  type PayableSources,
  type PayableWithFiles,
} from '@/lib/payables'
import type { EventPayable, PayableFile } from '@/types/types'

const INVOICE_BUCKET = 'event-invoices'

// What the system already knows about who gets paid for this event.
const fetchPayableSources = async (eventId: string): Promise<PayableSources> => {
  const [performers, staff, event] = await Promise.all([
    supabase
      .from('event_performers')
      .select(
        'performer_id, lineup_role, final_fee, travel_covered, display_order, performer:performers(performer_name)'
      )
      .eq('event_id', eventId)
      .order('display_order', { ascending: true }),
    supabase
      .from('event_staff_volunteers')
      .select('id, role, fee, display_name, staff:staff_volunteers(name, fee)')
      .eq('event_id', eventId),
    supabase.from('events').select('venue_id').eq('id', eventId).maybeSingle(),
  ])
  if (performers.error) throw performers.error
  if (staff.error) throw staff.error
  if (event.error) throw event.error

  let venue: PayableSources['venue'] = null
  if (event.data?.venue_id) {
    const { data, error } = await supabase
      .from('venues')
      .select('id, name, price')
      .eq('id', event.data.venue_id)
      .maybeSingle()
    if (error) throw error
    if (data) venue = { id: data.id, name: data.name, price: data.price }
  }

  return {
    performers: (performers.data ?? []).map((row, index) => ({
      id: row.performer_id,
      name: row.performer?.performer_name ?? 'Unnamed artist',
      role: row.lineup_role,
      fee: row.final_fee,
      travel: row.travel_covered,
      order: row.display_order ?? index,
    })),
    staff: (staff.data ?? []).map((row) => ({
      id: row.id,
      name: row.display_name || row.staff?.name || 'Unnamed',
      role: row.role,
      fee: row.fee,
      standingFee: row.staff?.fee ?? null,
    })),
    venue,
  }
}

export const getEventPayables = async (eventId: string): Promise<PayableWithFiles[]> => {
  const { data, error } = await supabase
    .from('event_payables')
    .select('*, files:event_payable_files(*)')
    .eq('event_id', eventId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []).map((row) => ({
    ...row,
    files: [...(row.files ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at)),
  }))
}

// Opens the tab: makes sure every cost the system knows about has a row, and lets rows follow a
// changed fee. Safe to run any number of times (the table refuses a second row for the same source).
export const syncEventPayables = async (eventId: string): Promise<void> => {
  const [sources, stored] = await Promise.all([
    fetchPayableSources(eventId),
    getEventPayables(eventId),
  ])
  const plan = planPayablesSync(
    expectedPayables(sources),
    stored.filter((r) => r.source_type !== null).map((r) => ({ ...r, fileCount: r.files.length }))
  )

  if (plan.insert.length) {
    const { error } = await supabase.from('event_payables').upsert(
      plan.insert.map((e) => ({
        event_id: eventId,
        section: e.section,
        label: e.label,
        tag: e.tag,
        note: e.note,
        agreed_amount: e.agreed_amount,
        amount: e.agreed_amount,
        source_type: e.source_type,
        source_id: e.source_id,
        sort_order: e.sort_order,
      })),
      { onConflict: 'event_id,source_type,source_id', ignoreDuplicates: true }
    )
    if (error) throw error
  }

  for (const id of plan.remove) {
    await deleteRow('event_payables', id)
  }

  for (const u of plan.update) {
    await updateRow('event_payables', u.id, { ...u.patch, updated_at: new Date().toISOString() })
  }
}

export const createPayable = async (
  eventId: string,
  section: PayableSection,
  sortOrder: number
): Promise<EventPayable> => {
  const { data, error } = await supabase
    .from('event_payables')
    .insert({ event_id: eventId, section, label: '', sort_order: sortOrder })
    .select()
    .single()
  if (error) throw error
  return data
}

export type PayablePatchInput = Partial<
  Pick<
    EventPayable,
    | 'label'
    | 'note'
    | 'amount'
    | 'vat_amount'
    | 'payment_route'
    | 'advanced_by'
    | 'tag'
    | 'paid_on'
    | 'dismissed'
    | 'section'
  >
>

export const updatePayable = (id: string, patch: PayablePatchInput): Promise<EventPayable> =>
  updateRow('event_payables', id, { ...patch, updated_at: new Date().toISOString() })

// Only for rows the board added by hand. A row the page created itself is dismissed instead,
// otherwise the next sync would simply add it back.
export const deletePayable = (id: string): Promise<void> => deleteRow('event_payables', id)

// A person's travel is its own row, paid separately from the job. Used when the board adds travel
// to someone the system has no travel for, or brings back a travel row they had hidden.
export const addTravelRow = async (job: EventPayable): Promise<EventPayable> => {
  const travelType = `${job.source_type}${TRAVEL_SUFFIX}`
  const { data: existing, error: findError } = await supabase
    .from('event_payables')
    .select('*')
    .eq('event_id', job.event_id)
    .eq('source_type', travelType)
    .eq('source_id', job.source_id ?? '')
    .maybeSingle()
  if (findError) throw findError
  if (existing) return updatePayable(existing.id, { dismissed: false })

  const { data, error } = await supabase
    .from('event_payables')
    .insert({
      event_id: job.event_id,
      section: job.section,
      label: job.label,
      tag: job.tag,
      source_type: travelType,
      source_id: job.source_id,
      sort_order: job.sort_order + 1,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

//=== INVOICE AND RECEIPT FILES ===//

export const uploadInvoice = (eventId: string, file: File): Promise<string> =>
  uploadStorageFile(INVOICE_BUCKET, eventId, file)

// Stores the file and records it on the row. Any number of files can sit on one row.
export const attachPayableFile = async (
  eventId: string,
  payableId: string,
  file: File
): Promise<PayableFile> => {
  const path = await uploadInvoice(eventId, file)
  const { data, error } = await supabase
    .from('event_payable_files')
    .insert({ payable_id: payableId, path, name: file.name })
    .select()
    .single()
  if (error) {
    await removeInvoiceFile(path).catch(() => undefined)
    throw error
  }
  return data
}

export const removeInvoiceFile = async (path: string): Promise<void> => {
  const { error } = await supabase.storage.from(INVOICE_BUCKET).remove([path])
  if (error) throw error
}

export const deletePayableFile = async (file: PayableFile): Promise<void> => {
  await deleteRow('event_payable_files', file.id)
  await removeInvoiceFile(file.path).catch(() => undefined)
}

// The bucket is private, so a file is opened through a link that expires after an hour.
export const getInvoiceUrl = async (path: string): Promise<string> => {
  const { data, error } = await supabase.storage.from(INVOICE_BUCKET).createSignedUrl(path, 3600)
  if (error) throw error
  return data.signedUrl
}
