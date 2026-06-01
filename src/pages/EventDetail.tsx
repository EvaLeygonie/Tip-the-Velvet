import { useCallback, useEffect, useState } from 'react'
import CloudinaryImage from '@/components/CloudinaryImage'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { Link, useParams } from 'react-router-dom'
import type { Event, OldEvent, EventImage } from '@/types/types'
import { getEventWithImages } from '@/services/eventService'
import { GalleryEditor } from '@/components/events/GalleryEditor'
import { ArrowLeft, Images, ExternalLink, Camera } from 'lucide-react'
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

  const sortedImages = [...images]
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
    .filter((img) => img.is_visible)

  const lightBoxSlides = sortedImages.map((img) => ({
    src: getImageSrc(img.image_id),
    alt: img.event_slug || '',
  }))

  const loadEventData = useCallback(async () => {
    if (!slug) return

    try {
      const data = (await getEventWithImages(slug, isOldEvent)) as (Event | OldEvent) & {
        images?: EventImage[]
      }

      setEvent(data)
      setImages(data.images || [])
    } catch (err) {
      console.error('Error fetching event:', err)
    } finally {
      setLoading(false)
    }
  }, [slug, isOldEvent])

  useEffect(() => {
    let isMounted = true

    const fetchData = async () => {
      if (isMounted) {
        await loadEventData()
      }
    }

    fetchData()

    return () => {
      isMounted = false
    }
  }, [loadEventData])

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

          <div className="text-center space-y-2">
            <h1 className="drop-shadow-[0_0_20px_currentColor]">
              {event?.title || t('Event hittades inte', 'Event not found')}
            </h1>

            {event && !isOldEvent && 'subtitle' in event && event.subtitle && (
              <h2 className="font-heading text-foreground/70 text-sm md:text-base tracking-wide mt-1">
                {event.subtitle}
              </h2>
            )}
          </div>

          <div className="header-side-content md:justify-end">
            {user && !isOldEvent && (
              <Link to={`/admin/event-editor/${slug}`}>
                <button className="btn-admin">{t('Redigera Event', 'Edit Event')}</button>
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto space-y-10 px-10 my-12">
        {event &&
          (() => {
            const langKey = `description_${t('sv', 'eng')}` as keyof typeof event
            const description = event[langKey] as string
            return description && <p className="text-info">{description}</p>
          })()}

        <div className="gold-divider" />

        {isOldEvent ? (
          <OldEventInfo event={event as OldEvent}></OldEventInfo>
        ) : (
          <EventInfo event={event as Event}></EventInfo>
        )}
        {event?.fb_album_url && (
          <div className="flex justify-center">
            <a
              href={event.fb_album_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-gold-outline"
            >
              <ExternalLink size={14} />
              {t('Se Facebook-album', 'View Facebook Album')}
            </a>
          </div>
        )}
        {/* FACEBOOK LÄNK */}
        {event && 'facebook_event' in event && event.facebook_event && !event.fb_album_url && (
          <div className="flex justify-center">
            <a
              href={event.facebook_event}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-gold-outline"
            >
              <ExternalLink size={14} />
              {t('Se Facebook-event', 'View Facebook Event')}
            </a>
          </div>
        )}
      </div>

      <div className="gold-divider" />

      {/* GALLERY */}
      <section className="page-section mt-10">
        <div className="editor-container text-center space-y-1 mb-4">
          <h2 className="m-0 p-0">{t('Bilder', 'Photos')}</h2>
          {/* FOTOGRAPHER */}
          {event?.photographer && (
            <div className="flex items-center justify-center gap-2 text-foreground/80 text-sm md:text-base font-body pt-2">
              <Camera size={14} className="text-accent/70" />
              <span>{event.photographer}</span>
            </div>
          )}
        </div>

        {user && event && (
          <GalleryEditor
            images={images}
            event={event}
            isOldEvent={isOldEvent}
            onUpdate={loadEventData}
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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
