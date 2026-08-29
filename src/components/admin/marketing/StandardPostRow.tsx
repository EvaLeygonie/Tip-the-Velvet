import { useState } from 'react'
import { ChevronDown, ChevronUp, Copy, RotateCcw, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import { saveMarketingPostContent, type FixedMarketingPostType } from '@/services/marketingService'

interface StandardPostRowProps {
  eventId: string
  postType: FixedMarketingPostType
  label: string
  // Computed from POST_SCHEDULE's offset — shown whenever no manual override is set.
  suggestedDateIso: string | null
  // A manual override, saved via setMarketingPostDate — wins over suggestedDateIso.
  savedPostDate: string | null
  isPosted: boolean
  savedContent: string | null
  // null when this post type has no template (see POST_SCHEDULE's hasTemplate) — the row
  // still opens so the board can write and save something from scratch.
  generateText: (() => string) | null
  onToggle: (checked: boolean) => void
  onSaved: (content: string) => void
  onDateChanged: (postDate: string | null) => void
}

// Mirrors CustomPostRow.tsx's collapse-to-summary/expand-to-edit shape. The saved `content`
// is the record of what actually got posted — the row shows the live template output only
// until the board saves an edit, after which the saved text wins (see marketingService's
// getMarketingPosts).
export const StandardPostRow = ({
  eventId,
  postType,
  label,
  suggestedDateIso,
  savedPostDate,
  isPosted,
  savedContent,
  generateText,
  onToggle,
  onSaved,
  onDateChanged,
}: StandardPostRowProps) => {
  const { t } = useLanguage()
  const [isExpanded, setIsExpanded] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [draft, setDraft] = useState(() => savedContent ?? (generateText ? generateText() : ''))

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(draft)
      toast.success(t('Text kopierad!', 'Text copied!'))
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte kopiera.', 'Could not copy.'))
    }
  }

  const handleReset = () => {
    if (!generateText) return
    setDraft(generateText())
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await saveMarketingPostContent(eventId, postType, draft)
      onSaved(draft)
      toast.success(t('Sparat!', 'Saved!'))
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte spara.', 'Could not save.'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="admin-panel velvet-surface transition-all duration-300 overflow-hidden" style={{ padding: 0 }}>
      <div
        className="p-3 flex items-center gap-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="text-accent/50 shrink-0">
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
        <span className="font-decorative text-sm text-foreground flex-1 min-w-0 truncate">{label}</span>
        <input
          type="date"
          value={savedPostDate ?? suggestedDateIso ?? ''}
          title={
            savedPostDate
              ? t('Manuellt datum', 'Manual date')
              : t('Föreslaget datum', 'Suggested date')
          }
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onDateChanged(e.target.value || null)}
          // Inline width, not a w-[…] utility class — index.css's global
          // input[type='date'] { width: 100% } rule (needed elsewhere for full-width form
          // fields) otherwise wins the cascade here and stretches the input to fill the
          // row, shoving the copy button and checkbox out of view. An inline style always
          // beats an external stylesheet rule, so it's the reliable way to override it
          // locally without touching the global rule.
          style={{ width: '150px' }}
          className="h-7 text-xs bg-black/40 border border-accent/20 rounded px-2 text-white shrink-0"
        />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            handleCopyText()
          }}
          title={t('Kopiera text', 'Copy text')}
          className="p-1.5 border border-accent/20 rounded text-accent hover:bg-accent hover:text-black transition-colors shrink-0"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        <input
          type="checkbox"
          checked={isPosted}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onToggle(e.target.checked)}
          className="h-4 w-4 accent-accent shrink-0"
        />
      </div>

      {isExpanded && (
        <div
          className="border-t border-accent/10 bg-black/20 p-4 space-y-3 cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={
              generateText
                ? undefined
                : t('Ingen mall för detta inlägg — skriv texten här.', 'No template for this post — write the text here.')
            }
            className="w-full min-h-[160px] text-sm bg-black/40 border border-accent/20 font-sans p-2 leading-relaxed rounded resize-y focus:border-accent text-white"
          />
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-accent/10">
            {generateText ? (
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1.5 text-xs py-2 px-3 border border-accent/20 rounded text-accent hover:bg-accent hover:text-black transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t('Återställ till mall', 'Reset to template')}
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="btn-gold text-xs py-2 px-4 min-h-0 flex items-center gap-1.5"
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
