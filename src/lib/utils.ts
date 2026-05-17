export const createSlug = (text: string) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const buildEventFolderName = (
  isOldEvent: boolean,
  eventTitle: string,
  eventDate: string
) => {
  const base = isOldEvent ? 'Old Events' : 'Events'
  const date = eventDate.substring(0, 10)
  return `${base}/${date} ${eventTitle}`
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

export const utcToLocal = (utcString: string): string => {
  if (!utcString) return ''
  const date = new Date(utcString)
  const offset = date.getTimezoneOffset() * 60000
  const localIso = new Date(date.getTime() - offset).toISOString()
  return localIso.substring(0, 16)
}

export const localToUtc = (localString: string): string => {
  if (!localString) return ''
  return new Date(localString).toISOString()
}

export const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      let { width, height } = img

      // Scale down if needed
      const maxPx = 4000
      if (width > maxPx || height > maxPx) {
        const ratio = Math.min(maxPx / width, maxPx / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      canvas.width = width
      canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('Compression failed'))
          resolve(new File([blob], file.name, { type: 'image/jpeg' }))
        },
        'image/jpeg',
        0.85 // quality 85% — good balance of size and quality
      )
    }
    img.onerror = reject
    img.src = url
  })
}
