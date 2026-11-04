import { supabase } from '@/lib/supabase'
import JSZip from 'jszip'
import { compressReceipt } from '@/lib/receiptCompression'
import { deleteRow, updateRow, uploadStorageFile } from '@/services/databaseService'
import {
  expectedPayables,
  planPayablesSync,
  type PayableSection,
  TRAVEL_SUFFIX,
  type PayableSources,
  type ArtistTravelInfo,
  type PayableWithFiles,
  type RowFile,
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

// What each artist said about their own travel on the booking page, by performer id.
const fetchArtistTravel = async (eventId: string): Promise<Map<string, ArtistTravelInfo>> => {
  const { data, error } = await supabase
    .from('event_performers')
    .select('performer_id, travels_by_car, travel_receipts')
    .eq('event_id', eventId)
  // The page works without it, so a failure here only hides the artists' own files
  if (error) {
    console.error('Kunde inte hämta artisternas resekvitton:', error)
    return new Map()
  }
  return new Map(
    (data ?? []).map((row) => {
      const receipts = Array.isArray(row.travel_receipts)
        ? (row.travel_receipts as unknown as ArtistTravelInfo['receipts']).filter(
            (r) => r && typeof r.url === 'string'
          )
        : []
      return [row.performer_id, { byCar: row.travels_by_car, receipts }]
    })
  )
}

export const getEventPayables = async (eventId: string): Promise<PayableWithFiles[]> => {
  const [{ data, error }, artistTravel] = await Promise.all([
    supabase
      .from('event_payables')
      .select('*, files:event_payable_files(*)')
      .eq('event_id', eventId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    fetchArtistTravel(eventId),
  ])
  if (error) throw error
  return (data ?? []).map((row) => ({
    ...row,
    files: [...(row.files ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at)),
    artist:
      row.source_type === 'performer_travel' && row.source_id
        ? artistTravel.get(row.source_id)
        : undefined,
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

  for (const id of plan.convert) {
    await updateRow('event_payables', id, {
      source_type: null,
      source_id: null,
      updated_at: new Date().toISOString(),
    })
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
    | 'vat_rate'
    | 'payment_route'
    | 'payment_account'
    | 'due_on'
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
  original: File
): Promise<PayableFile> => {
  const file = await compressReceipt(original)
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

// The bytes of one file, from the private bucket or from the artist's link.
export const fetchRowFileBlob = async (file: RowFile): Promise<Blob> => {
  if (file.origin === 'board' && file.path) {
    const { data, error } = await supabase.storage.from(INVOICE_BUCKET).download(file.path)
    if (error) throw error
    return data
  }
  const response = await fetch(file.url ?? '')
  if (!response.ok) throw new Error(`Could not fetch ${file.name}`)
  return response.blob()
}

// Several files in one zip. A prefix (who the file belongs to) keeps the names apart and readable,
// and a number is added if two files still end up with the same name.
export const zipRowFiles = async (entries: { prefix: string; file: RowFile }[]): Promise<Blob> => {
  const zip = new JSZip()
  const used = new Set<string>()
  const blobs = await Promise.all(entries.map((e) => fetchRowFileBlob(e.file)))
  entries.forEach((entry, index) => {
    const base = `${entry.prefix} - ${entry.file.name}`.replace(/[\\/:*?"<>|]/g, '_')
    let name = base
    for (let n = 2; used.has(name); n += 1) name = base.replace(/(\.[^.]*)?$/, ` (${n})$1`)
    used.add(name)
    zip.file(name, blobs[index])
  })
  return zip.generateAsync({ type: 'blob' })
}
