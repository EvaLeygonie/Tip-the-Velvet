import { supabase } from '@/lib/supabase'

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

//=== READ ===///

export interface CloudinaryImageResult {
  public_id: string
  context?: {
    custom?: {
      photographer?: string
    }
    photographer?: string
  }
}

export const getCloudinaryImagesByTag = async (
  tag: string,
  folder: string
): Promise<CloudinaryImageResult[]> => {
  const { data, error } = await supabase.functions.invoke('get-images-by-tag', {
    body: { tag, folder },
  })

  if (error) {
    console.error('Fel vid hämtning från Edge Function:', error)
    throw new Error('Hämtning av bilder misslyckades')
  }

  return data.images || []
}

//=== CREATE ===//

export const uploadToCloudinary = async (
  file: File,
  folder: string,
  tags: string[],
  publicId?: string,
  context?: Record<string, string>
): Promise<string> => {
  const formData = new FormData()

  let cleanFileName = file.name
  if (/\.(jpg|jpeg|png|webp|heic)\.(jpg|jpeg|png|webp|heic)$/i.test(cleanFileName)) {
    cleanFileName = cleanFileName.replace(/\.[^/.]+$/, '')
  }

  const cleanFile = new File([file], cleanFileName, { type: file.type })

  formData.append('file', cleanFile)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', folder)
  formData.append('tags', tags.join(','))

  if (publicId) formData.append('public_id', publicId)

  if (context) {
    const contextString = Object.entries(context)
      .map(([key, val]) => {
        const cleanVal = String(val).replace(/[|=,]/g, '')
        return `${key}=${cleanVal}`
      })
      .join('|')
    formData.append('context', contextString)
  }

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const errorData = await res.json()
    console.error('Cloudinary API Error:', errorData)
    throw new Error(errorData.error?.message || 'Uppladdning misslyckades')
  }

  const data = await res.json()
  return data.public_id
}

//=== DELETE ===//

export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('Not logged in')

  const { error } = await supabase.functions.invoke('cloudinary-delete', {
    body: { public_id: publicId },
  })

  if (error) throw new Error('Radering misslyckades')
}
