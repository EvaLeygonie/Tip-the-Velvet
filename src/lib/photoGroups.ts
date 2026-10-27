// The three filters on an event's photos. A photo's stored category (ImageCategory) is grouped:
// performance and stage shots both belong under Stage, party under Mingle. Photos with no category
// belong to no group and only show under "All".
export type PhotoGroup = 'stage' | 'mingle' | 'photobooth'

export const PHOTO_GROUPS: { key: PhotoGroup; sv: string; eng: string }[] = [
  { key: 'stage', sv: 'Scen', eng: 'Stage' },
  { key: 'mingle', sv: 'Mingel', eng: 'Mingle' },
  { key: 'photobooth', sv: 'Fotohörna', eng: 'Photobooth' },
]

export const photoGroup = (category: string | null | undefined): string | null => {
  switch (category) {
    case 'performance':
    case 'stage':
      return 'stage'
    case 'party':
      return 'party'
    case 'photobooth':
      return 'photobooth'
    default:
      return null
  }
}

// Same grouping but with the public filter's key names.
export const publicPhotoGroup = (category: string | null | undefined): PhotoGroup | null => {
  const group = photoGroup(category)
  return group === 'party' ? 'mingle' : (group as PhotoGroup | null)
}
