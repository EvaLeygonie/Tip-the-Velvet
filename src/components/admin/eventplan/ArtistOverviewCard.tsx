import { useState } from 'react'
import { Download, Copy, ExternalLink, Mic2, Crown, UtensilsCrossed, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import { getImageSrc } from '@/lib/utils'
import { togglePerformerVisibility } from '@/services/performerService'
import { revealPerformerNow, schedulePerformerReveal } from '@/services/eventService'
import type { AdminEventPerformerRow } from '@/services/eventService'

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME

interface ArtistOverviewCardProps {
  row: AdminEventPerformerRow
  event: { id: string; title: string }
  onChanged: (performerId: string, patch: Partial<AdminEventPerformerRow>) => void
}

export const ArtistOverviewCard = ({ row, event, onChanged }: ArtistOverviewCardProps) => {
  const { t } = useLanguage()
  const [isRevealing, setIsRevealing] = useState(false)
  const performer = row.performer

  const handleDownloadImage = () => {
    if (!row.eventPromoImageId) return
    window.open(
      `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/fl_attachment/${row.eventPromoImageId}`,
      '_blank'
    )
  }

  const handleCopyPromoText = async () => {
    const block = [
      `🎭 ${performer.performer_name} uppträder på ${event.title}!`,
      '',
      performer.bio_sv || t('(Ingen svensk text ännu)', '(No Swedish text yet)'),
      '',
      '—',
      '',
      `🎭 ${performer.performer_name} is performing at ${event.title}!`,
      '',
      performer.bio_eng || t('(Ingen engelsk text ännu)', '(No English text yet)'),
    ].join('\n')

    try {
      await navigator.clipboard.writeText(block)
      toast.success(t('Text kopierad!', 'Text copied!'))
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte kopiera.', 'Could not copy.'))
    }
  }

  // A first-time performer's public profile is gated behind performers.is_approved
  // (defaults false from confirm_and_migrate_artist) independently of
  // event_performers.is_revealed — flipping only the latter would leave them invisible, so
  // both writes happen together whenever the profile isn't already approved.
  const handleRevealNow = async () => {
    setIsRevealing(true)
    try {
      const writes: Promise<unknown>[] = [revealPerformerNow(event.id, performer.id)]
      if (!performer.is_approved) {
        writes.push(togglePerformerVisibility(performer.id, true))
      }
      await Promise.all(writes)
      toast.success(t('Artisten är avslöjad!', 'Artist revealed!'))
      onChanged(performer.id, { is_revealed: true })
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte avslöja artisten.', 'Could not reveal the artist.'))
    } finally {
      setIsRevealing(false)
    }
  }

  const handleRevealDateChange = async (value: string) => {
    onChanged(performer.id, { reveal_date: value || null })
    try {
      await schedulePerformerReveal(event.id, performer.id, value || null)
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte spara datum.', 'Could not save date.'))
    }
  }

  const roleLabel =
    row.lineup_role === 'host' ? 'Host' : row.lineup_role === 'headliner' ? 'Headliner' : null
  const RoleIcon = row.lineup_role === 'host' ? Mic2 : Crown

  return (
    <div className="admin-panel velvet-surface p-4 flex flex-col sm:flex-row gap-4">
      <div className="shrink-0 w-full sm:w-28">
        <div className="relative w-full h-28 rounded border border-accent/20 overflow-hidden bg-black/30">
          {row.eventPromoImageId ? (
            <img
              src={getImageSrc(row.eventPromoImageId)}
              alt={performer.performer_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-foreground/30 text-[11px] text-center px-1">
              {t('Ingen bild', 'No image')}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleDownloadImage}
          disabled={!row.eventPromoImageId}
          className="mt-2 w-full flex items-center justify-center gap-1.5 text-[11px] py-1.5 border border-accent/20 rounded text-accent hover:bg-accent hover:text-black transition-colors disabled:opacity-30 disabled:pointer-events-none"
        >
          <Download className="h-3 w-3" />
          {t('Ladda ner bild', 'Download image')}
        </button>
      </div>

      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <h4 className="font-decorative text-base text-foreground truncate">
              {performer.performer_name}
            </h4>
            {roleLabel && (
              <span className="shrink-0 flex items-center gap-1 text-[10px] font-body font-semibold text-accent">
                <RoleIcon className="h-3 w-3" />
                {roleLabel}
              </span>
            )}
            {row.plus_one_name && (
              <span
                title={`+1: ${row.plus_one_name}`}
                className="shrink-0 text-[10px] font-body font-semibold text-sky-400 border border-sky-400/30 rounded-full px-1.5 py-0.5"
              >
                +1
              </span>
            )}
          </div>
          <a
            href={`/performers/${performer.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 flex items-center gap-1 text-[11px] text-accent hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            {t('Profil', 'Profile')}
          </a>
        </div>

        {row.dietary_requirements && (
          <div className="flex items-start gap-1.5 text-xs text-foreground/60 italic">
            <UtensilsCrossed className="h-3.5 w-3.5 shrink-0 mt-0.5 text-accent/50" />
            {row.dietary_requirements}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleCopyPromoText}
            className="flex items-center gap-1.5 text-[11px] py-1.5 px-3 border border-accent/20 rounded text-accent hover:bg-accent hover:text-black transition-colors"
          >
            <Copy className="h-3 w-3" />
            {t('Kopiera promo-text', 'Copy promo text')}
          </button>

          {row.is_revealed ? (
            <span className="text-[11px] font-semibold text-green-400">
              {t('Avslöjad', 'Revealed')}
            </span>
          ) : (
            <>
              <input
                type="date"
                value={row.reveal_date ?? ''}
                onChange={(e) => handleRevealDateChange(e.target.value)}
                className="h-8 text-xs bg-black/40 border border-accent/20 rounded px-2 text-white"
              />
              <button
                type="button"
                onClick={handleRevealNow}
                disabled={isRevealing}
                className="btn-gold text-[11px] py-1.5 px-3 min-h-0 flex items-center gap-1.5"
              >
                {isRevealing && <Loader2 className="h-3 w-3 animate-spin" />}
                {t('Avslöja nu', 'Reveal now')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
