import React, { useState, useEffect } from 'react'
import { getApplicationsFromEvent } from '@/services/applicationService'
import { fetchEventsForAdmin } from '@/services/eventService'
import { useLanguage } from '@/contexts/LanguageContext'
import type { CastingApplication, Event } from '@/types/types'
import { getImageSrc, formatDate } from '@/lib/utils'

export const AdminCasting = () => {
  const { language, t } = useLanguage()
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
          setSelectedEventId(data[0].id) // Sätter nyaste som default
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

  const todayStr = new Date().toISOString().split('T')[0]
  const upcomingEvents = events.filter((e) => e.event_start && e.event_start >= todayStr)
  const archivedEvents = events.filter((e) => !e.event_start || e.event_start < todayStr)

  const pendingApplications = applications.filter((app) => app.review_status === 'pending')

  return (
    <>
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

        {/* Felhantering */}
        {error && (
          <div className="velvet-warning-box max-w-2xl mx-auto my-4">
            <span className="p-clean text-red-200">{error}</span>
          </div>
        )}

        {/* Laddningsindikator via din CSS */}
        {loading ? (
          <div className="loading-container">
            <div className="loading-text">{t('Öppnar ridån...', 'Opening the curtain...')}</div>
          </div>
        ) : (
          <div className="mt-12 relative z-10">
            {/* Osorterade / Pending Sektion */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-accent/20 pb-2">
                <h4 className="font-decorative">
                  {t('Osorterade ansökningar', 'Unsorted applications')}{' '}
                  {applications.length > 0 && `(${applications.length})`}
                </h4>
                <span className="text-xs uppercase tracking-widest px-3 py-1 bg-accent/10 border border-accent/30 text-accent rounded-full font-mono">
                  {pendingApplications.length} {t('st', 'pcs')}
                </span>
              </div>

              {pendingApplications.length === 0 ? (
                <div className="callout-panel italic text-foreground/50">
                  {t(
                    'Inga obearbetade ansökningar kvar för denna show.',
                    'No unprocessed applications left for this show.'
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingApplications.map((app) => (
                    <div
                      key={app.id}
                      className="admin-panel velvet-surface p-4 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all duration-300 hover:border-accent/30"
                      style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
                    >
                      {/* Profilbild och Artistinfo */}
                      <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left w-full sm:w-auto">
                        <div className="w-14 h-14 rounded-md overflow-hidden border border-accent/20 shrink-0 bg-black/40">
                          {app.promo_image_id ? (
                            <img
                              src={getImageSrc(app.promo_image_id)}
                              alt={app.performer_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-accent/30 text-xs font-mono">
                              N/A
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-decorative text-lg text-foreground tracking-wide">
                            {app.performer_name}
                          </div>
                          <div className="text-accent italic text-sm font-heading">
                            {app.act_title}
                          </div>
                        </div>
                      </div>

                      {/* Platsinfo */}
                      <div className="text-center sm:text-left text-sm text-foreground/60 font-body">
                        <span className="block uppercase tracking-wider text-[11px] text-accent/50">
                          {t('Plats', 'Location')}
                        </span>
                        {app.city || '—'}
                        {app.country ? `, ${app.country}` : ''}
                      </div>

                      <div className="text-center sm:text-left text-sm text-foreground/60 font-body">
                        <span className="block uppercase tracking-wider text-[11px] text-accent/50">
                          {t('Tid', 'Time')}
                        </span>
                        {formatDate(language, app.created_at)}
                      </div>

                      {/* Statusväljare */}
                      <div className="w-full sm:w-auto flex justify-end">
                        <select
                          value={app.review_status}
                          onChange={(e) => {
                            console.log(`Ändra status för ${app.id} till ${e.target.value}`)
                          }}
                          className="admin-select !w-auto min-w-[140px]"
                        >
                          <option value="pending">{t('Osorterad', 'Unsorted')}</option>
                          <option value="yes">{t('Ja', 'Yes')}</option>
                          <option value="maybe">{t('Kanske', 'Maybe')}</option>
                          <option value="no">{t('Nej', 'No')}</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
