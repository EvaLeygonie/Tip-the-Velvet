import type { EventMarketingData } from '@/services/eventService'
import { feedbackLink } from '@/services/feedbackService'

// Extrapolated from Desserted Island's "Utvärdering" post (docs/old-work-documents/Social
// Media & Emails) — photos-coming-soon line + a link to the event's feedback page on our own
// site (/events/event/<slug>/feedback, replacing the Google survey). The link only works once
// feedback is switched on for the event on /admin/feedback. 2026-10-26.
export const buildEvaluationText = (event: EventMarketingData): string => {
  const feedbackUrl = feedbackLink(event.slug)
  const hashtagsSection = ['#Feedback', event.hashtags?.trim()].filter(Boolean).join(' ')

  return [
    `🇸🇪 Åh, vilken natt! Bilder från ${event.title} kommer snart att publiceras på våra sociala medier & hemsida, så håll utkik!\n\nVill ni hjälpa oss att göra Tip the Velvet ännu bättre? Berätta vad ni tyckte om festen, det tar bara en minut! ⭐ ${feedbackUrl}`,
    `🇬🇧 Oh, what a night! Pictures from ${event.title} will soon be published on our social media & website, so keep an eye out!\n\nWould you like to help us make Tip the Velvet even better? Tell us what you thought of the party, it only takes a minute! ⭐ ${feedbackUrl}`,
    hashtagsSection,
  ]
    .filter(Boolean)
    .join('\n\n')
}
