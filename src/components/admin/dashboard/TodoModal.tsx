import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import type { Todo } from '@/types/types'

interface TodoModalProps {
  isOpen: boolean
  // Presence of an existing todo switches this into edit mode (prefilled fields, "Save"
  // instead of "Add") — one modal for both, since the fields are identical either way.
  editingTodo?: Todo | null
  onClose: () => void
  onSave: (title: string, dueDate: string | null, details: string | null) => Promise<void>
}

// Portaled overlay, not an inline expansion — same reasoning as InlineAddPicker's own
// rewrite: expanding a form in place inside a card pushes every card below it down the page.
export const TodoModal = ({ isOpen, editingTodo, onClose, onSave }: TodoModalProps) => {
  const { t } = useLanguage()
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [details, setDetails] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const resetDraft = () => {
      if (isOpen) {
        setTitle(editingTodo?.title ?? '')
        setDueDate(editingTodo?.due_date ?? '')
        setDetails(editingTodo?.details ?? '')
      }
    }
    resetDraft()
  }, [isOpen, editingTodo])

  const handleSave = async () => {
    const trimmed = title.trim()
    if (!trimmed) return
    setIsSaving(true)
    try {
      await onSave(trimmed, dueDate || null, details.trim() || null)
      onClose()
    } catch (err) {
      toast.error(t('Kunde inte spara.', 'Could not save.'))
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen || typeof window === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="velvet-surface border border-accent/30 max-w-sm w-full p-5 space-y-3 rounded-lg shadow-2xl relative"
        style={{ backgroundColor: '#141111' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h4 className="font-decorative text-base text-accent text-center">
          {editingTodo ? t('Redigera uppgift', 'Edit task') : t('Ny uppgift', 'New task')}
        </h4>

        <div className="space-y-1.5">
          <label className="form-label-gold block">{t('Uppgift', 'Task')}</label>
          <input
            type="text"
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave()
            }}
            className="w-full h-9 text-sm bg-black/40 border border-accent/20 rounded px-2 text-foreground focus:border-accent"
          />
        </div>

        <div className="space-y-1.5">
          <label className="form-label-gold block">{t('Deadline (valfritt)', 'Deadline (optional)')}</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full h-9 text-sm bg-black/40 border border-accent/20 rounded px-2 text-foreground focus:border-accent"
          />
        </div>

        <div className="space-y-1.5">
          <label className="form-label-gold block">{t('Detaljer (valfritt)', 'Details (optional)')}</label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={3}
            placeholder={t(
              'Mer att skriva om uppgiften...',
              'More to write about the task...'
            )}
            className="w-full text-sm bg-black/40 border border-accent/20 font-sans p-2 leading-relaxed rounded resize-none focus:border-accent text-white"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-accent/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs border border-accent/20 rounded text-foreground/70 hover:bg-white/5 transition-colors"
            disabled={isSaving}
          >
            {t('Avbryt', 'Cancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !title.trim()}
            className="btn-gold text-xs py-2 px-4 flex items-center gap-1.5"
          >
            {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {editingTodo ? t('Spara', 'Save') : t('Lägg till', 'Add')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
