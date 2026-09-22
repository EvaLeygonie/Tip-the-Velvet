import { useState } from 'react'
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import { sponsorTypeLabel } from '@/lib/contactLabels'
import {
  updateEventSponsorDetails,
  updateEventSponsorMerchNotes,
  removeSponsorFromEvent,
  setSponsorMerchTable,
  setSponsorExhibitionTable,
  setSponsorGotPrice,
} from '@/services/contactsService'
import type { AdminEventSponsorRow } from '@/services/eventService'

interface EventSponsorRowProps {
  row: AdminEventSponsorRow
  eventId: string
  onRemoved: (sponsorId: string) => void
  onUpdated: (sponsorId: string, patch: Partial<AdminEventSponsorRow>) => void
  onMerchToggled: (sponsorId: string, value: boolean) => void
  onExhibitionToggled: (sponsorId: string, value: boolean) => void
}

// Mirrors EventStaffRow.tsx — Event Planning's operational view of one confirmed
// sponsorship, editing the logistics notes and removing them from this event. Everything
// else about the contact is still only editable via Contacts.
export const EventSponsorRow = ({
  row,
  eventId,
  onRemoved,
  onUpdated,
  onMerchToggled,
  onExhibitionToggled,
}: EventSponsorRowProps) => {
  const { t } = useLanguage()
  const isPrizeSponsor = row.role === 'prize'
  const [isExpanded, setIsExpanded] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isTogglingMerch, setIsTogglingMerch] = useState(false)
  const [isTogglingExhibition, setIsTogglingExhibition] = useState(false)
  const [isTogglingPrice, setIsTogglingPrice] = useState(false)
  const [draft, setDraft] = useState({
    details: row.details ?? '',
    merchTableNotes: row.merch_table_notes ?? '',
  })

  const handleToggleMerch = async () => {
    setIsTogglingMerch(true)
    try {
      const next = !row.has_merch_table
      await setSponsorMerchTable(eventId, row.sponsor_id, next)
      onMerchToggled(row.sponsor_id, next)
      toast.success(
        next
          ? t('Markerad med säljbord.', 'Marked as running a merch table.')
          : t('Säljbord borttaget.', 'Merch table removed.')
      )
    } catch (err) {
      toast.error(t('Kunde inte spara.', 'Could not save.'))
      console.error(err)
    } finally {
      setIsTogglingMerch(false)
    }
  }

  const handleToggleExhibition = async () => {
    setIsTogglingExhibition(true)
    try {
      const next = !row.has_exhibition
      await setSponsorExhibitionTable(eventId, row.sponsor_id, next)
      onExhibitionToggled(row.sponsor_id, next)
      toast.success(
        next
          ? t('Markerad med utställning.', 'Marked as exhibiting.')
          : t('Utställning borttagen.', 'Exhibition removed.')
      )
    } catch (err) {
      toast.error(t('Kunde inte spara.', 'Could not save.'))
      console.error(err)
    } finally {
      setIsTogglingExhibition(false)
    }
  }

  // Whether this prize sponsor has actually handed over their competition prize yet — we
  // need all 4 at the latest on the event day, so this is what lets the Dashboard's
  // "Sponsorer" card tell "slots filled" apart from "prizes actually in hand". Direct
  // feedback 2026-09-22.
  const handleToggleGotPrice = async () => {
    setIsTogglingPrice(true)
    try {
      const next = !row.has_gotten_price
      await setSponsorGotPrice(eventId, row.sponsor_id, next)
      onUpdated(row.sponsor_id, { has_gotten_price: next })
      toast.success(
        next
          ? t('Markerad som mottaget pris.', 'Marked as prize received.')
          : t('Pris ej längre markerat som mottaget.', 'Prize no longer marked as received.')
      )
    } catch (err) {
      toast.error(t('Kunde inte spara.', 'Could not save.'))
      console.error(err)
    } finally {
      setIsTogglingPrice(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const details = draft.details.trim() || null
      const merchTableNotes = draft.merchTableNotes.trim() || null
      await Promise.all([
        updateEventSponsorDetails(eventId, row.sponsor_id, details),
        updateEventSponsorMerchNotes(eventId, row.sponsor_id, merchTableNotes),
      ])
      onUpdated(row.sponsor_id, { details, merch_table_notes: merchTableNotes })
      toast.success(t('Sparat!', 'Saved!'))
      setIsExpanded(false)
    } catch (err) {
      toast.error(t('Kunde inte spara.', 'Could not save.'))
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemove = async () => {
    const confirmed = window.confirm(
      t(`Ta bort ${row.sponsor.name} från eventet?`, `Remove ${row.sponsor.name} from the event?`)
    )
    if (!confirmed) return
    try {
      await removeSponsorFromEvent(eventId, row.sponsor_id)
      onRemoved(row.sponsor_id)
      toast.success(t('Borttagen från eventet.', 'Removed from the event.'))
    } catch (err) {
      toast.error(t('Kunde inte ta bort.', 'Could not remove.'))
      console.error(err)
    }
  }

  return (
    <div
      className="admin-panel velvet-surface transition-all duration-300 overflow-hidden cursor-pointer"
      style={{ padding: 0 }}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {/* min-h matches SponsorSlotGrid's empty-slot placeholder exactly — otherwise a real
          card sharing a grid row with an empty slot gets stretched taller than a row of two
          real cards (CSS Grid stretches the whole row to its tallest item), which looked
          like an arbitrary height mismatch between rows. Direct feedback 2026-09-21. */}
      <div className="p-3 flex items-center gap-3 min-h-[52px]">
        <div className="text-accent/50 shrink-0">
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
        <span className="font-decorative text-sm text-foreground flex-1 min-w-0 truncate">
          {row.sponsor.name}
        </span>
        {row.role && (
          <span className="text-accent italic text-xs font-heading shrink-0">
            {sponsorTypeLabel(t, row.role)}
          </span>
        )}
        {isPrizeSponsor && (
          <span
            className={`text-[10px] border rounded-full px-2 py-0.5 shrink-0 ${
              row.has_gotten_price
                ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                : 'text-amber-400 border-amber-500/30 bg-amber-500/10'
            }`}
          >
            {row.has_gotten_price
              ? t('Pris mottaget', 'Prize received')
              : t('Väntar på pris', 'Awaiting prize')}
          </span>
        )}
        {row.has_merch_table && (
          <span className="text-[10px] text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 rounded-full px-2 py-0.5 shrink-0">
            {t('Säljbord', 'Merch table')}
          </span>
        )}
        {row.has_exhibition && (
          <span className="text-[10px] text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 rounded-full px-2 py-0.5 shrink-0">
            {t('Utställning', 'Exhibition')}
          </span>
        )}
        {row.details && !isExpanded && (
          <span className="text-xs text-foreground/50 italic truncate max-w-[180px] shrink-0 hidden sm:block">
            {row.details}
          </span>
        )}
      </div>

      {isExpanded && (
        <div
          className="border-t border-accent/10 bg-black/20 p-4 space-y-3 cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-6 flex-wrap">
            <label className="flex items-center gap-2 text-sm text-foreground/80 cursor-pointer">
              <input
                type="checkbox"
                checked={row.has_merch_table}
                onChange={handleToggleMerch}
                disabled={isTogglingMerch}
                className="h-4 w-4 accent-accent"
              />
              {t('Säljbord', 'Merch table')}
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground/80 cursor-pointer">
              <input
                type="checkbox"
                checked={row.has_exhibition}
                onChange={handleToggleExhibition}
                disabled={isTogglingExhibition}
                className="h-4 w-4 accent-accent"
              />
              {t('Utställning', 'Exhibition')}
            </label>
            {isPrizeSponsor && (
              <label className="flex items-center gap-2 text-sm text-foreground/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={row.has_gotten_price}
                  onChange={handleToggleGotPrice}
                  disabled={isTogglingPrice}
                  className="h-4 w-4 accent-accent"
                />
                {t('Pris hämtat', 'Price acquired')}
              </label>
            )}
          </div>
          <div className="space-y-1">
            <label className="form-label-gold block">
              {isPrizeSponsor
                ? t('Anteckning om priset', 'Note about the prize')
                : t('Anteckning', 'Note')}
            </label>
            <textarea
              value={draft.details}
              onChange={(e) => setDraft({ ...draft, details: e.target.value })}
              className="w-full min-h-[70px] text-sm bg-black/40 border border-accent/20 font-sans p-2 leading-relaxed rounded resize-y focus:border-accent text-white"
            />
          </div>
          {row.has_merch_table && (
            <div className="space-y-1">
              <label className="form-label-gold block">
                {t(
                  'Anteckning om säljbordet (t.ex. platsbehov)',
                  'Merch table note (e.g. space needed)'
                )}
              </label>
              <textarea
                value={draft.merchTableNotes}
                onChange={(e) => setDraft({ ...draft, merchTableNotes: e.target.value })}
                className="w-full min-h-[70px] text-sm bg-black/40 border border-accent/20 font-sans p-2 leading-relaxed rounded resize-y focus:border-accent text-white"
              />
            </div>
          )}
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-accent/10">
            <button type="button" onClick={handleRemove} className="btn-red text-xs py-2 px-4">
              {t('Ta bort från event', 'Remove from event')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="btn-gold text-xs py-2 px-4 flex items-center gap-1.5"
            >
              {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t('Spara', 'Save')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
