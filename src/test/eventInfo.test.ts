import { describe, it, expect } from 'vitest'
import {
  audienceForStaffRole,
  buildDoorSlots,
  countUncoveredDoorWindows,
  doorPlanSentence,
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
    expect(doorPlanSentence(plan, 'eng')).toBe(
      'With 4 people and 6 hours to cover, that is about 1.5 hours each – or 3 hours if you would rather sit two at a time.'
    )
    expect(doorPlanSentence(plan, 'sv')).toContain('Med 4 personer')
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
