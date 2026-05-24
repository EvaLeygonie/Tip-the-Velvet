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
      <div className="page-standard">
        <h1>Casting Call</h1>
        <section className="py-20 bg-background relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/10 rounded-full blur-3xl" />
          <div className="container mx-auto px-4 relative z-10">
            {castingEvents.length === 0 ? (
              <div className="text-center py-20">
                <div className="bg-card/40 backdrop-blur-sm p-12 rounded-lg shadow-[0_10px_50px_hsl(0_60%_5%/0.6)] border border-accent/20 max-w-2xl mx-auto">
                  <h2 className="text-3xl font-decorative text-accent mb-4 drop-shadow-[0_0_15px_currentColor]">
                    {t('Inga öppna casting calls', 'No Open Casting Calls')}
                  </h2>
                  <p className="text-foreground/80 font-sans text-lg leading-relaxed">
                    {t(
                      'Det finns inga event att söka till just nu. Följ oss på sosicala medier för att stanna uppdaterad!',
                      'There are no events to apply to at this time. Follow us on social media to stay updated!'
                    )}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-16 max-w-3xl mx-auto">
                {castingEvents.map((event: Event) => (
                  <ApplicationCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  )
}
