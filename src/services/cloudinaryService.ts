const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

export interface CloudinaryResource {
  public_id: string
}

//=== READ ===///

export const getCloudinaryImagesByTag = async (tag: string) => {
  const response = await fetch(`https://res.cloudinary.com/${CLOUD_NAME}/image/list/${tag}.json`)

  if (!response.ok) throw new Error('Hämtning av bilder misslyckades')

  const data = await response.json()
  return data.resources.map((img: CloudinaryResource) => img.public_id)
}

//===CREATE===//

// Upload single file
export const uploadToCloudinary = async (
  file: File,
  folder: string,
  tags: string[]
): Promise<string> => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', folder)
  formData.append('tags', tags.join(','))

  console.log('Uploading to Cloudinary:', {
    cloudName: CLOUD_NAME,
    uploadPreset: UPLOAD_PRESET,
    folder,
    tags,
    fileName: file.name,
    fileSize: file.size,
  })

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) throw new Error('Uppladdning misslyckades')
  const data = await res.json()
  return data.public_id
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
