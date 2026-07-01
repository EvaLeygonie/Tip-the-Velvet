export const ImageCategory = {
  PERFORMANCE: 'performance',
  PARTY: 'party',
  EVENT_PROMO: 'event-promo',
  ARTIST_PROMO: 'artist-promo',
  CASTING: 'casting',
  PHOTOBOOTH: 'photobooth',
  SPONSOR: 'sponsor',
  STAGE: 'stage',
  OLD_EVENT: 'old-event',
} as const

export type ImageCategoryType = (typeof ImageCategory)[keyof typeof ImageCategory]
