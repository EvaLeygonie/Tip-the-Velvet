export const ImageCategory = {
  PERFORMANCE: 'performance',
  PARTY: 'party',
  PROMO: 'promo',
  CASTING: 'casting',
  PHOTOBOOTH: 'photobooth',
  SPONSOR: 'sponsor',
  STAGE: 'stage',
} as const

export type ImageCategoryType = (typeof ImageCategory)[keyof typeof ImageCategory]
