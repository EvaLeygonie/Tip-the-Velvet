import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

type TableName = keyof Database['public']['Tables']

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
