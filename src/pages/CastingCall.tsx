import { useState, useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import type { Event } from '@/types/types'
import { getEventWithCasting } from '@/services/castingService'
import { ApplicationCard } from '@/components/castings/ApplicationCard'

export const CastingCall = () => {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [castingEvents, setCastingEvents] = useState<Event[]>([])

  useEffect(() => {
    const getCastings = async () => {
      setLoading(true)
      try {
        const data = await getEventWithCasting()
        setCastingEvents(data)
      } catch (err) {
        console.error('Error fetching events:', err)
      } finally {
        setLoading(false)
      }
    }
    getCastings()
  }, [])

  if (loading)
    return (
      <div className="loading-container">
        <p className="loading-text">{t('Laddar...', 'Loading...')}</p>
      </div>
    )

  return (
    <>
      <div className="page-shell">
        <header className="header !mb-0 !pb-5">
          <h1>Casting Call</h1>

          <div className="gold-divider" />

          <p className="subtitle">
            {t(
              'Om du har frågor kring vad vi letar efter för ett specifikt event, mail oss gärna på: ',
              'If you have questions about what we are looking for for a particular event, feel free to contact us at: '
            )}
            <a href="mailto:velvet.gbg@gmail.com" className="text-accent hover:text-accent/80 ">
              <span>velvet.gbg@gmail.com</span>
            </a>
          </p>
        </header>

        <div className="mx-auto px-4 relative">
          <div className="middle-glow" />
          {castingEvents.length === 0 ? (
            <div className="text-center">
              <div className="panel-callout">
                <h2 className="text-2xl sm:text-3xl font-decorative text-accent mb-4 drop-shadow-[0_0_15px_currentColor]">
                  {t('Inga öppna casting calls', 'No Open Casting Calls')}
                </h2>
                <p className="text-foreground/80 font-sans text-lg leading-relaxed">
                  {t(
                    'Det finns inga event att söka till just nu.',
                    'There are no events to apply to at this time.'
                  )}
                </p>
                <p className="text-foreground/80 font-sans text-lg leading-relaxed">
                  {t(
                    'Följ oss på sociala medier för att stanna uppdaterad!',
                    'Follow us on social media to stay updated!'
                  )}
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-8 md:space-y-10">
              {castingEvents.map((event: Event) => (
                <ApplicationCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
