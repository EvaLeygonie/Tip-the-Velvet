import { supabase } from '@/lib/supabase'
import type { VipManualEntry, CreateVipManualEntryInput } from '@/types/types'

// Entries the VIP list can't derive from any other table — ticket/contest winners and any
// other one-off addition (e.g. a rare staff/volunteer +1, per the board's own call: those
// stay manual rather than adding plus-one columns to event_staff_volunteers).
export const getVipManualEntries = async (eventId: string): Promise<VipManualEntry[]> => {
  const { data, error } = await supabase
    .from('vip_manual_entries')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at')

  if (error) throw error
  return data || []
}

export const createVipManualEntry = async (
  input: CreateVipManualEntryInput
): Promise<VipManualEntry> => {
  const { data, error } = await supabase
    .from('vip_manual_entries')
    .insert(input)
    .select()
    .single()

  if (error) throw error
  return data
}
