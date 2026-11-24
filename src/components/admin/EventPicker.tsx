import { Link } from 'react-router-dom'
import { useCurrentEvent } from '@/contexts/CurrentEventContext'
import { useLanguage } from '@/contexts/LanguageContext'

// An extra "all events" choice at the top of the list, for pages that also have a view across every
// show (the Economy overview). The page keeps track of whether it is active; picking any single event
// switches it off again.
interface AllEventsOption {
  label: string
  // The button beside the list: "show all" while one event is shown, "show one" while all are shown.
  // The second goes back to the event that was open before, which the page never stops remembering.
  buttonLabel: string
  backLabel: string
  active: boolean
  onChange: (active: boolean) => void
}

interface EventPickerProps {
  className?: string
  allOption?: AllEventsOption
}

const ALL_VALUE = '__all__'

export const EventPicker = ({ className, allOption }: EventPickerProps) => {
  const { upcomingEvents, archivedEvents, selectedEventId, selectedEvent, setSelectedEventId } =
    useCurrentEvent()
  const { t } = useLanguage()

  if (upcomingEvents.length === 0 && archivedEvents.length === 0) return null

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === ALL_VALUE) {
      allOption?.onChange(true)
      return
    }
    setSelectedEventId(e.target.value)
    allOption?.onChange(false)
  }

  return (
    <div className={className ?? 'max-w-md mx-auto my-8 space-y-2 text-center relative z-10'}>
      <label className="form-label-gold block">
        {t('Välj show / event', 'Select show / event')}
      </label>
      <select
        value={allOption?.active ? ALL_VALUE : selectedEventId}
        onChange={handleChange}
        className="text-center"
      >
        {allOption && <option value={ALL_VALUE}>{allOption.label}</option>}
        {upcomingEvents.length > 0 && (
          <optgroup label={t('✨ Kommande Event', '✨ Upcoming Events')}>
            {upcomingEvents.map((evt) => (
              <option key={evt.id} value={evt.id}>
                {evt.status === 'draft' ? `${t('Utkast', 'Draft')}: ` : ''}
                {evt.title} ({evt.event_start?.split('T')[0] ?? t('datum ej satt', 'no date yet')})
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
      {(allOption || selectedEvent?.slug) && (
        <div className="flex items-center justify-center gap-4">
          {allOption && (
            <button
              type="button"
              onClick={() => allOption.onChange(!allOption.active)}
              className="btn-gold-outline text-xs !px-4 !py-1.5 whitespace-nowrap"
            >
              {allOption.active ? allOption.backLabel : allOption.buttonLabel}
            </button>
          )}
          {selectedEvent?.slug && !allOption?.active && (
            <Link
              to={`/admin/event-editor/${selectedEvent.slug}`}
              className="text-xs text-foreground/50 hover:text-accent underline"
            >
              {t('Redigera eventet', 'Edit the event')}
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
