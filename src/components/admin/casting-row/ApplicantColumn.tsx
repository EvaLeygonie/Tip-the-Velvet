import { Mail, Phone, Link as LinkIcon, Video } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { getImageSrc, formatDate } from '@/lib/utils'
import type { CastingApplicationWithActs } from '@/types/types'

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

type CastingAct = NonNullable<CastingApplicationWithActs['casting_application_acts']>[number]

interface ApplicantColumnProps {
  application: CastingApplicationWithActs
  // The act whose video is shown (with several acts the video sits by the act tabs instead).
  activeAct: CastingAct | undefined
}

// Left column of an expanded row: promo image, contact details, links and submission date.
export const ApplicantColumn = ({ application, activeAct }: ApplicantColumnProps) => {
  const { t, language } = useLanguage()
  const acts = application.casting_application_acts ?? []
  return (
    <div className="space-y-4">
      {application.promo_image_id && (
        <div className="border border-accent/20 rounded-md overflow-hidden bg-black/40">
          <img
            src={getImageSrc(application.promo_image_id)}
            alt="Promo"
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
          {application.phone && (
            <a
              href={`tel:${application.phone}`}
              className="flex items-center gap-2 text-accent hover:underline"
            >
              <Phone className="h-4 w-4 shrink-0" />{' '}
              <span className="truncate">{application.phone}</span>
            </a>
          )}
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
          {/* Only one act — video is unambiguous and can sit with the other static
                    links, same as before tabs existed. With several acts, the video is
                    act-specific and lives next to the active tab instead (below). */}
          {acts.length <= 1 && activeAct?.video_url && (
            <a
              href={activeAct.video_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-accent hover:underline"
            >
              <Video className="h-4 w-4 shrink-0" /> <span>{t('Kolla video', 'Watch Video')}</span>
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

      <div className="pt-4 border-t border-accent/5 font-body text-xs text-foreground/40">
        <span className="block uppercase tracking-wider text-[9px] text-accent/40 font-semibold mb-0.5 font-sans">
          {t('Ansökan inskickad', 'Application submitted')}
        </span>
        <span>{formatDate(language, application.created_at)}</span>
      </div>
    </div>
  )
}
