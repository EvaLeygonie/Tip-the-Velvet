import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

type TableName = keyof Database['public']['Tables']

// The two helpers below take any table name, which supabase-js can't type per call; the public
// signatures are fully typed, so the cast stays inside them.

//=== UPDATE ===///
export const updateRow = async <T extends TableName>(
  table: T,
  id: string,
  updatedData: Database['public']['Tables'][T]['Update']
): Promise<Database['public']['Tables'][T]['Row']> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any
  const result = await client.from(table).update(updatedData).eq('id', id).select().single()

  if (result.error) throw result.error
  return result.data
}

//=== DELETE ===///
export const deleteRow = async (table: TableName, id: string): Promise<void> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any
  const result = await client.from(table).delete().eq('id', id)

  if (result.error) throw result.error
}

//=== STORAGE ===///

export const uploadStorageFile = async (
  bucket: string,
  folder: string,
  file: File
): Promise<string> => {
  const fileExt = file.name.split('.').pop()
  const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`

  const { error } = await supabase.storage.from(bucket).upload(fileName, file, { upsert: true })

  if (error) throw error

  return fileName
}

class UploadError extends Error {
  retryable: boolean
  constructor(message: string, retryable: boolean) {
    super(message)
    this.retryable = retryable
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Same as uploadStorageFile, but reports progress (supabase-js can't) so a big file shows a
// percentage instead of a spinner that looks stuck. Goes straight at the Storage REST endpoint
// with the same public key supabase-js uses. Supabase's storage service now and then answers
// 429/500 for a moment when its own connection pool is busy ("too_many_connections"), so those
// (and network drops) are retried a couple of times before giving up.
export const uploadStorageFileWithProgress = async (
  bucket: string,
  folder: string,
  file: File,
  onProgress: (fraction: number) => void
): Promise<string> => {
  const fileExt = file.name.split('.').pop()
  const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  const objectPath = fileName.split('/').map(encodeURIComponent).join('/')
  const url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/${bucket}/${objectPath}`

  const attempt = () =>
    new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', url)
      xhr.setRequestHeader('apikey', key)
      xhr.setRequestHeader('Authorization', `Bearer ${key}`)
      xhr.setRequestHeader('x-upsert', 'true')
      xhr.setRequestHeader('Cache-Control', 'max-age=3600')
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(e.loaded / e.total)
      }
      xhr.onload = () =>
        xhr.status >= 200 && xhr.status < 300
          ? resolve()
          : reject(
              new UploadError(
                `Upload failed (${xhr.status}): ${xhr.responseText}`,
                xhr.status === 429 || xhr.status >= 500
              )
            )
      xhr.onerror = () => reject(new UploadError('Upload failed (network error)', true))
      xhr.send(file)
    })

  const retryDelays = [2000, 6000]
  for (let i = 0; ; i++) {
    try {
      onProgress(0)
      await attempt()
      return fileName
    } catch (err) {
      if (!(err instanceof UploadError) || !err.retryable || i >= retryDelays.length) throw err
      await sleep(retryDelays[i])
    }
  }
}
