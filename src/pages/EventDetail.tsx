import { useEffect, useState } from 'react'
// import { supabase } from '@/lib/supabase'
import CloudinaryImage from '@/components/CloudinaryImage'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { Link, useParams } from 'react-router-dom'
import type { Event, OldEvent, EventImage } from '@/types'
import { getEventWithImages } from '@/services/eventService'
import { ArrowLeft, Images } from 'lucide-react'
// import { syncImagesFromCloudinary } from '@/services/cloudinaryService'
// import { toast } from 'sonner'

const EventDetail = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const { t } = useLanguage()
  const { slug, type } = useParams()
  const isOldEvent = type === 'old'

  const [event, setEvent] = useState<Event | OldEvent | null>(null)
  const [images, setImages] = useState<EventImage[]>([])
  // const [syncing, setSyncing] = useState(false)
  // const [synced, setSynced] = useState(false)

  useEffect(() => {
    console.log('Fetching event with slug:', slug, 'isOldEvent:', isOldEvent)
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

  // const handleSyncImages = async () => {
  //   if (!event || !isOldEvent) return
  //   setSyncing(true)
  //   try {
  //     const {
  //       data: { session },
  //     } = await supabase.auth.getSession()
  //     if (!session) throw new Error(t('Inte inloggad', 'Not logged in'))

  //     const result = await syncImagesFromCloudinary(session.access_token, event.slug, {
  //       event_id: event.id,
  //     })
  //     toast.success(
  //       t(
  //         `${result.inserted} bilder synkade! (${result.skipped} redan importerade)`,
  //         `${result.inserted} images synced! (${result.skipped} already imported)`
  //       )
  //     )
  //     setSynced(true)
  //   } catch (err) {
  //     toast.error(t('Synkning misslyckades', 'Syncing failed'))
  //     console.error(err)
  //   } finally {
  //     setSyncing(false)
  //   }
  // }

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
                <button className="btn-admin">
                  <span className="text-lg">+</span>
                  {t('Redigera Event', 'Edit Event')}
                </button>
              </Link>
            )}
          </div>
        </div>
      </div>
      <div className="gold-divider" />

      {/* GALLERY */}
      <section className="page-section">
        <div className="section-header-triad">
          <div className="header-side-content md:justify-start">
            {/* {user && isOldEvent && !synced && (
              <button onClick={handleSyncImages} disabled={syncing} className="btn-admin">
                {syncing ? t('Synkar...', 'Syncing...') : t('↓ Synka bilder', '↓ Sync images')}
              </button>
            )} */}
          </div>
          <h2>{t('Bilder', 'Photos')}</h2>

          <div className="header-side-content md:justify-end">
            {/* {user && (
              <button onClick={handleSyncImages} className="btn-admin">
                {t('Redigera galleri', 'Edit gallery')}
              </button>
            )} */}
          </div>
        </div>

        {images.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-foreground/30">
            <Images className="w-12 h-12" />
            <p className="font-decorative uppercase tracking-widest text-sm">
              {t('Inga bilder uppladdade ännu', 'No photos uploaded yet')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((img) => (
              <div
                key={img.id}
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
    </div>
  )
}

export default EventDetail
