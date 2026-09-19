import { useState } from 'react'
import { Plus, X, Pencil, Calendar, ChevronsUp, ChevronsDown } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { TodoModal } from './TodoModal'
import type { Todo } from '@/types/types'

interface TodoListCardProps {
  title: string
  todos: Todo[]
  onAdd: (title: string, dueDate: string | null, details: string | null) => Promise<void>
  onEdit: (id: string, title: string, dueDate: string | null, details: string | null) => Promise<void>
  onToggle: (id: string, isDone: boolean) => Promise<void>
  onSetDueDate: (id: string, dueDate: string | null) => Promise<void>
  onMoveUp: (id: string) => void
  onMoveDown: (id: string) => void
  onDelete: (id: string) => Promise<void>
}

const DAY_MS = 24 * 60 * 60 * 1000
const isoDate = (date: Date): string => date.toISOString().slice(0, 10)

// Red once overdue, amber inside a week, neutral otherwise — same threshold the Dashboard's
// deadline banner above uses to decide what's worth surfacing at all.
const dueDateClass = (dueDate: string): string => {
  const today = isoDate(new Date())
  if (dueDate < today) return 'text-red-400'
  const weekOut = isoDate(new Date(Date.now() + 7 * DAY_MS))
  if (dueDate <= weekOut) return 'text-amber-400'
  return 'text-foreground/40'
}

// Fixed box size for the date field regardless of whether it's empty or filled — a plain
// `width` utility alone still let the browser's native date control grow/shrink to fit its
// placeholder vs. a real value, direct feedback 2026-09-20.
const DATE_INPUT_SIZE = 'w-[130px] min-w-[130px] max-w-[130px]'

interface TodoRowProps {
  todo: Todo
  showArrows: boolean
  isFirst: boolean
  isLast: boolean
  onToggle: (id: string, isDone: boolean) => Promise<void>
  onSetDueDate: (id: string, dueDate: string | null) => Promise<void>
  onMoveUp: (id: string) => void
  onMoveDown: (id: string) => void
  onDelete: (id: string) => Promise<void>
  onEditClick: (todo: Todo) => void
}

const TodoRow = ({
  todo,
  showArrows,
  isFirst,
  isLast,
  onToggle,
  onSetDueDate,
  onMoveUp,
  onMoveDown,
  onDelete,
  onEditClick,
}: TodoRowProps) => (
  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm group">
    {showArrows ? (
      <div className="flex flex-col shrink-0">
        <button
          type="button"
          disabled={isFirst}
          onClick={() => onMoveUp(todo.id)}
          className="text-accent/50 hover:text-accent disabled:opacity-20 disabled:hover:text-accent/50"
        >
          <ChevronsUp className="h-3 w-3" />
        </button>
        <button
          type="button"
          disabled={isLast}
          onClick={() => onMoveDown(todo.id)}
          className="text-accent/50 hover:text-accent disabled:opacity-20 disabled:hover:text-accent/50"
        >
          <ChevronsDown className="h-3 w-3" />
        </button>
      </div>
    ) : (
      <div className="w-3 shrink-0" />
    )}
    <input
      type="checkbox"
      checked={todo.is_done}
      onChange={(e) => onToggle(todo.id, e.target.checked)}
      className="accent-accent shrink-0 h-4 w-4"
    />
    {/* Title + details stacked as one block, not a separate line below the row — with the
        row itself vertically centered (items-center above), the checkbox/arrows naturally
        center against this whole block when details is present, and sit centered next to
        the title alone when it isn't. Contacts-row style, direct feedback 2026-09-20. */}
    <div className="flex-1 min-w-[100px]">
      <div
        className={`truncate ${todo.is_done ? 'line-through text-foreground/30' : 'text-foreground'}`}
      >
        {todo.title}
      </div>
      {todo.details && (
        <div className="text-[11px] text-accent/80 italic truncate">{todo.details}</div>
      )}
    </div>
    <div className="flex items-center gap-1 shrink-0 ml-auto">
      <Calendar
        className={`h-3 w-3 shrink-0 ${
          todo.is_done ? 'text-foreground/20' : dueDateClass(todo.due_date ?? '9999-99-99')
        }`}
      />
      <input
        type="date"
        value={todo.due_date ?? ''}
        onChange={(e) => onSetDueDate(todo.id, e.target.value || null)}
        className={`${DATE_INPUT_SIZE} shrink-0 h-6 text-[11px] bg-black/40 border border-accent/20 rounded px-1 focus:border-accent ${
          todo.is_done ? 'text-foreground/20' : dueDateClass(todo.due_date ?? '9999-99-99')
        }`}
      />
      <button
        type="button"
        onClick={() => onEditClick(todo)}
        title="Redigera"
        className="text-foreground/20 hover:text-accent transition-colors shrink-0 opacity-0 group-hover:opacity-100"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onDelete(todo.id)}
        title="Ta bort"
        className="text-foreground/20 hover:text-red-400 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  </div>
)

