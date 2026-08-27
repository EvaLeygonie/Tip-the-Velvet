import { useState, useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useCurrentEvent } from '@/contexts/CurrentEventContext'
import { EventPicker } from '@/components/admin/EventPicker'
import { getEventPerformersForAdmin } from '@/services/eventService'
import type { AdminEventPerformerRow } from '@/services/eventService'
import { ArtistOverviewCard } from '@/components/admin/eventplan/ArtistOverviewCard'

export const AdminEventPlan = () => {
  const { t } = useLanguage()
  const { selectedEventId, selectedEvent } = useCurrentEvent()
  const [performers, setPerformers] = useState<AdminEventPerformerRow[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selectedEventId) return

    const loadPerformers = async () => {
      setLoading(true)
      try {
        const data = await getEventPerformersForAdmin(selectedEventId)
        setPerformers(data)
      } catch (err) {
        console.error('Kunde inte hämta artister:', err)
      } finally {
        setLoading(false)
      }
    }
    loadPerformers()
  }, [selectedEventId])

  const handleChanged = (performerId: string, patch: Partial<AdminEventPerformerRow>) => {
    setPerformers((prev) =>
      prev.map((row) => (row.performer_id === performerId ? { ...row, ...patch } : row))
    )
  }

  return (
    <div className="page-shell">
      <div className="bg-glow-spot" />
      <h1>{t('Eventplan', 'Event Plan')}</h1>
      <div className="gold-divider" />

      <EventPicker />

      {selectedEventId && (
        <div className="max-w-5xl mx-auto mt-8 space-y-4">
          <h3 className="font-decorative text-lg text-foreground/90">
            {t('Artister', 'Artists')}
          </h3>

          {loading ? (
            <div className="loading-container">
              <div className="loading-text">{t('Öppnar ridån...', 'Opening the curtain...')}</div>
            </div>
          ) : performers.length === 0 ? (
            <div className="callout-panel italic text-center text-foreground/40 bg-black/10 border-dashed border-accent/10 py-8">
              {t(
                'Inga bekräftade artister för detta event ännu.',
                'No confirmed artists for this event yet.'
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {performers.map((row) => (
                <ArtistOverviewCard
                  key={row.performer_id}
                  row={row}
                  event={{ id: selectedEventId, title: selectedEvent?.title ?? '' }}
                  onChanged={handleChanged}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
