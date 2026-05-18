import { supabase } from '@/lib/supabase'

//=== UPDATE ===///

export const updateRecord = async (
  table: string,
  id: string,
  updatedData: Record<string, unknown>
) => {
  const { data, error } = await supabase
    .from(table)
    .update(updatedData)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

//=== DELETE ===///

export const deleteRecord = async (id: string, table: string) => {
  const { error } = await supabase.from(table).delete().eq('id', id)

  if (error) throw error
}
