import { buildScheduleBlock } from './EveningScheduleCard'
import { formatEventDateVenueLine, isTicketReleased } from '@/lib/utils'
import type { EventMarketingData } from '@/services/eventService'

// The org's real events (Dark Carnival, Desserted Island) reposted the exact same schedule
// close to the date under "Nu kör vi! + kvällens schema igen" — reuses
// EveningScheduleCard.tsx's buildScheduleBlock rather than duplicating it, just with a
// "here it is again" framing instead of the first announcement. 2026-09-22.
export const buildEveningScheduleReminderText = (event: EventMarketingData): string => {
  const [scheduleSv, scheduleEng] = buildScheduleBlock()
  const dateVenue = formatEventDateVenueLine(event.eventStart, event.location, 'eng')
  const ticketsLine =
    event.ticketUrl && isTicketReleased(event.ticketReleaseDate)
      ? `🎟️ Biljetter/Tickets: ${event.ticketUrl}`
      : ''
  const hashtagsSection = ['#EveningSchedule', event.hashtags?.trim()].filter(Boolean).join(' ')

  return [
    `🇸🇪 Här kommer kvällens schema igen, för er som missade det förra gången! ${event.title} närmar sig! ✨\n\n${scheduleSv}`,
    `🇬🇧 Here's tonight's schedule again, in case you missed it the first time! ${event.title} is almost here! ✨\n\n${scheduleEng}`,
    [dateVenue, ticketsLine].filter(Boolean).join('\n'),
    hashtagsSection,
  ]
    .filter(Boolean)
    .join('\n\n')
}
