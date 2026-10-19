import { supabase } from '@/lib/supabase'

// The Dashboard's "To print" checklist. Standard rows (print_standard_items) apply to every
// event; event_print_items holds one event's ticked state, its own custom rows, and any standard
// row removed for that event only. A new event has no rows there, so it starts unticked.

export interface PrintRow {
  // Key for React and for ticking: the event_print_items id when one exists, else the standard id.
  key: string
  standardId: string | null
  // event_print_items id — null for a standard row nobody has touched for this event yet.
  stateId: string | null
  label: string
  done: boolean
  // Printed by a print shop (true) or by us (false).
  professional: boolean
  // Number of copies to print.
  copies: number
}

export const getPrintRows = async (eventId: string): Promise<PrintRow[]> => {
  const [standards, states] = await Promise.all([
    supabase.from('print_standard_items').select('*').order('sort_order').order('created_at'),
    supabase
      .from('event_print_items')
      .select('*')
      .eq('event_id', eventId)
      .order('sort_order')
      .order('created_at'),
  ])
  if (standards.error) throw standards.error
  if (states.error) throw states.error

  const stateByStandard = new Map(
    (states.data ?? []).filter((s) => s.standard_id).map((s) => [s.standard_id as string, s])
  )
  const rows: PrintRow[] = []
  for (const std of standards.data ?? []) {
    const state = stateByStandard.get(std.id)
    if (state?.hidden) continue
    rows.push({
      key: state?.id ?? std.id,
      standardId: std.id,
      stateId: state?.id ?? null,
      label: std.label,
      done: state?.done ?? false,
      professional: state?.professional ?? std.professional,
      copies: state?.copies ?? std.copies,
    })
  }
  for (const custom of (states.data ?? []).filter((s) => !s.standard_id)) {
    rows.push({
      key: custom.id,
      standardId: null,
      stateId: custom.id,
      label: custom.label ?? '',
      done: custom.done,
      professional: custom.professional ?? false,
      copies: custom.copies ?? 1,
    })
  }
  return rows
}

// This event's own choice — a standard row's default is left alone, since the workflow can vary.
export const setPrintRowProfessional = async (
  eventId: string,
  row: PrintRow,
  professional: boolean
) => {
  if (row.stateId) {
    const { error } = await supabase
      .from('event_print_items')
      .update({ professional })
      .eq('id', row.stateId)
    if (error) throw error
    return
  }
  const { error } = await supabase
    .from('event_print_items')
    .insert({ event_id: eventId, standard_id: row.standardId, professional })
  if (error) throw error
}

export const setPrintRowCopies = async (eventId: string, row: PrintRow, copies: number) => {
  const value = Math.max(1, Math.round(copies) || 1)
  if (row.stateId) {
    const { error } = await supabase
      .from('event_print_items')
      .update({ copies: value })
      .eq('id', row.stateId)
    if (error) throw error
    return
  }
  const { error } = await supabase
    .from('event_print_items')
    .insert({ event_id: eventId, standard_id: row.standardId, copies: value })
  if (error) throw error
}

export const setPrintRowDone = async (eventId: string, row: PrintRow, done: boolean) => {
  if (row.stateId) {
    const { error } = await supabase
      .from('event_print_items')
      .update({ done })
      .eq('id', row.stateId)
    if (error) throw error
    return
  }
  const { error } = await supabase
    .from('event_print_items')
    .insert({ event_id: eventId, standard_id: row.standardId, done })
  if (error) throw error
}

// A custom row for this event only, or — with makeStandard — a new standard row for every event.
export const addPrintRow = async (
  eventId: string,
  label: string,
  makeStandard: boolean,
  professional: boolean,
  copies: number
) => {
  if (makeStandard) {
    const { error } = await supabase
      .from('print_standard_items')
      .insert({ label, professional, copies, sort_order: 1000 })
    if (error) throw error
    return
  }
  const { error } = await supabase.from('event_print_items').insert({
    event_id: eventId,
    label,
    professional,
    copies,
    sort_order: 1000,
  })
  if (error) throw error
}

