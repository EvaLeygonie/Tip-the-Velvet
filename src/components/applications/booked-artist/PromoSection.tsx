import CloudinaryImage from '@/components/CloudinaryImage'
import { useLanguage } from '@/contexts/LanguageContext'
import type { CastingApplicationPortalData } from '@/types/types'
import type { BookedFormData, FormChangeEvent } from './types'

interface PromoSectionProps {
  application: CastingApplicationPortalData
  formData: Pick<BookedFormData, 'bio_sv' | 'bio_eng'>
  onChange: (e: FormChangeEvent) => void
}

export const PromoSection = ({ application, formData, onChange }: PromoSectionProps) => {
  const { t } = useLanguage()
  return (
    <div className="login-card space-y-6">
      <div className="flex items-center gap-2 text-lg font-bold text-accent border-b border-border/50 pb-3 justify-center">
        <h2>{t('Artist Promo', 'Artist Promo')}</h2>
      </div>
      <p className="text-sm text-foreground/90">
        {t(
          'Används för eventpromo och din artistprofil i vårt "Hall of Fame"',
          'Used for event promo and your artist profile in our "Hall of Fame"'
        )}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        <div className="form-field md:col-span-4 flex flex-col h-full">
          <label className="form-label-block">{t('Promobild', 'Promo Image')}</label>
          <div className="relative flex-1 flex flex-col items-center justify-center border border-accent/20 rounded-lg p-2 bg-background/30 min-h-[220px]">
            {application.promo_image_id ? (
              <CloudinaryImage
                publicId={application.promo_image_id}
                width={400}
                height={400}
                fit
                className="max-h-full max-w-full object-contain rounded"
              />
            ) : (
              <span className="text-xs text-foreground/50">
                {t('Ingen bild tillgänglig', 'No image available')}
              </span>
            )}
          </div>
        </div>

        <div className="md:col-span-8 flex flex-col gap-4">
          <div className="form-field flex-1 flex flex-col">
            <label className="form-label-gold text-xs block mb-1">
              {t('Promo text (Svenska)', 'Promo text (Swedish)')}
            </label>
            <textarea
              name="bio_sv"
              placeholder={t(
                'Din presentationstext på svenska...',
                'Your presentation in Swedish...'
              )}
              value={formData.bio_sv}
              onChange={onChange}
              className="login-input flex-1 w-full resize-none p-3 min-h-[100px] text-sm"
            />
          </div>

          <div className="form-field flex-1 flex flex-col">
            <label className="form-label-gold text-xs block mb-1">
              {t('Promo text (Engelska)', 'Promo text (English)')}
            </label>
            <textarea
              name="bio_eng"
              placeholder={t(
                'Din presentationstext på engelska...',
                'Your presentation in English...'
              )}
              value={formData.bio_eng}
              onChange={onChange}
              className="login-input flex-1 w-full resize-none p-3 min-h-[100px] text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
