import { toBoldSerif, toSmallCaps, formatSocialDateLine } from '@/lib/utils'
import type { EventMarketingData } from '@/services/eventService'

// The "reveals starting soon" teaser — precedes the individual artist-reveal posts
// (ArtistOverviewCard) and the later "all together" recap (ArtistsAllTogetherCard). Matches
// a real published post exactly. #PerformerReveal is the one addition baked in here (this
// post type's own reusable tag, distinct from event.hashtags); anything event-specific and
// non-reusable (the real post also had #Halloween, since that event was Halloween-themed)
// is left for the board to add by hand after generating — see StandardPostRow's edit/save.
export const buildArtistsSoonText = (event: EventMarketingData): string => {
  const titleSmallCaps = toSmallCaps(event.title)

  let dateSv = ''
  let dateEng = ''
  if (event.eventStart) {
    dateSv = ` den ${formatSocialDateLine(event.eventStart, 'sv')}`
    const [month, dayWithSuffix, year] = formatSocialDateLine(event.eventStart, 'eng').split(' ')
    dateEng = ` on the ${dayWithSuffix} of ${month} ${year}`
  }

  const ticketsSection = event.ticketUrl
    ? `🎟️ ${toBoldSerif('Biljetter/Tickets:')} ${event.ticketUrl}`
    : null

  const hashtagsSection = ['#PerformerReveal', event.hashtags?.trim()].filter(Boolean).join(' ') || null

  return [
    `🇸🇪 🎭✨ ${toBoldSerif('Artister avslöjas snart!')} ✨🎭\n\nÄr ni taggade på att få veta vilka fantastiska artister som kommer att förgylla vår scen på ${titleSmallCaps}${dateSv}? Snart är väntan över 😘`,
    `🇬🇧 🎭✨ ${toBoldSerif('Performers will be revealed soon!')} ✨🎭\n\nAre you excited to find out which fantastic performers will be gracing our stage at ${titleSmallCaps}${dateEng}? Well the wait will soon be over 😘`,
    ticketsSection,
    hashtagsSection,
  ]
    .filter(Boolean)
    .join('\n\n')
}
