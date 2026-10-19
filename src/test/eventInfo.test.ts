import { describe, it, expect } from 'vitest'
import {
  audienceForStaffRole,
  buildDoorSlots,
  countUncoveredDoorWindows,
  doorPlanSentence,
  findPhoneForName,
  partyPhase,
  slotPartyPhase,
  buildDoorReport,
  buildDoorNeed,
  doorBookingInfo,
  showStartMinutesFromItems,
  buildDoorShiftsForPeople,
  findUnplacedDoorStaff,
  formatClock,
  formatDuration,
  formatDurationShort,
  hasPlaceholder,
  isDoorStaffRow,
  planDoorShifts,
  sameAsTemplate,
  sortInfoItems,
  templateKeyFor,
  timeSortKey,
  type DoorSlot,
} from '../lib/eventInfo'

const slot = (start: string, end: string, name: string | null = null): DoorSlot => ({
  id: `${start}-${name ?? 'open'}`,
  slot_start: start,
  slot_end: end,
  volunteer_name: name,
})

describe('audienceForStaffRole', () => {
  it('maps staff roles to their info link', () => {
    expect(audienceForStaffRole('photographer')).toBe('photographer')
    expect(audienceForStaffRole('technician')).toBe('technician')
    expect(audienceForStaffRole('volunteer')).toBe('volunteer')
    expect(audienceForStaffRole('doorman')).toBe('volunteer')
  })

  it('gives roles without their own page no link', () => {
    expect(audienceForStaffRole('dj')).toBeNull()
    expect(audienceForStaffRole('other')).toBeNull()
  })
})

describe('timeSortKey', () => {
  it('reads the first clock time in a label', () => {
    expect(timeSortKey('21:00')).toBe(21 * 60)
    expect(timeSortKey('ca 22:30')).toBe(22 * 60 + 30)
    expect(timeSortKey('17:00–18:00')).toBe(17 * 60)
    expect(timeSortKey('21.15')).toBe(21 * 60 + 15)
  })

  it('counts small hours as after midnight', () => {
    expect(timeSortKey('01:20')).toBeGreaterThan(timeSortKey('21:00')!)
    expect(timeSortKey('05:59')).toBe(29 * 60 + 59)
    expect(timeSortKey('06:00')).toBe(6 * 60)
  })

  it('returns null when there is no time', () => {
    expect(timeSortKey(null)).toBeNull()
    expect(timeSortKey('Hela kvällen')).toBeNull()
  })
})

describe('sortInfoItems', () => {
  const row = (kind: 'schedule' | 'text', time_text: string | null, sort_order: number) => ({
    kind,
    time_text,
    sort_order,
  })

  it('orders schedule rows by clock time, after-midnight last', () => {
    const sorted = sortInfoItems([
      row('schedule', '01:20', 1),
      row('schedule', '21:00', 2),
      row('schedule', '19:00', 3),
    ])
    expect(sorted.map((r) => r.time_text)).toEqual(['19:00', '21:00', '01:20'])
  })

  it('falls back to sort_order for rows without a usable time and for text rows', () => {
    const sorted = sortInfoItems([row('text', null, 2), row('text', null, 1)])
    expect(sorted.map((r) => r.sort_order)).toEqual([1, 2])
  })

  it('does not change the array it is given', () => {
    const input = [row('schedule', '22:00', 1), row('schedule', '20:00', 2)]
    sortInfoItems(input)
    expect(input[0].time_text).toBe('22:00')
  })
})

describe('formatClock', () => {
  it('shows Swedish local time whatever the device time zone', () => {
    expect(formatClock('2026-10-24T17:00:00Z')).toBe('19:00') // CEST, before the 25 Oct switch
    expect(formatClock('2026-12-01T17:00:00Z')).toBe('18:00') // CET
  })
})

describe('buildDoorSlots', () => {
  const start = new Date('2026-10-24T17:00:00Z')

  it('splits the window into slots with the requested number of seats', () => {
    const slots = buildDoorSlots(start, new Date('2026-10-24T20:00:00Z'), 60, 2)
    expect(slots).toHaveLength(6)
    expect(slots[0].slot_start).toBe('2026-10-24T17:00:00.000Z')
    expect(slots[1].slot_start).toBe(slots[0].slot_start)
    expect(slots[2].slot_start).toBe('2026-10-24T18:00:00.000Z')
  })

  it('shortens the last slot to fit', () => {
    const slots = buildDoorSlots(start, new Date('2026-10-24T18:30:00Z'), 60, 1)
    expect(slots).toHaveLength(2)
    expect(slots[1].slot_end).toBe('2026-10-24T18:30:00.000Z')
  })

  it('makes nothing for an empty window', () => {
    expect(buildDoorSlots(start, start, 60, 2)).toEqual([])
  })
})

