import type { EventMarketingData } from '@/services/eventService'

// Extrapolated from Desserted Island's "Utvärdering" post (docs/old-work-documents/Social
// Media & Emails) — photos-coming-soon line + a survey link. No survey-link field exists in
// event-marketing data, left as a bracketed placeholder. 2026-09-22.
export const buildEvaluationText = (event: EventMarketingData): string => {
  const hashtagsSection = ['#Feedback', event.hashtags?.trim()].filter(Boolean).join(' ')

  return [
    `🇸🇪 Åh, vilken natt! Bilder från ${event.title} kommer snart att publiceras på våra sociala medier & hemsida, så håll utkik!\n\nVill ni hjälpa oss att göra Tip the Velvet ännu bättre? Svara på vår enkät om festen! 📋 [länk till enkät]`,
    `🇬🇧 Oh, what a night! Pictures from ${event.title} will soon be published on our social media & website, so keep an eye out!\n\nWould you like to help us make Tip the Velvet even better? Answer our survey about the party! 📋 [survey link]`,
    hashtagsSection,
  ]
    .filter(Boolean)
    .join('\n\n')
}
