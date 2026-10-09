import { useState } from 'react'
import { Download, Copy, Pencil, Loader2, AtSign } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import CloudinaryImage from '@/components/CloudinaryImage'
import {
  toBoldSerif,
  toDoubleStruck,
  toHashtag,
  extractInstagramHandle,
  formatEventDateVenueLine,
} from '@/lib/utils'
import {
  scheduleEntertainerReveal,
  setEntertainerRevealed,
  setEntertainerSocialPosted,
  type EventEntertainer,
} from '@/services/entertainerService'
import { EntertainerProfileModal } from '@/components/admin/event-plan/EntertainerProfileModal'

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME

interface EntertainerOverviewCardProps {
  row: EventEntertainer
  event: {
    id: string
    ticketUrl: string | null
    hashtags: string | null
    eventStart: string | null
    location: string | null
  }
  onChanged: (id: string, patch: Partial<EventEntertainer>) => void
}

// Marketing's view of one pre-show entertainer — the same reveal controls as a lineup
// artist (reveal date, reveal state, "posted on social media"), plus the reveal post text
// built from their public profile.
export const EntertainerOverviewCard = ({
  row,
  event,
  onChanged,
}: EntertainerOverviewCardProps) => {
  const { t } = useLanguage()
  const [isRevealing, setIsRevealing] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const name = row.display_name || row.staff.name
  const hasProfile = Boolean(row.bio_sv || row.bio_eng || row.image_id)
  const instagramHandle = extractInstagramHandle(row.instagram_link)

  const handleCopyInstagramHandle = async () => {
    if (!instagramHandle) return
    try {
      await navigator.clipboard.writeText(instagramHandle)
      toast.success(t('Instagram-tagg kopierad!', 'Instagram tag copied!'))
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte kopiera.', 'Could not copy.'))
    }
  }

  const handleDownloadImage = () => {
    if (!row.image_id) return
    window.open(
      `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/fl_attachment/${row.image_id}`,
      '_blank'
    )
  }

  // Both languages in one post, like the artist reveal. Hand-edit after pasting for the
  // storytelling version — this is the factual base built from the profile.
  const handleCopyPostText = async () => {
    const eventTags = event.hashtags?.trim() ? event.hashtags.trim().split(/\s+/) : []
    const hashtags = [toHashtag(name), ...eventTags].join(' ')
    const heading = (title: string | null) => `${name}${title ? ` — ${title}` : ''}`

    const sections = [
      `✨ ${toBoldSerif('Pre-show reveal!')} ✨`,
      `🇸🇪 ${heading(row.title_sv)}\n${row.bio_sv || t('(Ingen svensk text ännu)', '(No Swedish text yet)')}`,
      `🇬🇧 ${heading(row.title_eng)}\n${row.bio_eng || t('(Ingen engelsk text ännu)', '(No English text yet)')}`,
    ]
    if (instagramHandle) {
      sections.push(`📷 ${toDoubleStruck('Instagram:')} ${instagramHandle}`)
    }
    const dateVenue = formatEventDateVenueLine(event.eventStart, event.location, 'eng')
    if (dateVenue) sections.push(dateVenue)
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

  const handleRevealDateChange = async (value: string) => {
    onChanged(row.id, { reveal_date: value || null })
    try {
      await scheduleEntertainerReveal(row.id, value || null)
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte spara datum.', 'Could not save date.'))
    }
  }

  const handleHideAgain = async () => {
    setIsRevealing(true)
    try {
      await setEntertainerRevealed(row.id, false)
      toast.success(t('Dold igen.', 'Hidden again.'))
      onChanged(row.id, { is_revealed: false })
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte dölja.', 'Could not hide.'))
    } finally {
      setIsRevealing(false)
    }
  }

  const handleRevealNow = async () => {
    setIsRevealing(true)
    try {
      await setEntertainerRevealed(row.id, true)
      toast.success(t('Avslöjad!', 'Revealed!'))
      onChanged(row.id, { is_revealed: true })
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte avslöja.', 'Could not reveal.'))
    } finally {
      setIsRevealing(false)
    }
  }

  const handleToggleSocialPosted = async (checked: boolean) => {
    onChanged(row.id, { social_posted: checked })
    try {
      await setEntertainerSocialPosted(row.id, checked)
    } catch (err) {
      console.error(err)
      onChanged(row.id, { social_posted: !checked })
      toast.error(t('Kunde inte spara.', 'Could not save.'))
    }
  }

  return (
    <div className="admin-panel velvet-surface px-3 py-2 flex items-center gap-2 flex-wrap">
      <div className="relative shrink-0 w-9 h-9 rounded border border-accent/20 overflow-hidden bg-black/30">
        {row.image_id ? (
          <CloudinaryImage
            publicId={row.image_id}
            width={72}
            height={72}
            gravityFace
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-foreground/30 text-[7px] text-center">
            {t('Ingen', 'None')}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="font-decorative text-sm text-foreground truncate">{name}</h4>
      </div>

      <div className="flex items-center gap-1.5 ml-auto shrink-0">
        <button
          type="button"
          onClick={() => setShowProfile(true)}
          title={t('Redigera offentlig profil', 'Edit public profile')}
          className="p-1.5 border border-accent/20 rounded text-accent hover:bg-accent hover:text-black transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={handleDownloadImage}
          disabled={!row.image_id}
          title={t('Ladda ner bild', 'Download image')}
          className="p-1.5 border border-accent/20 rounded text-accent hover:bg-accent hover:text-black transition-colors disabled:opacity-30 disabled:pointer-events-none"
        >
          <Download className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={handleCopyPostText}
          title={t('Kopiera text', 'Copy text')}
          className="p-1.5 border border-accent/20 rounded text-accent hover:bg-accent hover:text-black transition-colors"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={handleCopyInstagramHandle}
          disabled={!instagramHandle}
          title={
            instagramHandle
              ? t('Kopiera Instagram-tagg', 'Copy Instagram tag')
              : t('Ingen Instagram-länk', 'No Instagram link')
          }
          className="p-1.5 border border-accent/20 rounded text-accent hover:bg-accent hover:text-black transition-colors disabled:opacity-30 disabled:pointer-events-none"
        >
          <AtSign className="h-3.5 w-3.5" />
        </button>

        {row.is_revealed ? (
          <button
            type="button"
            onClick={handleHideAgain}
            disabled={isRevealing}
            title={t(
              'Avslöjad för tidigt? Klicka för att dölja igen.',
              'Revealed too early? Click to hide again.'
            )}
            className="text-[11px] font-semibold text-green-400 hover:text-red-400 whitespace-nowrap flex items-center gap-1.5 disabled:opacity-50"
          >
            {isRevealing && <Loader2 className="h-3 w-3 animate-spin" />}
            {t('Avslöjad', 'Revealed')}
          </button>
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
              disabled={isRevealing || !hasProfile}
              title={
                hasProfile
                  ? t('Avslöja på sajten nu', 'Reveal on the site now')
                  : t('Fyll i profilen först', 'Fill in the profile first')
              }
              className="text-[11px] py-1 px-2 border border-accent/20 rounded text-accent hover:bg-accent hover:text-black transition-colors disabled:opacity-30 disabled:pointer-events-none whitespace-nowrap flex items-center gap-1.5"
            >
              {isRevealing && <Loader2 className="h-3 w-3 animate-spin" />}
              {t('Avslöja nu', 'Reveal now')}
            </button>
          </>
        )}

        <input
          type="checkbox"
          checked={row.social_posted}
          title={t('Postat på sociala medier', 'Posted on social media')}
          onChange={(e) => handleToggleSocialPosted(e.target.checked)}
          className="h-4 w-4 accent-accent shrink-0"
        />
      </div>

      {!hasProfile && (
        <p className="basis-full w-full text-[10px] text-amber-400/80">
          {t('Profilen är inte ifylld än', 'Profile not filled in yet')}
        </p>
      )}

      {showProfile && (
        <EntertainerProfileModal
          eventId={event.id}
          staffId={row.staff_id}
          staffName={row.staff.name}
          onClose={() => setShowProfile(false)}
          onSaved={(patch) => onChanged(row.id, patch)}
        />
      )}
    </div>
  )
}
