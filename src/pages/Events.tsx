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
      <div className="flex justify-center items-center min-h-[50vh]">
        <p className="font-decorative animate-pulse text-accent">{t('Laddar...', 'Loading...')}</p>
      </div>
    )

  return (
    <>
      <div className="section-stack py-12">
        {/* 1. Kommande (Featured) */}
        <section className="container mx-auto px-4 space-y-8">
          <div className="max-w-7xl mx-auto px-6 md:px-10 mb-8">
            <div className="grid grid-cols-3 items-center">
              {/* Vänster kolumn - tom för att balansera upp högersidan */}
              <div className="hidden md:block"></div>

              {/* Mitten - Rubriken är nu perfekt centrerad */}
              <h2 className="text-accent font-decorative text-2xl md:text-3xl uppercase tracking-[0.3em] text-center whitespace-nowrap">
                {t('Kommande Event', 'Upcoming Events')}
              </h2>

              <div className="flex justify-end">
                {user && (
                  <Link to="/admin/event-editor">
                    <button className="flex items-center gap-2 px-3 py-1.5 border border-white/20 hover:border-white/50 bg-white/5 hover:bg-white/10 text-white rounded transition-all duration-300 group">
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
        <section className="container-wide space-y-8 mt-24">
          <h2 className="text-center font-decorative text-2xl uppercase tracking-widest text-accent">
            {t('Tidigare event', 'Past Events')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pastNewEvents.map((e) => (
              <ArchivedEventCard key={e.id} event={e} />
            ))}
          </div>
        </section>

        {/* 3. Arkiv (Gamla styrelsen) */}
        <section className="container-wide space-y-8 mt-24">
          <div className="text-center space-y-4">
            <h2 className="font-decorative text-2xl uppercase tracking-widest text-accent ">
              {t('Arkiv', 'Archive')}
            </h2>
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
