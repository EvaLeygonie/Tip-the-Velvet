import type { EventMarketingData } from '@/services/eventService'

// Times are Dark Carnival's real schedule (docs/old-work-documents/Social Media & Emails)
// — direct feedback 2026-09-22 that these are the hours the current venue actually runs on,
// not a one-off. Hardcoded rather than derived from anywhere (no per-event run-of-show data
// exists), so this is a starting point to hand-adjust per event, same spirit as the rest of
// these templates. Exported separately from buildEveningScheduleText so
// EveningScheduleReminderCard.tsx (the same schedule, reposted closer to the date) can reuse
// it instead of duplicating the whole block.
export const buildScheduleBlock = (): [string, string] => [
  `𝟏𝟗.𝟎𝟎 – Dörrarna öppnar! Passa på att anmäla er till dräkttävlingen, ta en drink och besök vår fotohörna 📸\n𝟐𝟏.𝟎𝟎 – Showen startar med första akten! Efter första akten presenterar vi alla tävlande på scen.\nca 𝟐𝟐.𝟎𝟎 – Paus & mingel – Rösta på vem ni tycker har kvällens bästa utklädnad! 🎭\nca 𝟐𝟐.𝟑𝟎 – Dags för andra akten! Efter showen blir det prisutdelning för dräkttävlingen ✨\nDärefter – Dansgolvet öppnar! 🎶\n𝟎𝟏.𝟐𝟎 – Baren stänger 𝟎𝟐.𝟎𝟎 – Portarna stängs\n♿ Tillgänglighet: Hiss finns, hör av er till oss vid behov eller be om hjälp i entrén!\n⚠️ OBS! Det är förbjudet att ta med eller ha på sig frigolit, konfetti eller liknande.`,
  `𝟏𝟗:𝟎𝟎 – Doors open! Sign up for the costume contest, grab a drink and swing by our photo corner 📸\n𝟐𝟏:𝟎𝟎 – The show begins with the first act! After the first act, we'll present all the contestants on stage.\n𝟐𝟐:𝟎𝟎-ish – Break & mingling – Don't forget to vote for who you think has the best costume of the night! 🎭\n𝟐𝟐:𝟑𝟎-ish – Time for the second act! After the show, we'll announce the winners of the costume contest ✨\nAfterwards – The dance floor opens! 🎶\n𝟎𝟏:𝟐𝟎 – Bar closes 𝟎𝟐:𝟎𝟎 – Venue closes\n♿ Accessibility: There is an elevator, please contact us if necessary or ask for help at the entrance!\n⚠️ Please note! No styrofoam, confetti, or similar items are allowed.`,
]

export const buildEveningScheduleText = (event: EventMarketingData): string => {
  const [scheduleSv, scheduleEng] = buildScheduleBlock()
  const hashtagsSection = ['#EveningSchedule', event.hashtags?.trim()].filter(Boolean).join(' ')

  return [
    `🇸🇪 Kvällens program för ${event.title}! ✨\n\n${scheduleSv}`,
    `🇬🇧 Tonight's schedule for ${event.title}! ✨\n\n${scheduleEng}`,
    hashtagsSection,
  ]
    .filter(Boolean)
    .join('\n\n')
}
