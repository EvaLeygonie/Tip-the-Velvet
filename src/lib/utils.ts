import heic2any from 'heic2any'
import { supabase } from './supabase'

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME

export const createSlug = (text: string) => {
  return (
    text
      .toLowerCase()
      .trim()
      // Säkra upp de vanligaste accenterna manuellt först
      .replace(/[éèêë]/g, 'e')
      .replace(/[àâäáå]/g, 'a')
      .replace(/[öôóò]/g, 'o')
      .replace(/[üûúù]/g, 'u')
      .replace(/[íìîï]/g, 'i')
      .replace(/[ç]/g, 'c')
      // Din befintliga robusta logik körs efteråt
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ß/g, 'ss')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
  )
}

export const formatInstagramLink = (value: string): string => {
  const clean = value.trim()
  if (!clean) return ''

  if (clean.startsWith('@')) {
    return `https://www.instagram.com/${clean.substring(1)}`
  }

  if (clean.includes('instagram.com')) {
    if (clean.startsWith('http://')) {
      return clean.replace('http://', 'https://')
    }
    if (!clean.startsWith('https://')) {
      return `https://${clean}`
    }
    return clean
  }

  return `https://www.instagram.com/${clean}`
}

export const formatOtherLink = (value: string): string => {
  const clean = value.trim()
  if (!clean) return ''

  if (!/^https?:\/\//i.test(clean)) {
    return `https://${clean}`
  }
  return clean
}

export const buildEventFolderName = (eventTitle: string, eventDate: string) => {
  const date = eventDate.substring(0, 10)
  return `${date} ${eventTitle}`
}

export const getStoragePathFromUrl = (url: string, bucketName = 'artist-files') => {
  if (!url) return ''
  try {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const urlObj = new URL(url)
      const pathSegments = urlObj.pathname.split('/')
      const bucketIndex = pathSegments.indexOf(bucketName)
      if (bucketIndex !== -1) {
        return pathSegments.slice(bucketIndex + 1).join('/')
      }
    }
  } catch (err) {
    console.error('Kunde inte parsa URL:', err)
  }
  return url
}

// Hjälpfunktion för att hämta korrekt offentlig URL från Supabase
export const getPublicFileUrl = (pathOrUrl: string) => {
  if (!pathOrUrl) return ''
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    return pathOrUrl
  }
  const { data } = supabase.storage.from('artist-files').getPublicUrl(pathOrUrl)
  return data.publicUrl
}

export const getImageSrc = (imageId: string) => {
  if (!imageId) return ''
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

export const processUploadedImage = async (file: File): Promise<File> => {
  let processedFile = file

  const isHeic =
    file.type === 'image/heic' || file.type === 'image/heif' || /\.(heic|heif)$/i.test(file.name)

  if (isHeic) {
    try {
      const result = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.9,
      })
      const blob = Array.isArray(result) ? result[0] : result
      const newFileName = file.name.replace(/\.(heic|heif)$/i, '.jpg')
      processedFile = new File([blob], newFileName, { type: 'image/jpeg' })
    } catch (error) {
      console.error('HEIC-konvertering misslyckades:', error)
      throw new Error('Kunde inte läsa bildformatet (HEIC)')
    }
  }

  const FIVE_MB = 5 * 1024 * 1024
  if (processedFile.size > FIVE_MB) {
    try {
      processedFile = await compressImage(processedFile)
    } catch (error) {
      console.warn('Komprimering misslyckades, behåller originalfilen:', error)
    }
  }

  return processedFile
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
