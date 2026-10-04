import { toFraktur, isTicketReleased } from '@/lib/utils'
import { LEGAL_INFO_SV, LEGAL_INFO_ENG } from './postBoilerplate'
import type { EventMarketingData } from '@/services/eventService'

// description_sv/eng is an exact wording match for this post specifically (confirmed
// against the org's real Facebook event text earlier this session) — not an approximation
// like Save the Date's teaser.
export const buildFacebookEventText = (event: EventMarketingData): string => {
  const dateLine = event.eventStart
    ? (() => {
        const d = new Date(event.eventStart!)
        return `🔞 18+ | ${d.getDate()}/${d.getMonth() + 1} - ${d.getFullYear()} | ${event.location ?? ''}`
      })()
    : ''
  const ticketsLine =
    event.ticketUrl && isTicketReleased(event.ticketReleaseDate)
      ? `🎟️ Biljetter/Tickets: ${event.ticketUrl}`
      : ''

  return [
    [toFraktur(event.title), dateLine, ticketsLine].filter(Boolean).join('\n'),
    `🇸🇪 ${event.descriptionSv ?? ''}\n✨ Artister annonseras snart!\n${LEGAL_INFO_SV}`,
    `🇬🇧 ${event.descriptionEng ?? ''}\n✨ Lineup to be announced!\n${LEGAL_INFO_ENG}`,
  ].join('\n\n')
}
