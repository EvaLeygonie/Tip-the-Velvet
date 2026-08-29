import { toSmallCaps, formatSocialDateLine } from '@/lib/utils'
import type { EventMarketingData } from '@/services/eventService'

// Text-only — the org's real example has no separate image (Pinterest itself is the
// image-heavy destination). Uses events.pinterest_link (already a field, set in
// EventEditor.tsx's "Fler detaljer" section) for the board link.
export const buildPinterestBoardText = (event: EventMarketingData): string => {
  const titleSmallCaps = toSmallCaps(event.title)
  const dateVenue = event.eventStart
    ? `🎪 ${formatSocialDateLine(event.eventStart, 'eng')}\n📍 ${event.location ?? ''}`
    : ''

  return [
    `🇸🇪 I väntan på vårt nästa event, ${titleSmallCaps}, så finns ju gott om tid att planera en fängslande outfit!\n\nVad inspirerar dig? Musik, färger, ädelstenar, böcker, filmer, en specifik accessoar…? Kommentera nedan! Vill vill veta vad som inspirerar er! ✨`,
    `🇬🇧 As we wait for our next event, ${titleSmallCaps}, there's plenty of time to plan a captivating outfit!\n\nWhat inspires you? Music, colours, gemstones, books, movies, a specific accessory…? Comment below! We want to know what inspires you! ✨`,
    `${titleSmallCaps}\n${dateVenue}`,
    event.pinterestLink ? `✨ Pinterest inspiration: ${event.pinterestLink}` : null,
  ]
    .filter(Boolean)
    .join('\n\n')
}
