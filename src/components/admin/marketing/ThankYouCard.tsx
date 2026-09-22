import type { EventMarketingData } from '@/services/eventService'

// Extrapolated from Desserted Island's "Tack!!" post (docs/old-work-documents/Social Media
// & Emails) — kept to the generic opening line, since the real posts go on to thank named
// individuals (photographer, DJ, sound/light tech, specific vendors) that aren't event-
// marketing data and vary every time; the board fills those in by hand. 2026-09-22.
export const buildThankYouText = (event: EventMarketingData): string => {
  const hashtagsSection = ['#ThankYou', event.hashtags?.trim()].filter(Boolean).join(' ')

  return [
    `🇸🇪 Tack till alla som var med och gjorde ${event.title} till en kväll att minnas! Vi ser fram emot att se er igen snart! 🖤`,
    `🇬🇧 Thank you to everyone who made ${event.title} a night to remember! We look forward to seeing you again soon! 🖤`,
    hashtagsSection,
  ]
    .filter(Boolean)
    .join('\n\n')
}
