import { useCurrentEvent } from '@/contexts/CurrentEventContext'
import { useLanguage } from '@/contexts/LanguageContext'

interface EventPickerProps {
  className?: string
}

export const EventPicker = ({ className }: EventPickerProps) => {
  const { upcomingEvents, archivedEvents, selectedEventId, setSelectedEventId } = useCurrentEvent()
  const { t } = useLanguage()

  if (upcomingEvents.length === 0 && archivedEvents.length === 0) return null

  return (
    <div className={className ?? 'max-w-md mx-auto my-8 space-y-2 text-center relative z-10'}>
      <label className="form-label-gold block">
        {t('Välj show / event', 'Select show / event')}
      </label>
      <select
        value={selectedEventId}
        onChange={(e) => setSelectedEventId(e.target.value)}
        className="text-center"
      >
        {upcomingEvents.length > 0 && (
          <optgroup label={t('✨ Kommande Event', '✨ Upcoming Events')}>
            {upcomingEvents.map((evt) => (
              <option key={evt.id} value={evt.id}>
                {evt.title} ({evt.event_start?.split('T')[0]})
              </option>
            ))}
          </optgroup>
        )}
        {archivedEvents.length > 0 && (
          <optgroup label={t('📜 Arkiverade Event', '📜 Archived Events')}>
            {archivedEvents.map((evt) => (
              <option key={evt.id} value={evt.id}>
                {evt.title} ({evt.event_start?.split('T')[0]})
              </option>
            ))}
          </optgroup>
        )}
      </select>
    </div>
  )
}
