const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

export interface CloudinaryPublicId {
  public_id: string
}

//===READ===//

export const getCloudinaryImagesByTag = async (tag: string) => {
  const response = await fetch(`https://res.cloudinary.com/${CLOUD_NAME}/image/list/${tag}.json`)

  if (!response.ok) throw new Error('Hämtning av bilder misslyckades')

  const data = await response.json()
  return data.resources.map((img: CloudinaryPublicId) => img.public_id)
}

//===CREATE===//

export const uploadToCloudinary = async (file: File, folder: string, tag: string) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', folder)
  formData.append('tags', tag)

  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) throw new Error('Uppladdning misslyckades')

  const data = await response.json()
  return data.public_id
}

export const syncOldEventImages = async (
  oldEventId: string,
  eventSlug: string,
  accessToken: string
) => {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-cloudinary-album`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        old_event_id: oldEventId,
        event_slug: eventSlug,
        kind: 'tag',
        value: eventSlug,
      }),
    }
  )

  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error || 'Synkning misslyckades')
  }

  return await response.json() // total, inserted, skipped
}

//===UPDATE===//

//===DELETE===//

export const deleteFromCloudinary = async (publicId: string) => {
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/image/upload?public_ids[]=${publicId}`,
    { method: 'DELETE' }
  )

  if (!response.ok) throw new Error('Radering misslyckades')
}
