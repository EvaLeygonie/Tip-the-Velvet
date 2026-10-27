import { extractInstagramHandle } from '@/lib/utils'
import type {
  EventMarketingData,
  AdminEventPerformerRow,
  AdminEventSponsorRow,
} from '@/services/eventService'
import type { EventEntertainer } from '@/services/entertainerService'

// Based on Desserted Island's "Tack!!" post (docs/old-work-documents/Social Media & Emails),
// reworked for Pandaemonium: thanks the whole crew and audience, says where the photos will
// appear and who to contact for a high-resolution copy — the event's own photographer
// (events.photographer_id, see getEventMarketingData), as an Instagram tag when they have one.
// Ends with a credit block for every artist, pre-show entertainer and sponsor: their Instagram
// tag where they have one (Facebook shows it as plain text, which is fine — everyone knows them by
// it), their name otherwise. The real posts also thank named
// individuals (DJ, sound/light tech, vendors) who vary every time, so the board adds those by
// hand.

export const buildThankYouText = (
  event: EventMarketingData,
  performers: AdminEventPerformerRow[],
  entertainers: EventEntertainer[],
  sponsorRows: AdminEventSponsorRow[]
): string => {
  const hashtagsSection = ['#ThankYou', event.hashtags?.trim()].filter(Boolean).join(' ')
  const photographerRef = event.photographer?.instagramHandle || event.photographer?.name || null

  const creditLine = (
    label: string,
    credits: [string | null | undefined, string | undefined][]
  ) => {
    // Instagram tag when there is a link, the plain name otherwise — nobody drops out.
    const entries = credits.flatMap(([link, name]) => {
      const entry = extractInstagramHandle(link) ?? name?.trim()
      return entry ? [entry] : []
    })
    const unique = [...new Map(entries.map((entry) => [entry.toLowerCase(), entry])).values()]
    return unique.length > 0 ? `${label} ${unique.join(' ')}` : ''
  }
  const creditsSection = [
    creditLine(
      '🎭 Artister / Artists:',
      performers.map((row) => [row.performer.instagram_link, row.performer.performer_name])
    ),
    creditLine(
      '🔥 Förshow / Pre-show:',
      entertainers.map((row) => [row.instagram_link, row.display_name || row.staff.name])
    ),
    creditLine(
      '🖤 Sponsorer / Sponsors:',
      sponsorRows.map((row) => [row.sponsor.instagram_link, row.sponsor.name])
    ),
  ]
    .filter(Boolean)
    .join('\n')

  return [
    `🇸🇪 Tack till alla som var med och gjorde ${event.title} till en kväll att minnas! Artister, arbetare, volontärer & såklart publik, ni är alla underbara och vi ser fram emot att se er igen snart! 🖤🔥\n\n📸 Bilderna kommer delas på vår hemsida samt på Facebook när fotografen är klar med dem! Vill ni ha en speciell bild högupplöst kan ni kontakta ${photographerRef ?? 'fotografen'} direkt!`,
    `🇬🇧 Thank you to everyone who made ${event.title} a night to remember! Artists, workers, volunteers & of course our guests, you are all wonderful and we look forward to seeing you again soon! 🖤🔥\n\n📸 The pictures will be shared on our website as well as our Facebook page once the photographer is done with them! If you want a specific image in high quality, you can then contact ${photographerRef ?? 'the photographer'} directly!`,
    creditsSection,
    hashtagsSection,
  ]
    .filter(Boolean)
    .join('\n\n')
}
