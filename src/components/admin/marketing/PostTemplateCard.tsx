import { Download, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import { getImageSrc } from '@/lib/utils'

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME

interface PostActionClusterProps {
  // Omit entirely for text-only posts (no image button rendered at all) — pass null for a
  // post that does have an image slot but nothing's uploaded yet (button shown, disabled).
  imageId?: string | null
  imageAlt?: string
  buildText: () => string
}

// Shared thumbnail + download-image + copy-text cluster for every templated social post
// (Save the Date, Facebook Event, Casting Call open/closed, Ticket countdown/release,
// Artists all together). No row wrapper of its own — the caller (AdminMarketing.tsx)
// renders it inline as part of the single unified checklist row.
export const PostActionCluster = ({ imageId, imageAlt, buildText }: PostActionClusterProps) => {
  const { t } = useLanguage()
  const hasImageSlot = imageId !== undefined

  const handleDownloadImage = () => {
    if (!imageId) return
    window.open(
      `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/fl_attachment/${imageId}`,
      '_blank'
    )
  }

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(buildText())
      toast.success(t('Text kopierad!', 'Text copied!'))
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte kopiera.', 'Could not copy.'))
    }
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      {hasImageSlot && (
        <div className="relative shrink-0 w-9 h-9 rounded border border-accent/20 overflow-hidden bg-black/30">
          {imageId ? (
            <img src={getImageSrc(imageId)} alt={imageAlt} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-foreground/30 text-[7px] text-center">
              {t('Ingen', 'None')}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-1.5">
        {hasImageSlot && (
          <button
            type="button"
            onClick={handleDownloadImage}
            disabled={!imageId}
            title={t('Ladda ner bild', 'Download image')}
            className="p-1.5 border border-accent/20 rounded text-accent hover:bg-accent hover:text-black transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={handleCopyText}
          title={t('Kopiera text', 'Copy text')}
          className="p-1.5 border border-accent/20 rounded text-accent hover:bg-accent hover:text-black transition-colors"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
