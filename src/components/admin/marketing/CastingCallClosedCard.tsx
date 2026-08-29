import { toBoldSerif, toSmallCaps, formatSocialDateLine } from '@/lib/utils'
import type { EventMarketingData } from '@/services/eventService'

export const buildCastingCallClosedText = (event: EventMarketingData): string => {
  const titleSmallCaps = toSmallCaps(event.title)
  const dateVenue = event.eventStart
    ? `🎪 ${formatSocialDateLine(event.eventStart, 'eng')}\n📍 ${event.location ?? ''}`
    : ''

  return [
    `🇸🇪 ${toBoldSerif('Casting call CLOSED')} \n\n${event.title}s portar till vårt casting call har nu stängt! Tack till alla fantastiska artister som skickat in sina ansökningar! Nu börjar det svåra jobbet att välja ut akter till vårt nästa event, ${titleSmallCaps}!`,
    `🇬🇧 ${toBoldSerif('Casting call CLOSED')}\n\n${event.title}s gates to our casting call are now closed! Thanks to all the fantastic artists that sent in their applications! Now begins the difficult job of choosing acts for our next event, ${titleSmallCaps}!`,
    `${titleSmallCaps}\n${dateVenue}`,
  ].join('\n\n')
}
