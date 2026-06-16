import { supabase } from '@/lib/supabase'
import type { Performer, PublicPerformer, CreatePerformerInput } from '@/types/types'
import { deleteFromCloudinary } from './cloudinaryService'
import { updateRow } from './databaseService'

//=== READ ===///

export const fetchPerformers = async (
  isAdmin: boolean
): Promise<(Performer | PublicPerformer)[]> => {
  if (isAdmin) {
    const { data, error } = await supabase
      .from('performers')
      .select('*')
      .order('performer_name', { ascending: true })

    if (error) throw error
    return data as Performer[]
  } else {
    const { data, error } = await supabase
      .from('public_performers')
      .select('*')
      .order('performer_name', { ascending: true })

    if (error) throw error
    return data as PublicPerformer[]
  }
}

export const fetchPerformerBySlug = async (
  slug: string,
  isAdmin: boolean
): Promise<Performer | PublicPerformer> => {
  if (isAdmin) {
    const { data, error } = await supabase.from('performers').select('*').eq('slug', slug).single()

    if (error) throw error
    return data as Performer
  } else {
    const { data, error } = await supabase
      .from('public_performers')
      .select('*')
      .eq('slug', slug)
      .single()

    if (error) throw error
    return data as PublicPerformer
  }
}

//=== CREATE ===//

export const submitArtistInfo = async (application: CreatePerformerInput): Promise<void> => {
  const { error } = await supabase.from('performers').insert(application)

  if (error) throw error
}

//=== UPDATE ===///

export const updatePerformer = (id: string, updatedData: Partial<CreatePerformerInput>) =>
  updateRow('performers', id, updatedData as Record<string, unknown>)

export const togglePerformerVisibility = (id: string, isApproved: boolean) =>
  updateRow('performers', id, { is_approved: isApproved })

//=== DELETE ===///

export const deletePerformer = async (performerId: string, promoImageId: string) => {
  const { error } = await supabase.from('performers').delete().eq('id', performerId)
  if (error) throw error

  await deleteFromCloudinary(promoImageId)
}
