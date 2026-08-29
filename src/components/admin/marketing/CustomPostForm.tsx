import { useState } from 'react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import { createCustomPost, type CustomMarketingPost } from '@/services/marketingService'
import type { EventMarketingData } from '@/services/eventService'

interface CustomPostFormProps {
  event: EventMarketingData
  onCreated: (post: CustomMarketingPost) => void
  onCancel: () => void
}

// The content textarea starts pre-filled with a starter shell (sv/eng flags + this event's
// hashtags/ticket link) matching every other post's convention — a head start, not a
// reusable template; fully free-text from here.
const buildStarterContent = (event: EventMarketingData): string => {
  const lines = ['🇸🇪 ', '', '🇬🇧 ']
  if (event.ticketUrl) {
    lines.push('', `🎟️ ${event.ticketUrl}`)
  }
  if (event.hashtags?.trim()) {
    lines.push('', event.hashtags.trim())
  }
  return lines.join('\n')
}

export const CustomPostForm = ({ event, onCreated, onCancel }: CustomPostFormProps) => {
  const { t } = useLanguage()
  const [title, setTitle] = useState('')
  const [postDate, setPostDate] = useState('')
  const [content, setContent] = useState(() => buildStarterContent(event))
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error(t('Titel krävs.', 'Title is required.'))
      return
    }
    setIsSaving(true)
    try {
      const created = await createCustomPost(event.id, title.trim(), postDate || null, content)
      toast.success(t('Inlägg tillagt!', 'Post added!'))
      onCreated(created)
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte spara.', 'Could not save.'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="admin-panel velvet-surface p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="form-label-gold block">{t('Titel', 'Title')}</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full h-9 text-sm bg-black/40 border border-accent/20 rounded p-2 focus:border-accent text-white"
          />
        </div>
        <div className="space-y-1">
          <label className="form-label-gold block">{t('Datum', 'Date')}</label>
          <input
            type="date"
            value={postDate}
            onChange={(e) => setPostDate(e.target.value)}
            className="w-full h-9 text-sm bg-black/40 border border-accent/20 rounded p-2 focus:border-accent text-white"
          />
        </div>
      </div>
      <div className="space-y-1">
        <label className="form-label-gold block">{t('Text', 'Content')}</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full min-h-[160px] text-sm bg-black/40 border border-accent/20 font-sans p-2 leading-relaxed rounded resize-y focus:border-accent text-white"
        />
      </div>
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-xs border border-accent/20 rounded text-foreground/70 hover:bg-white/5 transition-colors"
        >
          {t('Avbryt', 'Cancel')}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="btn-gold text-xs py-2 px-4 min-h-0"
        >
          {t('Spara', 'Save')}
        </button>
      </div>
    </div>
  )
}
