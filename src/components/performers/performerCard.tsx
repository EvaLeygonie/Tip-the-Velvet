import { Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import CloudinaryImage from '@/components/CloudinaryImage'
import type { Performer } from '@/types/types'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { useSiteSettings } from '@/hooks/useSiteSettings'

export const PerformerCard = ({ performer }: { performer: Performer }) => {
  const { t } = useLanguage()
  const { user } = useAuth()
  const siteSettings = useSiteSettings()
  // The board can hide the Hall of Fame's images (Dashboard) when Cloudinary's credits run low;
  // the profile text stays. Nothing loads until the setting is known. Logged-in admins still see them.
  const imagesHidden = siteSettings.hallOfFameImagesHidden && !user
  const promoImageId = siteSettings.ready && !imagesHidden ? performer.promo_image_id : null

  const bioKey = t('bio_sv', 'bio_eng') as keyof Performer
  const description = performer[bioKey] as string

  return (
    <Link
      to={`/performers/${performer.slug}`}
      className="group event-showcase-card flex flex-col h-full hover:-translate-y-2 transition-all duration-300"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-black/40">
        {promoImageId ? (
          <>
            <div className="w-full h-full transform group-hover:scale-105 transition-transform duration-700 ease-out">
              <CloudinaryImage
                publicId={promoImageId}
                width={600}
                height={800}
                alt={performer.performer_name}
                className="object-cover w-full h-full"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-accent/60 to-transparent shadow-[0_0_8px_theme(colors.accent.DEFAULT)]" />
          </>
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-gradient-to-b from-accent/5 to-transparent">
            <div className="text-center space-y-2">
              <Sparkles
                className={`w-10 h-10 mx-auto ${imagesHidden ? 'text-accent' : 'text-accent/20'}`}
              />
              <span
                className={`block font-decorative tracking-widest uppercase ${
                  imagesHidden ? 'text-xs text-white' : 'text-[9px] text-accent/30'
                }`}
              >
                {imagesHidden
                  ? t('Bild kommer snart', 'Image coming soon')
                  : !performer.promo_image_id
                    ? t('Ingen bild', 'No image')
                    : ''}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="p-5 space-y-3 bg-gradient-to-b from-transparent to-black/30 flex-1 flex flex-col justify-between items-center text-center md:items-start md:text-left">
        <div className="space-y-2 w-full">
          <h3 className="text-xl md:text-2xl font-decorative text-accent text-center group-hover:text-white transition-colors line-clamp-1">
            {performer.performer_name}
          </h3>

          {description && (
            <p className="text-xs text-foreground/70 leading-relaxed tracking-wide line-clamp-3 normal-case font-normal">
              {description}
            </p>
          )}
        </div>

        {(performer.city || performer.country) && (
          <p className="text-[12px] uppercase tracking-widest text-accent/70 font-medium pt-1 mx-auto">
            {performer.city}
            {performer.city && performer.country ? ', ' : ''}
            {performer.country}
          </p>
        )}
      </div>
    </Link>
  )
}
