import { useState } from 'react'
import { toast } from 'sonner'
import { uploadToCloudinary } from '@/services/cloudinaryService'

interface UseCloudinaryUploadOptions {
  genericErrorMessage: string
  // Formulär som vill särskilja "redan skickad ansökan"-fel (t.ex. CastingForm) hanterar
  // sin egen toast här. Övriga lämnar den odefinierad och får det generiska felmeddelandet.
  onDuplicateError?: (message: string) => void
}

export const useCloudinaryUpload = () => {
  const [uploading, setUploading] = useState(false)

  const upload = async (
    file: File,
    folder: string,
    tags: string[],
    publicId: string | undefined,
    context: Record<string, string> | undefined,
    options: UseCloudinaryUploadOptions
  ): Promise<string | null> => {
    setUploading(true)
    try {
      return await uploadToCloudinary(file, folder, tags, publicId, context)
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      const isDuplicate = message.includes('exists') || message.includes('already')

      if (isDuplicate && options.onDuplicateError) {
        options.onDuplicateError(message)
      } else {
        toast.error(options.genericErrorMessage)
        console.error(err)
      }
      return null
    } finally {
      setUploading(false)
    }
  }

  return { uploading, upload }
}
