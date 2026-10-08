import { supabase } from '@/lib/supabase'
import type { MissingInfoPerson, MissingItem } from '@/lib/missingInfo'

// Append-only log of "we chased this person for this item" — the Dashboard's missing-info
// panel shows "reminded 3 days ago" from it so the board doesn't nag the same person twice
// by accident. Never cleared: once the info is in, the person simply stops appearing.

export interface InfoReminder {
  performer_id: string | null
  staff_id: string | null
  item: MissingItem
  reminded_at: string
}

export const getInfoReminders = async (eventId: string): Promise<InfoReminder[]> => {
  const { data, error } = await supabase
    .from('info_reminders')
    .select('performer_id, staff_id, item, reminded_at')
    .eq('event_id', eventId)
    .order('reminded_at', { ascending: false })

  if (error) throw error
  return (data || []) as InfoReminder[]
}

export const logInfoReminders = async (
  eventId: string,
  people: Pick<MissingInfoPerson, 'performerId' | 'staffId' | 'items'>[]
): Promise<void> => {
  const rows = people.flatMap((p) =>
    p.items.map((item) => ({
      event_id: eventId,
      performer_id: p.performerId ?? null,
      staff_id: p.staffId ?? null,
      item,
    }))
  )
  if (rows.length === 0) return
  const { error } = await supabase.from('info_reminders').insert(rows)
  if (error) throw error
}
