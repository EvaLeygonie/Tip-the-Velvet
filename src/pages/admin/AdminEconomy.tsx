import { Wallet } from 'lucide-react'
import { EventPicker } from '@/components/admin/EventPicker'
import { EventPayablesTab } from '@/components/admin/economy/EventPayablesTab'
import { useCurrentEvent } from '@/contexts/CurrentEventContext'
import { useLanguage } from '@/contexts/LanguageContext'

// Economy. For now one tab: every bill to pay out for the selected event. The side-by-side
// overview of all shows comes later (see docs/ticket-sales.md and the invoice report) and gets
// its own tab next to this one.
export const AdminEconomy = () => {
  const { t } = useLanguage()
  const { selectedEventId } = useCurrentEvent()

  return (
    <div className="page-shell">
      <div className="bg-glow-spot" />
      <h1>{t('Ekonomi', 'Economy')}</h1>
      <div className="gold-divider" />

      <EventPicker />

      <div className="flex flex-wrap items-center justify-center gap-2 mt-2 mb-8">
        <span className="btn-gold text-xs py-2 px-4" aria-current="page">
          {t('Ett event', 'One event')}
        </span>
        <span
          className="btn-gold-inactive text-xs py-2 px-4"
          title={t('Kommer senare', 'Coming later')}
          aria-disabled="true"
        >
          {t('Översikt', 'Overview')}
        </span>
      </div>

      {selectedEventId ? (
        // Keyed on the event so switching show starts from a clean list
        <EventPayablesTab key={selectedEventId} eventId={selectedEventId} />
      ) : (
        <div className="callout-panel max-w-xl">
          <Wallet className="mx-auto h-8 w-8 text-accent/60" strokeWidth={1.3} />
          <p className="text-info">{t('Välj ett event ovan.', 'Choose an event above.')}</p>
        </div>
      )}
    </div>
  )
}
