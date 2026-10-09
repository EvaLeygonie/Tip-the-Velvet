import { ExternalLink } from 'lucide-react'
import CloudinaryImage from '@/components/CloudinaryImage'
import { useLanguage } from '@/contexts/LanguageContext'
import type { PublicEventEntertainer } from '@/types/types'

const InstagramIcon = ({ size = 16 }: { size?: number }) => (
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

interface EventPreShowProps {
  entertainers: PublicEventEntertainer[]
}

// "Welcomed by" — the pre-show entertainment greeting guests at the entrance. Deliberately
// quieter than the line-up: full-width row with a small portrait photo (same shape as the line-up cards) and name, title, text and link icons to the right, no card
// flip and no profile page of its own. Renders nothing at all until someone has been
// revealed (the public view only returns revealed entertainers).
export const EventPreShow = ({ entertainers }: EventPreShowProps) => {
  const { t, language } = useLanguage()

  if (entertainers.length === 0) return null

  // Falls back to the other language if only one was filled in.
  const pick = (sv: string | null, eng: string | null) =>
    (language === 'sv' ? sv || eng : eng || sv) ?? ''

  return (
    <div className="mt-12 space-y-2">
      <div className="text-center">
        <h2 className="font-decorative uppercase tracking-widest text-lg text-accent/80">
          {t('Välkomnade av', 'Welcomed by')}
        </h2>
      </div>

      <div className="flex flex-col items-center gap-4 max-w-7xl mx-auto">
        {entertainers.map((person) => {
          const title = pick(person.title_sv, person.title_eng)
          const bio = pick(person.bio_sv, person.bio_eng)
          // Image and name link to Instagram, or the other link if there is no Instagram.
          const mainLink = person.instagram_link || person.other_link
          const linkProps = {
            href: mainLink ?? undefined,
            target: '_blank',
            rel: 'noopener noreferrer',
          }
          const image = (
            <div
              className="group/photo relative shrink-0 w-[100px] aspect-[3/4] rounded-lg overflow-hidden border border-accent/10 bg-black/60"
              title={
                person.photo_credit ? `${t('Foto', 'Photo')}: ${person.photo_credit}` : undefined
              }
            >
              {person.image_id && (
                <CloudinaryImage
                  publicId={person.image_id}
                  width={200}
                  height={267}
                  gravityFace
                  alt={person.name ?? ''}
                  className="w-full h-full object-cover"
                />
              )}
              {person.photo_credit && (
                <div className="absolute inset-x-0 bottom-0 bg-black/70 px-1 py-1 text-center text-[10px] leading-tight text-foreground/90 opacity-0 transition-opacity duration-200 group-hover/photo:opacity-100">
                  {t('Foto', 'Photo')}: {person.photo_credit}
                </div>
              )}
            </div>
          )
          return (
            <div
              key={person.id}
              className="flex gap-4 sm:gap-5 items-center text-left bg-black/40 border border-white/5 rounded-xl p-3 w-full sm:w-[calc(80%-16px)]"
            >
              {mainLink ? (
                <a {...linkProps} className="shrink-0 hover:opacity-80 transition-opacity">
                  {image}
                </a>
              ) : (
                image
              )}
              <div className="min-w-0 flex-1 flex flex-col justify-center gap-2 text-left">
                {title && (
                  <h4 className="font-decorative uppercase tracking-widest text-base md:text-lg text-accent m-0 text-left">
                    {title}
                  </h4>
                )}
                {bio && (
                  <p className="text-sm text-foreground/70 leading-relaxed m-0 text-left">{bio}</p>
                )}
                <div className="flex items-center gap-2 pt-1">
                  <h3 className="font-decorative text-sm md:text-base text-foreground tracking-wide m-0">
                    {mainLink ? (
                      <a {...linkProps} className="hover:text-accent transition-colors">
                        {person.name}
                      </a>
                    ) : (
                      person.name
                    )}
                  </h3>
                  {person.instagram_link && (
                    <a
                      href={person.instagram_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Instagram"
                      className="text-accent hover:text-accent/80 transition-colors"
                    >
                      <InstagramIcon />
                    </a>
                  )}
                  {person.other_link && (
                    <a
                      href={person.other_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={t('Länk', 'Link')}
                      className="text-accent hover:text-accent/80 transition-colors"
                    >
                      <ExternalLink size={16} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
