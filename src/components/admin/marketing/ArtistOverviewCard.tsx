import { useState } from 'react'
import { Download, Copy, ExternalLink, Mic2, Crown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import { getImageSrc, toBoldSerif, toDoubleStruck, toHashtag } from '@/lib/utils'
import { togglePerformerVisibility } from '@/services/performerService'
import { revealPerformerNow, schedulePerformerReveal } from '@/services/eventService'
import type { AdminEventPerformerRow } from '@/services/eventService'

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const SITE_URL = 'https://tipthevelvet.nu'

const ROLE_LABEL: Record<AdminEventPerformerRow['lineup_role'], string> = {
  performer: 'Performer',
  host: 'Host',
  headliner: 'Headliner',
}

interface ArtistOverviewCardProps {
  row: AdminEventPerformerRow
  event: { id: string; title: string; ticketUrl: string | null; hashtags: string | null }
  onChanged: (performerId: string, patch: Partial<AdminEventPerformerRow>) => void
}

// Promo/social-content view — logistics (dietary requirements, plus-one) live on
// Event Planning instead, not here (see AdminEventPlan.tsx's compact roster list).
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
    const roleLabel = ROLE_LABEL[row.lineup_role]
    const artistTag = toHashtag(performer.performer_name)
    const roleTag = row.lineup_role === 'performer' ? null : `#${roleLabel}`
    // event.hashtags already carries the base org/city tags (events.hashtags' DB default)
    // with any generated/hand-added event-specific tags placed before them by EventEditor's
    // "Generate" action — no separate base-tag list needed here.
    const eventTags = event.hashtags?.trim() ? event.hashtags.trim().split(/\s+/) : []
    const hashtags = [artistTag, roleTag, ...eventTags].filter(Boolean).join(' ')

    const sections = [
      `✨ ${toBoldSerif(`${roleLabel} Reveal!`)} ✨`,
      `🇸🇪 ${performer.bio_sv || t('(Ingen svensk text ännu)', '(No Swedish text yet)')}`,
      `🇬🇧 ${performer.bio_eng || t('(Ingen engelsk text ännu)', '(No English text yet)')}`,
    ]
    if (row.eventPhotographer) {
      sections.push(`📷 ${toDoubleStruck('Photographer:')} ${row.eventPhotographer}`)
    }
    sections.push(`🔗 ${toDoubleStruck('Profil/Profile:')} ${SITE_URL}/performers/${performer.slug}`)
    if (event.ticketUrl) {
      sections.push(`🎟️${toDoubleStruck('Biljetter/Tickets:')} ${event.ticketUrl}`)
    }
    sections.push(hashtags)

    try {
      await navigator.clipboard.writeText(sections.join('\n\n'))
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

  const badgeRoleLabel = row.lineup_role === 'performer' ? null : ROLE_LABEL[row.lineup_role]
  const RoleIcon = row.lineup_role === 'host' ? Mic2 : Crown

  return (
    <div className="admin-panel velvet-surface px-3 py-2 flex items-center gap-2">
      <div className="relative shrink-0 w-9 h-9 rounded border border-accent/20 overflow-hidden bg-black/30">
        {row.eventPromoImageId ? (
          <img
            src={getImageSrc(row.eventPromoImageId)}
            alt={performer.performer_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-foreground/30 text-[7px] text-center">
            {t('Ingen', 'None')}
          </div>
        )}
      </div>

      <h4 className="font-decorative text-sm text-foreground truncate shrink-0 max-w-[160px]">
        {performer.performer_name}
      </h4>

      {badgeRoleLabel && (
        <span
          title={badgeRoleLabel}
          className="shrink-0 flex items-center text-accent"
        >
          <RoleIcon className="h-3.5 w-3.5" />
        </span>
      )}

      <a
        href={`/performers/${performer.slug}`}
        target="_blank"
        rel="noopener noreferrer"
        title={t('Profil', 'Profile')}
        className="shrink-0 text-accent hover:text-accent-light transition-colors"
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </a>

      <div className="flex items-center gap-1.5 ml-auto shrink-0">
        <button
          type="button"
          onClick={handleDownloadImage}
          disabled={!row.eventPromoImageId}
          title={t('Ladda ner bild', 'Download image')}
          className="p-1.5 border border-accent/20 rounded text-accent hover:bg-accent hover:text-black transition-colors disabled:opacity-30 disabled:pointer-events-none"
        >
          <Download className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={handleCopyPromoText}
          title={t('Kopiera text', 'Copy text')}
          className="p-1.5 border border-accent/20 rounded text-accent hover:bg-accent hover:text-black transition-colors"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>

        {row.is_revealed ? (
          <span className="text-[11px] font-semibold text-green-400 whitespace-nowrap">
            {t('Avslöjad', 'Revealed')}
          </span>
        ) : (
          <>
            <input
              type="date"
              value={row.reveal_date ?? ''}
              onChange={(e) => handleRevealDateChange(e.target.value)}
              className="h-7 w-[128px] text-xs bg-black/40 border border-accent/20 rounded px-2 text-white"
            />
            <button
              type="button"
              onClick={handleRevealNow}
              disabled={isRevealing}
              className="btn-gold text-[11px] py-1 px-2.5 min-h-0 flex items-center gap-1.5 whitespace-nowrap"
            >
              {isRevealing && <Loader2 className="h-3 w-3 animate-spin" />}
              {t('Avslöja nu', 'Reveal now')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
