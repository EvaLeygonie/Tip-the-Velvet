import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import { useConfirm } from '@/contexts/ConfirmContext'
import {
  getEventActsForAdmin,
  getEventPerformersForAdmin,
  getShowLocks,
  setShowLock,
  reorderShowProgram,
  updateEventPerformerAccommodation,
  updateEventPerformerAccommodationDetails,
  updateEventPerformerTravelNotes,
  type AdminEventActRow,
  type AdminEventPerformerRow,
  type ShowLocks,
} from '@/services/eventService'
import { PerformerLinksProvider, bookingPortalPath } from '@/lib/performerLinks'
import { ShowProgramBoard } from './ShowProgramBoard'
import { TravelAccommodationTab } from './TravelAccommodationTab'

interface ArtistShowTravelTabProps {
  tab: 'show' | 'travel'
  eventId: string
  eventTitle: string
}

// The Show and Travel & accommodation tabs of the Artist booking page. Loads what they need
// (confirmed performers, their acts, staff for the document headcounts) itself, so the page
// around it only has to know which tab is showing.
export const ArtistShowTravelTab = ({ tab, eventId, eventTitle }: ArtistShowTravelTabProps) => {
  const { t } = useLanguage()
  const confirm = useConfirm()
  const [performers, setPerformers] = useState<AdminEventPerformerRow[]>([])
  const [acts, setActs] = useState<AdminEventActRow[]>([])
  const [loading, setLoading] = useState(true)
  const [locks, setLocks] = useState<ShowLocks>({ 1: false, 2: false })

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const [performersData, actsData, lockData] = await Promise.all([
          getEventPerformersForAdmin(eventId),
          getEventActsForAdmin(eventId),
          // Optional: the planning still works unlocked if this can't be read
          getShowLocks(eventId).catch(() => ({ 1: false, 2: false }) as ShowLocks),
        ])
        if (cancelled) return
        setPerformers(performersData.performers)
        setActs(actsData)
        setLocks(lockData)
      } catch (err) {
        console.error('Kunde inte hämta showplaneringen:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [eventId])

  const handleActUpdated = (id: string, patch: Partial<AdminEventActRow>) =>
    setActs((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)))
  const handleActRemoved = (id: string) => setActs((prev) => prev.filter((a) => a.id !== id))
  const handleActAdded = (row: AdminEventActRow) => setActs((prev) => [...prev, row])
  const handleActsReordered = (next: AdminEventActRow[]) => setActs(next)

  // Dragging every act across the Set 1/2 divide by hand is fiddly. This gives a one-click
  // starting point (real acts only, split by their CURRENT running order — first half to Set 1,
  // the rest to Set 2; manual/constant segments keep whatever set they're already in) that can
  // then be fine-tuned with the arrows or drag-and-drop.
  const handleToggleLock = async (setNumber: 1 | 2) => {
    const next = !locks[setNumber]
    setLocks((prev) => ({ ...prev, [setNumber]: next }))
    try {
      await setShowLock(eventId, setNumber, next)
    } catch (err) {
      console.error(err)
      setLocks((prev) => ({ ...prev, [setNumber]: !next }))
      toast.error(t('Kunde inte spara låset.', 'Could not save the lock.'))
    }
  }

  const handleAutoSplit = async () => {
    const confirmed = await confirm({
      message: t(
        'Dela upp alla akter jämnt mellan Set 1 och Set 2? Detta skriver över akternas nuvarande set-placering (egna och fasta moment påverkas inte).',
        "Split all acts evenly between Set 1 and Set 2? This overwrites acts' current set assignment (manual and constant segments are left untouched)."
      ),
    })
    if (!confirmed) return

    const realActs = acts
      .filter((a) => a.performer !== null)
      .sort((a, b) => a.display_order - b.display_order)
    const splitPoint = Math.ceil(realActs.length / 2)
    const setByActId = new Map<string, 1 | 2>(
      realActs.map((a, index) => [a.id, index < splitPoint ? 1 : 2])
    )

    setActs((prev) =>
      prev.map((a) => {
        const setNumber = setByActId.get(a.id)
        return setNumber && setNumber !== a.set_number ? { ...a, set_number: setNumber } : a
      })
    )
    reorderShowProgram(
      realActs.map((a) => ({
        id: a.id,
        display_order: a.display_order,
        set_number: setByActId.get(a.id) as 1 | 2,
      }))
    ).catch((err) => console.error('Kunde inte spara uppdelningen:', err))
  }

  const performerLinks = Object.fromEntries(
    performers.flatMap((p) =>
      p.castingApplicationId && p.castingApplicationToken
        ? [[p.performer_id, bookingPortalPath(p.castingApplicationId, p.castingApplicationToken)]]
        : []
    )
  )

  const savePerformerField =
    (
      save: (eventId: string, performerId: string, value: string | null) => Promise<void>,
      field: 'notes' | 'accommodation' | 'accommodation_details'
    ) =>
    async (performerId: string, value: string) => {
      const trimmed = value.trim() || null
      try {
        await save(eventId, performerId, trimmed)
        setPerformers((prev) =>
          prev.map((p) => (p.performer_id === performerId ? { ...p, [field]: trimmed } : p))
        )
      } catch (err) {
        toast.error(t('Kunde inte spara.', 'Could not save.'))
        console.error(err)
      }
    }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-text">{t('Öppnar ridån...', 'Opening the curtain...')}</div>
      </div>
    )
  }

  if (tab === 'travel') {
    return (
      <>
        <TravelAccommodationTab
          eventTitle={eventTitle}
          performers={performers}
          onTravelNotesChanged={savePerformerField(updateEventPerformerTravelNotes, 'notes')}
          onAccommodationChanged={savePerformerField(
            updateEventPerformerAccommodation,
            'accommodation'
          )}
          onAccommodationDetailsChanged={savePerformerField(
            updateEventPerformerAccommodationDetails,
            'accommodation_details'
          )}
        />
      </>
    )
  }

  if (acts.length === 0) {
    return (
      <div className="callout-panel italic text-center text-foreground/40 bg-black/10 border-dashed border-accent/10 py-8">
        {t(
          'Inga akter registrerade för detta event ännu.',
          'No acts registered for this event yet.'
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <PerformerLinksProvider value={performerLinks}>
        <ShowProgramBoard
          acts={acts}
          eventId={eventId}
          onUpdated={handleActUpdated}
          onRemoved={handleActRemoved}
          onAdded={handleActAdded}
          onReordered={handleActsReordered}
          locks={locks}
          onToggleLock={handleToggleLock}
          onSplit={handleAutoSplit}
        />
      </PerformerLinksProvider>
    </div>
  )
}
