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

  const localDate = new Date(Date.UTC(year, month - 1, day, hours, minutes))
  const offsetMs =
    localDate.getTime() -
    new Date(
      new Intl.DateTimeFormat('en-US', {
        timeZone: TZ,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false,
      })
        .format(localDate)
        .replace(/(\d+)\/(\d+)\/(\d+),\s(\d+):(\d+):(\d+)/, '$3-$1-$2T$4:$5:$6')
    ).getTime()

  return new Date(localDate.getTime() + offsetMs).toISOString()
}
