import type { EventPayable, PayableFile } from '@/types/types'

// A bill with the invoices and receipts attached to it (there can be several per bill)
export type PayableWithFiles = EventPayable & { files: PayableFile[] }

// The Economy page's "One event" tab: every bill to pay out after a show. Pure helpers only
// (no Supabase, no React), so the rules below can be tested on their own.

export type PayableSection =
  | 'artists'
  | 'staff'
  | 'venue'
  | 'decor'
  | 'print'
  | 'transport'
  | 'other'

export interface PayableSectionInfo {
  key: PayableSection
  sv: string
  eng: string
  // Shown under the title while the section is empty
  emptySv: string
  emptyEng: string
}

export const PAYABLE_SECTIONS: PayableSectionInfo[] = [
  {
    key: 'artists',
    sv: 'Artister',
    eng: 'Artists',
    emptySv: 'Inga artister i line-upen än.',
    emptyEng: 'No artists in the lineup yet.',
  },
  {
    key: 'staff',
    sv: 'Personal',
    eng: 'Staff and crew',
    emptySv: 'Ingen betald personal än.',
    emptyEng: 'No paid staff yet.',
  },
  {
    key: 'venue',
    sv: 'Lokal',
    eng: 'Venue',
    emptySv: 'Ingen lokal vald för eventet.',
    emptyEng: 'No venue chosen for the event.',
  },
  {
    key: 'decor',
    sv: 'Dekorationer och extra',
    eng: 'Decorations and extras',
    emptySv: 'Lägg till kvitton för dekor, kostym, godis och annat extra.',
    emptyEng: 'Add receipts for decor, costume, sweets and other extras.',
  },
  {
    key: 'print',
    sv: 'Tryck',
    eng: 'Printing',
    emptySv: 'Lägg till tryckkostnader, till exempel affischer och skyltar.',
    emptyEng: 'Add printing costs, such as posters and signs.',
  },
  {
    key: 'transport',
    sv: 'Transport',
    eng: 'Transport',
    emptySv: 'Lägg till resor, till exempel Uber hem med packningen.',
    emptyEng: 'Add trips, such as the Uber home with the packing.',
  },
  {
    key: 'other',
    sv: 'Övrigt',
    eng: 'Other',
    emptySv: 'Allt annat som ska betalas.',
    emptyEng: 'Anything else that has to be paid.',
  },
]

export type PaymentRoute = 'company_invoice' | 'frilansfinans' | 'private' | 'receipt'

export const PAYMENT_ROUTES: { key: PaymentRoute; sv: string; eng: string }[] = [
  { key: 'company_invoice', sv: 'Faktura från eget företag', eng: 'Own company invoice' },
  { key: 'frilansfinans', sv: 'FrilansFinans', eng: 'FrilansFinans' },
  { key: 'private', sv: 'Privat betalning, max 999 kr', eng: 'Private payment, up to 999 kr' },
  { key: 'receipt', sv: 'Kvitto', eng: 'Receipt' },
]

// A private person can only be paid up to this amount without an invoice (the "Mall betalning
// max 999" template). Above it the row needs an invoice from a company or FrilansFinans.
export const PRIVATE_PAYMENT_LIMIT = 999

export const exceedsPrivateLimit = (route: string | null, amount: number | null): boolean =>
  route === 'private' && amount !== null && amount > PRIVATE_PAYMENT_LIMIT

// Roles that normally are paid, so they get a row even when no fee has been entered yet. A fee of
// 0 on the staffing row always wins and means "not paid". The door is not on this list: it is
// often unpaid, so it only gets a row once a fee above 0 is set. Volunteers, stage kittens and
// board members work the same way.
export const ALWAYS_PAID_STAFF_ROLES = ['photographer', 'technician', 'dj', 'entertainment']

//=== WHAT THE SYSTEM ALREADY KNOWS ===//

export interface PayableSources {
  performers: {
    id: string
    name: string
    role: string
    fee: number | null
    travel: number | null
    order: number
  }[]
  staff: {
    // event_staff_volunteers.id: one row per role, so someone with two roles is two rows
    id: string
    name: string
    role: string
    fee: number | null
    // The person's standing rate on their contact card, used when the event row has none
    standingFee: number | null
  }[]
  venue: { id: string; name: string; price: number | null } | null
}

// A person's job and their travel are paid separately, so each is its own row. The travel row
// has the same source_id as the job row and a source_type ending in "_travel".
export type PayableSourceType =
  | 'performer'
  | 'performer_travel'
  | 'staff'
  | 'staff_travel'
  | 'venue'
  | 'standard'

export interface ExpectedPayable {
  section: PayableSection
  source_type: PayableSourceType
  source_id: string
  label: string
  // The gold tag under the name: the person's role
  tag: string | null
  note: string | null
  agreed_amount: number | null
  sort_order: number
}

const ROLE_TAG: Record<string, string> = {
  host: 'Host',
  headliner: 'Headliner',
  performer: 'Performer',
  photographer: 'Photographer',
  technician: 'Technician',
  doorman: 'Door',
  dj: 'DJ',
  entertainment: 'Entertainment',
  other: 'Other',
  volunteer: 'Volunteer',
  stage_kitten: 'Stage kitten',
  board: 'Board',
}

