import { useEffect, useState } from 'react'
import CloudinaryImage from '@/components/CloudinaryImage'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { Link, useParams } from 'react-router-dom'
import type { Event, OldEvent, EventImage } from '@/types'
import { getEventWithImages } from '@/services/eventService'
import { GalleryEditor } from '@/components/events/GalleryEditor'
import { ArrowLeft, Images, ExternalLink } from 'lucide-react'
import Lightbox from 'yet-another-react-lightbox'
import 'yet-another-react-lightbox/styles.css'
import { getImageSrc } from '@/lib/utils'
import { EventInfo } from '@/components/events/EventInfo'
import { OldEventInfo } from '@/components/events/OldEventInfo'

export const EventDetail = () => {
  const { user } = useAuth()
  const { t } = useLanguage()
  const { slug, type } = useParams()
  const isOldEvent = type === 'old'
  const [loading, setLoading] = useState(true)

  const [event, setEvent] = useState<Event | OldEvent | null>(null)
  const [images, setImages] = useState<EventImage[]>([])
  const [index, setIndex] = useState<number>(-1)
  //* -1 istället för false => Betyder att lightboxen är stängd!

  const sortedImages = [...images]
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
    .filter((img) => img.is_visible)

  const lightBoxSlides = sortedImages.map((img) => ({
    src: getImageSrc(img.image_id),
    alt: img.event_slug,
  }))

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

      <div className="max-w-3xl mx-auto space-y-8 text-center my-12">
        {isOldEvent ? (
          <OldEventInfo event={event as OldEvent}></OldEventInfo>
        ) : (
          <EventInfo event={event as Event}></EventInfo>
        )}

        {event &&
          (() => {
            const langKey = `description_${t('sv', 'eng')}` as keyof typeof event
            const description = event[langKey] as string
            return description && <p>{description}</p>
          })()}

        {event?.fb_album_url && (
          <div className="pt-2">
            <a
              href={event.fb_album_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-2.5 border border-accent/40 bg-accent/5 hover:bg-accent hover:text-black text-accent text-xs font-semibold uppercase tracking-widest rounded-xl transition-all duration-300"
            >
              <ExternalLink size={14} />
              {t('Se Facebook-album', 'View Facebook Album')}
            </a>
          </div>
        )}
      </div>
      <div className="gold-divider" />

      {/* GALLERY */}
      <section className="page-section mt-10">
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
            {sortedImages.map((img, idx) => (
              <div
                key={img.id}
                onClick={() => setIndex(idx)}
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

      <Lightbox
        open={index >= 0}
        index={index}
        close={() => setIndex(-1)}
        slides={lightBoxSlides}
      />
    </div>
  )
}
