// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  buildLines,
  exceedsPrivateLimit,
  expectedPayables,
  isGeneratedNote,
  payableStatus,
  planPayablesSync,
  summarizePayables,
  todayIso,
  UBER_SOURCE_ID,
  type PayableSources,
  type PayableWithFiles,
} from '../lib/payables'

const sources: PayableSources = {
  performers: [
    { id: 'p1', name: 'Seymour Bottoms', role: 'host', fee: 3000, travel: 1013, order: 0 },
    { id: 'p2', name: 'Athena Morgane', role: 'performer', fee: 999, travel: 0, order: 1 },
    { id: 'p3', name: 'Nobody Paid', role: 'performer', fee: 0, travel: null, order: 2 },
    { id: 'p4', name: 'Travel Only', role: 'performer', fee: 0, travel: 400, order: 3 },
  ],
  staff: [
    { id: 's1', name: 'Karolina', role: 'technician', fee: null, standingFee: 2000 },
    { id: 's2', name: 'Emil', role: 'doorman', fee: null, standingFee: null },
    { id: 's3', name: 'Helper', role: 'volunteer', fee: null, standingFee: null },
    { id: 's4', name: 'Paid helper', role: 'volunteer', fee: 500, standingFee: null },
    { id: 's5', name: 'Camera', role: 'photographer', fee: null, standingFee: null },
    { id: 's6', name: 'Unpaid photographer', role: 'photographer', fee: 0, standingFee: 6600 },
    { id: 's7', name: 'Unpaid door', role: 'doorman', fee: 0, standingFee: null },
    { id: 's8', name: 'Paid door', role: 'doorman', fee: 1500, standingFee: null },
  ],
  venue: { id: 'v1', name: 'Auktionsverket', price: 30000 },
}

describe('expectedPayables', () => {
  const rows = expectedPayables(sources)
  const find = (type: string, id: string) =>
    rows.find((r) => r.source_type === type && r.source_id === id)

  it('keeps the fee and the travel of an artist as two separate rows', () => {
    expect(find('performer', 'p1')?.agreed_amount).toBe(3000)
    expect(find('performer_travel', 'p1')?.agreed_amount).toBe(1013)
  })

  it('has no travel row for an artist without travel, and skips artists with nothing to pay', () => {
    expect(find('performer', 'p2')?.agreed_amount).toBe(999)
    expect(find('performer_travel', 'p2')).toBeUndefined()
    expect(find('performer', 'p3')).toBeUndefined()
  })

  it('still gives an artist with only travel a job row, with no amount', () => {
    expect(find('performer', 'p4')?.agreed_amount).toBeNull()
    expect(find('performer_travel', 'p4')?.agreed_amount).toBe(400)
  })

  it('puts the role in the tag and nothing in the note', () => {
    expect(find('performer', 'p1')?.tag).toBe('Host')
    expect(find('performer_travel', 'p1')?.tag).toBe('Host')
    expect(find('performer', 'p2')?.tag).toBe('Performer')
    expect(find('staff', 's1')?.tag).toBe('Technician')
    expect(find('performer', 'p1')?.note).toBeNull()
  })

  it('uses the standing rate when the event row has no fee', () => {
    expect(find('staff', 's1')?.agreed_amount).toBe(2000)
  })

  it('gives photographers and technicians a row even without an amount', () => {
    expect(find('staff', 's5')).toBeDefined()
    expect(find('staff', 's5')?.agreed_amount).toBeNull()
  })

  it('does not treat the door as a paid role: no row until a fee above 0 is set', () => {
    expect(find('staff', 's2')).toBeUndefined()
    expect(find('staff', 's7')).toBeUndefined()
    expect(find('staff', 's8')?.agreed_amount).toBe(1500)
  })

  it('skips anyone whose fee is 0, even a role that is normally paid and has a standing rate', () => {
    expect(find('staff', 's6')).toBeUndefined()
  })

  it('skips unpaid volunteers but keeps one with a fee', () => {
    expect(find('staff', 's3')).toBeUndefined()
    expect(find('staff', 's4')?.agreed_amount).toBe(500)
  })

  it('adds the venue and the standard Uber row, both tagged', () => {
    expect(find('venue', 'v1')?.agreed_amount).toBe(30000)
    expect(find('venue', 'v1')?.tag).toBe('Venue')
    expect(find('standard', UBER_SOURCE_ID)?.section).toBe('transport')
    expect(find('standard', UBER_SOURCE_ID)?.tag).toBe('Transport')
  })

  it('has no venue row when the event has no venue', () => {
    const none = expectedPayables({ ...sources, venue: null })
    expect(none.some((r) => r.source_type === 'venue')).toBe(false)
  })
})