// "This event only": a custom row is simply deleted; a standard row is hidden for the event.
export const removePrintRowForEvent = async (eventId: string, row: PrintRow) => {
  if (!row.standardId) {
    const { error } = await supabase.from('event_print_items').delete().eq('id', row.stateId!)
    if (error) throw error
    return
  }
  if (row.stateId) {
    const { error } = await supabase
      .from('event_print_items')
      .update({ hidden: true })
      .eq('id', row.stateId)
    if (error) throw error
    return
  }
  const { error } = await supabase
    .from('event_print_items')
    .insert({ event_id: eventId, standard_id: row.standardId, hidden: true })
  if (error) throw error
}

// From the standards for good (all events); the per-event state rows go with it.
export const deletePrintStandard = async (standardId: string) => {
  const { error } = await supabase.from('print_standard_items').delete().eq('id', standardId)
  if (error) throw error
}

// Manual reset: untick everything for this event.
export const resetPrintRows = async (eventId: string) => {
  const { error } = await supabase
    .from('event_print_items')
    .update({ done: false })
    .eq('event_id', eventId)
  if (error) throw error
}

// The standard row's own text — changes it for every event.
export const renamePrintStandard = async (standardId: string, label: string) => {
  const { error } = await supabase
    .from('print_standard_items')
    .update({ label })
    .eq('id', standardId)
  if (error) throw error
}

// The edit modal. "Repeats on all events" decides where a change goes:
//  - on a standard row, ticked: the standard itself changes (text, copies, printing) for every
//    event, and this event's own overrides are cleared so it follows the standard again;
//  - on a standard row, unticked: this event only — copies and printing become this event's own
//    choice, and a different text turns it into a one-off row for this event;
//  - on a custom row: updated in place, or turned into a standard row when ticked.
export const updatePrintRow = async (
  eventId: string,
  row: PrintRow,
  next: { label: string; copies: number; professional: boolean; repeats: boolean }
) => {
  const { label, copies, professional } = next
  if (!row.standardId) {
    if (next.repeats) {
      await promotePrintRowToStandard(eventId, row, { label, copies, professional })
      return
    }
    const { error } = await supabase
      .from('event_print_items')
      .update({ label, copies, professional })
      .eq('id', row.stateId!)
    if (error) throw error
    return
  }

  if (next.repeats) {
    const { error } = await supabase
      .from('print_standard_items')
      .update({ label, copies, professional })
      .eq('id', row.standardId)
    if (error) throw error
    if (row.stateId) {
      const { error: clearError } = await supabase
        .from('event_print_items')
        .update({ copies: null, professional: null })
        .eq('id', row.stateId)
      if (clearError) throw clearError
    }
    return
  }

  if (label !== row.label) {
    // A different text can't be per event on a shared row: hide the standard row here and add
    // a one-off row with the new text instead.
    await removePrintRowForEvent(eventId, row)
    const { error } = await supabase.from('event_print_items').insert({
      event_id: eventId,
      label,
      copies,
      professional,
      done: row.done,
      sort_order: 1000,
    })
    if (error) throw error
    return
  }
  if (row.stateId) {
    const { error } = await supabase
      .from('event_print_items')
      .update({ copies, professional })
      .eq('id', row.stateId)
    if (error) throw error
    return
  }
  const { error } = await supabase
    .from('event_print_items')
    .insert({ event_id: eventId, standard_id: row.standardId, copies, professional })
  if (error) throw error
}

// A custom row turned into a standard row ("repeats on all events"): a new standard row with the
// same text and settings, this event's tick carried over, and the custom row removed.
export const promotePrintRowToStandard = async (
  eventId: string,
  row: PrintRow,
  next: { label: string; copies: number; professional: boolean }
) => {
  const { data, error } = await supabase
    .from('print_standard_items')
    .insert({ ...next, sort_order: 1000 })
    .select('id')
    .single()
  if (error) throw error
  const { error: stateError } = await supabase
    .from('event_print_items')
    .insert({ event_id: eventId, standard_id: data.id, done: row.done })
  if (stateError) throw stateError
  if (row.stateId) {
    const { error: deleteError } = await supabase
      .from('event_print_items')
      .delete()
      .eq('id', row.stateId)
    if (deleteError) throw deleteError
  }
}
