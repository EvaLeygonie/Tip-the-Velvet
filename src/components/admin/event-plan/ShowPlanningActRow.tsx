import { useState } from 'react'
import { ChevronDown, ChevronUp, ChevronsUp, ChevronsDown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import { updatePerformerActNotes } from '@/services/eventService'
import type { AdminEventActRow } from '@/services/eventService'

interface ShowPlanningActRowProps {
  row: AdminEventActRow
  position: number
  isFirst: boolean
  isLast: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onUpdated: (id: string, patch: Partial<AdminEventActRow>) => void
}

// One act in the running order — read from performer_acts, which already collects
// stage_preparations/pick_up_cleaning/act_notes via the artist's own BookedArtistForm (real
// data confirmed against the org's own "Set list" documents). This is the first
// admin-facing view of it. Move buttons rather than drag-and-drop, matching the codebase's
// existing lightweight-first pattern — no reorder library exists here today.
export const ShowPlanningActRow = ({
  row,
  position,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onUpdated,
}: ShowPlanningActRowProps) => {
  const { t } = useLanguage()
  const [isExpanded, setIsExpanded] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [draft, setDraft] = useState({
    stage_preparations: row.stage_preparations ?? '',
    pick_up_cleaning: row.pick_up_cleaning ?? '',
    act_notes: row.act_notes ?? '',
  })

  const hasNotes = row.stage_preparations || row.pick_up_cleaning || row.act_notes

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const patch = {
        stage_preparations: draft.stage_preparations.trim() || null,
        pick_up_cleaning: draft.pick_up_cleaning.trim() || null,
        act_notes: draft.act_notes.trim() || null,
      }
      await updatePerformerActNotes(row.id, patch)
      onUpdated(row.id, patch)
      toast.success(t('Sparat!', 'Saved!'))
      setIsExpanded(false)
    } catch (err) {
      toast.error(t('Kunde inte spara.', 'Could not save.'))
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      className="admin-panel velvet-surface transition-all duration-300 overflow-hidden cursor-pointer"
      style={{ padding: 0 }}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="p-3 flex items-center gap-3">
        <span className="text-xs font-mono text-accent/60 shrink-0 w-5 text-center">{position}</span>
        <div className="flex flex-col shrink-0 -my-1">
          <button
            type="button"
            disabled={isFirst}
            onClick={(e) => {
              e.stopPropagation()
              onMoveUp()
            }}
            className="text-accent/50 hover:text-accent disabled:opacity-20 disabled:hover:text-accent/50"
          >
            <ChevronsUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            disabled={isLast}
            onClick={(e) => {
              e.stopPropagation()
              onMoveDown()
            }}
            className="text-accent/50 hover:text-accent disabled:opacity-20 disabled:hover:text-accent/50"
          >
            <ChevronsDown className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-decorative text-sm text-foreground truncate">{row.act_name}</div>
          <div className="text-xs text-foreground/50 truncate">{row.performer.performer_name}</div>
        </div>
        {!hasNotes && !isExpanded && (
          <span className="text-[10px] font-body font-semibold text-amber-400/80 border border-amber-400/30 rounded-full px-1.5 py-0.5 shrink-0">
            {t('Inga scenanteckningar', 'No stage notes')}
          </span>
        )}
        <div className="text-accent/50 shrink-0">
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </div>

      {isExpanded && (
        <div
          className="border-t border-accent/10 bg-black/20 p-4 space-y-3 cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="space-y-1">
            <label className="form-label-gold block">
              {t('Scenförberedelser', 'Stage preparations')}
            </label>
            <textarea
              value={draft.stage_preparations}
              onChange={(e) => setDraft({ ...draft, stage_preparations: e.target.value })}
              className="w-full min-h-[60px] text-sm bg-black/40 border border-accent/20 font-sans p-2 leading-relaxed rounded resize-y focus:border-accent text-white"
            />
          </div>
          <div className="space-y-1">
            <label className="form-label-gold block">
              {t('Plockning/städning', 'Pick up / cleaning')}
            </label>
            <textarea
              value={draft.pick_up_cleaning}
              onChange={(e) => setDraft({ ...draft, pick_up_cleaning: e.target.value })}
              className="w-full min-h-[60px] text-sm bg-black/40 border border-accent/20 font-sans p-2 leading-relaxed rounded resize-y focus:border-accent text-white"
            />
          </div>
          <div className="space-y-1">
            <label className="form-label-gold block">{t('Övriga anteckningar', 'Other notes')}</label>
            <textarea
              value={draft.act_notes}
              onChange={(e) => setDraft({ ...draft, act_notes: e.target.value })}
              className="w-full min-h-[60px] text-sm bg-black/40 border border-accent/20 font-sans p-2 leading-relaxed rounded resize-y focus:border-accent text-white"
            />
          </div>
          <div className="flex items-center justify-end pt-2 border-t border-accent/10">
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
      )}
    </div>
  )
}