describe('planPayablesSync', () => {
  const expected = expectedPayables(sources)
  const athena = expected.find((e) => e.source_type === 'performer' && e.source_id === 'p2')!
  const stored = (over: Record<string, unknown> = {}) => ({
    id: 'row1',
    source_type: 'performer',
    source_id: 'p2',
    label: 'Athena Morgane',
    tag: 'Performer',
    note: null,
    amount: 999,
    agreed_amount: 999,
    paid_on: null,
    ...over,
  })

  it('inserts every expected row when nothing is stored', () => {
    expect(planPayablesSync(expected, []).insert).toHaveLength(expected.length)
  })

  it('does not touch a row that already matches', () => {
    const plan = planPayablesSync([athena], [stored()])
    expect(plan.insert).toHaveLength(0)
    expect(plan.update).toHaveLength(0)
  })

  it('follows a changed fee when the board has not typed another amount', () => {
    const plan = planPayablesSync([{ ...athena, agreed_amount: 1500 }], [stored()])
    expect(plan.update[0].patch.agreed_amount).toBe(1500)
    expect(plan.update[0].patch.amount).toBe(1500)
  })

  it('keeps an amount the board changed to match an invoice', () => {
    const plan = planPayablesSync([{ ...athena, agreed_amount: 1500 }], [stored({ amount: 1250 })])
    expect(plan.update[0].patch.agreed_amount).toBe(1500)
    expect(plan.update[0].patch).not.toHaveProperty('amount')
  })

  it('leaves paid rows alone', () => {
    const plan = planPayablesSync(
      [{ ...athena, agreed_amount: 1500 }],
      [stored({ paid_on: '2026-10-30' })]
    )
    expect(plan.update).toHaveLength(0)
  })

  it('never inserts the same source twice', () => {
    const plan = planPayablesSync(expected, [stored()])
    expect(plan.insert.some((e) => e.source_type === 'performer' && e.source_id === 'p2')).toBe(
      false
    )
  })

  it('splits an old combined fee-and-travel row: the fee row shrinks and a travel row is added', () => {
    const seymour = expected.find((e) => e.source_type === 'performer' && e.source_id === 'p1')!
    const old = stored({
      id: 'seymour',
      source_id: 'p1',
      label: 'Seymour Bottoms',
      tag: null,
      note: 'Host. Fee 3000 kr + travel 1013 kr',
      amount: 4013,
      agreed_amount: 4013,
    })
    const plan = planPayablesSync(
      expected.filter((e) => e.source_id === 'p1'),
      [old]
    )
    expect(plan.update).toHaveLength(1)
    expect(plan.update[0].patch).toMatchObject({
      agreed_amount: 3000,
      amount: 3000,
      tag: 'Host',
      note: null,
    })
    expect(plan.insert.map((e) => e.source_type)).toEqual(['performer_travel'])
    expect(seymour.agreed_amount).toBe(3000)
  })

  it('fills in a missing tag and clears the old generated note without touching the amount', () => {
    const plan = planPayablesSync(
      expected.filter((e) => e.source_type === 'staff' && e.source_id === 's1'),
      [
        stored({
          id: 'k',
          source_type: 'staff',
          source_id: 's1',
          label: 'Karolina',
          tag: null,
          note: 'Light and sound technician',
          amount: 2000,
          agreed_amount: 2000,
        }),
      ]
    )
    expect(plan.update[0].patch).toMatchObject({ tag: 'Technician', note: null })
    expect(plan.update[0].patch).not.toHaveProperty('amount')
  })

  it('keeps a note the board wrote themselves', () => {
    const plan = planPayablesSync(
      [athena],
      [stored({ tag: null, note: 'Invoice sent to the wrong address' })]
    )
    expect(plan.update[0].patch.note).toBe('Invoice sent to the wrong address')
  })
})

describe('planPayablesSync, rows that are no longer expected', () => {
  const stored = (over: Record<string, unknown> = {}) => ({
    id: 'door',
    source_type: 'staff',
    source_id: 's2',
    label: 'Emil',
    tag: 'Door',
    note: null,
    amount: null,
    agreed_amount: null,
    paid_on: null,
    ...over,
  })
  const none = expectedPayables({ performers: [], staff: [], venue: null })

  it('removes an untouched row the system made for someone who is no longer paid', () => {
    expect(planPayablesSync(none, [stored()]).remove).toEqual(['door'])
  })

  it('keeps it when it has been paid, has a file, was given its own amount, or is hidden', () => {
    expect(planPayablesSync(none, [stored({ paid_on: '2026-10-30' })]).remove).toEqual([])
    expect(planPayablesSync(none, [stored({ fileCount: 1 })]).remove).toEqual([])
    expect(planPayablesSync(none, [stored({ amount: 800 })]).remove).toEqual([])
    expect(planPayablesSync(none, [stored({ dismissed: true })]).remove).toEqual([])
  })

  it('leaves rows added by hand and travel the board added alone', () => {
    expect(planPayablesSync(none, [stored({ source_type: null, source_id: null })]).remove).toEqual(
      []
    )
    expect(planPayablesSync(none, [stored({ source_type: 'staff_travel' })]).remove).toEqual([])
    expect(
      planPayablesSync(none, [stored({ source_type: 'performer_travel', agreed_amount: null })])
        .remove
    ).toEqual([])
  })

  it('removes the system travel row of an artist who has no fee or travel any more', () => {
    const plan = planPayablesSync(none, [
      stored({ id: 'trip', source_type: 'performer_travel', agreed_amount: 600, amount: 600 }),
    ])
    expect(plan.remove).toEqual(['trip'])
  })
})