export const UBER_SOURCE_ID = 'uber-after-show'

export const TRAVEL_SUFFIX = '_travel'
export const isTravelRow = (row: { source_type: string | null }): boolean =>
  row.source_type !== null && row.source_type.endsWith(TRAVEL_SUFFIX)

// Sections where each line is a person, and so has both a job and a travel slot
export const PERSON_SECTIONS: PayableSection[] = ['artists', 'staff']
const PERSON_SOURCE_TYPES = ['performer', 'staff']

export const expectedPayables = (sources: PayableSources): ExpectedPayable[] => {
  const rows: ExpectedPayable[] = []

  for (const p of sources.performers) {
    const fee = p.fee ?? 0
    const travel = p.travel ?? 0
    if (fee <= 0 && travel <= 0) continue
    const tag = ROLE_TAG[p.role] ?? null
    rows.push({
      section: 'artists',
      source_type: 'performer',
      source_id: p.id,
      label: p.name,
      tag,
      note: null,
      agreed_amount: fee > 0 ? fee : null,
      sort_order: p.order * 2,
    })
    if (travel > 0) {
      rows.push({
        section: 'artists',
        source_type: 'performer_travel',
        source_id: p.id,
        label: p.name,
        tag,
        note: null,
        agreed_amount: travel,
        sort_order: p.order * 2 + 1,
      })
    }
  }

  let staffOrder = 0
  for (const s of sources.staff) {
    const amount = s.fee ?? s.standingFee
    // 0 means unpaid, whatever the role
    if (amount === 0) continue
    const paid = (amount ?? 0) > 0
    if (!paid && !ALWAYS_PAID_STAFF_ROLES.includes(s.role)) continue
    rows.push({
      section: 'staff',
      source_type: 'staff',
      source_id: s.id,
      label: s.name,
      tag: ROLE_TAG[s.role] ?? null,
      note: null,
      agreed_amount: paid ? amount : null,
      sort_order: staffOrder++ * 2,
    })
  }

  if (sources.venue) {
    rows.push({
      section: 'venue',
      source_type: 'venue',
      source_id: sources.venue.id,
      label: `Venue: ${sources.venue.name}`,
      tag: 'Venue',
      note: sources.venue.price ? 'Standard rate from Contacts. Change it to the invoice.' : null,
      agreed_amount: sources.venue.price,
      sort_order: 0,
    })
  }

  // The Uber home with all the packing is booked after every show.
  rows.push({
    section: 'transport',
    source_type: 'standard',
    source_id: UBER_SOURCE_ID,
    label: 'Uber home with all the packing',
    tag: 'Transport',
    note: null,
    agreed_amount: null,
    sort_order: 0,
  })

  return rows
}

//=== KEEPING STORED ROWS IN STEP ===//

type StoredPayable = Pick<
  EventPayable,
  | 'id'
  | 'source_type'
  | 'source_id'
  | 'label'
  | 'tag'
  | 'note'
  | 'amount'
  | 'agreed_amount'
  | 'paid_on'
> & {
  dismissed?: boolean
  // Invoices and receipts on the row; a row with files is never removed
  fileCount?: number
}

export interface PayablePatch {
  label: string
  tag: string | null
  note: string | null
  agreed_amount: number | null
  amount?: number | null
}

export interface PayableSyncPlan {
  insert: ExpectedPayable[]
  update: { id: string; patch: PayablePatch }[]
  // Ids of rows the system made that it no longer expects and nobody has touched
  remove: string[]
}

const sourceKey = (type: string | null, id: string | null) => `${type}:${id}`

const sameNumber = (a: number | null, b: number | null) =>
  (a === null && b === null) || (a !== null && b !== null && Number(a) === Number(b))

// The first version of this page wrote the role and "Fee x kr + travel y kr" into the note. Those
// lines now live in the tag and the two amounts, so they are cleared; anything the board wrote
// themselves stays.
const GENERATED_NOTE =
  /^(?:(?:Host|Headliner|Photographer|Light and sound technician|Door|DJ|Entertainment|Other|Volunteer|Stage kitten|Board)\.?\s*)?(?:Fee \d+ kr \+ travel \d+ kr)?$/
export const isGeneratedNote = (note: string | null): boolean =>
  note !== null && note !== '' && GENERATED_NOTE.test(note.trim())

