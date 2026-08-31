import { useState } from 'react'
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import { vipCategoryLabel } from '@/lib/contactLabels'
import type { VipManualEntry, VipEntryCategory } from '@/types/types'

const CATEGORY_OPTIONS: VipEntryCategory[] = ['ticket_winner', 'contest_winner', 'other']

interface VipManualEntryRowProps {
  row: VipManualEntry
  isNew?: boolean
  onSave: (id: string, patch: Partial<VipManualEntry>, isNew: boolean) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onCancelNew?: (id: string) => void
}

// The VIP list's "doesn't come from any other table" entries — ticket/contest winners, and
// any other one-off addition (a rare staff +1, per the board's own call to keep that
// manual rather than adding plus-one columns to event_staff_volunteers).
export const VipManualEntryRow = ({
  row,
  isNew = false,
  onSave,
  onDelete,
  onCancelNew,
}: VipManualEntryRowProps) => {
  const { t } = useLanguage()
  const [isExpanded, setIsExpanded] = useState(isNew)
  const [isSaving, setIsSaving] = useState(false)
  const [draft, setDraft] = useState({
    name: row.name,
    email: row.email ?? '',
    category: row.category,
    note: row.note ?? '',
  })

  const handleSave = async () => {
    if (!draft.name.trim()) {
      toast.error(t('Namn krävs.', 'Name is required.'))
      return
    }
    setIsSaving(true)
    try {
      await onSave(
        row.id,
        {
          name: draft.name.trim(),
          email: draft.email.trim() || null,
          category: draft.category,
          note: draft.note.trim() || null,
        },
        isNew
      )
      if (!isNew) setIsExpanded(false)
    } catch (err) {
      toast.error(t('Kunde inte spara.', 'Could not save.'))
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    const confirmed = window.confirm(
      t(`Är du säker på att du vill radera ${row.name}?`, `Are you sure you want to delete ${row.name}?`)
    )
    if (!confirmed) return
    try {
      await onDelete(row.id)
    } catch (err) {
      toast.error(t('Kunde inte radera.', 'Could not delete.'))
      console.error(err)
    }
  }

  return (
    <div
      className="admin-panel velvet-surface transition-all duration-300 overflow-hidden cursor-pointer"
      style={{ padding: 0 }}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="p-3 flex items-center gap-3">
        <div className="text-accent/50 shrink-0">
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
        <span className="font-decorative text-sm text-foreground flex-1 min-w-0 truncate">
          {row.name || t('(Namnlös)', '(Unnamed)')}
        </span>
        <span className="text-accent italic text-xs font-heading shrink-0">
          {vipCategoryLabel(t, row.category)}
        </span>
        {row.email && !isExpanded && (
          <span className="text-xs text-foreground/50 truncate max-w-[160px] shrink-0 hidden sm:block">
            {row.email}
          </span>
        )}
      </div>

      {isExpanded && (
        <div
          className="border-t border-accent/10 bg-black/20 p-4 space-y-3 cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="form-label-gold block">{t('Namn', 'Name')}</label>
              <input
                type="text"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="w-full h-9 text-sm bg-black/40 border border-accent/20 rounded p-2 focus:border-accent text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="form-label-gold block">Email</label>
              <input
                type="email"
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                className="w-full h-9 text-sm bg-black/40 border border-accent/20 rounded p-2 focus:border-accent text-white"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="form-label-gold block">{t('Kategori', 'Category')}</label>
              <select
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value as VipEntryCategory })}
                className="w-full h-9 flex items-center text-sm bg-black/40 border border-accent/20 rounded py-2 pl-2 pr-8 focus:border-accent text-white"
              >
                {CATEGORY_OPTIONS.map((category) => (
                  <option key={category} value={category}>
                    {vipCategoryLabel(t, category)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="form-label-gold block">{t('Anteckning', 'Note')}</label>
            <textarea
              value={draft.note}
              onChange={(e) => setDraft({ ...draft, note: e.target.value })}
              className="w-full h-20 text-sm bg-black/40 border border-accent/20 font-sans p-2 leading-relaxed rounded resize-none focus:border-accent text-white"
            />
          </div>

          <div className="flex items-center justify-between gap-3 pt-2 border-t border-accent/10">
            {!isNew ? (
              <button type="button" onClick={handleDelete} className="btn-red text-xs py-2 px-4">
                {t('Radera', 'Delete')}
              </button>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-2">
              {isNew && onCancelNew && (
                <button
                  type="button"
                  onClick={() => onCancelNew(row.id)}
                  className="px-4 py-2 text-xs border border-accent/20 rounded text-foreground/70 hover:bg-white/5 transition-colors"
                >
                  {t('Avbryt', 'Cancel')}
                </button>
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="btn-gold text-xs py-2 px-4 flex items-center gap-1.5"
              >
                {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {t('Spara', 'Save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
