import { formatEventDateVenueLine } from '@/lib/utils'
import type { EventMarketingData, AdminEventPerformerRow } from '@/services/eventService'

// Extrapolated from Dark Carnival's/Creatures of the Night's/Desserted Island's "En vecka
// kvar" posts (docs/old-work-documents/Social Media & Emails) — all three name every
// confirmed artist by name, so this takes a performers list and lists them the same way
// buildArtistsAllTogetherText does, rather than a static ticket reminder like
// TicketCountdownCard/TicketReleaseCard. 2026-09-22.
export const buildOneWeekLeftText = (
  event: EventMarketingData,
  performers: AdminEventPerformerRow[]
): string => {
  const names = performers.map((row) => row.performer.performer_name).join(', ')
  const dateVenue = formatEventDateVenueLine(event.eventStart, event.location, 'eng')
  const ticketsLine = event.ticketUrl ? `🎟️ Biljetter/Tickets: ${event.ticketUrl}` : ''
  const artistLineSv = names
    ? `\n\nFörbered dig på en kväll tillsammans med våra fabulösa artister: ${names}!`
    : ''
  const artistLineEng = names
    ? `\n\nGet ready for a night with our fabulous artists: ${names}!`
    : ''
  const hashtagsSection = ['#OneWeekLeft', event.hashtags?.trim()].filter(Boolean).join(' ')

  return [
    `🇸🇪 𝐁𝐚𝐫𝐚 𝐞𝐧 𝐯𝐞𝐜𝐤𝐚 𝐤𝐯𝐚𝐫… Har du säkrat din biljett till ${event.title}? Biljetter säljs inte i dörren – så skaffa din biljett nu! 🎪${artistLineSv}\n\nVi ses om en vecka! 🖤`,
    `🇬🇧 𝐎𝐧𝐞 𝐰𝐞𝐞𝐤 𝐭𝐨 𝐠𝐨… Have you secured your ticket for ${event.title}? Tickets aren't sold at the door – so get yours now! 🎪${artistLineEng}\n\nSee you in one week! 🖤`,
    [dateVenue, ticketsLine].filter(Boolean).join('\n'),
    hashtagsSection,
  ]
    .filter(Boolean)
    .join('\n\n')
}
