import { useState, useEffect } from 'react'
import {
  getApplicationsFromEvent,
  updateApplicationNotes,
  updateApplicationStatus,
  updateApplicationLogistics,
} from '@/services/applicationService'
import { fetchEventsForAdmin } from '@/services/eventService'
import { useLanguage } from '@/contexts/LanguageContext'
import type { CastingApplication, Event } from '@/types/types'
import { CastingApplicationRow } from '@/components/admin/CastingApplicationRow'
import { DollarSign } from 'lucide-react'
import { withTimeout } from '@/lib/utils'

export const AdminCasting = () => {
  const { t } = useLanguage()
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [applications, setApplications] = useState<CastingApplication[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const data = await fetchEventsForAdmin()
        if (data.length > 0) {
          setEvents(data)
          setSelectedEventId(data[0].id)
        }
      } catch (err) {
        console.error('Kunde inte hämta event:', err)
        setError('Kunde inte läsa in eventlistan.')
      }
    }
    loadEvents()
  }, [])

  useEffect(() => {
    if (!selectedEventId) return

    const loadApplications = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getApplicationsFromEvent(selectedEventId)
        setApplications(data)
      } catch (err) {
        console.error('Fel vid hämtning av ansökningar:', err)
        setError('Kunde inte ladda in ansökningar för detta event.')
      } finally {
        setLoading(false)
      }
    }
    loadApplications()
  }, [selectedEventId])

  const handleStatusChange = async (id: string, newStatus: CastingApplication['review_status']) => {
    const previousStatus = applications.find((app) => app.id === id)?.review_status

    setApplications((prev) =>
      prev.map((app) => (app.id === id ? { ...app, review_status: newStatus } : app))
    )

    try {
      await withTimeout(
        updateApplicationStatus(id, newStatus),
        15000,
        t(
          'Nätverksanropet tog för lång tid. Kontrollera din anslutning.',
          'The network request took too long. Check your connection.'
        )
      )
    } catch (err) {
      setApplications((prev) =>
        prev.map((app) =>
          app.id === id ? { ...app, review_status: previousStatus ?? app.review_status } : app
        )
      )
      throw err
    }
  }

  const handleSaveNotes = async (id: string, updatedNotes: string) => {
    setApplications((prev) =>
      prev.map((app) => (app.id === id ? { ...app, admin_notes: updatedNotes } : app))
    )

    await updateApplicationNotes(id, updatedNotes)
  }

  const handleUpdateLogisticsStatus = async (
    id: string,
    initialReplySent: boolean,
    bookingStatus: CastingApplication['booking_status'],
    proposedFee?: number,
    needsTravelCosts?: boolean,
    travelCostAmount?: number,
    needsAccommodation?: boolean
  ) => {
    const previous = applications.find((app) => app.id === id)

    setApplications((prev) =>
      prev.map((app) =>
        app.id === id
          ? {
              ...app,
              initial_reply_sent: initialReplySent,
              booking_status: bookingStatus,
              proposed_fee: proposedFee !== undefined ? proposedFee : app.proposed_fee,
              needs_travel_costs:
                needsTravelCosts !== undefined ? needsTravelCosts : app.needs_travel_costs,
              travel_cost_amount:
                travelCostAmount !== undefined ? travelCostAmount : app.travel_cost_amount,
              needs_accommodation:
                needsAccommodation !== undefined ? needsAccommodation : app.needs_accommodation,
            }
          : app
      )
    )
    try {
      await withTimeout(
        updateApplicationLogistics(
          id,
          initialReplySent,
          bookingStatus,
          proposedFee,
          needsTravelCosts,
          travelCostAmount,
          needsAccommodation
        ),
        15000,
        t(
          'Nätverksanropet tog för lång tid. Kontrollera din anslutning.',
          'The network request took too long. Check your connection.'
        )
      )
    } catch (err) {
      console.error('Kunde inte uppdatera logistikstatus i databasen:', err)
      if (previous) {
        setApplications((prev) => prev.map((app) => (app.id === id ? previous : app)))
      }
      throw err
    }
  }

  const todayStr = new Date().toISOString().split('T')[0]
  const upcomingEvents = events.filter((e) => e.event_start && e.event_start >= todayStr)
  const archivedEvents = events.filter((e) => !e.event_start || e.event_start < todayStr)

  const pendingApps = applications.filter((app) => app.review_status === 'pending')
  const yesApps = applications.filter((app) => app.review_status === 'yes')
  const maybeApps = applications.filter((app) => app.review_status === 'maybe')
  const noApps = applications.filter((app) => app.review_status === 'no')

  const totalBudget = yesApps.reduce((sum, app) => {
    const fee = Number(app.proposed_fee) || Number(app.requested_fee) || 0
    const travel = app.needs_travel_costs ? Number(app.travel_cost_amount) || 0 : 0
    return sum + fee + travel
  }, 0)

  const renderAppSection = (
    title: string,
    appsList: CastingApplication[],
    badgeColor: string,
    isYesSection = false
  ) => {
    if (appsList.length === 0) return null

    return (
      <div className="space-y-3 pt-4">
        <div className="flex items-center justify-between border-b border-accent/10 pb-2">
          <h5 className="font-decorative text-base text-foreground/80">{title}</h5>

          <div className="flex items-center gap-3">
            {isYesSection && (
              <div className="text-xs text-gold font-mono flex items-center gap-1 opacity-90">
                <DollarSign className="h-3 w-3" />
                <span>Total: {totalBudget} SEK</span>
              </div>
            )}
            <span className={`text-xs font-mono px-2.5 py-0.5 rounded-full border ${badgeColor}`}>
              {appsList.length}
            </span>
          </div>
        </div>
        <div className="space-y-3">
          {appsList.map((app) => (
            <CastingApplicationRow
              key={app.id}
              application={app}
              onStatusChange={handleStatusChange}
              onSaveNotes={handleSaveNotes}
              onUpdateLogistics={handleUpdateLogisticsStatus}
            />
          ))}
        </div>
      </div>
    )
  }

  const hasAnyApplications = applications.length > 0

  return (
    <div className="page-shell">
      <div className="bg-glow-spot" />
      <h1>{t('Casting-hantering', 'Casting handling')}</h1>
      <div className="gold-divider" />

      {/* Eventväljare */}
      <div className="max-w-md mx-auto my-8 space-y-2 text-center relative z-10">
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

      {error && (
        <div className="velvet-warning-box max-w-2xl mx-auto my-4">
          <span className="p-clean text-red-200">{error}</span>
        </div>
      )}

      {loading ? (
        <div className="loading-container">
          <div className="loading-text">{t('Öppnar ridån...', 'Opening the curtain...')}</div>
        </div>
      ) : (
        <div className="mt-8 relative z-10 max-w-5xl mx-auto space-y-6">
          {!hasAnyApplications ? (
            <div className="callout-panel italic text-center text-foreground/40 bg-black/10 border-dashed border-accent/10 py-8">
              {t(
                'Inga ansökningar har inkommit för detta event ännu.',
                'No applications received for this event yet.'
              )}
            </div>
          ) : (
            <>
              {renderAppSection(
                t('Osorterade ansökningar', 'Unsorted applications'),
                pendingApps,
                'bg-accent/10 border-accent/30 text-accent'
              )}

              {renderAppSection(
                t('Bokade / Ja', 'Booked / Yes'),
                yesApps,
                'bg-green-500/10 border-green-500/30 text-green-400',
                true
              )}

              {renderAppSection(
                t('Kanske / Reserver', 'Maybe / Backup'),
                maybeApps,
                'bg-amber-500/10 border-amber-500/30 text-amber-400'
              )}

              {renderAppSection(
                t('Nej / Tackade nej', 'No / Declined'),
                noApps,
                'bg-red-500/10 border-red-500/30 text-red-400'
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
