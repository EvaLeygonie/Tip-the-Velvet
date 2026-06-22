import { useEffect, useState } from 'react'
import CloudinaryImage from '@/components/CloudinaryImage'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { useParams, Link } from 'react-router-dom'
import type { Performer, PublicPerformer } from '@/types/types'
import { fetchPerformerBySlug } from '@/services/performerService'
import { getCloudinaryImagesByTag } from '@/services/cloudinaryService'
import { getImageSrc } from '@/lib/utils'
import { ArrowLeft, Images, Mail, Phone, ExternalLink, MapPin, Camera } from 'lucide-react'
import Lightbox from 'yet-another-react-lightbox'
import 'yet-another-react-lightbox/styles.css'

const isAdminPerformer = (p: Performer | PublicPerformer): p is Performer => {
  return 'email' in p
}

const InstagramIcon = ({ size = 20 }: { size?: number }) => (
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

export const PerformerDetail = () => {
  const { t } = useLanguage()
  const { slug } = useParams()
  const { user } = useAuth()

  const [performer, setPerformer] = useState<Performer | PublicPerformer | null>(null)
  const [imageIds, setImageIds] = useState<string[]>([])
  const [index, setIndex] = useState<number>(-1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getPerformerData = async () => {
      setLoading(true)
      try {
        const data = await fetchPerformerBySlug(slug!, !!user)
        setPerformer(data)

        if (data) {
          try {
            const targetTag = data.slug ? data.slug.toLowerCase() : slug!.toLowerCase()
            const cloudinaryIds = await getCloudinaryImagesByTag(targetTag)

            const filteredIds = cloudinaryIds.filter((id: string) => id !== data.promo_image_id)
            setImageIds(filteredIds)
          } catch (cloudinaryErr) {
            console.log(cloudinaryErr, ' Inga bilder hittades på Cloudinary för denna artist.')
            setImageIds([])
          }
        }
      } catch (err) {
        console.error('Error fetching performer details:', err)
      } finally {
        setLoading(false)
      }
    }
    getPerformerData()
  }, [slug, user])

  if (loading) {
    return (
      <div className="loading-container">
        <p className="loading-text">
          {t('Laddar artistprofil...', 'Loading performer profile...')}
        </p>
      </div>
    )
  }

  if (!performer) {
    return (
      <div className="empty-state">
        <p>{t('Artisten hittades inte.', 'Performer not found.')}</p>
        <Link to="/performers" className="btn-gold mt-4">
          <ArrowLeft size={16} className="mr-2" /> {t('Tillbaka', 'Back')}
        </Link>
      </div>
    )
  }

  const lightboxSlides = imageIds.map((id) => ({
    src: getImageSrc(id),
    alt: performer.performer_name || '',
  }))

  return (
    <>
      <div className="page-shell">
        {/* Bakgrundsglow hamnar bakom tack vare z-index justeringarna nedan */}
        <div className="bg-glow-spot z-0" />

        <div className="editor-container relative z-10">
          <div className="section-header-triad">
            <div className="header-side-content md:justify-start">
              <Link to="/performers">
                <ArrowLeft className="text-accent hover:scale-105 transition-transform" />
              </Link>
            </div>

            {/* Centrerat textblock med säkrat z-index mot glow-spots */}
            <div className="text-center space-y-2 relative z-10">
              <h1 className="drop-shadow-[0_0_20px_currentColor] text-4xl font-decorative text-accent">
                {performer.performer_name}
              </h1>

              {/* Stad/Land med MapPin för mycket skarpare läsbarhet mot mörk bakgrund */}
              {performer.city && (
                <p className="text-xs font-mono tracking-widest text-accent/70 uppercase flex items-center justify-center gap-1 drop-shadow-md">
                  <MapPin size={12} className="text-accent-light/80" />
                  {performer.city}, {performer.country || 'Sweden'}
                </p>
              )}

              {/* Sociala Länkar */}
              <div className="flex gap-4 justify-center pt-1">
                {performer.instagram_link && (
                  <a
                    href={performer.instagram_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent/60 hover:text-accent transition-colors p-1 hover:scale-110 duration-200"
                    title="Instagram"
                  >
                    <InstagramIcon size={18} />
                  </a>
                )}
                {performer.other_link && (
                  <a
                    href={performer.other_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent/60 hover:text-accent transition-colors p-1 hover:scale-110 duration-200"
                    title={t('Hemsida / Länk', 'Website / Link')}
                  >
                    <ExternalLink size={18} />
                  </a>
                )}
              </div>
            </div>

            <div className="header-side-content md:justify-end">
              {user && (
                <Link to={`/admin/event-editor/${slug}`}>
                  <button className="btn-admin">{t('Redigera Artist', 'Edit Performer')}</button>
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="gold-divider !my-6" />

        {/* Profilinnehåll */}
        <div className="page-content-narrow flex flex-col items-center space-y-8 relative z-10">
          {/* PROFILBILD / PROMOBILD PLACERING */}
          {performer.promo_image_id && (
            <div className="w-full max-w-sm aspect-[3/4] rounded-lg overflow-hidden border border-gold/20 shadow-[0_0_30px_rgba(0,0,0,0.8)] bg-black/40 group relative">
              <CloudinaryImage
                publicId={performer.promo_image_id}
                width={500}
                height={666}
                gravityFace={true} // HÄR ÄR DEN NYA PROPEN! Ta bort crop="..." och gravity="..."
                className="media-cover group-hover:scale-102 transition-transform duration-700"
              />
              <div className="absolute inset-0 border border-gold/10 rounded-lg pointer-events-none m-1" />
            </div>
          )}

          {/* Biografi */}
          <p className="text-sm md:text-base leading-relaxed text-foreground/80 whitespace-pre-line font-light text-center max-w-2xl">
            {t(performer.bio_sv, performer.bio_eng)}
          </p>
        </div>

        {/* KONFIDENTIELL ADMIN-BOX */}
        {user && isAdminPerformer(performer) && (
          <div className="border border-gold/30 p-5 bg-black/60 rounded-lg shadow-xl space-y-4 animate-fadeIn max-w-md mx-auto my-8 relative z-10">
            <div className="flex items-center space-x-2 border-b border-gold/10 pb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="font-decorative text-xs tracking-widest uppercase text-accent">
                {t('Intern Administration', 'Internal Admin')}
              </h3>
            </div>

            <div className="space-y-2 text-xs font-mono text-foreground/70">
              <p className="flex items-center gap-2">
                <Mail size={12} className="text-accent/60" />
                <span className="text-foreground/40">Email:</span> {performer.email}
              </p>
              {performer.phone && (
                <p className="flex items-center gap-2">
                  <Phone size={12} className="text-accent/60" />
                  <span className="text-foreground/40">Tel:</span> {performer.phone}
                </p>
              )}
            </div>

            <a
              href={`mailto:${performer.email}?subject=Tip the Velvet`}
              className="btn-admin w-full justify-center text-xs py-2 mt-2"
            >
              {t('Kontakta artisten', 'Contact Performer')}
            </a>
          </div>
        )}

        {/* Portfolio / Bildgalleri-sektion */}
        <section className="page-section-gallery relative z-10">
          <div className="editor-container text-center space-y-1 mb-6">
            <h2 className="m-0 p-0 text-xl font-decorative tracking-wider text-foreground flex items-center justify-center gap-2">
              <Camera size={18} className="text-accent/60" />
              {t('Galleri & Scenögonblick', 'Gallery & Stage Moments')}
            </h2>
          </div>

          {imageIds.length === 0 ? (
            <div className="empty-state bg-black/20 rounded-lg p-10 border border-dashed border-white/5 max-w-md mx-auto text-center flex flex-col items-center">
              <Images className="w-8 h-8 text-foreground/20 mb-2" />
              <p className="text-xs text-foreground/40 font-mono uppercase tracking-wider m-0">
                {t(
                  'Inga galleribilder taggade för denna artist ännu.',
                  'No gallery images tagged for this performer yet.'
                )}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {imageIds.map((id, imgIndex) => (
                <div
                  key={id}
                  onClick={() => setIndex(imgIndex)}
                  className="gallery-thumb group relative aspect-square overflow-hidden rounded border border-gold/10 bg-black/20 cursor-pointer shadow-md hover:border-gold/40 transition-all duration-300"
                >
                  <CloudinaryImage
                    publicId={id}
                    width={300}
                    height={300}
                    className="media-cover group-hover:scale-105 group-hover:rotate-1 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-2">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-accent-light">
                      {t('Förstora', 'Maximize')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <Lightbox
        index={index}
        slides={lightboxSlides}
        open={index >= 0}
        close={() => setIndex(-1)}
      />
    </>
  )
}
