import type { EventMarketingData } from '@/services/eventService'

// Extrapolated from Desserted Island's/Dark Carnival's/Creatures of the Night's "Fotohörna"
// posts (docs/old-work-documents/Social Media & Emails). All three docs happened to credit
// HardisPhoto, but that was just this event's assigned photographer at the time, not a
// fixed org partner — credits whoever's actually assigned to this event
// (events.photographer_id, see getEventMarketingData) instead, name + Instagram tag when
// both exist. Direct feedback 2026-09-22.
export const buildPhotoCornerText = (event: EventMarketingData): string => {
  const photographerCredit = event.photographer
    ? [event.photographer.name, event.photographer.instagramHandle].filter(Boolean).join(' ')
    : '[fotograf]'
  const hashtagsSection = ['#PhotoBooth', event.hashtags?.trim()].filter(Boolean).join(' ')

  return [
    `🇸🇪 📸 Fotohörna! 📸\n\nVi är glada att ha fantastiska ${photographerCredit} på plats för att fånga era looks! Fotohörnan är öppen innan första akten samt under pausen mellan akterna.\n\nKom och posera – och ta med dig ett minne från kvällen! ✨`,
    `🇬🇧 📸 Photo Booth! 📸\n\nWe're thrilled to have the amazing ${photographerCredit} on site to capture your looks! The Photo Booth is open before the first act and during the intermission.\n\nCome strike a pose and take home a memory from the night! ✨`,
    hashtagsSection,
  ]
    .filter(Boolean)
    .join('\n\n')
}
