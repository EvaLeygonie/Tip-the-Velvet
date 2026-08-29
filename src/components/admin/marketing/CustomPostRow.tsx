import { useState } from 'react'
import { ChevronDown, ChevronUp, Copy, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import {
  updateCustomPost,
  deleteCustomPost,
  type CustomMarketingPost,
} from '@/services/marketingService'

interface CustomPostRowProps {
  post: CustomMarketingPost
  onChanged: (post: CustomMarketingPost) => void
  onDeleted: (id: string) => void
}

// Mirrors StaffVolunteerRow.tsx's collapse-to-summary/expand-to-edit shape — same CRUD
// hygiene every other row-based list in this app already has.
export const CustomPostRow = ({ post, onChanged, onDeleted }: CustomPostRowProps) => {
  const { t } = useLanguage()
  const [isExpanded, setIsExpanded] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [draft, setDraft] = useState({
    title: post.title,
    postDate: post.postDate ?? '',
    content: post.content,
  })

  const handleToggleChecked = async (checked: boolean) => {
    onChanged({ ...post, isPosted: checked })
    try {
      await updateCustomPost(post.id, { isPosted: checked })
    } catch (err) {
      console.error(err)
      onChanged({ ...post, isPosted: !checked })
      toast.error(t('Kunde inte spara.', 'Could not save.'))
    }
  }

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(post.content)
      toast.success(t('Text kopierad!', 'Text copied!'))
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte kopiera.', 'Could not copy.'))
    }
  }

  const handleSaveEdit = async () => {
    if (!draft.title.trim()) {
      toast.error(t('Titel krävs.', 'Title is required.'))
      return
    }
    setIsSaving(true)
    try {
      await updateCustomPost(post.id, {
        title: draft.title.trim(),
        postDate: draft.postDate || null,
        content: draft.content,
      })
      onChanged({
        ...post,
        title: draft.title.trim(),
        postDate: draft.postDate || null,
        content: draft.content,
      })
      toast.success(t('Sparat!', 'Saved!'))
      setIsExpanded(false)
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte spara.', 'Could not save.'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    const confirmed = window.confirm(
      t(`Är du säker på att du vill radera "${post.title}"?`, `Delete "${post.title}"?`)
    )
    if (!confirmed) return
    try {
      await deleteCustomPost(post.id)
      onDeleted(post.id)
      toast.success(t('Raderad.', 'Deleted.'))
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte radera.', 'Could not delete.'))
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
        <span className="font-decorative text-sm text-foreground flex-1 truncate">{post.title}</span>
        <span className="text-xs text-foreground/50 font-mono shrink-0">
          {post.postDate || t('Inget datum', 'No date')}
        </span>
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
          checked={post.isPosted}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => handleToggleChecked(e.target.checked)}
          className="h-4 w-4 accent-accent shrink-0"
        />
      </div>

      {isExpanded && (
        <div
          className="border-t border-accent/10 bg-black/20 p-4 space-y-3 cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="form-label-gold block">{t('Titel', 'Title')}</label>
              <input
                type="text"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                className="w-full h-9 text-sm bg-black/40 border border-accent/20 rounded p-2 focus:border-accent text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="form-label-gold block">{t('Datum', 'Date')}</label>
              <input
                type="date"
                value={draft.postDate}
                onChange={(e) => setDraft({ ...draft, postDate: e.target.value })}
                className="w-full h-9 text-sm bg-black/40 border border-accent/20 rounded p-2 focus:border-accent text-white"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="form-label-gold block">{t('Text', 'Content')}</label>
            <textarea
              value={draft.content}
              onChange={(e) => setDraft({ ...draft, content: e.target.value })}
              className="w-full min-h-[160px] text-sm bg-black/40 border border-accent/20 font-sans p-2 leading-relaxed rounded resize-y focus:border-accent text-white"
            />
          </div>
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-accent/10">
            <button type="button" onClick={handleDelete} className="btn-red text-xs py-2 px-4 min-h-0">
              {t('Radera', 'Delete')}
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
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
