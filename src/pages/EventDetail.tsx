import { useEffect, useState } from 'react'
import CloudinaryImage from '@/components/CloudinaryImage'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { Link, useParams } from 'react-router-dom'
import type { Event, OldEvent, EventImage } from '@/types'
import { getEventWithImages } from '@/services/eventService'
import { ArrowLeft, ChevronRight, ChevronLeft, X, Images } from 'lucide-react'
import GalleryEditor from '@/components/events/GalleryEditor'

const EventDetail = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const { t } = useLanguage()
  const { slug, type } = useParams()
  const isOldEvent = type === 'old'

  const [event, setEvent] = useState<Event | OldEvent | null>(null)
  const [images, setImages] = useState<EventImage[]>([])
  const sortedImages = [...images]
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
    .filter((img) => img.is_visible)

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const openLightbox = (index: number) => setLightboxIndex(index)
  const closeLightbox = () => setLightboxIndex(null)
  const prevImage = () => setLightboxIndex((i) => (i! > 0 ? i! - 1 : sortedImages.length - 1))
  const nextImage = () => setLightboxIndex((i) => (i! < sortedImages.length - 1 ? i! + 1 : 0))

  useEffect(() => {
    const fetchEvent = async () => {
      if (!slug) return
      setLoading(true)
      try {
        const data = await getEventWithImages(slug, isOldEvent)
        setEvent(data)
        setImages(data.images || [])
      } catch (err) {
        console.error('Error fetching event:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchEvent()
  }, [slug, isOldEvent])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxIndex(null)
      }
      if (e.key === 'ArrowLeft') {
        setLightboxIndex((i) => (i === null ? null : i > 0 ? i - 1 : sortedImages.length - 1))
      }
      if (e.key === 'ArrowRight') {
        setLightboxIndex((i) => (i === null ? null : i < sortedImages.length - 1 ? i + 1 : 0))
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [sortedImages.length])

  if (loading) return <p>{t('Laddar...', 'Loading...')}</p>

  return (
    <div className="page-standard">
      <div className="editor-container">
        <div className="section-header-triad">
          <div className="header-side-content md:justify-start">
            <Link to="/events">
              <ArrowLeft className="text-accent hover:scale-105" />
            </Link>
          </div>
          <h1>{event?.title || t('Event hittades inte', 'Event not found')}</h1>

          <div className="header-side-content md:justify-end">
            {user && !isOldEvent && (
              <Link to={`/admin/event-editor/${slug}`}>
                <button className="btn-admin">{t('Redigera Event', 'Edit Event')}</button>
              </Link>
            )}
          </div>
        </div>
      </div>
      <div className="gold-divider" />

      {/* GALLERY */}
      <section className="page-section">
        <div className="editor-container">
          <h2>{t('Bilder', 'Photos')}</h2>
        </div>

        {user && event && (
          <GalleryEditor
            images={images}
            event={event}
            isOldEvent={isOldEvent}
            onUpdate={() => {
              getEventWithImages(slug!, isOldEvent)
                .then((data) => setImages(data.images || []))
                .catch((err) => console.error('Error refreshing images:', err))
            }}
          />
        )}

        {images.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-foreground/30">
            <Images className="w-12 h-12" />
            <p className="font-decorative uppercase tracking-widest text-sm">
              {t('Inga bilder uppladdade ännu', 'No photos uploaded yet')}
            </p>
          </div>
        )}

        {!user && images.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {sortedImages.map((img, index) => (
              <div
                key={img.id}
                onClick={() => openLightbox(index)}
                className="aspect-square rounded-lg overflow-hidden border border-accent/10 hover:border-accent/40 transition-all hover:scale-[1.02]"
              >
                <CloudinaryImage
                  publicId={img.image_id}
                  width={600}
                  height={600}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
          >
            <X size={32} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation()
              prevImage()
            }}
            className="absolute left-4 text-white/60 hover:text-white transition-colors p-2"
          >
            <ChevronLeft size={40} />
          </button>

          <div className="max-w-5xl max-h-[90vh] mx-16" onClick={(e) => e.stopPropagation()}>
            <CloudinaryImage
              publicId={sortedImages[lightboxIndex].image_id}
              width={1920}
              height={1920}
              fit={true}
              className="max-h-[90vh] max-w-[90vw] w-auto h-auto object-contain rounded-lg"
            />
            <p className="text-center text-white/30 text-xs font-mono mt-3 tracking-widest">
              {lightboxIndex + 1} / {sortedImages.length}
            </p>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation()
              nextImage()
            }}
            className="absolute right-4 text-white/60 hover:text-white transition-colors p-2"
          >
            <ChevronRight size={40} />
          </button>
        </div>
      )}
    </div>
  )
}

export default EventDetail
