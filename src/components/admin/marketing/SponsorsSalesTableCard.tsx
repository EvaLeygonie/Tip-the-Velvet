import { toSmallCaps, toHashtag, joinWithConjunction } from '@/lib/utils'
import type { EventMarketingData, AdminEventSponsorRow } from '@/services/eventService'

// Extrapolated from Desserted Island's "Sponsorer" and Creatures of the Night's "Sponsorer
// + lotteri" posts (docs/old-work-documents/Social Media & Emails) — both name the prize
// sponsors and tie them to the costume competition. Sponsor names now come straight from
// the Sponsors tab (getEventSponsorsForAdmin, see AdminMarketing.tsx) instead of a
// placeholder — the prize-sponsor paragraph always runs (the costume competition is a
// fixture), but the sales-table paragraph only appears when someone's actually running one
// this event, same "only mention what applies" pattern as the rest of these templates.
// Direct feedback 2026-09-22.
export const buildSponsorsSalesTableText = (
  event: EventMarketingData,
  sponsorRows: AdminEventSponsorRow[]
): string => {
  const titleSmallCaps = toSmallCaps(event.title)
  const prizeSponsors = sponsorRows.filter((r) => r.role === 'prize')
  const salesSponsors = sponsorRows.filter((r) => r.has_merch_table)
  const exhibitionSponsors = sponsorRows.filter((r) => r.has_exhibition)
  const prizeSponsorNames = prizeSponsors.map((r) => r.sponsor.name)
  const salesSponsorNames = salesSponsors.map((r) => r.sponsor.name)
  const exhibitionSponsorNames = exhibitionSponsors.map((r) => r.sponsor.name)

  const prizeNamesSv = prizeSponsorNames.length
    ? joinWithConjunction(prizeSponsorNames, 'och')
    : '[sponsorer]'
  const prizeNamesEng = prizeSponsorNames.length
    ? joinWithConjunction(prizeSponsorNames, 'and')
    : '[sponsors]'

  const salesBlockSv = salesSponsorNames.length
    ? `\n\nMissa inte heller vårt säljbord på plats med ${joinWithConjunction(salesSponsorNames, 'och')}, där ni kan hitta unika skatter att komplettera er look med!`
    : ''
  const salesBlockEng = salesSponsorNames.length
    ? `\n\nDon't miss our sales table on site with ${joinWithConjunction(salesSponsorNames, 'and')}, with unique treasures to complete your look!`
    : ''

  const exhibitionBlockSv = exhibitionSponsorNames.length
    ? `\n\nHåll även utkik efter ${joinWithConjunction(exhibitionSponsorNames, 'och')}, som ställer ut sitt arbete på plats denna kväll!`
    : ''
  const exhibitionBlockEng = exhibitionSponsorNames.length
    ? `\n\nAlso keep an eye out for ${joinWithConjunction(exhibitionSponsorNames, 'and')}, exhibiting their work on site this evening!`
    : ''

  const sponsorTags = Array.from(
    new Set(
      [...prizeSponsors, ...salesSponsors, ...exhibitionSponsors].map((r) =>
        toHashtag(r.sponsor.name)
      )
    )
  ).join(' ')
  const hashtagsSection = ['#Sponsors', sponsorTags, event.hashtags?.trim()]
    .filter(Boolean)
    .join(' ')

  return [
    `🇸🇪 🎉✨ Våra fantastiska sponsorer & priser! ✨🎉\n\nVi är otroligt glada att presentera våra underbara sponsorer för ${titleSmallCaps}! 🖤 Ett stort tack till ${prizeNamesSv} för de fantastiska priserna till vår kostymtävling – kvällens bäst klädda gäster kommer få ta hem några riktigt fina priser! ✨${salesBlockSv}${exhibitionBlockSv}`,
    `🇬🇧 🎉✨ Our Amazing Sponsors & Prizes! ✨🎉\n\nWe're beyond excited to announce our wonderful sponsors for ${titleSmallCaps}! 🖤 Huge thanks to ${prizeNamesEng} for providing fabulous prizes for our costume contest – the best-dressed guests of the night will take home some truly magical treasures! ✨${salesBlockEng}${exhibitionBlockEng}`,
    hashtagsSection,
  ]
    .filter(Boolean)
    .join('\n\n')
}
