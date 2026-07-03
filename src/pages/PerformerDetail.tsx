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
import Captions from 'yet-another-react-lightbox/plugins/captions'
import 'yet-another-react-lightbox/styles.css'
import 'yet-another-react-lightbox/plugins/captions.css'

interface GalleryImage {
  id: string
  photographer?: string
}

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
  const [images, setImages] = useState<GalleryImage[]>([])
  const [index, setIndex] = useState<number>(-1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getPerformerData = async () => {
      setLoading(true)
      try {
        const data = await fetchPerformerBySlug(slug!, !!user)
        setPerformer(data)

        if (data && slug) {
          try {
            const cloudinaryResponse = await getCloudinaryImagesByTag(slug, 'Events')

            if (Array.isArray(cloudinaryResponse)) {
              setImages(
                cloudinaryResponse.map((img) => ({
                  id: img.public_id,
                  photographer:
                    img.context?.custom?.photographer || img.context?.photographer || '',
                }))
              )
            } else {
              setImages([])
            }
          } catch (cloudinaryErr) {
            console.error('Cloudinary Error:', cloudinaryErr)
            setImages([])
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

  const lightboxSlides = images.map((img) => ({
    src: getImageSrc(img.id),
    alt: performer.performer_name || '',
    description: img.photographer
      ? `${t('Fotograf:', 'Photographer:')} ${img.photographer}`
      : undefined,
  }))

  return (
    <>
      <div className="page-shell !max-w-none w-full px-0">
        <div className="bg-glow-spot z-0" />

        <div className="w-full max-w-7xl mx-auto px-4 md:px-8 relative z-10">
          <div className="section-header-triad">
            <div className="header-side-content md:justify-start">
              <Link to="/performers">
                <ArrowLeft className="text-accent hover:scale-105 transition-transform" />
              </Link>
            </div>

            <div className="text-center space-y-2 relative z-10">
              <h1 className="drop-shadow-[0_0_20px_currentColor] text-4xl font-decorative text-accent m-0 p-0">
                {performer.performer_name}
              </h1>

              {performer.city && (
                <p className="text-xs font-mono tracking-widest text-accent/70 uppercase flex items-center justify-center gap-1 drop-shadow-md m-0">
                  <MapPin size={12} />
                  {performer.city}, {performer.country || 'Sweden'}
                </p>
              )}

              {/* SOCIALA LÄNKAR (PUBLIKA) */}
              <div className="flex gap-4 justify-center items-center pt-2">
                {performer.instagram_link && (
                  <a
                    href={performer.instagram_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent/60 hover:text-accent transition-all p-1 hover:scale-110 duration-200"
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
                    className="text-accent/60 hover:text-accent transition-all p-1 hover:scale-110 duration-200"
                    title={t('Hemsida / Länk', 'Website / Link')}
                  >
                    <ExternalLink size={18} />
                  </a>
                )}
              </div>

              {/* LÄNKAR FÖR ADMIN */}
              {user && isAdminPerformer(performer) && (
                <div className="animate-fade-in flex flex-wrap gap-x-4 gap-y-1 justify-center items-center pt-1.5 text-xs font-mono text-accent">
                  <a
                    href={`mailto:${performer.email}?subject=Tip the Velvet`}
                    className="hover:text-accent-light underline decoration-accent/40 hover:decoration-accent transition-all flex items-center gap-1"
                  >
                    <Mail size={12} />
                    <span>{performer.email}</span>
                  </a>

                  {performer.phone && (
                    <>
                      <span className="text-accent/30 hidden sm:inline">|</span>
                      <a
                        href={`tel:${performer.phone}`}
                        className="hover:text-accent-light underline decoration-accent/40 hover:decoration-accent transition-all flex items-center gap-1"
                      >
                        <Phone size={12} />
                        <span>{performer.phone}</span>
                      </a>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="header-side-content md:justify-end">
              {user && (
                <Link to={`/hall-of-fame-form/${slug}`}>
                  <button className="btn-admin text-xs uppercase tracking-widest">
                    {t('Redigera Artist', 'Edit Performer')}
                  </button>
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="gold-divider !my-8" />

        {/* Profilinnehåll */}
        <div className="max-w-2xl mx-auto flex flex-col items-center space-y-6 relative z-10 px-4">
          {/* PROFILBILD */}
          {performer.promo_image_id && (
            <div className="w-full max-w-sm aspect-[3/4] rounded-lg overflow-hidden border border-accent/20 shadow-[0_0_30px_rgba(0,0,0,0.8)] bg-black/40 group relative">
              <CloudinaryImage
                publicId={performer.promo_image_id}
                width={500}
                height={666}
                gravityFace={true}
                className="media-cover group-hover:scale-102 transition-transform duration-700"
              />
            </div>
          )}

          {performer.photographer && (
            <div className="meta-row justify-center text-xs text-foreground/70 italic">
              <Camera size={13} className="text-accent/60 mr-1" />
              <span>{t('Fotograf:', 'Photographer:')} </span>
              <span className="text-accent not-italic font-medium ml-1">
                {performer.photographer}
              </span>
            </div>
          )}

          {/* Biografi */}
          <p className="text-sm md:text-base text-center font-light opacity-90 pt-4 leading-relaxed whitespace-pre-line text-foreground/80">
            {t(performer.bio_sv, performer.bio_eng)}
          </p>
        </div>

        <div className="gold-divider !my-12" />

        {/* BILDGALLERI */}
        <section className="w-full max-w-none px-4 md:px-12 pb-16 relative z-10">
          <div className="text-center space-y-2 mb-8">
            <h2 className="m-0 p-0 text-2xl font-decorative tracking-widest text-accent flex items-center justify-center gap-2">
              <Camera size={20} className="text-accent" />
              {t('Galleri & Scenögonblick', 'Gallery & Stage Moments')}
            </h2>
          </div>

          {images.length === 0 ? (
            <div className="w-full max-w-4xl mx-auto border-2 border-dashed border-accent/10 rounded-xl p-12 bg-black/10 text-center flex flex-col items-center justify-center">
              <Images className="w-10 h-10 text-accent/20 mb-3" />
              <p className="text-xs font-mono uppercase tracking-widest text-foreground/40 m-0">
                {t(
                  'Inga galleribilder taggade för denna artist ännu.',
                  'No gallery images tagged for this performer yet.'
                )}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 w-full">
              {images.map((img, imgIndex) => (
                <div
                  key={img.id}
                  onClick={() => setIndex(imgIndex)}
                  className="gallery-thumb group relative aspect-square overflow-hidden rounded-lg border border-accent/10 bg-black/40 cursor-pointer shadow-lg hover:border-accent/50 transition-all duration-300"
                >
                  <CloudinaryImage
                    publicId={img.id}
                    width={400}
                    height={400}
                    className="media-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                  />
                  {/* Snygg hovringseffekt med fotografens namn */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                    {img.photographer && (
                      <span className="text-[11px] font-mono tracking-wide text-accent/90 truncate flex items-center gap-1">
                        <Camera size={10} />
                        {img.photographer}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>{' '}
      <Lightbox
        index={index}
        slides={lightboxSlides}
        open={index >= 0}
        close={() => setIndex(-1)}
        plugins={[Captions]}
        captions={{ descriptionTextAlign: 'center' }}
      />
    </>
  )
}