// One checklist — reused for both the org-wide list and each upcoming event's own list, the
// only difference between them being which `todos` slice and which closures (carrying the
// right event_id, or null) the caller passes in.
//
// Dated tasks always sort by due_date (soonest first) with no manual override — mixing a
// date sort with a hand-picked one made moving a dated task look wrong, since its visible
// date no longer matched where it landed. Tasks with no deadline get their own group
// underneath, ordered by display_order, which is the only thing the up/down arrows ever
// touch. Direct feedback, 2026-09-20.
export const TodoListCard = ({
  title,
  todos,
  onAdd,
  onEdit,
  onToggle,
  onSetDueDate,
  onMoveUp,
  onMoveDown,
  onDelete,
}: TodoListCardProps) => {
  const { t } = useLanguage()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)

  const pending = todos.filter((td) => !td.is_done)
  const datedPending = [...pending.filter((td) => td.due_date)].sort((a, b) =>
    (a.due_date as string).localeCompare(b.due_date as string)
  )
  const datelessPending = [...pending.filter((td) => !td.due_date)].sort(
    (a, b) => a.display_order - b.display_order
  )
  const done = [...todos.filter((td) => td.is_done)].sort((a, b) => a.display_order - b.display_order)

  const handleSave = async (todoTitle: string, dueDate: string | null, details: string | null) => {
    if (editingTodo) {
      await onEdit(editingTodo.id, todoTitle, dueDate, details)
    } else {
      await onAdd(todoTitle, dueDate, details)
    }
  }

  return (
    <div className="admin-panel velvet-surface p-3 space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="font-decorative text-sm text-foreground/80">{title}</h4>
        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          title={t('Ny uppgift', 'New task')}
          className="p-1 rounded-full border border-accent/20 text-accent/70 hover:text-accent hover:border-accent/50 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {todos.length === 0 ? (
        <p className="text-xs text-foreground/40 italic text-left">
          {t('Inga uppgifter ännu.', 'No tasks yet.')}
        </p>
      ) : (
        <div className="space-y-2">
          {datedPending.length > 0 && (
            <div className="space-y-1.5">
              {datedPending.map((todo) => (
                <TodoRow
                  key={todo.id}
                  todo={todo}
                  showArrows={false}
                  isFirst
                  isLast
                  onToggle={onToggle}
                  onSetDueDate={onSetDueDate}
                  onMoveUp={onMoveUp}
                  onMoveDown={onMoveDown}
                  onDelete={onDelete}
                  onEditClick={setEditingTodo}
                />
              ))}
            </div>
          )}

          {datelessPending.length > 0 && (
            <div className={`space-y-1.5 ${datedPending.length > 0 ? 'pt-1.5 border-t border-accent/10' : ''}`}>
              {datelessPending.map((todo, index) => (
                <TodoRow
                  key={todo.id}
                  todo={todo}
                  showArrows
                  isFirst={index === 0}
                  isLast={index === datelessPending.length - 1}
                  onToggle={onToggle}
                  onSetDueDate={onSetDueDate}
                  onMoveUp={onMoveUp}
                  onMoveDown={onMoveDown}
                  onDelete={onDelete}
                  onEditClick={setEditingTodo}
                />
              ))}
            </div>
          )}

          {done.length > 0 && (
            <div className="space-y-1.5 pt-1.5 border-t border-accent/10">
              {done.map((todo) => (
                <TodoRow
                  key={todo.id}
                  todo={todo}
                  showArrows={false}
                  isFirst
                  isLast
                  onToggle={onToggle}
                  onSetDueDate={onSetDueDate}
                  onMoveUp={onMoveUp}
                  onMoveDown={onMoveDown}
                  onDelete={onDelete}
                  onEditClick={setEditingTodo}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <TodoModal
        isOpen={isAddOpen || editingTodo !== null}
        editingTodo={editingTodo}
        onClose={() => {
          setIsAddOpen(false)
          setEditingTodo(null)
        }}
        onSave={handleSave}
      />
    </div>
  )
}
