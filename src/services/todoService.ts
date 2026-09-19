import { supabase } from '@/lib/supabase'
import type { Todo, CreateTodoInput } from '@/types/types'

// Org-wide tasks (e.g. "print a banner", "do our taxes") have event_id: null; per-event
// tasks (e.g. "pick up prize from Bouvardia") carry the event's id. One table, one shape —
// the Dashboard splits them into two lists purely by filtering on that one field.
export const getTodos = async (): Promise<Todo[]> => {
  const { data, error } = await supabase
    .from('todos')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

// display_order only means anything for tasks with no due_date — a task with a deadline
// always sorts by that date (no arrows, nothing to override); tasks with none form their own
// manually-orderable group underneath, since mixing "sorted by date" and "sorted by hand" in
// one list made moving a dated item look wrong (its visible date no longer matched its
// position). Direct feedback, 2026-09-20. The Dashboard computes the actual order value
// (append-to-end of the dateless group) since that needs to see sibling rows.
export const createTodo = async (input: CreateTodoInput): Promise<Todo> => {
  const { data, error } = await supabase.from('todos').insert(input).select().single()

  if (error) throw error
  return data
}

export const setTodoDone = async (id: string, isDone: boolean): Promise<void> => {
  const { error } = await supabase.from('todos').update({ is_done: isDone }).eq('id', id)

  if (error) throw error
}

// General-purpose update — used both by the inline per-row date picker (due_date, plus a new
// display_order whenever the date is being cleared back into the dateless group) and by the
// edit modal (title/due_date/details together).
export const updateTodo = async (
  id: string,
  patch: Partial<Pick<Todo, 'title' | 'due_date' | 'details' | 'display_order'>>
): Promise<void> => {
  const { error } = await supabase.from('todos').update(patch).eq('id', id)

  if (error) throw error
}

// The up/down arrows' one write — a plain value swap between two adjacent rows, same shape
// as updatePerformerActOrder on the Show Planning tab. Only ever called among the dateless
// group.
export const setTodoOrder = async (id: string, displayOrder: number): Promise<void> => {
  const { error } = await supabase.from('todos').update({ display_order: displayOrder }).eq('id', id)

  if (error) throw error
}

export const deleteTodo = async (id: string): Promise<void> => {
  const { error } = await supabase.from('todos').delete().eq('id', id)

  if (error) throw error
}
