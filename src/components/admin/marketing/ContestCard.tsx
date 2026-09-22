import { toSmallCaps, joinWithConjunction } from '@/lib/utils'
import type { EventMarketingData, AdminEventSponsorRow } from '@/services/eventService'

// Extrapolated from Desserted Island's "Dräkttävling" post (docs/old-work-documents/Social
// Media & Emails), the clearest of the org's real costume-contest posts — sign-up/photo,
// presentation/voting, the 4 standard categories, jury vs. audience choice. Sign-up (doors
// at 19.00) and cutoff (20.45, 15 minutes before Act I at 21.00) match
// EveningScheduleCard.tsx's now-fixed venue times. Prize sponsors come from the same
// sponsorRows SponsorsSalesTableCard.tsx uses (role: 'prize'). Direct feedback 2026-09-22.
export const buildContestText = (
  event: EventMarketingData,
  sponsorRows: AdminEventSponsorRow[]
): string => {
  const titleSmallCaps = toSmallCaps(event.title)
  const prizeSponsorNames = sponsorRows.filter((r) => r.role === 'prize').map((r) => r.sponsor.name)
  const sponsorsSv = prizeSponsorNames.length
    ? joinWithConjunction(prizeSponsorNames, 'och')
    : '[sponsorer]'
  const sponsorsEng = prizeSponsorNames.length
    ? joinWithConjunction(prizeSponsorNames, 'and')
    : '[sponsors]'
  const hashtagsSection = ['#CostumeCompetition', event.hashtags?.trim()].filter(Boolean).join(' ')

  return [
    `🇸🇪 🎭✨ Dräkttävling på ${titleSmallCaps}! ✨🎭\n\nRedo att visa upp din mest fantastiska look? Så här går det till:\n\n✨ Anmälan & Foto: Dörrarna öppnar 𝟏𝟗.𝟎𝟎! Fram till 𝟐𝟎.𝟒𝟓 kan du anmäla dig vid vårt tävlingsbord. Vi tar ett foto av dig för att fånga din look.\n\n✨ Presentation & Röstning: Efter första akten presenterar vi alla tävlande på scen och delar ut en QR-kod till publiken. Rösta på din favorit – röstningen är öppen till slutet av andra akten!\n\n✨ Fyra kategorier: 🏆 Kvällens Tema (huvudpriset!) 🎨 Kreativitet 🌟 Originalitet 🖤 Publikens Val\n\nJuryn väljer vinnare i de tre första kategorierna, medan Publikens Val avgörs genom era röster. Om publikens favorit redan vunnit ett pris går vinsten till nästa person på listan – så vi får fyra unika vinnare!\n\n👉 Prissponsorer: ${sponsorsSv}`,
    `🇬🇧 🎭✨ Costume Contest at ${titleSmallCaps}! ✨🎭\n\nReady to show off your most fabulous look? Here's how it works:\n\n✨ Sign-Up & Photos: Doors open at 𝟏𝟗:𝟎𝟎! Until 𝟐𝟎:𝟒𝟓 you can sign up at our contest table. We'll take a photo to capture your fabulous look.\n\n✨ Presentation & Voting: After the first act, contestants are presented on stage and we'll share a QR code for voting. Vote for your favorite – voting is open until the end of Act 2!\n\n✨ Four Categories: 🏆 Theme of the Night (grand prize!) 🎨 Creativity 🌟 Originality 🖤 Audience Choice\n\nThe jury selects winners in the first three categories, while Audience Choice is decided by your votes. If the audience's favorite has already won, the prize goes to the next highest-voted contestant, so we end up with four unique winners!\n\n👉 Prize sponsors: ${sponsorsEng}`,
    hashtagsSection,
  ]
    .filter(Boolean)
    .join('\n\n')
}
