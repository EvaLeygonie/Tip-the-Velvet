const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME

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

export const getImageSrc = (imageId: string) => {
  if (imageId.startsWith('blob:') || imageId.startsWith('http')) return imageId
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${imageId}`
}

export const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.src = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(img.src)

      const maxWidth = 2000
      let width = img.width
      let height = img.height

      if (width > maxWidth) {
        height = (maxWidth / width) * height
        width = maxWidth
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      ctx?.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('Kunde inte göra bilden mindre'))
          resolve(new File([blob], file.name, { type: 'image/jpeg' }))
        },
        'image/jpeg',
        0.85
      )
    }
    img.onerror = reject
  })
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
