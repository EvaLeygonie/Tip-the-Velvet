const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

export interface CloudinaryResource {
  public_id: string
}

//===CREATE===//

// Upload single file
export const uploadToCloudinary = async (
  file: File,
  folder: string,
  slug: string
): Promise<string> => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', folder)
  formData.append('tags', slug)

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) throw new Error('Uppladdning misslyckades')
  const data = await res.json()
  return data.public_id
}

// Sync event images from Cloudinary to Supabase via edge function
//! Probably useless now
export const syncImagesFromCloudinary = async (
  accessToken: string,
  eventSlug: string,
  ids: { old_event_id: string } | { event_id: string }
): Promise<{ total: number; inserted: number; skipped: number }> => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/import-cloudinary-album`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      ...ids,
      event_slug: eventSlug,
      kind: 'tag',
      value: eventSlug,
    }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Synkning misslyckades')
  }
  return res.json()
}

//===DELETE===//

// Via Supabase edge function
export const deleteFromCloudinary = async (
  publicId: string,
  accessToken: string
): Promise<void> => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/cloudinary-delete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ public_id: publicId }),
  })
  if (!res.ok) throw new Error('Radering misslyckades')
}