describe('isDoorStaffRow', () => {
  it('counts doormen and guest-list volunteers only', () => {
    expect(isDoorStaffRow({ role: 'doorman', shift: null })).toBe(true)
    expect(isDoorStaffRow({ role: 'volunteer', shift: 'guestlist' })).toBe(true)
    expect(isDoorStaffRow({ role: 'volunteer', shift: 'bar' })).toBe(false)
    expect(isDoorStaffRow({ role: 'technician', shift: 'guestlist' })).toBe(false)
  })
})

describe('findUnplacedDoorStaff', () => {
  const people = [{ name: 'Irini Karlsson' }, { name: 'Linnea Berg' }]

  it('returns everyone when no slot has a name', () => {
    expect(findUnplacedDoorStaff(people, [null, null])).toEqual(people)
  })

  it('matches full names regardless of case and spacing', () => {
    expect(findUnplacedDoorStaff(people, ['  linnea berg '])).toEqual([people[0]])
  })

  it('accepts a first name alone when it is unambiguous', () => {
    expect(findUnplacedDoorStaff(people, ['Irini'])).toEqual([people[1]])
  })

  it('does not guess when two door staff share a first name', () => {
    const twins = [{ name: 'Anna Ek' }, { name: 'Anna Lind' }]
    expect(findUnplacedDoorStaff(twins, ['Anna'])).toEqual(twins)
  })
})

describe('countUncoveredDoorWindows', () => {
  it('needs only one name per time window', () => {
    const slots = [
      slot('2026-10-24T17:00:00Z', '2026-10-24T18:00:00Z', 'Irini'),
      slot('2026-10-24T17:00:00Z', '2026-10-24T18:00:00Z', null),
      slot('2026-10-24T18:00:00Z', '2026-10-24T19:00:00Z', null),
      slot('2026-10-24T18:00:00Z', '2026-10-24T19:00:00Z', null),
    ]
    expect(countUncoveredDoorWindows(slots)).toBe(1)
  })

  it('is zero without slots', () => {
    expect(countUncoveredDoorWindows([])).toBe(0)
  })
})

describe('planDoorShifts', () => {
  // 19:00–01:00 in one-hour windows with two seats each: six hours to cover.
  const slots = buildDoorSlots(
    new Date('2026-10-24T17:00:00Z'),
    new Date('2026-10-24T23:00:00Z'),
    60,
    2
  )

  it('divides the covered time by the number of people, to the half hour', () => {
    expect(planDoorShifts(slots, 6)).toMatchObject({ coverageMinutes: 360, soloMinutes: 60 })
    expect(planDoorShifts(slots, 4)).toMatchObject({ soloMinutes: 90, tandemMinutes: 180 })
    expect(planDoorShifts(slots, 5)?.soloMinutes).toBe(60) // 72 min rounds to 60
  })

  it('counts a window once even though it has two seats', () => {
    expect(planDoorShifts(slots, 1)?.coverageMinutes).toBe(360)
  })

  it('never suggests less than half an hour', () => {
    expect(planDoorShifts(slots, 100)?.soloMinutes).toBe(30)
  })

  it('has no plan without people or without slots', () => {
    expect(planDoorShifts(slots, 0)).toBeNull()
    expect(planDoorShifts([], 5)).toBeNull()
  })
})

describe('buildDoorShiftsForPeople', () => {
  const start = new Date('2026-10-24T17:00:00Z')
  const end = new Date('2026-10-24T23:00:00Z')

  it('doubles the earliest hours so spots equal people', () => {
    const plan = buildDoorShiftsForPeople(start, end, 60, 10)
    expect(plan.slots).toHaveLength(10)
    expect(plan.doubled).toBe(4)
  })

  it('flags hours that cannot be covered', () => {
    expect(buildDoorShiftsForPeople(start, end, 60, 4).emptyHours).toBe(2)
  })
})

