import { useState } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import { useCurrentEvent } from '@/contexts/CurrentEventContext'
import { markStaffInterested, confirmStaffForEvent } from '@/services/contactsService'
import type { StaffVolunteerType } from '@/types/types'

interface AddToEventPopoverProps {
  onClose: () => void
  staffId: string
  role: StaffVolunteerType
  roleDetails: string | null
  // Lets the Contacts page refresh its status badges/tally after a write here, without
  // this component needing to know how that state is stored.
  onChanged?: () => void
}

// A small dialog, not an anchored dropdown — the row it's triggered from has
// overflow-hidden (keeps its content within the rounded card border), which would clip an
// absolutely-positioned popover nested inside it. Portaled to document.body instead, same
// pattern already proven by ContactMailModal.tsx.
export const AddToEventPopover = ({
  onClose,
  staffId,
  role,
  roleDetails,
  onChanged,
}: AddToEventPopoverProps) => {
  const { t } = useLanguage()
  const { upcomingEvents, selectedEventId } = useCurrentEvent()
  const [targetEventId, setTargetEventId] = useState(selectedEventId)
  const [isSaving, setIsSaving] = useState(false)

  const handleMarkInterested = async () => {
    if (!targetEventId) return
    setIsSaving(true)
    try {
      await markStaffInterested(targetEventId, staffId)
      toast.success(t('Markerad som intresserad!', 'Marked as interested!'))
      onChanged?.()
      onClose()
    } catch (err) {
      toast.error(t('Kunde inte spara.', 'Could not save.'))
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleConfirm = async () => {
    if (!targetEventId) return
    setIsSaving(true)
    try {
      await confirmStaffForEvent(targetEventId, staffId, role, roleDetails)
      toast.success(t('Bekräftad för eventet!', 'Confirmed for the event!'))
      onChanged?.()
      onClose()
    } catch (err) {
      toast.error(t('Kunde inte spara.', 'Could not save.'))
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  if (typeof window === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="velvet-surface border border-accent/30 max-w-xs w-full p-5 space-y-3 rounded-lg shadow-2xl relative"
        style={{ backgroundColor: '#141111' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h4 className="font-decorative text-base text-accent text-center">
          {t('Lägg till i event', 'Add to event')}
        </h4>

        <div className="space-y-1">
          <label className="form-label-gold block">{t('Event', 'Event')}</label>
          {upcomingEvents.length > 1 ? (
            <select
              value={targetEventId}
              onChange={(e) => setTargetEventId(e.target.value)}
              className="w-full h-9 flex items-center text-sm bg-black/40 border border-accent/20 rounded py-2 pl-2 pr-8 focus:border-accent text-white"
            >
              {upcomingEvents.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.title}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-foreground/80">
              {upcomingEvents[0]?.title ?? t('Inget kommande event', 'No upcoming event')}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            onClick={handleMarkInterested}
            disabled={isSaving || !targetEventId}
            className="btn-gold-outline text-xs py-2 px-3 justify-center"
          >
            {t('Markera intresserad', 'Mark interested')}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSaving || !targetEventId}
            className="btn-gold text-xs py-2 px-3 min-h-0 justify-center"
          >
            {t('Bekräfta', 'Confirm')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-foreground/60 hover:text-foreground/90 transition-colors"
          >
            {t('Avbryt', 'Cancel')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
