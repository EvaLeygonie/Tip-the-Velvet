export const createSlug = (text: string) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const getImageSrc = (imageId: string, CLOUD_NAME: string) => {
  if (imageId.startsWith('blob:') || imageId.startsWith('http')) return imageId
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${imageId}`
}

export const formatDate = (dateString: string | null) => {
  if (!dateString) return 'TBA'
  const date = new Date(dateString)
  return date.toLocaleDateString('sv-SE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

const TZ = 'Europe/Stockholm'

export const utcToLocal = (utcString: string): string => {
  const date = new Date(utcString)

  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(date)
    .replace(' ', 'T')
    .substring(0, 16)
}

export const localToUtc = (localString: string): string => {
  const [datePart, timePart] = localString.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hours, minutes] = timePart.split(':').map(Number)

  const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes))

  const stockholmParts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(utcDate)

  const p = Object.fromEntries(stockholmParts.map(({ type, value }) => [type, Number(value)]))
  const stockholmAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute)
  const offsetMs = stockholmAsUtc - utcDate.getTime()

  return new Date(utcDate.getTime() - offsetMs).toISOString()
}
