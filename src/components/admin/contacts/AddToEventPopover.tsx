import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import type { LucideIcon } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useCurrentEvent } from '@/contexts/CurrentEventContext'
import { VOLUNTEER_SHIFT_ORDER } from '@/components/admin/event-plan/constants'
import { volunteerShiftLabel } from '@/lib/contactLabels'
import type { StaffVolunteerType, VolunteerShift } from '@/types/types'

interface ExistingRole {
  role: StaffVolunteerType
  roleLabel: string
  roleDetails: string | null
  // Only meaningful for role: 'volunteer' — a person can hold several volunteer shifts at
  // once, which are otherwise indistinguishable by role alone (see contactsService.ts's
  // confirmStaffForEvent/removeStaffFromEvent for why shift has to be part of the identity
  // here too, not just role).
  shift: VolunteerShift | null
  shiftLabel: string | null
}

export interface RoleSelectionConfig {
  roleOptions: { value: StaffVolunteerType; label: string }[]
  defaultRole: StaffVolunteerType
  defaultRoleDetails: string | null
  // Every role (+ shift, for volunteers) this person already holds for whichever event is
  // selected — refetched after each confirm/remove so the list (and the "add another role"
  // flow) stays live.
  fetchExisting: (eventId: string) => Promise<ExistingRole[]>
  onRemoveExisting: (
    eventId: string,
    role: StaffVolunteerType,
    shift: VolunteerShift | null
  ) => Promise<void>
}

export interface PopoverAction {
  label: string
  // 'positive' (gold, filled) for interested/confirm-type moves, 'negative' (red-tinted,
  // matches the Radera/delete idiom used elsewhere) for remove-from-event, 'neutral'
  // (amber-tinted) for admin-bookkeeping moves that aren't a rejection.
  variant: 'positive' | 'negative' | 'neutral'
  successMessage: string
  onClick: (
    eventId: string,
    selection?: { role: StaffVolunteerType; roleDetails: string | null; shift: VolunteerShift | null }
  ) => Promise<void>
  // Only the staff "Confirm" action sets this — reveals a role (+ shift) picker inline
  // instead of firing immediately, and keeps the popover open afterward so another role can
  // be added right away. Sponsors have no role concept, so their actions never set this.
  needsRoleSelection?: RoleSelectionConfig
}

// A small self-toggling flag, rendered as one icon among a row of icons rather than a
// full-width colored button — for secondary, easily-combined markers (contacted/not
// needed/can't work) that were crowding the popover as equally-weighted buttons alongside
// the two real decisions (Interested, Confirm). isActive drives both the icon's fill and
// which direction onClick moves it (the caller flips its own onClick based on isActive).
export interface ToggleAction {
  icon: LucideIcon
  label: string
  isActive: boolean
  activeClassName: string
  onClick: (eventId: string) => Promise<void>
  successMessage: string
}

