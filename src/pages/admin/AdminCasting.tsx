import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  getApplicationsFromEvent,
  updateApplicationNotes,
  updateApplicationStatus,
  updateApplicationLogistics,
  syncConfirmedBookingTerms,
  updateActSelection,
} from '@/services/applicationService'
import { fetchEventsForAdmin } from '@/services/eventService'
import { useLanguage } from '@/contexts/LanguageContext'
import type { CastingApplication, CastingApplicationWithActs, Event } from '@/types/types'
import { CastingApplicationRow } from '@/components/admin/CastingApplicationRow'
import { DollarSign, Music, Users, Mail, Loader2 } from 'lucide-react'
import { withTimeout } from '@/lib/utils'
import { toast } from 'sonner'

export const AdminCasting = () => {
  const { t } = useLanguage()
  const actLabel = (count: number) => t(count === 1 ? 'akt' : 'akter', count === 1 ? 'act' : 'acts')
  const artistLabel = (count: number) =>
    t(count === 1 ? 'artist' : 'artister', count === 1 ? 'artist' : 'artists')
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [applications, setApplications] = useState<CastingApplicationWithActs[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const [showBulkMailModal, setShowBulkMailModal] = useState(false)
  const [bulkSubjectSv, setBulkSubjectSv] = useState('')
  const [bulkSubjectEn, setBulkSubjectEn] = useState('')
  // Kept separate from bulkBodySv/En (not just baked into the body text) — the edge
  // function otherwise auto-prepends a personalized "Hej {name}!" per recipient, so this
  // has to reach it as a real override, not just sit as the first line of the body, or
  // every artist would see both greetings stacked on top of each other.
  const [bulkGreetingSv, setBulkGreetingSv] = useState('')
  const [bulkGreetingEn, setBulkGreetingEn] = useState('')
  const [bulkBodySv, setBulkBodySv] = useState('')
  const [bulkBodyEn, setBulkBodyEn] = useState('')
  const [isSendingBulkMail, setIsSendingBulkMail] = useState(false)

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

  const handleToggleActSelected = async (
    applicationId: string,
    actId: string,
    isSelected: boolean
  ) => {
    const previous = applications

    setApplications((prev) =>
      prev.map((app) =>
        app.id === applicationId
          ? {
              ...app,
              casting_application_acts: app.casting_application_acts.map((act) =>
                act.id === actId ? { ...act, is_selected: isSelected } : act
              ),
            }
          : app
      )
    )

    try {
      await withTimeout(
        updateActSelection(actId, isSelected),
        15000,
        t(
          'Nätverksanropet tog för lång tid. Kontrollera din anslutning.',
          'The network request took too long. Check your connection.'
        )
      )
    } catch (err) {
      setApplications(previous)
      throw err
    }
  }

  const handleUpdateLogisticsStatus = async (
    id: string,
    initialReplySent: boolean,
    bookingStatus: CastingApplication['booking_status'],
    proposedFee?: number,
    needsTravelCosts?: boolean,
    travelCostAmount?: number,
    needsAccommodation?: boolean,
    lineupRole?: CastingApplication['lineup_role']
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
              lineup_role: lineupRole !== undefined ? lineupRole : app.lineup_role,
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
          needsAccommodation,
          lineupRole
        ),
        15000,
        t(
          'Nätverksanropet tog för lång tid. Kontrollera din anslutning.',
          'The network request took too long. Check your connection.'
        )
      )

      // Confirming migrates fee/travel/role onto a separate event_performers row — once
      // that's happened, an admin correction here (an artist stepping into someone else's
      // slot, a renegotiated fee, etc.) needs to reach that row too, or the two silently
      // diverge (real case: Seymour's travel offer and Florence's headliner role never
      // made it past casting_applications).
      if (previous?.booking_status === 'confirmed' && previous.performer_id) {
        await syncConfirmedBookingTerms(previous.event_id, previous.performer_id, {
          finalFee: proposedFee,
          travelCovered: travelCostAmount,
          lineupRole,
        })
      }
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

  // "Booked artists" — actually confirmed, not just review_status='yes' (which also
  // includes artists not yet contacted or still awaiting their own confirmation).
  const bookedApps = yesApps.filter((app) => app.booking_status === 'confirmed')
  const selectedEvent = events.find((e) => e.id === selectedEventId)

  const openBulkMailModal = () => {
    const eventTitle = selectedEvent?.title ?? ''
    setBulkSubjectSv(`Inför ${eventTitle}`)
    setBulkSubjectEn(`Regarding ${eventTitle}`)
    setBulkGreetingSv('Hej allihopa!')
    setBulkGreetingEn('Hey everyone!')
    setBulkBodySv('\n\nVarma hälsningar,\nTip the Velvet')
    setBulkBodyEn('\n\nBest regards,\nTip the Velvet')
    setShowBulkMailModal(true)
  }

  const handleSendBulkMail = async () => {
    setIsSendingBulkMail(true)
    try {
      const results = await Promise.allSettled(
        bookedApps.map((app) => {
          const isRecipientSv = app.language === 'sv'
          return fetch('/api/send-casting-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: app.email,
              name: app.performer_name,
              subject: isRecipientSv ? bulkSubjectSv : bulkSubjectEn,
              bodyText: isRecipientSv ? bulkBodySv : bulkBodyEn,
              language: app.language,
              greeting: isRecipientSv ? bulkGreetingSv : bulkGreetingEn,
            }),
          }).then((res) => {
            if (!res.ok) throw new Error(`Failed to send to ${app.email}`)
          })
        })
      )

      const failedCount = results.filter((r) => r.status === 'rejected').length

      if (failedCount === 0) {
        toast.success(
          t('Mail skickat till alla bokade artister!', 'Email sent to all booked artists!')
        )
        setShowBulkMailModal(false)
      } else {
        toast.error(
          t(
            `${failedCount} av ${bookedApps.length} mail kunde inte skickas.`,
            `${failedCount} of ${bookedApps.length} emails could not be sent.`
          )
        )
      }
    } finally {
      setIsSendingBulkMail(false)
    }
  }

  const totalBudget = yesApps.reduce((sum, app) => {
    const fee = Number(app.proposed_fee) || Number(app.requested_fee) || 0
    const travel = app.needs_travel_costs ? Number(app.travel_cost_amount) || 0 : 0
    return sum + fee + travel
  }, 0)

  // Yes/maybe: how many acts have actually been chosen (is_selected) — "do we have enough
  // lined up for the show" (yes) / "how many are on the waiting list" (maybe). Pending/no:
  // selection isn't a meaningful concept yet, so just the total acts submitted instead.
  const countActs = (list: CastingApplicationWithActs[], onlySelected: boolean) =>
    list.reduce(
      (sum, app) =>
        sum +
        (app.casting_application_acts ?? []).filter((act) => !onlySelected || act.is_selected)
          .length,
      0
    )

  const pendingActsCount = countActs(pendingApps, false)
  const yesActsCount = countActs(yesApps, true)
  const maybeActsCount = countActs(maybeApps, true)
  const noActsCount = countActs(noApps, false)

  // Page-level total for this event — every application/act regardless of status, for
  // comparing events against each other over time (once there's history to compare).
  const totalArtists = applications.length
  const totalActsSubmitted = countActs(applications, false)

  const renderAppSection = (
    title: string,
    appsList: CastingApplicationWithActs[],
    badgeColor: string,
    actsCount: number,
    isYesSection = false
  ) => {
    if (appsList.length === 0) return null

    return (
      <div className="space-y-3 pt-4">
        <div className="flex items-center justify-between border-b border-accent/10 pb-2">
          <div className="flex items-center gap-2">
            <h5 className="font-decorative text-base text-foreground/80">{title}</h5>
            {isYesSection && (
              <button
                type="button"
                onClick={openBulkMailModal}
                disabled={bookedApps.length === 0}
                className="p-1.5 border rounded-md transition-colors shrink-0 bg-accent/10 border-accent/20 text-accent hover:bg-accent hover:text-black disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-accent/10 disabled:hover:text-accent"
                title={
                  bookedApps.length === 0
                    ? t('Inga bokade artister ännu', 'No booked artists yet')
                    : t('Maila alla bokade artister', 'Email all booked artists')
                }
              >
                <Mail className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isYesSection && (
              <div className="text-xs text-gold font-mono flex items-center gap-1 opacity-90">
                <DollarSign className="h-3 w-3" />
                <span>Total: {totalBudget} SEK</span>
              </div>
            )}
            <div className="text-xs text-accent/80 font-mono flex items-center gap-1 opacity-90">
              <Music className="h-3 w-3" />
              <span>
                {actsCount} {actLabel(actsCount)}
              </span>
            </div>
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
              onToggleActSelected={handleToggleActSelected}
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

      {hasAnyApplications && (
        <div className="flex items-center justify-center gap-6 text-sm text-foreground/70 font-body -mt-4 mb-6 relative z-10">
          <span className="flex items-center gap-1.5">
            <Users className="h-4 w-4 text-accent" />
            <span className="font-semibold text-foreground">{totalArtists}</span>
            {artistLabel(totalArtists)}
          </span>
          <span className="text-accent/30">•</span>
          <span className="flex items-center gap-1.5">
            <Music className="h-4 w-4 text-accent" />
            <span className="font-semibold text-foreground">{totalActsSubmitted}</span>
            {actLabel(totalActsSubmitted)}
          </span>
        </div>
      )}

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
                'bg-accent/10 border-accent/30 text-accent',
                pendingActsCount
              )}

              {renderAppSection(
                t('Bokade / Ja', 'Booked / Yes'),
                yesApps,
                'bg-green-500/10 border-green-500/30 text-green-400',
                yesActsCount,
                true
              )}

              {renderAppSection(
                t('Kanske / Reserver', 'Maybe / Backup'),
                maybeApps,
                'bg-amber-500/10 border-amber-500/30 text-amber-400',
                maybeActsCount
              )}

              {renderAppSection(
                t('Nej / Tackade nej', 'No / Declined'),
                noApps,
                'bg-red-500/10 border-red-500/30 text-red-400',
                noActsCount
              )}
            </>
          )}
        </div>
      )}

      {showBulkMailModal &&
        typeof window !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 text-left"
            onClick={() => setShowBulkMailModal(false)}
          >
            <div
              className="velvet-surface border border-accent/30 max-w-2xl w-full p-6 space-y-4 rounded-lg shadow-2xl relative"
              style={{ backgroundColor: '#141111' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <h4 className="font-decorative text-lg text-accent text-center">
                  {t('Maila alla bokade artister', 'Email all booked artists')}
                </h4>
                <p className="text-xs text-muted-foreground text-center">
                  {bookedApps.length}{' '}
                  {t(
                    `mottagare (${bookedApps.filter((a) => a.language === 'sv').length} svenska, ${bookedApps.filter((a) => a.language !== 'sv').length} engelska)`,
                    `recipients (${bookedApps.filter((a) => a.language === 'sv').length} Swedish, ${bookedApps.filter((a) => a.language !== 'sv').length} English)`
                  )}
                  .{' '}
                  {t(
                    'Varje artist får versionen på sitt eget språk.',
                    'Each artist gets the version in their own language.'
                  )}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <span className="block text-[11px] uppercase tracking-wider text-gold font-mono">
                    {t('Svenska', 'Swedish')}
                  </span>
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono block">
                      {t('Ämnesrad', 'Subject')}
                    </label>
                    <input
                      type="text"
                      value={bulkSubjectSv}
                      onChange={(e) => setBulkSubjectSv(e.target.value)}
                      className="w-full text-sm bg-black/40 border border-accent/20 rounded p-2 focus:border-accent text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono block">
                      {t('Hälsning', 'Greeting')}
                    </label>
                    <input
                      type="text"
                      value={bulkGreetingSv}
                      onChange={(e) => setBulkGreetingSv(e.target.value)}
                      className="w-full text-sm bg-black/40 border border-accent/20 rounded p-2 focus:border-accent text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono block">
                      {t('Mailtext', 'Email Text')}
                    </label>
                    <textarea
                      value={bulkBodySv}
                      onChange={(e) => setBulkBodySv(e.target.value)}
                      className="w-full h-40 text-sm bg-black/40 border border-accent/20 font-sans p-2 leading-relaxed rounded resize-none focus:border-accent text-white"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <span className="block text-[11px] uppercase tracking-wider text-gold font-mono">
                    {t('Engelska', 'English')}
                  </span>
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono block">
                      {t('Ämnesrad', 'Subject')}
                    </label>
                    <input
                      type="text"
                      value={bulkSubjectEn}
                      onChange={(e) => setBulkSubjectEn(e.target.value)}
                      className="w-full text-sm bg-black/40 border border-accent/20 rounded p-2 focus:border-accent text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono block">
                      {t('Hälsning', 'Greeting')}
                    </label>
                    <input
                      type="text"
                      value={bulkGreetingEn}
                      onChange={(e) => setBulkGreetingEn(e.target.value)}
                      className="w-full text-sm bg-black/40 border border-accent/20 rounded p-2 focus:border-accent text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono block">
                      {t('Mailtext', 'Email Text')}
                    </label>
                    <textarea
                      value={bulkBodyEn}
                      onChange={(e) => setBulkBodyEn(e.target.value)}
                      className="w-full h-40 text-sm bg-black/40 border border-accent/20 font-sans p-2 leading-relaxed rounded resize-none focus:border-accent text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-accent/10">
                <button
                  type="button"
                  onClick={() => setShowBulkMailModal(false)}
                  className="px-4 py-2 text-xs border border-accent/20 rounded text-foreground/70 hover:bg-white/5 transition-colors"
                  disabled={isSendingBulkMail}
                >
                  {t('Avbryt', 'Cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleSendBulkMail}
                  className="btn-gold text-xs py-2 px-4 flex items-center gap-1.5"
                  disabled={isSendingBulkMail || bookedApps.length === 0}
                >
                  {isSendingBulkMail ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Mail className="h-3.5 w-3.5" />
                  )}
                  {isSendingBulkMail
                    ? t('Skickar...', 'Sending...')
                    : t('Skicka till alla', 'Send to all')}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
