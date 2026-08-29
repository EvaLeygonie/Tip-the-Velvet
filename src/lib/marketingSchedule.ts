import type { FixedMarketingPostType } from '@/services/marketingService'

// negative = before event_start, positive = after
export type PostOffset = { unit: 'months' | 'weeks' | 'days'; amount: number }

export interface PostScheduleItem {
  type: FixedMarketingPostType
  offset: PostOffset
  labelSv: string
  labelEng: string
  hasTemplate: boolean
}

// The board's real posting calendar. Host/Headliner/Artist reveals are deliberately not
// listed here — those are event_performers.is_revealed/reveal_date, tracked on the Artists
// section below, not a second parallel checklist entry.
export const POST_SCHEDULE: PostScheduleItem[] = [
  {
    type: 'save_the_date',
    offset: { unit: 'months', amount: -6 },
    labelSv: 'Save the Date & temareveal',
    labelEng: 'Save the Date & theme reveal',
    hasTemplate: true,
  },
  {
    type: 'facebook_event',
    offset: { unit: 'months', amount: -5.5 },
    labelSv: 'Facebook-event (+ Darkside)',
    labelEng: 'Facebook event (+ Darkside)',
    hasTemplate: true,
  },
  {
    type: 'casting_call_open',
    offset: { unit: 'months', amount: -5 },
    labelSv: 'Casting call öppnar',
    labelEng: 'Casting call opens',
    hasTemplate: true,
  },
  {
    type: 'casting_call_closed',
    offset: { unit: 'months', amount: -3.5 },
    labelSv: 'Casting call stänger',
    labelEng: 'Casting call closes',
    hasTemplate: true,
  },
  {
    type: 'ticket_countdown',
    offset: { unit: 'days', amount: -Math.round(3 * 30.44 + 7) },
    labelSv: 'Biljettsläpp countdown',
    labelEng: 'Ticket release countdown',
    hasTemplate: true,
  },
  {
    type: 'ticket_release',
    offset: { unit: 'months', amount: -3 },
    labelSv: 'Biljettsläpp',
    labelEng: 'Ticket release',
    hasTemplate: true,
  },
  {
    type: 'pinterest_board',
    offset: { unit: 'months', amount: -2.5 },
    labelSv: 'Pinterest-board',
    labelEng: 'Pinterest board',
    hasTemplate: true,
  },
  {
    type: 'volunteers_needed',
    offset: { unit: 'weeks', amount: -8 },
    labelSv: 'Volontärer sökes',
    labelEng: 'Volunteers needed',
    hasTemplate: true,
  },
  {
    type: 'artists_soon',
    offset: { unit: 'weeks', amount: -7 },
    labelSv: 'Artister släpps snart!',
    labelEng: 'Artists releasing soon!',
    hasTemplate: true,
  },
  {
    type: 'artists_all_together',
    offset: { unit: 'weeks', amount: -4 },
    labelSv: 'Artisterna, alla tillsammans',
    labelEng: 'Artists, all together',
    hasTemplate: true,
  },
  {
    type: 'sponsors_sales_table',
    offset: { unit: 'weeks', amount: -3 },
    labelSv: 'Sponsorer & säljbord',
    labelEng: 'Sponsors & sales table',
    hasTemplate: false,
  },
  {
    type: 'contest',
    offset: { unit: 'weeks', amount: -3 },
    labelSv: 'Tävling',
    labelEng: 'Contest',
    hasTemplate: false,
  },
  {
    type: 'photo_corner',
    offset: { unit: 'weeks', amount: -3 },
    labelSv: 'Photo-hörna',
    labelEng: 'Photo corner',
    hasTemplate: false,
  },
  {
    type: 'venue_rules',
    offset: { unit: 'weeks', amount: -2 },
    labelSv: 'Venue-regler',
    labelEng: 'Venue rules',
    hasTemplate: false,
  },
  {
    type: 'evening_schedule',
    offset: { unit: 'weeks', amount: -2 },
    labelSv: 'Kvällens upplägg',
    labelEng: "Evening's schedule",
    hasTemplate: false,
  },
  {
    type: 'one_week_left',
    offset: { unit: 'weeks', amount: -1 },
    labelSv: 'En vecka kvar',
    labelEng: 'One week left',
    hasTemplate: false,
  },
  {
    type: 'share_like_invite',
    offset: { unit: 'weeks', amount: -1 },
    labelSv: 'Share, like, invite',
    labelEng: 'Share, like, invite',
    hasTemplate: false,
  },
  {
    type: 'evening_schedule_reminder',
    offset: { unit: 'weeks', amount: -1 },
    labelSv: 'Kvällens upplägg igen',
    labelEng: "Evening's schedule, again",
    hasTemplate: false,
  },
  {
    type: 'lets_go',
    offset: { unit: 'days', amount: 0 },
    labelSv: 'Nu kör vi!',
    labelEng: "Let's go!",
    hasTemplate: false,
  },
  {
    type: 'thank_you',
    offset: { unit: 'days', amount: 2 },
    labelSv: 'Tack!',
    labelEng: 'Thank you!',
    hasTemplate: false,
  },
  {
    type: 'evaluation',
    offset: { unit: 'days', amount: 5 },
    labelSv: 'Utvärdering',
    labelEng: 'Evaluation',
    hasTemplate: false,
  },
]

// Calendar-aware for months (so "6 months before Oct 24" lands on ~Apr 24, not a fixed day
// count), plain day math for weeks/days. Half-month amounts (5.5, 3.5, 2.5) are handled by
// splitting into whole months + 15 days.
export const computeSuggestedDate = (eventStart: string, offset: PostOffset): Date => {
  const date = new Date(eventStart)

  if (offset.unit === 'months') {
    const wholeMonths = Math.trunc(offset.amount)
    const isHalf = Math.abs(offset.amount - wholeMonths) >= 0.5
    date.setMonth(date.getMonth() + wholeMonths)
    if (isHalf) date.setDate(date.getDate() + (offset.amount < 0 ? -15 : 15))
    return date
  }

  const days = offset.unit === 'weeks' ? offset.amount * 7 : offset.amount
  date.setDate(date.getDate() + days)
  return date
}

// YYYY-MM-DD in local time, for feeding a Date into a date input's `value` — deliberately
// not `toISOString().slice(0, 10)`, which converts to UTC first and can land on the wrong
// day depending on the browser's timezone offset.
export const toLocalIsoDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
