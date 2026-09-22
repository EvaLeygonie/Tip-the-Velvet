import { formatEventDateVenueLine } from '@/lib/utils'
import type { EventMarketingData } from '@/services/eventService'

// Matches Dark Carnival's "Like, share & invite" post almost word for word — this one's
// generic wording repeated near-identically across every event doc read
// (docs/old-work-documents/Social Media & Emails), so no per-event customization needed
// beyond the ticket link. 2026-09-22.
export const buildShareLikeInviteText = (event: EventMarketingData): string => {
  const dateVenue = formatEventDateVenueLine(event.eventStart, event.location, 'eng')
  const ticketsLine = event.ticketUrl ? `🎟️ Biljetter/Tickets: ${event.ticketUrl}` : ''
  const hashtagsSection = ['#ShareLikeInvite', event.hashtags?.trim()].filter(Boolean).join(' ')

  return [
    '🇸🇪 Tillsammans skapar vi Tip the Velvet! Så glöm inte att gilla, dela och bjuda in så att våra fester och shower kan fortsätta växa, förtrolla och underhålla! ❤️',
    '🇬🇧 Together we create Tip the Velvet! So remember to like, share and invite so that our parties and shows can continue to grow, enchant and entertain! ❤️',
    [dateVenue, ticketsLine].filter(Boolean).join('\n'),
    hashtagsSection,
  ]
    .filter(Boolean)
    .join('\n\n')
}