describe('door report', () => {
  const at = (hhmm: string) => new Date(`2026-10-24T${hhmm}:00+02:00`).toISOString()
  const slot = (from: string, to: string, name: string | null) => ({
    slot_start: at(from),
    slot_end: at(to),
    volunteer_name: name,
  })

  it('finds the show start from the schedule row', () => {
    expect(
      showStartMinutesFromItems([
        {
          kind: 'schedule',
          time_text: '19:00',
          title_sv: 'Dörrarna öppnas',
          title_eng: 'Doors open',
        },
        {
          kind: 'schedule',
          time_text: '21:00',
          title_sv: 'Showen börjar – akt 1',
          title_eng: null,
        },
      ])
    ).toBe(21 * 60)
  })

  it('works out how many extra volunteers the open slots need', () => {
    const slots = [
      slot('19:00', '19:30', 'Anna'),
      slot('19:30', '20:00', null),
      slot('20:00', '20:30', null),
      slot('20:30', '21:00', null),
      slot('20:30', '21:00', null),
    ]
    const need = buildDoorNeed(slots, buildDoorReport(slots, ['Anna', 'Bo'], null))
    expect(need.openSpots).toBe(4)
    expect(need.uncoveredSlots).toBe(3)
    expect(need.uncoveredMinutes).toBe(90)
    // Anna still owes 30 min and Bo 60: 90 min covers the 90 min of empty time.
    expect(need.owedMinutes).toBe(90)
    expect(need.extraVolunteers).toBe(0)
  })

  it('treats setup volunteers as done at 30 minutes, or as free when they have no door shift', () => {
    const report = buildDoorReport(
      [slot('19:00', '19:30', 'Sam')],
      ['Sam', 'Kat', 'Dan'],
      21 * 60,
      ['sam', 'Kat']
    )
    expect(report.done).toEqual([{ name: 'Sam', minutes: 30, show: false, early: 30, target: 30 }])
    expect(report.setupFree).toEqual(['Kat'])
    expect(report.notBooked).toEqual(['Dan'])
    expect(report.needsMore).toEqual([])
  })

  it('splits people into not booked, needs more and done (a show shift alone is not done)', () => {
    const report = buildDoorReport(
      [
        slot('19:00', '19:30', 'Anna'),
        slot('20:00', '20:30', 'Anna'),
        slot('19:30', '20:00', 'Bo'),
        slot('21:00', '21:30', 'Cia'),
      ],
      ['Anna', 'Bo', 'Cia', 'Dan'],
      21 * 60
    )
    expect(report.notBooked).toEqual(['Dan'])
    expect(report.needsMore).toEqual([
      { name: 'Bo', minutes: 30, show: false, early: 30, target: 60 },
      { name: 'Cia', minutes: 30, show: true, early: 0, target: 60 },
    ])
    expect(report.done).toEqual([{ name: 'Anna', minutes: 60, show: false, early: 60, target: 60 }])
  })
})

describe('doorBookingInfo', () => {
  const half = (from: string, to: string) => ({
    slot_start: new Date(`2026-10-24T${from}:00+02:00`).toISOString(),
    slot_end: new Date(`2026-10-24T${to}:00+02:00`).toISOString(),
  })

  it('explains the fair way to book 30-minute shifts: one before and one after the first two hours', () => {
    const sv = doorBookingInfo([half('19:00', '19:30')], 'sv')!
    expect(sv).toContain('ett före 21:00 och ett efter')
    expect(doorBookingInfo([half('19:00', '19:30')], 'eng')).toContain(
      'one before 21:00 and one after'
    )
  })

  it('falls back to a general instruction for other shift lengths', () => {
    expect(doorBookingInfo([half('19:00', '20:00')], 'sv')).toBe('Skriv upp dig på ett pass.')
  })

  it('has nothing to say without shifts', () => {
    expect(doorBookingInfo([], 'sv')).toBeNull()
  })
})

describe('partyPhase', () => {
  it('runs mingle, show, break, show, dancefloor from the show start', () => {
    expect([-120, -30, 0, 30, 59, 60, 89, 90, 149, 150, 200].map(partyPhase)).toEqual([
      'mingle',
      'mingle',
      'show',
      'show',
      'show',
      'break',
      'break',
      'show',
      'show',
      'dancefloor',
      'dancefloor',
    ])
  })
})

