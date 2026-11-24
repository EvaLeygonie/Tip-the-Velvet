import { useState } from 'react'
import { Wallet } from 'lucide-react'
import { EventPicker } from '@/components/admin/EventPicker'
import { EconomyOverviewTab } from '@/components/admin/economy/EconomyOverviewTab'
import { EventPayablesTab } from '@/components/admin/economy/EventPayablesTab'
import { useCurrentEvent } from '@/contexts/CurrentEventContext'
import { useLanguage } from '@/contexts/LanguageContext'

// Economy. The list at the top picks what to look at: one event (every bill to pay out, and what its
// tickets brought in) or "all events", the overview of every show side by side.
export const AdminEconomy = () => {
  const { t } = useLanguage()
  const { selectedEventId, setSelectedEventId } = useCurrentEvent()
  // Whether the page shows every show side by side, instead of the one picked in the list
  const [showAll, setShowAll] = useState(false)

  return (
    <div className="page-shell">
      <div className="bg-glow-spot" />
      <h1>{t('Ekonomi', 'Economy')}</h1>
      <div className="gold-divider" />

      <EventPicker
        allOption={{
          label: t('Alla event (översikt)', 'All events (overview)'),
          buttonLabel: t('Visa alla', 'Show all'),
          backLabel: t('Visa en', 'Show one'),
          active: showAll,
          onChange: setShowAll,
        }}
      />

      {showAll ? (
        <EconomyOverviewTab
          onOpenEvent={(id) => {
            setSelectedEventId(id)
            setShowAll(false)
          }}
        />
      ) : selectedEventId ? (
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
