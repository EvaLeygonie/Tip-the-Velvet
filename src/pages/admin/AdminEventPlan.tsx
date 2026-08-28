import { useState, useEffect } from 'react'
import { UtensilsCrossed } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useCurrentEvent } from '@/contexts/CurrentEventContext'
import { EventPicker } from '@/components/admin/EventPicker'
import { getEventPerformersForAdmin } from '@/services/eventService'
import type { AdminEventPerformerRow } from '@/services/eventService'

export const AdminEventPlan = () => {
  const { t } = useLanguage()
  const { selectedEventId } = useCurrentEvent()
  const [performers, setPerformers] = useState<AdminEventPerformerRow[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selectedEventId) return

    const loadPerformers = async () => {
      setLoading(true)
      try {
        const data = await getEventPerformersForAdmin(selectedEventId)
        setPerformers(data.performers)
      } catch (err) {
        console.error('Kunde inte hämta artister:', err)
      } finally {
        setLoading(false)
      }
    }
    loadPerformers()
  }, [selectedEventId])

  return (
    <div className="page-shell">
      <div className="bg-glow-spot" />
      <h1>{t('Eventplan', 'Event Plan')}</h1>
      <div className="gold-divider" />

      <EventPicker />

      {selectedEventId && (
        <div className="max-w-3xl mx-auto mt-8 space-y-4">
          <h3 className="font-decorative text-lg text-foreground/90">
            {t('Artistlogistik', 'Artist logistics')}
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
            <div className="space-y-2">
              {performers.map((row) => (
                <div
                  key={row.performer_id}
                  className="admin-panel velvet-surface p-3 flex items-center gap-3"
                >
                  <span className="font-decorative text-sm text-foreground flex-1 min-w-0 truncate">
                    {row.performer.performer_name}
                  </span>
                  {row.plus_one_name && (
                    <span
                      title={`+1: ${row.plus_one_name}`}
                      className="shrink-0 text-[10px] font-body font-semibold text-sky-400 border border-sky-400/30 rounded-full px-1.5 py-0.5"
                    >
                      +1
                    </span>
                  )}
                  {row.dietary_requirements && (
                    <span className="flex items-center gap-1.5 text-xs text-foreground/60 italic min-w-0">
                      <UtensilsCrossed className="h-3.5 w-3.5 shrink-0 text-accent/50" />
                      <span className="truncate">{row.dietary_requirements}</span>
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
