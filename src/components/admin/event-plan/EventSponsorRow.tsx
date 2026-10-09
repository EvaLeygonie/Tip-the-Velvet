import { useState } from 'react'
import { ChevronDown, ChevronUp, Loader2, UserPlus, Check } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import { getImageSrc } from '@/lib/utils'
import {
  updateEventSponsorDetails,
  updateEventSponsorMerchNotes,
  removeSponsorFromEvent,
  setSponsorMerchTable,
  setSponsorExhibitionTable,
  setSponsorGotPrice,
} from '@/services/contactsService'
import type { AdminEventSponsorRow } from '@/services/eventService'
import { useConfirm } from '@/contexts/ConfirmContext'

interface EventSponsorRowProps {
  row: AdminEventSponsorRow
  eventId: string
  onRemoved: (sponsorId: string) => void
  onUpdated: (sponsorId: string, patch: Partial<AdminEventSponsorRow>) => void
  onMerchToggled: (sponsorId: string, value: boolean) => void
  onExhibitionToggled: (sponsorId: string, value: boolean) => void
  // Only passed for sponsors that can have an on-site person (Säljbord/Utställning rows) —
  // lets the VIP nudge live on the card itself instead of as a separate line underneath it,
  // and doubles as a "already added" indicator once isAdded flips true. Direct feedback
  // 2026-10-04 that the standalone link under each card looked awkward.
  vipStatus?: {
    isAdded: boolean
    onRequestVip: () => void
  }
  // A sponsor confirmed in more than one capacity (e.g. prize + merch table) renders as a
  // separate card per section (one in Pris-sponsorer, one in Säljbord), each reading the same
  // underlying row — so without this, both cards showed BOTH note fields regardless of which
  // section they sat in. Each caller now says which single field its section cares about.
  // Direct feedback 2026-10-04.
  noteField: { key: 'details' | 'merch_table_notes'; label: string }
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
  vipStatus,
  noteField,
}: EventSponsorRowProps) => {
  const { t } = useLanguage()
  const confirm = useConfirm()
  const isPrizeSponsor = row.role === 'prize'
  const [isExpanded, setIsExpanded] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isTogglingMerch, setIsTogglingMerch] = useState(false)
  const [isTogglingExhibition, setIsTogglingExhibition] = useState(false)
  const [isTogglingPrice, setIsTogglingPrice] = useState(false)
  const currentNoteValue = noteField.key === 'details' ? row.details : row.merch_table_notes
  const [draft, setDraft] = useState({ note: currentNoteValue ?? '' })

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
      const value = draft.note.trim() || null
      if (noteField.key === 'details') {
        await updateEventSponsorDetails(eventId, row.sponsor_id, value)
        onUpdated(row.sponsor_id, { details: value })
      } else {
        await updateEventSponsorMerchNotes(eventId, row.sponsor_id, value)
        onUpdated(row.sponsor_id, { merch_table_notes: value })
      }
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
    const confirmed = await confirm({
      message: t(
        `Ta bort ${row.sponsor.name} från eventet?`,
        `Remove ${row.sponsor.name} from the event?`
      ),
      destructive: true,
    })
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
      <div className="p-3 flex items-center gap-3 min-h-[72px]">
        <div className="text-accent/50 shrink-0">
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
        {/* Same logo treatment as CastingApplicationRow's performer thumbnail — direct
            feedback 2026-10-04. */}
        <div className="w-12 h-12 rounded-md overflow-hidden border border-accent/20 shrink-0 bg-black/40">
          {row.sponsor.logo_id ? (
            <img
              src={getImageSrc(row.sponsor.logo_id)}
              alt={row.sponsor.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-accent/30 text-xs font-mono">
              N/A
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <span className="font-decorative text-sm text-foreground truncate block">
            {row.sponsor.name}
          </span>
          {/* The note relevant to THIS section only (see noteField), not whichever note the
              sponsor happens to have in another capacity — moved here under the title,
              smaller and gold, instead of truncated off to the side. Direct feedback
              2026-10-04. */}
          {currentNoteValue && !isExpanded && (
            <p className="text-left text-[11px] text-accent/80 italic truncate">
              {currentNoteValue}
            </p>
          )}
        </div>
        {/* No separate role-label badge here on purpose — the grid section this row sits in
            (Pris-sponsorer / Säljbord / Utställning / Övriga) already says what kind of
            sponsor this is. These badges are for the status/cross-category signal a section
            alone can't show (e.g. a Prize sponsor who's also running a merch table), one
            badge per dimension, amber when something's outstanding and green when it isn't —
            not a second label repeating the category itself. Direct feedback 2026-10-04. */}
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
        {vipStatus &&
          (vipStatus.isAdded ? (
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 rounded-full px-2 py-0.5 shrink-0">
              <Check className="h-2.5 w-2.5" />
              {t('VIP-listan', 'VIP list')}
            </span>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                vipStatus.onRequestVip()
              }}
              className="flex items-center gap-1 text-[10px] text-accent/70 border border-accent/20 rounded-full px-2 py-0.5 shrink-0 hover:text-accent hover:border-accent/40 transition-colors"
            >
              <UserPlus className="h-2.5 w-2.5" />
              {t('VIP-listan', 'VIP list')}
            </button>
          ))}
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
            <label className="form-label-gold block">{noteField.label}</label>
            <textarea
              value={draft.note}
              onChange={(e) => setDraft({ ...draft, note: e.target.value })}
              className="w-full min-h-[70px] text-sm bg-black/40 border border-accent/20 font-sans p-2 leading-relaxed rounded resize-y focus:border-accent text-white"
            />
          </div>
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
