import { useState } from 'react'
import type { CastingApplication } from '@/types/types'
import { getImageSrc, formatDate } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'
import { ChevronDown, ChevronUp, Mail, Link as LinkIcon, Video, Save } from 'lucide-react'
import { toast } from 'sonner'

interface CastingApplicationRowProps {
  application: CastingApplication
  onStatusChange: (id: string, newStatus: CastingApplication['review_status']) => void
  onSaveNotes: (id: string, notes: string) => Promise<void>
}

const Instagram = ({ size = 20 }: { size?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
)

export const CastingApplicationRow = ({
  application,
  onStatusChange,
  onSaveNotes,
}: CastingApplicationRowProps) => {
  const { language, t } = useLanguage()
  const [isExpanded, setIsExpanded] = useState(false)
  const [notes, setNotes] = useState(application.admin_notes || '')
  const [savingNotes, setSavingNotes] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const handleSaveNotes = async () => {
    setSavingNotes(true)
    try {
      await onSaveNotes(application.id, notes)
      toast.success(t('Anteckningar sparade!', 'Notes saved!'))
    } catch (err) {
      toast.error(t('Kunde inte spara anteckningar.', 'Could not save notes.'))
      console.error(err)
    } finally {
      setSavingNotes(false)
    }
  }

  const handleStatusSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    setUpdatingStatus(true)
    try {
      await onStatusChange(application.id, e.target.value as CastingApplication['review_status'])
      toast.success(t('Status uppdaterad!', 'Status updated!'))
    } catch (err) {
      toast.error(t('Kunde inte uppdatera status.', 'Could not update status.'))
      console.error(err)
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleMailClick = (e: React.MouseEvent) => {
    e.stopPropagation()

    const subject =
      application.language === 'sv'
        ? `Tip the Velvet - Angående din castingansökan för ${application.act_title}`
        : `Tip the Velvet - Regarding your casting application for ${application.act_title}`

    window.location.href = `mailto:${application.email}?subject=${encodeURIComponent(subject)}`
  }

  return (
    <div
      className="admin-panel velvet-surface transition-all duration-300 hover:border-accent/30 overflow-hidden cursor-pointer"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)', padding: 0 }}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {/* STÄNGD RAD */}
      <div className="p-4 grid grid-cols-12 items-center gap-4 text-left">
        <div className="col-span-12 sm:col-span-4 flex items-center gap-3">
          <div className="text-accent/50 shrink-0">
            {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
          <div className="w-12 h-12 rounded-md overflow-hidden border border-accent/20 shrink-0 bg-black/40">
            {application.promo_image_id ? (
              <img
                src={getImageSrc(application.promo_image_id)}
                alt={application.performer_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-accent/30 text-xs font-mono">
                N/A
              </div>
            )}
          </div>
          <div className="truncate">
            <div className="font-decorative text-base text-foreground tracking-wide truncate">
              {application.performer_name}
            </div>
            <div className="text-accent italic text-xs font-heading truncate">
              {application.act_title}
            </div>
          </div>
        </div>

        <div className="col-span-6 sm:col-span-2 text-sm text-foreground/60 font-body">
          <span className="block uppercase tracking-wider text-[10px] text-accent/50 font-semibold mb-0.5">
            {t('Plats', 'Location')}
          </span>
          <span className="truncate block">
            {application.city || '—'}
            {application.country ? `, ${application.country}` : ''}
          </span>
        </div>

        <div className="col-span-6 sm:col-span-2 text-sm text-foreground/60 font-body">
          <span className="block uppercase tracking-wider text-[10px] text-accent/50 font-semibold mb-0.5">
            {t('Språk', 'Language')}
          </span>
          <span className="truncate block">
            {application.language === 'sv' ? t('Svenska', 'Swedish') : t('Engelska', 'English')}
          </span>
        </div>

        <div className="col-span-6 sm:col-span-2 text-sm text-foreground/60 font-body">
          <span className="block uppercase tracking-wider text-[10px] text-accent/50 font-semibold mb-0.5">
            {t('Datum', 'Date')}
          </span>
          <span>{formatDate(language, application.created_at)}</span>
        </div>

        <div
          className="col-span-12 sm:col-span-2 flex items-center justify-end gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <select
            value={application.review_status}
            onChange={handleStatusSelect}
            disabled={updatingStatus}
            className="admin-select !w-full min-w-[150px] !pr-8 text-xs py-1.5 px-2"
          >
            <option value="pending">{t('Osorterad', 'Unsorted')}</option>
            <option value="yes">{t('Ja', 'Yes')}</option>
            <option value="maybe">{t('Kanske', 'Maybe')}</option>
            <option value="no">{t('Nej', 'No')}</option>
          </select>

          <button
            onClick={handleMailClick}
            className="p-2 bg-accent/10 border border-accent/20 text-accent hover:bg-accent hover:text-black rounded-md transition-colors"
            title={t('Kontakta artist', 'Contact artist')}
          >
            <Mail className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* EXPANDERAD SEKTION */}
      {isExpanded && (
        <div
          className="border-t border-accent/10 bg-black/20 p-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-left cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="space-y-4">
            {application.promo_image_id && (
              <div className="border border-accent/20 rounded-md overflow-hidden bg-black/40">
                {/* FIX: object-contain istället för object-cover så inga ansikten eller hakar croppas bort */}
                <img
                  src={getImageSrc(application.promo_image_id)}
                  alt="Promo stor"
                  className="w-full h-auto max-h-80 object-contain block mx-auto bg-black/10"
                />
                {application.photographer && (
                  <div className="p-2 text-xs text-foreground/40 italic bg-black/60 border-t border-accent/10 text-center">
                    📸 {t('Fotograf', 'Photographer')}: {application.photographer}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2 pt-2">
              <span className="block uppercase tracking-wider text-[10px] text-accent/50 font-semibold">
                {t('Medier & Länkar', 'Media & Links')}
              </span>
              <div className="flex flex-col gap-2 text-sm">
                <a
                  href={`mailto:${application.email}`}
                  className="flex items-center gap-2 text-accent hover:underline"
                >
                  <Mail className="h-4 w-4 shrink-0" />{' '}
                  <span className="truncate">{application.email}</span>
                </a>
                {application.instagram_link && (
                  <a
                    href={application.instagram_link}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-accent hover:underline"
                  >
                    <Instagram /> <span>Instagram</span>
                  </a>
                )}
                {application.video_url && (
                  <a
                    href={application.video_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-accent hover:underline"
                  >
                    <Video className="h-4 w-4 shrink-0" />{' '}
                    <span>{t('Kolla video', 'Watch Video')}</span>
                  </a>
                )}
                {application.other_link && (
                  <a
                    href={application.other_link}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-accent hover:underline"
                  >
                    <LinkIcon className="h-4 w-4 shrink-0" />{' '}
                    <span className="truncate">{t('Hemsida / Annat', 'Website / Other')}</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="md:col-span-2 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div>
                <span className="block uppercase tracking-wider text-[10px] text-accent/50 font-semibold mb-1">
                  {t('Promo Text', 'Promo Text')}
                </span>
                <p className="text-sm text-foreground/80 whitespace-pre-wrap font-body leading-relaxed bg-black/30 p-3 rounded border border-accent/5">
                  {application.promo_text || <i>{t('Ingen text angiven.', 'No text provided.')}</i>}
                </p>
              </div>

              <div>
                <span className="block uppercase tracking-wider text-[10px] text-accent/50 font-semibold mb-1">
                  {t('Aktbeskrivning', 'Act Description')}
                </span>
                <p className="text-sm text-foreground/80 whitespace-pre-wrap font-body leading-relaxed bg-black/30 p-3 rounded border border-accent/5">
                  {application.act_description || (
                    <i>{t('Ingen beskrivning angiven.', 'No description provided.')}</i>
                  )}
                </p>
              </div>
            </div>

            {/* Admin Notes */}
            <div className="pt-4 border-t border-accent/10">
              <span className="block uppercase tracking-wider text-[10px] text-accent/50 font-semibold mb-1">
                {t('Admin-anteckningar (Visas ej för artist)', 'Admin Notes (Hidden from artist)')}
              </span>
              <div className="flex items-center gap-2 w-full">
                <div className="flex-1">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t(
                      'Skriv interna kommentarer här...',
                      'Write internal notes here...'
                    )}
                    className="w-full h-14 text-sm bg-black/40 border border-accent/20 rounded p-2 text-foreground focus:border-accent resize-none block"
                  />
                </div>
                <button
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  className="btn-gold !w-14 h-14 aspect-square p-0 flex items-center justify-center shrink-0"
                  title={t('Spara anteckningar', 'Save notes')}
                >
                  <Save className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