describe('findPhoneForName', () => {
  const people = [
    { name: 'Sam O Cleirigh', phone: '070 111' },
    { name: 'Krister Johansson', phone: '070 222' },
    { name: 'Anna Berg', phone: '070 333' },
    { name: 'Anna Lind', phone: '070 444' },
    { name: 'Linnea Lind', phone: null },
  ]

  it('matches the exact name, ignoring case', () => {
    expect(findPhoneForName('sam o cleirigh', people)).toBe('070 111')
  })

  it('matches on first name when it is unique, ignoring text in parentheses', () => {
    expect(findPhoneForName('Krister (arrangör)', people)).toBe('070 222')
  })

  it('does not guess when the first name is shared or the person has no number', () => {
    expect(findPhoneForName('Anna', people)).toBeNull()
    expect(findPhoneForName('Linnea Lind', people)).toBeNull()
  })
})

describe('duration formatting', () => {
  it('writes minutes, hours and half hours in both languages', () => {
    expect(formatDuration(45, 'sv')).toBe('45 min')
    expect(formatDuration(60, 'sv')).toBe('1 timme')
    expect(formatDuration(90, 'sv')).toBe('1,5 timmar')
    expect(formatDuration(60, 'eng')).toBe('1 hour')
    expect(formatDuration(150, 'eng')).toBe('2.5 hours')
  })

  it('has a compact form', () => {
    expect(formatDurationShort(30, 'sv')).toBe('30 min')
    expect(formatDurationShort(90, 'sv')).toBe('1,5 tim')
    expect(formatDurationShort(120, 'eng')).toBe('2 h')
  })

  it('builds the volunteer guidance sentence', () => {
    const plan = planDoorShifts(
      buildDoorSlots(new Date('2026-10-24T17:00:00Z'), new Date('2026-10-24T23:00:00Z'), 60, 2),
      4
    )!
    expect(doorPlanSentence(plan, 'eng')).toContain(
      'We are 4 door volunteers with 6 hours to cover, so it comes to about 1.5 hours each on average.'
    )
    expect(doorPlanSentence(plan, 'sv')).toContain('Vi är 4 dörrvolontärer')
  })
})

describe('template helpers', () => {
  it('derives a key from kind and English title for items without one', () => {
    expect(templateKeyFor({ kind: 'text', title_eng: 'Door shifts!', template_key: null })).toBe(
      'text:door-shifts'
    )
  })

  it('keeps an existing template key', () => {
    expect(templateKeyFor({ kind: 'text', title_eng: 'X', template_key: 'custom' })).toBe('custom')
  })

  it('finds [bracketed] blanks in any text field', () => {
    const base = { time_text: null, title_sv: null, title_eng: null, body_sv: null, body_eng: null }
    expect(hasPlaceholder(base)).toBe(false)
    expect(hasPlaceholder({ ...base, body_eng: 'Meet at [fill in address]' })).toBe(true)
    expect(hasPlaceholder({ ...base, body_eng: 'Meet at (fill in address)' })).toBe(false)
    expect(hasPlaceholder({ ...base, time_text: '[time]' })).toBe(true)
  })

  it('compares text and audience with the template, ignoring whitespace and order', () => {
    const template = {
      audiences: ['artist', 'volunteer'] as ('artist' | 'volunteer')[],
      title_sv: 'Titel',
      title_eng: 'Title',
      body_sv: null,
      body_eng: 'Body',
    }
    expect(
      sameAsTemplate(
        { ...template, audiences: ['volunteer', 'artist'], body_eng: ' Body ' },
        template
      )
    ).toBe(true)
    expect(sameAsTemplate({ ...template, body_eng: 'Changed' }, template)).toBe(false)
    expect(sameAsTemplate({ ...template, audiences: ['artist'] }, template)).toBe(false)
  })
})

describe('slotPartyPhase', () => {
  it('counts shifts after midnight as the end of the evening', () => {
    const at = (iso: string) => new Date(iso).toISOString()
    expect(slotPartyPhase(at('2026-10-24T22:00:00+02:00'), 21 * 60)).toBe('break')
    expect(slotPartyPhase(at('2026-10-25T00:00:00+02:00'), 21 * 60)).toBe('dancefloor')
    expect(slotPartyPhase(at('2026-10-24T19:30:00+02:00'), 21 * 60)).toBe('mingle')
  })
})
