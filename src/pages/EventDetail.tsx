import { useCallback, useEffect, useRef, useState } from 'react'
import CloudinaryImage from '@/components/CloudinaryImage'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { Link, useParams } from 'react-router-dom'
import type { Event, OldEvent, EventImage, PublicEventEntertainer } from '@/types/types'
import {
  getEventWithImages,
  getEventPerformers,
  type EventPerformerRow,
} from '@/services/eventService'
import { GalleryEditor } from '@/components/events/GalleryEditor'
import { FloatingBackLink } from '@/components/FloatingBackLink'
import { Images, ExternalLink, Camera } from 'lucide-react'
import Lightbox from 'yet-another-react-lightbox'
import 'yet-another-react-lightbox/styles.css'
import { getImageSrc } from '@/lib/utils'
import { EventInfo } from '@/components/events/EventInfo'
import { OldEventInfo } from '@/components/events/OldEventInfo'
import { EventLineup } from '@/components/events/EventLineup'
import { EventPreShow } from '@/components/events/EventPreShow'
import { getPublicEventEntertainers } from '@/services/entertainerService'
import { Seo } from '@/components/Seo'
import { FeedbackBadge, FeedbackSummary } from '@/components/feedback/FeedbackSummary'
import { useFeedbackSummary } from '@/hooks/useFeedbackSummary'
import { PHOTO_GROUPS, publicPhotoGroup, type PhotoGroup } from '@/lib/photoGroups'

type ExtendedEvent = Event & {
  public_photographers?: {
    id: string
    name: string
    link: string | null
  } | null
}

