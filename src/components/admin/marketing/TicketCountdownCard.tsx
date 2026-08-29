import { toBoldSerif, toSmallCaps, formatSocialDateLine } from '@/lib/utils'
import type { EventMarketingData } from '@/services/eventService'

// The short "gates ajar" teaser, not the full release-day post (that's buildTicketReleaseText).
export const buildTicketCountdownText = (event: EventMarketingData): string => {
  const titleSmallCaps = toSmallCaps(event.title)
  const releaseSv = event.ticketReleaseDate
    ? `Nu på lördag, ${formatSocialDateLine(event.ticketReleaseDate, 'sv')},`
    : 'Snart'
  const releaseEng = event.ticketReleaseDate
    ? `This Saturday, the ${formatSocialDateLine(event.ticketReleaseDate, 'eng')},`
    : 'Soon'
  const dateVenue = event.eventStart
    ? `🎪 ${formatSocialDateLine(event.eventStart, 'eng')}\n📍 ${event.location ?? ''}`
    : ''

  return [
    `🇸🇪 ${toBoldSerif('Ticket release')} \n\nPortarna till ${event.title} står på glänt… ${releaseSv} släpper vi våra biljetter till ${titleSmallCaps}!`,
    `🇬🇧 ${toBoldSerif('Ticket release')} \n\nThe gates of ${event.title} stand ajar… ${releaseEng} we release our tickets to ${titleSmallCaps}!`,
    `${titleSmallCaps}\n${dateVenue}`,
  ].join('\n\n')
}
