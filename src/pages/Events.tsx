import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { OldEvent, Event } from '@/types'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { FeaturedEventCard } from '@/components/events/featuredEventCard'
import { ArchivedEventCard } from '@/components/events/archivedEventCard'

const Events = () => {
  const [oldEvents, setOldEvents] = useState<OldEvent[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const { t } = useLanguage()

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true)

      const [eventsList, oldEventsList] = await Promise.all([
        supabase.from('events').select('*').order('event_start', { ascending: false }),
        supabase.from('old_events').select('*').order('date', { ascending: false }),
      ])

      if (eventsList.data) setEvents(eventsList.data)
      if (oldEventsList.data) setOldEvents(oldEventsList.data)

      if (eventsList.error) console.error('Events error:', eventsList.error)
      if (oldEventsList.error) console.error('Old Events error:', oldEventsList.error)

      setLoading(false)
    }

    fetchAllData()
  }, [])

  const upcomingEvents = events.filter((e) => e.status === 'published')
  const pastNewEvents = events.filter((e) => e.status === 'archived')

  if (loading)
    return (
      <div className="loading-container">
        <p className="loading-text">{t('Laddar...', 'Loading...')}</p>
      </div>
    )

  return (
    <>
      <div className="page-standard">
        {/* 1. Kommande (Featured) */}
        <section className="container-wide">
          <div>
            <div className="section-header-triad">
              {/* Vänster kolumn - tom för att balansera upp högersidan */}
              <div className="hidden md:block"></div>

              {/* Mitten - Rubriken är nu perfekt centrerad */}
              <h1>{t('Kommande Event', 'Upcoming Events')}</h1>

              <div className="header-side-content">
                {user && (
                  <Link to="/admin/event-editor">
                    <button className="btn-admin">
                      <span className="text-lg">+</span>
                      {t('Skapa Event', 'Add Event')}
                    </button>
                  </Link>
                )}
              </div>
            </div>
          </div>

          {upcomingEvents.length > 0 ? (
            upcomingEvents.map((e) => <FeaturedEventCard key={e.id} event={e} />)
          ) : (
            <FeaturedEventCard
              event={
                {
                  title: t('TBA', 'TBA'),
                  subtitle: t('Annonseras snart...', 'Stay tuned...'),
                  image_id: null,
                } as Event
              }
            />
          )}
        </section>

        {/* 2. Tidigare (Nya styrelsen) */}
        <section className="container-wide page-section">
          <h2>{t('Tidigare event', 'Past Events')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pastNewEvents.map((e) => (
              <ArchivedEventCard key={e.id} event={e} />
            ))}
          </div>
        </section>

        {/* 3. Arkiv (Gamla styrelsen) */}
        <section className="container-wide page-section">
          <div className="text-center space-y-4">
            <h2>{t('Arkiv', 'Archive')}</h2>
            <p className="max-w-xl mx-auto text-lg italic opacity-80">
              {t(
                'En hyllning till klubbens historia, här kan ni se event från tidigare styrelsen innan vi tog över 2024!',
                "A tribute to the club's history, here you can see events from the previous board before we took over in 2024!"
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {oldEvents.map((e) => (
              <ArchivedEventCard key={e.id} event={e as unknown as Event} />
            ))}
          </div>
        </section>
      </div>
    </>
  )
}

export default Events
