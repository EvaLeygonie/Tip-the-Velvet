import type { EventMarketingData } from '@/services/eventService'

// "The photos are up" post, reused for each batch from the photographer (photobooth first,
// then mingle and the show) — the board edits the intro line per batch. Credits the event's
// own photographer (events.photographer_id) as an Instagram tag when they have one, and lists
// the Facebook album and the photobooth link only when they exist. The photobooth link is the
// full set (every guest gets ~5 shots, too many for the Facebook album), so the post says so.
export const buildPhotosSharedText = (event: EventMarketingData): string => {
  const photographerRef = event.photographer?.instagramHandle || event.photographer?.name || null
  const hashtagsSection = ['#Photos', event.hashtags?.trim()].filter(Boolean).join(' ')

  const linksSv = [
    event.fbAlbumUrl && `📘 Facebook-album: ${event.fbAlbumUrl}`,
    event.photoboothUrl && `📸 Alla fotohörnebilder: ${event.photoboothUrl}`,
  ].filter(Boolean)
  const linksEng = [
    event.fbAlbumUrl && `📘 Facebook album: ${event.fbAlbumUrl}`,
    event.photoboothUrl && `📸 All photobooth photos: ${event.photoboothUrl}`,
  ].filter(Boolean)

  const photoboothSv = event.photoboothUrl
    ? '\n\nI fotohörnan fick alla 5 bilder – hitta och hämta alla dina där! 💛'
    : ''
  const photoboothEng = event.photoboothUrl
    ? '\n\nEveryone in the photobooth got 5 photos – find and download all of yours there! 💛'
    : ''
  const credit = (fallback: string) => photographerRef ?? fallback

  return [
    `🇸🇪 📸 Bilderna från ${event.title} är här! Tack ${credit('fotografen')} för fantastiska bilder!${photoboothSv}`,
    linksSv.join('\n'),
    `🇬🇧 📸 The photos from ${event.title} are here! Thank you ${credit('to the photographer')} for the amazing shots!${photoboothEng}`,
    linksEng.join('\n'),
    hashtagsSection,
  ]
    .filter(Boolean)
    .join('\n\n')
}