describe('isGeneratedNote', () => {
  it('recognises the lines the first version wrote, and only those', () => {
    expect(isGeneratedNote('Host. Fee 3000 kr + travel 1013 kr')).toBe(true)
    expect(isGeneratedNote('Fee 999 kr + travel 853 kr')).toBe(true)
    expect(isGeneratedNote('Light and sound technician')).toBe(true)
    expect(isGeneratedNote('Photographer')).toBe(true)
    expect(isGeneratedNote('Call before paying')).toBe(false)
    expect(isGeneratedNote(null)).toBe(false)
    expect(isGeneratedNote('')).toBe(false)
  })
})

describe('payableStatus', () => {
  it('is paid when a date is set, invoice when a file is attached, otherwise awaiting', () => {
    expect(payableStatus({ paid_on: '2026-10-30' }, 0)).toBe('paid')
    expect(payableStatus({ paid_on: '2026-10-30' }, 2)).toBe('paid')
    expect(payableStatus({ paid_on: null }, 1)).toBe('invoice')
    expect(payableStatus({ paid_on: null }, 3)).toBe('invoice')
    expect(payableStatus({ paid_on: null }, 0)).toBe('awaiting')
  })
})

describe('buildLines', () => {
  const row = (over: Partial<PayableWithFiles>): PayableWithFiles =>
    ({
      id: 'x',
      section: 'artists',
      source_type: 'performer',
      source_id: 'p1',
      dismissed: false,
      files: [],
      ...over,
    }) as PayableWithFiles

  it('puts a person’s travel on the same line as their job', () => {
    const lines = buildLines(
      [row({ id: 'job' }), row({ id: 'trip', source_type: 'performer_travel' })],
      'artists'
    )
    expect(lines).toHaveLength(1)
    expect(lines[0].main.id).toBe('job')
    expect(lines[0].travel?.id).toBe('trip')
    expect(lines[0].hasTravelSlot).toBe(true)
  })

  it('keeps two people apart', () => {
    const lines = buildLines(
      [
        row({ id: 'a', source_id: 'p1' }),
        row({ id: 'b', source_id: 'p2' }),
        row({ id: 'ta', source_id: 'p1', source_type: 'performer_travel' }),
      ],
      'artists'
    )
    expect(lines.find((l) => l.main.id === 'a')?.travel?.id).toBe('ta')
    expect(lines.find((l) => l.main.id === 'b')?.travel).toBeNull()
  })

  it('makes every row of the other sections a line without a travel slot', () => {
    const lines = buildLines(
      [row({ id: 'v', section: 'venue', source_type: 'venue', source_id: 'v1' })],
      'venue'
    )
    expect(lines).toHaveLength(1)
    expect(lines[0].hasTravelSlot).toBe(false)
  })
})

describe('summarizePayables', () => {
  const rows = [
    { amount: 1000, paid_on: '2026-10-30', dismissed: false, section: 'artists' },
    { amount: 2000, paid_on: null, dismissed: false, section: 'artists' },
    { amount: null, paid_on: null, dismissed: false, section: 'staff' },
    { amount: 5000, paid_on: null, dismissed: true, section: 'venue' },
  ]

  it('adds up total, paid and outstanding and ignores hidden rows', () => {
    const { all, bySection } = summarizePayables(rows)
    expect(all).toMatchObject({ total: 3000, paid: 1000, outstanding: 2000, rows: 3, paidRows: 1 })
    expect(bySection.artists.outstanding).toBe(2000)
    expect(bySection.venue).toBeUndefined()
  })

  it('counts rows that have no amount yet', () => {
    expect(summarizePayables(rows).all.withoutAmount).toBe(1)
  })
})

describe('private payment limit', () => {
  it('flags a private payment above 999 kr only', () => {
    expect(exceedsPrivateLimit('private', 1000)).toBe(true)
    expect(exceedsPrivateLimit('private', 999)).toBe(false)
    expect(exceedsPrivateLimit('frilansfinans', 5000)).toBe(false)
    expect(exceedsPrivateLimit('private', null)).toBe(false)
  })
})

describe('todayIso', () => {
  it('formats the local date with leading zeros', () => {
    expect(todayIso(new Date(2026, 9, 5))).toBe('2026-10-05')
  })
})