interface AddToEventPopoverProps {
  onClose: () => void
  // Caller computes exactly which 1-2 actions make sense for this row's current status
  // (none/interested/confirmed) — the popover just renders whatever it's given, so it stays
  // agnostic of staff-vs-sponsor status semantics.
  actions: PopoverAction[]
  // Small toggle-icon row shown below `actions`, in the same non-role-selection view.
  // Optional — sponsors/venues have no equivalent flags, so they never set this.
  toggleActions?: ToggleAction[]
  // A single plain-text link (not a colored button) for the one remaining case that isn't
  // self-toggling via an icon — clearing "interested" specifically, since it has no icon of
  // its own. Optional; omitted whenever there's nothing to clear.
  clearAction?: PopoverAction
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
  actions,
  toggleActions,
  clearAction,
  onChanged,
}: AddToEventPopoverProps) => {
  const { t } = useLanguage()
  const { upcomingEvents, selectedEventId } = useCurrentEvent()
  const [targetEventId, setTargetEventId] = useState(selectedEventId)
  const [isSaving, setIsSaving] = useState(false)

  const [pendingAction, setPendingAction] = useState<PopoverAction | null>(null)
  const [selectedRole, setSelectedRole] = useState<StaffVolunteerType | null>(null)
  const [roleDetails, setRoleDetails] = useState('')
  const [selectedShift, setSelectedShift] = useState<VolunteerShift | null>(null)
  const [existingRoles, setExistingRoles] = useState<ExistingRole[]>([])
  const [loadingExisting, setLoadingExisting] = useState(false)

  const loadExisting = async (action: PopoverAction, eventId: string) => {
    if (!action.needsRoleSelection || !eventId) return
    setLoadingExisting(true)
    try {
      const rows = await action.needsRoleSelection.fetchExisting(eventId)
      setExistingRoles(rows)
    } catch (err) {
      console.error('Kunde inte hämta befintliga roller:', err)
    } finally {
      setLoadingExisting(false)
    }
  }

  useEffect(() => {
    if (!pendingAction?.needsRoleSelection || !targetEventId) return
    const action = pendingAction
    const eventId = targetEventId
    const load = async () => {
      setLoadingExisting(true)
      try {
        const rows = await action.needsRoleSelection!.fetchExisting(eventId)
        setExistingRoles(rows)
      } catch (err) {
        console.error('Kunde inte hämta befintliga roller:', err)
      } finally {
        setLoadingExisting(false)
      }
    }
    load()
  }, [pendingAction, targetEventId])

  const handleAction = async (action: PopoverAction) => {
    if (!targetEventId) return
    if (action.needsRoleSelection) {
      setPendingAction(action)
      setSelectedRole(action.needsRoleSelection.defaultRole)
      setRoleDetails(action.needsRoleSelection.defaultRoleDetails ?? '')
      setSelectedShift(null)
      return
    }
    setIsSaving(true)
    try {
      await action.onClick(targetEventId)
      toast.success(action.successMessage)
      onChanged?.()
      onClose()
    } catch (err) {
      toast.error(t('Kunde inte spara.', 'Could not save.'))
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  // Deliberately doesn't call onClose() — a toggle click shouldn't dismiss the popover, so
  // several flags can be flipped in one visit without reopening it each time.
  const handleToggleAction = async (action: ToggleAction) => {
    if (!targetEventId) return
    setIsSaving(true)
    try {
      await action.onClick(targetEventId)
      toast.success(action.successMessage)
      onChanged?.()
    } catch (err) {
      toast.error(t('Kunde inte spara.', 'Could not save.'))
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleConfirmRole = async () => {
    if (!targetEventId || !pendingAction || !selectedRole) return
    setIsSaving(true)
    try {
      await pendingAction.onClick(targetEventId, {
        role: selectedRole,
        roleDetails: roleDetails.trim() || null,
        shift: selectedRole === 'volunteer' ? selectedShift : null,
      })
      toast.success(pendingAction.successMessage)
      onChanged?.()
      setRoleDetails('')
      setSelectedShift(null)
      await loadExisting(pendingAction, targetEventId)
    } catch (err) {
      toast.error(t('Kunde inte spara.', 'Could not save.'))
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemoveExisting = async (role: StaffVolunteerType, shift: VolunteerShift | null) => {
    if (!targetEventId || !pendingAction?.needsRoleSelection) return
    try {
      await pendingAction.needsRoleSelection.onRemoveExisting(targetEventId, role, shift)
      toast.success(t('Borttagen.', 'Removed.'))
      onChanged?.()
      await loadExisting(pendingAction, targetEventId)
    } catch (err) {
      toast.error(t('Kunde inte ta bort.', 'Could not remove.'))
      console.error(err)
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
          {pendingAction ? pendingAction.label : t('Lägg till i event', 'Add to event')}
        </h4>

        <div className="space-y-1.5 text-center">
          <label className="form-label-gold block text-center">{t('Event', 'Event')}</label>
          {upcomingEvents.length > 1 ? (
            <select
              value={targetEventId}
              onChange={(e) => setTargetEventId(e.target.value)}
              className="w-full h-9 flex items-center text-sm bg-black/40 border border-accent/20 rounded py-2 pl-2 pr-8 focus:border-accent text-white text-center"
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

        {pendingAction?.needsRoleSelection ? (
          <div className="space-y-3">
            {!loadingExisting && existingRoles.length > 0 && (
              <div className="space-y-1.5">
                <label className="form-label-gold block text-center">
                  {t('Redan bekräftad som', 'Already confirmed as')}
                </label>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {existingRoles.map((r) => (
                    <span
                      key={`${r.role}-${r.shift ?? 'none'}`}
                      className="flex items-center gap-1 text-[11px] py-1 px-2 rounded-full border border-accent/30 bg-accent/10 text-accent"
                    >
                      {r.shiftLabel ? `${r.roleLabel} — ${r.shiftLabel}` : r.roleLabel}
                      <button
                        type="button"
                        onClick={() => handleRemoveExisting(r.role, r.shift)}
                        title={t('Ta bort roll', 'Remove role')}
                        className="hover:text-red-400 transition-colors leading-none"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="form-label-gold block">{t('Roll', 'Role')}</label>
              <select
                value={selectedRole ?? ''}
                onChange={(e) => setSelectedRole(e.target.value as StaffVolunteerType)}
                className="w-full h-9 flex items-center text-sm bg-black/40 border border-accent/20 rounded py-2 pl-2 pr-8 focus:border-accent text-white"
              >
                {pendingAction.needsRoleSelection.roleOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {selectedRole === 'volunteer' && (
              <div className="space-y-1.5">
                <label className="form-label-gold block">{t('Pass', 'Shift')}</label>
                <select
                  value={selectedShift ?? ''}
                  onChange={(e) =>
                    setSelectedShift((e.target.value || null) as VolunteerShift | null)
                  }
                  className="w-full h-9 flex items-center text-sm bg-black/40 border border-accent/20 rounded py-2 pl-2 pr-8 focus:border-accent text-white"
                >
                  <option value="">{t('Inget pass (valfritt)', 'No shift (optional)')}</option>
                  {VOLUNTEER_SHIFT_ORDER.map((shift) => (
                    <option key={shift} value={shift}>
                      {volunteerShiftLabel(t, shift)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="form-label-gold block">{t('Detaljer', 'Details')}</label>
              <textarea
                value={roleDetails}
                onChange={(e) => setRoleDetails(e.target.value)}
                rows={2}
                className="w-full text-sm bg-black/40 border border-accent/20 font-sans p-2 leading-relaxed rounded resize-none focus:border-accent text-white"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPendingAction(null)}
                className="flex-1 text-xs py-2 px-3 border border-accent/20 rounded text-foreground/70 hover:bg-white/5 transition-colors"
              >
                {t('Tillbaka', 'Back')}
              </button>
              <button
                type="button"
                onClick={handleConfirmRole}
                disabled={isSaving || !targetEventId}
                className="flex-1 btn-gold text-xs py-2 px-3 min-h-0 justify-center flex items-center gap-1.5"
              >
                {pendingAction.label}
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full text-xs text-foreground/60 hover:text-foreground/90 transition-colors"
            >
              {t('Klar', 'Done')}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 pt-1">
            {actions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => handleAction(action)}
                disabled={isSaving || !targetEventId}
                className={
                  action.variant === 'positive'
                    ? 'btn-gold text-xs py-2 px-3 min-h-0 justify-center'
                    : action.variant === 'neutral'
                      ? 'btn-amber text-xs py-2 px-3 min-h-0 justify-center'
                      : 'btn-red text-xs py-2 px-3 min-h-0 justify-center'
                }
              >
                {action.label}
              </button>
            ))}

            {toggleActions && toggleActions.length > 0 && (
              <div className="flex items-center justify-center gap-3 pt-1">
                {toggleActions.map((toggle) => (
                  <button
                    key={toggle.label}
                    type="button"
                    title={toggle.label}
                    onClick={() => handleToggleAction(toggle)}
                    disabled={isSaving || !targetEventId}
                    className={`p-2 rounded-full border transition-colors ${
                      toggle.isActive
                        ? toggle.activeClassName
                        : 'border-accent/15 text-foreground/25 hover:text-foreground/50 hover:border-accent/30'
                    }`}
                  >
                    <toggle.icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
            )}

            {clearAction && (
              <button
                type="button"
                onClick={() => handleAction(clearAction)}
                disabled={isSaving || !targetEventId}
                className="text-[11px] text-foreground/40 hover:text-foreground/70 underline decoration-dotted transition-colors"
              >
                {clearAction.label}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="text-xs text-foreground/60 hover:text-foreground/90 transition-colors"
            >
              {t('Stäng', 'Close')}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
