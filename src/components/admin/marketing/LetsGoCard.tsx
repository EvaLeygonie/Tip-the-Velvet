import { formatEventDateVenueLine, joinWithConjunction } from '@/lib/utils'
import type {
  EventMarketingData,
  AdminEventPerformerRow,
  AdminEventSponsorRow,
} from '@/services/eventService'

// Extrapolated from Dark Carnival's/Desserted Island's "Nu kör vi" posts
// (docs/old-work-documents/Social Media & Emails) — the day-of hype post, naming every
// confirmed artist same as OneWeekLeftCard.tsx, and thanking the prize sponsors same as
// ContestCard.tsx/SponsorsSalesTableCard.tsx. 2026-09-22.
export const buildLetsGoText = (
  event: EventMarketingData,
  performers: AdminEventPerformerRow[],
  sponsorRows: AdminEventSponsorRow[]
): string => {
  const names = performers.map((row) => row.performer.performer_name).join(', ')
  const prizeSponsorNames = sponsorRows.filter((r) => r.role === 'prize').map((r) => r.sponsor.name)
  const sponsorsSv = prizeSponsorNames.length
    ? joinWithConjunction(prizeSponsorNames, 'och')
    : '[sponsorer]'
  const sponsorsEng = prizeSponsorNames.length
    ? joinWithConjunction(prizeSponsorNames, 'and')
    : '[sponsors]'
  const dateVenue = formatEventDateVenueLine(event.eventStart, event.location, 'eng')
  const ticketsLine = event.ticketUrl ? `🎟️ Biljetter/Tickets: ${event.ticketUrl}` : ''
  const artistLineSv = names ? `\n\n🌟 Kvällens artister: ${names}` : ''
  const artistLineEng = names ? `\n\n🌟 Tonight's performers: ${names}` : ''
  const hashtagsSection = ['#TimeToShine', event.hashtags?.trim()].filter(Boolean).join(' ')

  return [
    `🇸🇪 Ikväll öppnar vi portarna till ${event.title}! 🎪🖤 Dagen är här – och vi är mer än redo för en natt fylld av förföriska nummer, pulserande dans och magi.${artistLineSv}\n\n📸 Vår fotograf finns på plats för att fånga kvällens mest spektakulära looks.\n\n🖤 Tack till våra fantastiska sponsorer: ${sponsorsSv}!\n\n⚠️ Observera: Det blir en intensiv och livlig kväll, och ljudnivån kan vara hög – särskilt nära scenen. Ta gärna med hörselskydd om du är känslig.\n\nÄr ni redo att kliva in med oss? ✨`,
    `🇬🇧 Tonight we open the gates to ${event.title}! 🎪🖤 The night has arrived – and we're more than ready for an evening of seductive performances, pulsating dance and magic.${artistLineEng}\n\n📸 Our photographer will be there to capture the night's most spectacular looks.\n\n🖤 Huge thanks to our wonderful sponsors: ${sponsorsEng}!\n\n⚠️ Please note: It will be an intense and lively night, and the volume may get high – especially near the stage. Bring earplugs if you're sensitive to sound.\n\nAre you ready to step in with us? ✨`,
    [dateVenue, ticketsLine].filter(Boolean).join('\n'),
    hashtagsSection,
  ]
    .filter(Boolean)
    .join('\n\n')
}
