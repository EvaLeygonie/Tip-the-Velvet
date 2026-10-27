import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import type { OldEvent, Event } from '@/types/types'
import { FeaturedEventCard } from '@/components/events/featuredEventCard'
import { ArchivedEventCard } from '@/components/events/archivedEventCard'
import { fetchEvents } from '@/services/eventService'
import { getFeedbackAverages } from '@/services/feedbackService'
import { Seo } from '@/components/Seo'

export const Events = () => {
  const [oldEvents, setOldEvents] = useState<OldEvent[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [ratings, setRatings] = useState<Record<string, { average: number; count: number }>>({})
  const { user } = useAuth()
  const { t } = useLanguage()

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true)
      try {
        const [eventsList, oldEventsList] = await Promise.all([
          fetchEvents(false),
          fetchEvents(true),
        ])
        setEvents(eventsList)
        setOldEvents(oldEventsList)
      } catch (err) {
        console.error('Error fetching events:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAllData()
    // The star ratings on the cards are a bonus: the list works without them
    getFeedbackAverages()
      .then(setRatings)
      .catch((err) => console.error(err))
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
      <Seo
        path="/events"
        title={t(
          'Kommande burlesque-event i Göteborg | Tip the Velvet',
          'Upcoming Burlesque Events in Gothenburg | Tip the Velvet'
        )}
        description={t(
          'Kommande och tidigare burlesque-shower från Tip the Velvet i Göteborg. Köp biljetter och se vårt arkiv.',
          'Upcoming and past burlesque shows from Tip the Velvet in Gothenburg. Get tickets and browse our archive.'
        )}
      />
      <div className="page-standard">
        <div>
          <div className="section-header-triad">
            <div className="hidden md:block"></div>

            <h1 className="!pb-0">{t('Kommande Event', 'Upcoming Events')}</h1>

            <div className="header-side-content md:justify-end">
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
          <div className="gold-divider" />
        </div>

        <section className="container-wide pt-2">
          <div className="middle-glow" />
          <div className="events-featured-stack">
            {upcomingEvents.length > 0 ? (
              upcomingEvents.map((e) => <FeaturedEventCard key={e.id} event={e} />)
            ) : (
              <div className="callout-panel w-full md:w-[calc(66.667%+1.333rem)] !mt-0 !p-4 !space-y-2">
                <h2 className="!pb-0 font-decorative text-accent">TBA</h2>
                <p className="text-sm text-foreground/70">
                  {t(
                    'Nästa event annonseras snart. Prenumerera på vårt nyhetsbrev så får du veta först!',
                    'The next event will be announced soon. Subscribe to our newsletter to be the first to know!'
                  )}
                </p>
                <div className="pt-3">
                  <button
                    type="button"
                    onClick={() =>
                      document
                        .getElementById('newsletter')
                        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }
                    className="btn-gold-outline !py-1.5"
                  >
                    {t('Till nyhetsbrevet', 'Go to the newsletter')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="container-wide page-section">
          <h2 className="!pb-0">{t('Tidigare event', 'Past Events')}</h2>
          <div className="gold-divider" />
          <div className="card-grid">
            {pastNewEvents.map((e) => (
              <ArchivedEventCard key={e.id} event={e} rating={ratings[e.id]} />
            ))}
          </div>
        </section>

        <section className="container-wide page-section">
          <div>
            <h2>{t('Arkiv', 'Archive')}</h2>
            <p className="subtitle !pb-0">
              {t(
                'En hyllning till klubbens historia, här kan ni se event från tidigare styrelsen innan vi tog över 2024!',
                "A tribute to the club's history, here you can see events from the previous board before we took over in 2024!"
              )}
            </p>
          </div>
          <div className="gold-divider" />

          <div className="card-grid">
            {oldEvents.map((e) => (
              <ArchivedEventCard key={e.id} event={e as unknown as Event} />
            ))}
          </div>
        </section>
      </div>
    </>
  )
}
