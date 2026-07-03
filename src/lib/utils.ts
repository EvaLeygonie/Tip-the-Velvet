const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME

export const createSlug = (text: string) => {
  return (
    text
      .toLowerCase()
      .trim()
      // 1. Bryt upp accenter och umlauts (t.ex. 'ä' blir 'a' + '¨')
      .normalize('NFD')
      // 2. Ta bort själva accent-plupparna (\u0300 till \u036f)
      .replace(/[\u0300-\u036f]/g, '')
      // 3. Ersätt tyska dubbel-s (ß) om det skulle dyka upp till 'ss'
      .replace(/ß/g, 'ss')
      // 4. Ta bort allt som inte är a-z, 0-9, mellanslag eller bindestreck
      .replace(/[^a-z0-9\s-]/g, '')
      // 5. Gör om mellanslag och understreck till enkla bindestreck
      .replace(/[\s_-]+/g, '-')
      // 6. Trimma bort eventuella bindestreck i början eller slutet
      .replace(/^-+|-+$/g, '')
  )
}

export const buildEventFolderName = (eventTitle: string, eventDate: string) => {
  const date = eventDate.substring(0, 10)
  return `${date} ${eventTitle}`
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

export const formatDate = (language: string, dateString: string | null) => {
  if (!dateString) return 'TBA'
  const date = new Date(dateString)
  return date.toLocaleDateString(language === 'sv' ? 'sv-SE' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export const formatDateTime = (language: string, dateStr: string | null) => {
  if (!dateStr) return 'TBA'
  const date = new Date(dateStr)
  return date.toLocaleDateString(language === 'sv' ? 'sv-SE' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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
