import { useState } from 'react'
import JSZip from 'jszip'
import { Download, Copy, Save, Sparkles, Users, Link2, Loader2 } from 'lucide-react'
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
  const [isZipping, setIsZipping] = useState(false)

  const handleDownloadEventImage = () => {
    if (!event.imageId) return
    window.open(
      `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/fl_attachment/${event.imageId}`,
      '_blank'
    )
  }

  // Bundles every performer image into one zip and triggers a single download. Two lighter
  // approaches were tried and both proved unreliable: window.open per image gets blocked as
  // a popup after the first (only the click that's synchronously part of the user gesture
  // is exempt), and a plain anchor click straight to the Cloudinary URL cancels each
  // navigation as soon as the next one starts, so only the last image ever landed. Even
  // saving each image separately via a blob: URL still hit Chrome's "multiple automatic
  // downloads" throttle — several files in a row without a fresh gesture get silently
  // dropped, non-deterministically (confirmed while testing: 9 images in, sometimes only 4
  // or 6 came through). A single zip is one download, so none of that applies.
  const handleDownloadAllPerformerImages = async () => {
    const imageIds = performers.map((row) => row.eventPromoImageId).filter((id): id is string => !!id)
    if (imageIds.length === 0) {
      toast.error(t('Inga bilder att ladda ner.', 'No images to download.'))
      return
    }
    setIsZipping(true)
    try {
      const zip = new JSZip()
      await Promise.all(
        imageIds.map(async (imageId) => {
          const response = await fetch(
            `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/fl_attachment/${imageId}`
          )
          const blob = await response.blob()
          zip.file(`${imageId.split('/').pop()}.jpg`, blob)
        })
      )
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const blobUrl = URL.createObjectURL(zipBlob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `${event.title || 'artister'}-bilder.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte ladda ner bilderna.', 'Could not download the images.'))
    } finally {
      setIsZipping(false)
    }
  }

  const handleGenerateHashtags = () => {
    const generated = generateEventHashtags(event.title, event.subtitle, event.location)
    if (!generated) return

    const existingTags = hashtagsDraft.trim() ? hashtagsDraft.trim().split(/\s+/) : []
    const existingLower = new Set(existingTags.map((tag) => tag.toLowerCase()))
    const newTags = generated.trim().split(/\s+/).filter((tag) => !existingLower.has(tag.toLowerCase()))

    if (newTags.length === 0) {
      toast.info(t('Inga nya hashtags att lägga till.', 'No new hashtags to add.'))
      return
    }
    setHashtagsDraft([...newTags, ...existingTags].join(' '))
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
    <div className="admin-panel velvet-surface p-4">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Left: event image + the three download/copy actions stacked beside it, spanning
            the same height as the image instead of wrapping below it. */}
        <div className="flex gap-4 sm:w-[360px] shrink-0">
          <div className="shrink-0 w-36 h-36 rounded border border-accent/20 overflow-hidden bg-black/30">
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

          <div className="flex-1 h-36 flex flex-col justify-between">
            <button
              type="button"
              onClick={handleDownloadEventImage}
              disabled={!event.imageId}
              className="flex items-center gap-2 text-xs py-2 px-3 border border-accent/20 rounded text-accent hover:bg-accent hover:text-black transition-colors disabled:opacity-30 disabled:pointer-events-none"
            >
              <Download className="h-4 w-4 shrink-0" />
              <span className="truncate">{t('Ladda ner eventbild', 'Download event image')}</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadAllPerformerImages}
              disabled={isZipping}
              className="flex items-center gap-2 text-xs py-2 px-3 border border-accent/20 rounded text-accent hover:bg-accent hover:text-black transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              {isZipping ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              ) : (
                <Users className="h-4 w-4 shrink-0" />
              )}
              <span className="truncate">{t('Ladda ner alla artistbilder', 'Download all performer images')}</span>
            </button>
            <button
              type="button"
              onClick={handleCopyProfileLinks}
              className="flex items-center gap-2 text-xs py-2 px-3 border border-accent/20 rounded text-accent hover:bg-accent hover:text-black transition-colors"
            >
              <Link2 className="h-4 w-4 shrink-0" />
              <span className="truncate">{t('Kopiera profillänkar', 'Copy profile links')}</span>
            </button>
          </div>
        </div>

        {/* Right: hashtags, stretched to the same row height as the image/buttons column. */}
        <div className="flex-1 flex flex-col gap-1.5 sm:border-l sm:border-accent/10 sm:pl-4">
          <div className="flex items-center justify-between gap-2">
            <label className="form-label-gold shrink-0">{t('Hashtags', 'Hashtags')}</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleGenerateHashtags}
                className="flex items-center gap-1 text-[11px] text-accent hover:underline whitespace-nowrap"
              >
                <Sparkles className="h-3 w-3" />
                {t('Generera', 'Generate')}
              </button>
              <button
                type="button"
                onClick={handleCopyHashtags}
                className="flex items-center gap-1.5 text-[11px] py-1 px-2.5 border border-accent/20 rounded text-accent hover:bg-accent hover:text-black transition-colors"
              >
                <Copy className="h-3.5 w-3.5" />
                {t('Kopiera', 'Copy')}
              </button>
              <button
                type="button"
                onClick={handleSaveHashtags}
                disabled={isSavingHashtags}
                className="btn-gold text-[11px] py-1 px-2.5 min-h-0 flex items-center gap-1.5"
              >
                <Save className="h-3.5 w-3.5" />
                {t('Spara', 'Save')}
              </button>
            </div>
          </div>
          <textarea
            value={hashtagsDraft}
            onChange={(e) => setHashtagsDraft(e.target.value)}
            className="w-full flex-1 min-h-[70px] sm:min-h-0 text-sm bg-black/40 border border-accent/20 rounded p-2 leading-relaxed resize-none focus:border-accent text-white"
          />
        </div>
      </div>
    </div>
  )
}