// Compares what the system knows now with the rows already stored. New things get a row.
// A row whose source changed follows it, unless it is already paid (history stays as it was)
// or the board typed their own amount (an invoice that differs from the agreed one stays).
export const planPayablesSync = (
  expected: ExpectedPayable[],
  stored: StoredPayable[]
): PayableSyncPlan => {
  const byKey = new Map(stored.map((r) => [sourceKey(r.source_type, r.source_id), r]))
  const plan: PayableSyncPlan = { insert: [], update: [], remove: [] }

  for (const e of expected) {
    const existing = byKey.get(sourceKey(e.source_type, e.source_id))
    if (!existing) {
      plan.insert.push(e)
      continue
    }
    if (existing.paid_on) continue

    const labelChanged = existing.label !== e.label
    const tagChanged = existing.tag !== e.tag
    const agreedChanged = !sameNumber(existing.agreed_amount, e.agreed_amount)
    const oldGeneratedNote = isGeneratedNote(existing.note)
    // The venue's hint is the only note the page still writes itself.
    const noteChanged =
      (oldGeneratedNote && e.note === null) || (existing.note === null && e.note !== null)
    if (!labelChanged && !tagChanged && !agreedChanged && !noteChanged) continue

    const patch: PayablePatch = {
      label: e.label,
      tag: e.tag,
      note: noteChanged ? e.note : existing.note,
      agreed_amount: e.agreed_amount,
    }
    const followedAgreed =
      existing.amount === null || sameNumber(existing.amount, existing.agreed_amount)
    if (agreedChanged && followedAgreed) patch.amount = e.agreed_amount
    plan.update.push({ id: existing.id, patch })
  }

  // A row the system made for someone who no longer has a fee (the staffing row now says 0, the
  // person left the lineup) goes away, as long as nobody has paid it, typed their own amount or
  // attached a file. Travel rows the board added by hand have no agreed amount and are left alone.
  const expectedKeys = new Set(expected.map((e) => sourceKey(e.source_type, e.source_id)))
  for (const r of stored) {
    if (r.dismissed || r.paid_on || (r.fileCount ?? 0) > 0) continue
    if (expectedKeys.has(sourceKey(r.source_type, r.source_id))) continue
    const systemMade =
      r.source_type === 'performer' ||
      r.source_type === 'staff' ||
      r.source_type === 'venue' ||
      (r.source_type === 'performer_travel' && r.agreed_amount !== null)
    const untouched = r.amount === null || sameNumber(r.amount, r.agreed_amount)
    if (systemMade && untouched) plan.remove.push(r.id)
  }

  return plan
}

//=== LINES: ONE PERSON, TWO PAYMENTS ===//

export interface PayableLine {
  // The row for the job (or the only row, for a venue, a receipt and so on)
  main: PayableWithFiles
  // The travel row of a person, when there is one
  travel: PayableWithFiles | null
  // Whether the line has the two slots (job and travel) at all
  hasTravelSlot: boolean
}

// Groups a section's rows into lines. A person's travel row joins the line of the same
// source_id; every other row is a line of its own.
export const buildLines = (rows: PayableWithFiles[], section: PayableSection): PayableLine[] => {
  const inSection = rows.filter((r) => r.section === section)
  const travelByKey = new Map(
    inSection
      .filter(isTravelRow)
      .map((r) => [`${r.source_type?.replace(TRAVEL_SUFFIX, '')}:${r.source_id}`, r])
  )
  const person = PERSON_SECTIONS.includes(section)
  return inSection
    .filter((r) => !isTravelRow(r))
    .map((main) => ({
      main,
      travel:
        main.source_type !== null && PERSON_SOURCE_TYPES.includes(main.source_type)
          ? (travelByKey.get(`${main.source_type}:${main.source_id}`) ?? null)
          : null,
      hasTravelSlot: person,
    }))
}

//=== STATUS AND TOTALS ===//

export type PayableStatus = 'awaiting' | 'invoice' | 'paid'

// Paid beats everything; an attached invoice or receipt means it is ready to pay.
export const payableStatus = (
  row: Pick<EventPayable, 'paid_on'>,
  fileCount: number
): PayableStatus => (row.paid_on ? 'paid' : fileCount > 0 ? 'invoice' : 'awaiting')

export interface PayableTotals {
  total: number
  paid: number
  outstanding: number
  rows: number
  paidRows: number
  // Rows still without an amount, so the total is known to be incomplete
  withoutAmount: number
}

const emptyTotals = (): PayableTotals => ({
  total: 0,
  paid: 0,
  outstanding: 0,
  rows: 0,
  paidRows: 0,
  withoutAmount: 0,
})

export const summarizePayables = (
  rows: Pick<EventPayable, 'amount' | 'paid_on' | 'dismissed' | 'section'>[]
): { all: PayableTotals; bySection: Record<string, PayableTotals> } => {
  const all = emptyTotals()
  const bySection: Record<string, PayableTotals> = {}
  for (const r of rows) {
    if (r.dismissed) continue
    const t = (bySection[r.section] ??= emptyTotals())
    for (const bucket of [all, t]) {
      const amount = Number(r.amount ?? 0)
      bucket.rows += 1
      bucket.total += amount
      if (r.paid_on) {
        bucket.paid += amount
        bucket.paidRows += 1
      }
      if (r.amount === null) bucket.withoutAmount += 1
    }
  }
  for (const bucket of [all, ...Object.values(bySection)]) {
    bucket.outstanding = bucket.total - bucket.paid
  }
  return { all, bySection }
}

export const formatKr = (amount: number): string =>
  `${Math.round(amount).toLocaleString('sv-SE')} kr`

// "2026-10-31" for today in the local time zone (a date input and the paid_on column both use it)
export const todayIso = (now: Date = new Date()): string => {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}
