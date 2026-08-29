import { useState } from 'react'
import { Download, Copy, Save, Sparkles, Users, Link2 } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import { getImageSrc, generateEventHashtags } from '@/lib/utils'
import { saveEventHashtags } from '@/services/eventService'
import type { EventMarketingData, AdminEventPerformerRow } from '@/services/eventService'

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const SITE_URL = 'https://tipthevelvet.nu'

interface EventAssetPanelProps {
  event: EventMarketingData
  performers: AdminEventPerformerRow[]
  onHashtagsSaved: (hashtags: string) => void
}

// The one place shared, event-level assets live — image, hashtags, artist profile links —
// instead of being repeated on every templated post row (that duplication is what
// prompted this panel).
export const EventAssetPanel = ({ event, performers, onHashtagsSaved }: EventAssetPanelProps) => {
  const { t } = useLanguage()
  const [hashtagsDraft, setHashtagsDraft] = useState(event.hashtags ?? '')
  const [isSavingHashtags, setIsSavingHashtags] = useState(false)

  const handleDownloadEventImage = () => {
    if (!event.imageId) return
    window.open(
      `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/fl_attachment/${event.imageId}`,
      '_blank'
    )
  }

  // Sequential, staggered window.open calls rather than a real zip bundle — no new
  // dependency needed for this, and it's easy to upgrade later if popups prove annoying.
  const handleDownloadAllPerformerImages = () => {
    const imageIds = performers.map((row) => row.eventPromoImageId).filter((id): id is string => !!id)
    if (imageIds.length === 0) {
      toast.error(t('Inga bilder att ladda ner.', 'No images to download.'))
      return
    }
    imageIds.forEach((imageId, index) => {
      setTimeout(() => {
        window.open(
          `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/fl_attachment/${imageId}`,
          '_blank'
        )
      }, index * 400)
    })
  }

  const handleGenerateHashtags = () => {
    const generated = generateEventHashtags(event.title, event.subtitle, event.location)
    if (!generated) return
    const existing = hashtagsDraft.trim()
    setHashtagsDraft(existing ? `${generated} ${existing}` : generated)
  }

  const handleCopyHashtags = async () => {
    try {
      await navigator.clipboard.writeText(hashtagsDraft)
      toast.success(t('Hashtags kopierade!', 'Hashtags copied!'))
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte kopiera.', 'Could not copy.'))
    }
  }

  const handleSaveHashtags = async () => {
    setIsSavingHashtags(true)
    try {
      await saveEventHashtags(event.id, hashtagsDraft)
      onHashtagsSaved(hashtagsDraft)
      toast.success(t('Hashtags sparade!', 'Hashtags saved!'))
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte spara.', 'Could not save.'))
    } finally {
      setIsSavingHashtags(false)
    }
  }

  const handleCopyProfileLinks = async () => {
    const links = performers
      .map((row) => `${SITE_URL}/performers/${row.performer.slug}`)
      .join('\n')
    if (!links) {
      toast.error(t('Inga artister att länka till.', 'No artists to link to.'))
      return
    }
    try {
      await navigator.clipboard.writeText(links)
      toast.success(t('Profillänkar kopierade!', 'Profile links copied!'))
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte kopiera.', 'Could not copy.'))
    }
  }

  return (
    <div className="admin-panel velvet-surface p-4 space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="shrink-0 w-24 h-24 rounded border border-accent/20 overflow-hidden bg-black/30">
          {event.imageId ? (
            <img
              src={getImageSrc(event.imageId)}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-foreground/30 text-[10px] text-center px-1">
              {t('Ingen bild', 'No image')}
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col justify-center gap-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleDownloadEventImage}
              disabled={!event.imageId}
              className="flex items-center gap-1.5 text-[11px] py-1.5 px-3 border border-accent/20 rounded text-accent hover:bg-accent hover:text-black transition-colors disabled:opacity-30 disabled:pointer-events-none"
            >
              <Download className="h-3.5 w-3.5" />
              {t('Ladda ner eventbild', 'Download event image')}
            </button>
            <button
              type="button"
              onClick={handleDownloadAllPerformerImages}
              className="flex items-center gap-1.5 text-[11px] py-1.5 px-3 border border-accent/20 rounded text-accent hover:bg-accent hover:text-black transition-colors"
            >
              <Users className="h-3.5 w-3.5" />
              {t('Ladda ner alla artistbilder', 'Download all performer images')}
            </button>
            <button
              type="button"
              onClick={handleCopyProfileLinks}
              className="flex items-center gap-1.5 text-[11px] py-1.5 px-3 border border-accent/20 rounded text-accent hover:bg-accent hover:text-black transition-colors"
            >
              <Link2 className="h-3.5 w-3.5" />
              {t('Kopiera profillänkar', 'Copy profile links')}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-1.5 border-t border-accent/10 pt-3">
        <div className="flex items-center justify-between">
          <label className="form-label-gold">{t('Hashtags', 'Hashtags')}</label>
          <button
            type="button"
            onClick={handleGenerateHashtags}
            className="flex items-center gap-1 text-[11px] text-accent hover:underline"
          >
            <Sparkles className="h-3 w-3" />
            {t('Generera från titel', 'Generate from title')}
          </button>
        </div>
        <textarea
          value={hashtagsDraft}
          onChange={(e) => setHashtagsDraft(e.target.value)}
          className="w-full min-h-[60px] text-sm bg-black/40 border border-accent/20 rounded p-2 leading-relaxed resize-none focus:border-accent text-white"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCopyHashtags}
            className="flex items-center gap-1.5 text-[11px] py-1.5 px-3 border border-accent/20 rounded text-accent hover:bg-accent hover:text-black transition-colors"
          >
            <Copy className="h-3.5 w-3.5" />
            {t('Kopiera', 'Copy')}
          </button>
          <button
            type="button"
            onClick={handleSaveHashtags}
            disabled={isSavingHashtags}
            className="btn-gold text-[11px] py-1.5 px-3 min-h-0 flex items-center gap-1.5"
          >
            <Save className="h-3.5 w-3.5" />
            {t('Spara', 'Save')}
          </button>
        </div>
      </div>
    </div>
  )
}