export const EventDetail = () => {
  const { user } = useAuth()
  const { t, language } = useLanguage()
  const { slug, type } = useParams()
  const isOldEvent = type === 'old'
  const [loading, setLoading] = useState(true)

  const titleRef = useRef<HTMLHeadingElement>(null)
  const [event, setEvent] = useState<ExtendedEvent | OldEvent | null>(null)
  // Our own events only; the old board's archive has no feedback
  // Only current events have a photobooth album link (old_events has no such column).
  const photoboothUrl = event && 'photobooth_url' in event ? event.photobooth_url : null
  const feedbackSummary = useFeedbackSummary(!isOldEvent ? event?.id : undefined)
  const [eventPerformers, setEventPerformers] = useState<EventPerformerRow[]>([])
  const [entertainers, setEntertainers] = useState<PublicEventEntertainer[]>([])
  const [images, setImages] = useState<EventImage[]>([])
  const [index, setIndex] = useState<number>(-1)

  // "All" shows performance, then stage, mingle and photobooth (uncategorised last); within each
  // category the gallery editor's display order applies. Old events have no category, so they
  // keep plain display order.
  const CATEGORY_ORDER = ['performance', 'stage', 'party', 'photobooth']
  const categoryRank = (img: EventImage) => {
    const rank = CATEGORY_ORDER.indexOf(img.category ?? '')
    return rank === -1 ? CATEGORY_ORDER.length : rank
  }
  const sortedImages = [...images]
    .sort(
      (a, b) => categoryRank(a) - categoryRank(b) || (a.display_order ?? 0) - (b.display_order ?? 0)
    )
    .filter((img) => img.is_visible)

  // Stage / Mingle / Photobooth filter badges: always all three once any photo exists, so a 0
  // tells visitors that group's photos are still on their way (events only; each photo's
  // category is set in the gallery editor)
  const [photoFilter, setPhotoFilter] = useState<PhotoGroup | 'all'>('all')
  const groupOf = (img: EventImage) => publicPhotoGroup(img.category)
  const shownImages =
    photoFilter === 'all'
      ? sortedImages
      : sortedImages.filter((img) => groupOf(img) === photoFilter)

  // Lightbox slides are served resized + auto format/quality instead of the full uploaded file:
  // Cloudinary's free plan is capped on bandwidth (credits), and the lightbox preloads neighbours.
  const lightBoxSlides = shownImages.map((img) => ({
    src: getImageSrc(`f_auto,q_auto,c_limit,w_1600/${img.image_id}`),
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

      const performersData = await getEventPerformers(data.id)
      setEventPerformers(performersData)

      // Pre-show entertainment only exists for our own events, not the old board's archive.
      if (!isOldEvent) {
        try {
          setEntertainers(await getPublicEventEntertainers(data.id))
        } catch (err) {
          console.error('Kunde inte hämta förshowunderhållning:', err)
        }
      }
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
    <div className="page-shell">
      <Seo
        path={`/events/${type}/${slug}`}
        noindex={!event}
        title={`${event?.title ?? t('Event', 'Event')} | Tip the Velvet`.slice(0, 60)}
        description={(
          (event &&
            (language === 'sv'
              ? (event as { description_sv?: string | null }).description_sv
              : (event as { description_eng?: string | null }).description_eng)) ||
          t(
            'Burlesque-show av Tip the Velvet i Göteborg.',
            'A burlesque show by Tip the Velvet in Gothenburg.'
          )
        ).slice(0, 150)}
      />
      <div className="bg-glow-spot" />
      <div className="editor-container">
        <FloatingBackLink
          to="/events"
          label={t('Tillbaka till events', 'Back to events')}
          alignTo={titleRef}
        />
        {/* items-start: the title and the Edit button share one top line instead of centring the
            button on the whole title block (subtitle and rating included) */}
        <div className="section-header-triad md:!items-start">
          <div className="header-side-content md:justify-start" />

          <div className="text-center space-y-1">
            <h1 ref={titleRef} className="drop-shadow-[0_0_20px_currentColor] pb-1">
              {event?.title || t('Event hittades inte', 'Event not found')}
            </h1>

            {event && !isOldEvent && 'subtitle' in event && event.subtitle && (
              <h2 className="font-heading text-foreground/70 text-sm md:text-base tracking-wide pb-2">
                {event.subtitle}
              </h2>
            )}
            {!isOldEvent && event && (
              <FeedbackBadge summary={feedbackSummary} eventSlug={(event as Event).slug} />
            )}
          </div>

          <div className="header-side-content md:justify-end md:pt-3">
            {user && !isOldEvent && (
              <Link to={`/admin/event-editor/${slug}`}>
                <button className="btn-admin">{t('Redigera Event', 'Edit Event')}</button>
              </Link>
            )}
          </div>
        </div>
      </div>
      <div className="gold-divider" />

      <div className="page-content-narrow">
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
          <>
            <EventInfo event={event as Event} />
            <EventLineup performers={eventPerformers} />
            <EventPreShow entertainers={entertainers} />
          </>
        )}

        {(event?.fb_album_url || photoboothUrl) && (
          <div className="flex flex-wrap justify-center gap-4">
            {event?.fb_album_url && (
              <a
                href={event?.fb_album_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-gold-outline"
              >
                <ExternalLink size={14} />
                {t('Se Facebook-album', 'View Facebook Album')}
              </a>
            )}
            {photoboothUrl && (
              <a
                href={photoboothUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-gold-outline"
              >
                <Camera size={14} />
                {t('Hämta alla fotohörnebilder', 'Get all your photobooth photos')}
              </a>
            )}
          </div>
        )}

        {/* FACEBOOK LÄNK */}
        {event &&
          'facebook_event' in event &&
          event.facebook_event &&
          !event.fb_album_url &&
          !event.photobooth_url && (
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
      <section className="page-section-gallery">
        <div className="editor-container text-center space-y-1 mb-4">
          <h2 className="m-0 p-0">{t('Bilder', 'Photos')}</h2>
          {/* FOTOGRAPHER */}
          {isOldEvent
            ? (event as OldEvent).photographer && (
                <div className="meta-row justify-center pt-2">
                  <Camera size={14} className="text-accent/70" />
                  <span>{(event as OldEvent).photographer}</span>
                </div>
              )
            : (event as ExtendedEvent).public_photographers && (
                <div className="meta-row justify-center pt-2">
                  <Camera size={14} className="text-accent/70" />
                  {(event as ExtendedEvent).public_photographers?.link ? (
                    <a
                      href={(event as ExtendedEvent).public_photographers!.link!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground hover:underline inline-flex items-center gap-1"
                    >
                      {(event as ExtendedEvent).public_photographers!.name}
                      <ExternalLink size={11} className="opacity-60" />
                    </a>
                  ) : (
                    <span>{(event as ExtendedEvent).public_photographers!.name}</span>
                  )}
                </div>
              )}
        </div>

        {user && event && (
          <GalleryEditor
            images={images}
            event={event}
            isOldEvent={isOldEvent}
            onUpdate={loadEventData}
            eventPerformers={eventPerformers}
          />
        )}

        {images.length === 0 && (
          <div className="empty-state py-6">
            <Images className="w-12 h-12" />
            <p className="font-decorative uppercase tracking-widest text-sm">
              {t('Inga bilder uppladdade ännu', 'No photos uploaded yet')}
            </p>
            {!isOldEvent && (
              <p className="max-w-md text-center text-sm normal-case tracking-normal">
                {t(
                  'Bilderna laddas upp här så fort fotografen är klar med dem. Det brukar ta en liten stund – tack för ditt tålamod!',
                  'The photos will be uploaded here as soon as the photographer has finished with them. It usually takes a little while, thank you for your patience!'
                )}
              </p>
            )}
          </div>
        )}

        {!user && !isOldEvent && images.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mb-5">
            {(['all', ...PHOTO_GROUPS.map((g) => g.key)] as const).map((key) => {
              const group = PHOTO_GROUPS.find((g) => g.key === key)
              const count =
                key === 'all'
                  ? sortedImages.length
                  : sortedImages.filter((img) => groupOf(img) === key).length
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPhotoFilter(key)}
                  className={`${
                    photoFilter === key ? 'btn-gold' : 'btn-gold-outline'
                  } text-xs py-1.5 px-4 ${count === 0 && photoFilter !== key ? 'opacity-60' : ''}`}
                >
                  {group ? t(group.sv, group.eng) : t('Alla', 'All')}{' '}
                  <span className="opacity-60">{count}</span>
                </button>
              )
            })}
          </div>
        )}

        {!user && images.length > 0 && shownImages.length === 0 && (
          <p className="text-center text-sm text-foreground/70 mb-6">
            {t(
              'Bilderna i den här kategorin kommer snart – håll utkik!',
              'Photos in this category are coming soon – stay tuned!'
            )}
          </p>
        )}

        {!user && images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 max-w-6xl mx-auto">
            {shownImages.map((img, idx) => (
              <div
                key={img.id}
                onClick={() => setIndex(idx)}
                className="gallery-thumb cursor-pointer"
              >
                <CloudinaryImage
                  publicId={img.image_id}
                  width={600}
                  height={600}
                  alt={`${event?.title ?? 'Tip the Velvet'} – ${t('bild', 'image')} ${idx + 1}`}
                  className="media-cover"
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* REVIEWS: last on the page, so approved comments can grow here without pushing the photos down */}
      {!isOldEvent && event && (
        <div className="px-4 sm:px-6 md:px-10 mb-12">
          <div className="max-w-6xl mx-auto">
            <FeedbackSummary
              summary={feedbackSummary}
              eventId={(event as Event).id}
              eventSlug={(event as Event).slug}
            />
          </div>
        </div>
      )}

      <Lightbox
        open={index >= 0}
        index={index}
        close={() => setIndex(-1)}
        slides={lightBoxSlides}
        carousel={{ preload: 1 }}
      />
    </div>
  )
}
