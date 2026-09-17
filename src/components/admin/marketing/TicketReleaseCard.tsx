import { toSmallCaps, formatEventDateVenueLine, toDoubleStruck } from '@/lib/utils'
import { LEGAL_INFO_SV, LEGAL_INFO_ENG, DRESSCODE_INTRO_SV, DRESSCODE_INTRO_ENG } from './postBoilerplate'
import type { EventMarketingData } from '@/services/eventService'

export const buildTicketReleaseText = (event: EventMarketingData): string => {
  const titleSmallCaps = toSmallCaps(event.title)
  const dateVenue = formatEventDateVenueLine(event.eventStart, event.location, 'eng')
  const ticketsLine = event.ticketUrl
    ? `\n🎟️ ${toDoubleStruck('Biljetter/Tickets')} : ${event.ticketUrl}`
    : ''

  return [
    `🇸🇪 ${titleSmallCaps} ﹣ ${toSmallCaps('ticket release')}! \n\nBiljetter till ${titleSmallCaps} finns nu ute till försäljning!\n\n✨ Artister annonseras snart!\n${DRESSCODE_INTRO_SV}\n${LEGAL_INFO_SV}`,
    `🇬🇧 ${titleSmallCaps} ﹣ ${toSmallCaps('ticket release')}! \n\nTickets to ${titleSmallCaps} are now available for purchase!\n\n✨ Lineup to be announced! \n${DRESSCODE_INTRO_ENG}\n${LEGAL_INFO_ENG}`,
    `${titleSmallCaps}\n${dateVenue}${ticketsLine}`,
  ].join('\n\n')
}
