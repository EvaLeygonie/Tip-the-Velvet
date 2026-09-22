import type { EventMarketingData } from '@/services/eventService'

// Extrapolated from Dark Carnival's "Venue info" and Desserted Island's "Två barer" posts
// (docs/old-work-documents/Social Media & Emails) — both events ran the same practical
// checklist almost word for word (two bars, manned wardrobe, costume contest, photo booth,
// elevator, no confetti/styrofoam), so this keeps that list generic rather than copying one
// event's specific extras verbatim. 2026-09-22.
export const buildVenueRulesText = (event: EventMarketingData): string => {
  const venue = event.location?.trim() || '[lokalen]'
  const hashtagsSection = ['#VenueRules', event.hashtags?.trim()].filter(Boolean).join(' ')

  return [
    `🇸🇪 🎪 ${venue} – Viktig info 🖤\n\n${event.title} närmar sig – här är allt du behöver veta inför kvällen:\n\n🍹 Två barer – kortare köer\n🧥 Bemannad garderob – 30 kr\n🎭 Kostymtävling med jury & publikröstning\n📸 Fotohörna – fånga din look innan showen & under pausen!\n♿ Hiss finns – be om hjälp i entrén\n⚠️ Ingen frigolit, konfetti eller liknande (svårt att städa!)\n🙏 Ställ gärna tomma glas på designerade diskbord så hjälps vi åt att hålla lokalen fin hela kvällen.`,
    `🇬🇧 🎪 ${venue} – Important info 🖤\n\n${event.title} is almost here – here's what you need to know for the night:\n\n🍹 Two bars – shorter lines\n🧥 Manned wardrobe – 30 SEK\n🎭 Costume contest with jury & audience vote\n📸 Photo booth – capture your look before the show & during the break!\n♿ Elevator available – ask for assistance at the entrance\n⚠️ No styrofoam, confetti, or similar items (hard to clean up!)\n🙏 Please place empty glasses on designated dish tables to help us keep the venue lovely all night.`,
    hashtagsSection,
  ]
    .filter(Boolean)
    .join('\n\n')
}
