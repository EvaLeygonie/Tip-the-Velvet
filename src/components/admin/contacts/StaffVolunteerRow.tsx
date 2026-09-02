import { useState } from 'react'
import { ChevronDown, ChevronUp, Mail, CalendarPlus, CircleMinus, Ban, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import { formatDate } from '@/lib/utils'
import { volunteerShiftLabel } from '@/lib/contactLabels'
import { AddToEventPopover, type PopoverAction, type ToggleAction } from './AddToEventPopover'
import {
  markStaffInterested,
  markStaffDeclined,
  markStaffNotNeeded,
  markStaffContacted,
  clearStaffContacted,
  clearStaffResponseStatus,
  confirmStaffForEvent,
  removeStaffFromEvent,
  getStaffRolesForEvent,
} from '@/services/contactsService'
import type { StaffEventStatus } from '@/services/contactsService'
import type { StaffVolunteers, StaffVolunteerType } from '@/types/types'

// Mirrors CastingApplicationRow.tsx's statusRowClass convention rather than inventing a
// new one — plain border/bg tint, no pill, so it reads at a glance without competing with
// the name badge. Keyed by StaffEventStatus.status only — "contacted" is a separate signal
// shown as its own small icon (see the render below), not a row tint of its own, since it
// can coexist with any of these.
const EVENT_STATUS_ROW_CLASS: Record<string, string> = {
  confirmed: 'border-emerald-500/70 bg-emerald-950/20',
  interested: 'border-sky-500/60 bg-sky-950/10',
  declined: 'border-red-500/60 bg-red-950/10',
  not_needed: 'border-amber-500/60 bg-amber-950/10',
}

interface StaffVolunteerRowProps {
  row: StaffVolunteers
  isNew?: boolean
  roleOptions: { value: StaffVolunteerType; label: string }[]
  onSave: (id: string, patch: Partial<StaffVolunteers>, isNew: boolean) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onEmail: (row: StaffVolunteers) => void
  onCancelNew?: (id: string) => void
  // Status for whichever event Contacts is currently showing (see AdminContacts.tsx) —
  // undefined means this person has no relation to that event at all.
  eventStatus?: StaffEventStatus
  onEventStatusChanged?: () => void
}

export const StaffVolunteerRow = ({
  row,
  isNew = false,
  roleOptions,
  onSave,
  onDelete,
  onEmail,
  onCancelNew,
  eventStatus,
  onEventStatusChanged,
}: StaffVolunteerRowProps) => {
  const { t, language } = useLanguage()
  const [isExpanded, setIsExpanded] = useState(isNew)
  const [isSaving, setIsSaving] = useState(false)
  const [showEventPopover, setShowEventPopover] = useState(false)
  const [draft, setDraft] = useState({
    name: row.name,
    email: row.email ?? '',
    phone: row.phone ?? '',
    role: row.role,
    role_details: row.role_details ?? '',
    link: row.link ?? '',
    fee: row.fee != null ? String(row.fee) : '',
    worked_with: row.worked_with ?? false,
  })

  const handleSave = async () => {
    if (!draft.name.trim()) {
      toast.error(t('Namn krävs.', 'Name is required.'))
      return
    }
    setIsSaving(true)
    try {
      await onSave(
        row.id,
        {
          name: draft.name.trim(),
          email: draft.email.trim() || null,
          phone: draft.phone.trim() || null,
          role: draft.role,
          role_details: draft.role_details.trim() || null,
          link: draft.link.trim() || null,
          fee: draft.fee === '' ? null : Number(draft.fee),
          worked_with: draft.worked_with,
        },
        isNew
      )
      if (!isNew) setIsExpanded(false)
    } catch (err: unknown) {
      const dbError = err as { code?: string; message?: string }
      if (dbError?.code === '23505' || dbError?.message?.includes('unique_volunteer_role')) {
        toast.error(
          t(
            'Det finns redan en volontär med denna e-post och roll.',
            'A volunteer with this email and role already exists.'
          )
        )
      } else {
        toast.error(t('Kunde inte spara.', 'Could not save.'))
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    const confirmed = window.confirm(
      t(`Är du säker på att du vill radera ${row.name}?`, `Are you sure you want to delete ${row.name}?`)
    )
    if (!confirmed) return
    try {
      await onDelete(row.id)
    } catch (err: unknown) {
      const dbError = err as { code?: string }
      if (dbError?.code === '23503') {
        toast.error(
          t(
            'Kan inte radera — kontakten är kopplad till ett event.',
            "Can't delete — this contact is still linked to an event."
          )
        )
      } else {
        toast.error(t('Kunde inte radera.', 'Could not delete.'))
      }
    }
  }

  const status = eventStatus?.status
  const rowStatusClass = status ? (EVENT_STATUS_ROW_CLASS[status] ?? '') : ''

  // Which actions make sense depends on where this person already stands for the event —
  // e.g. once confirmed, "Mark interested" again would be a no-op. "Confirm" itself is
  // always offered though, confirmed or not: it now supports adding a second (or third)
  // role to the same event, not just the first one (see AddToEventPopover's
  // needsRoleSelection), so it stays useful past the initial confirmation.
  //
  // Per feedback (2026-09-02): the popover had grown to 5 stacked, differently-colored
  // buttons and felt crowded. Redesigned around two real decisions staying as buttons
  // (Interested, Confirm) with the three secondary, freely-combinable flags (contacted/
  // not needed/can't work) demoted to a row of small self-toggling icons underneath —
  // clicking an active icon undoes it, so there's no separate "remove" button needed for
  // any of the three. The one remaining gap is undoing "interested" itself, which has no
  // icon of its own — that's the lone plain-text link at the bottom.
  const markInterested: PopoverAction = {
    label: t('Markera intresserad', 'Mark interested'),
    variant: 'positive',
    successMessage: t('Markerad som intresserad!', 'Marked as interested!'),
    onClick: (eventId) => markStaffInterested(eventId, row.id),
  }
  const confirm: PopoverAction = {
    label: t('Tilldela roll', 'Assign role'),
    variant: 'positive',
    successMessage: t('Bekräftad för eventet!', 'Confirmed for the event!'),
    onClick: (eventId, selection) => {
      const role = selection?.role ?? row.role
      const roleDetails = selection?.roleDetails ?? row.role_details
      const shift = selection?.shift ?? null
      return confirmStaffForEvent(eventId, row.id, row.name, role, roleDetails, shift)
    },
    needsRoleSelection: {
      roleOptions,
      defaultRole: row.role,
      defaultRoleDetails: row.role_details,
      fetchExisting: async (eventId) => {
        const roles = await getStaffRolesForEvent(eventId, row.id)
        return roles.map((r) => ({
          role: r.role,
          roleLabel: roleOptions.find((o) => o.value === r.role)?.label ?? r.role,
          roleDetails: r.roleDetails,
          shift: r.shift,
          shiftLabel: r.shift ? volunteerShiftLabel(t, r.shift) : null,
        }))
      },
      onRemoveExisting: (eventId, role, shift) =>
        removeStaffFromEvent(eventId, row.id, role, shift),
    },
  }
  // "Remove from event" means the whole relationship, not one role — removes every role
  // (and every volunteer shift) this person holds for the event, not just row.role (their
  // own default role from the contacts table, which could easily differ from what they were
  // actually confirmed as here once multi-role support exists).
  const removeFromEvent: PopoverAction = {
    label: t('Ta bort från event', 'Remove from event'),
    variant: 'negative',
    successMessage: t('Borttagen från eventet.', 'Removed from the event.'),
    onClick: (eventId) => removeStaffFromEvent(eventId, row.id),
  }
  // Downgrading from confirmed has to both leave the confirmed roster and record the
  // interest — confirmed always wins over interested in the status map (see
  // getStaffEventStatuses), so marking interested alone wouldn't visibly change anything.
  // Same "every role" reasoning as removeFromEvent above.
  const downgradeToInterested: PopoverAction = {
    ...markInterested,
    onClick: async (eventId) => {
      await removeStaffFromEvent(eventId, row.id)
      await markStaffInterested(eventId, row.id)
    },
  }

  const buildActions = (): PopoverAction[] => {
    // Per feedback: a can't-work/not-needed mark is informational, never a lock — Confirm
    // stays available from every status in case plans change.
    if (status === 'confirmed') return [confirm, downgradeToInterested, removeFromEvent]
    return [markInterested, confirm]
  }

  const buildToggleActions = (): ToggleAction[] => {
    if (status === 'confirmed') return []
    const contacted = !!eventStatus?.contactedAt
    return [
      {
        icon: Mail,
        label: contacted
          ? t('Kontaktad — klicka för att ta bort', 'Contacted — click to remove')
          : t('Markera kontaktad', 'Mark as contacted'),
        isActive: contacted,
        activeClassName: 'border-violet-400/50 text-violet-300 bg-violet-500/10',
        successMessage: contacted
          ? t('Kontakt-markering borttagen.', 'Contacted marking removed.')
          : t('Markerad som kontaktad!', 'Marked as contacted!'),
        onClick: (eventId) =>
          contacted ? clearStaffContacted(eventId, row.id) : markStaffContacted(eventId, row.id),
      },
      {
        icon: CircleMinus,
        label:
          status === 'not_needed'
            ? t('Inte aktuell — klicka för att ta bort', 'Not needed — click to remove')
            : t('Inte aktuell', 'Not needed'),
        isActive: status === 'not_needed',
        activeClassName: 'border-amber-400/50 text-amber-300 bg-amber-500/10',
        successMessage:
          status === 'not_needed'
            ? t('Markering borttagen.', 'Marking removed.')
            : t('Markerad som inte aktuell.', 'Marked as not needed.'),
        onClick: (eventId) =>
          status === 'not_needed'
            ? clearStaffResponseStatus(eventId, row.id)
            : markStaffNotNeeded(eventId, row.id),
      },
      {
        icon: Ban,
        label:
          status === 'declined'
            ? t('Kan inte jobba — klicka för att ta bort', "Can't work — click to remove")
            : t('Kan inte jobba', "Can't work"),
        isActive: status === 'declined',
        activeClassName: 'border-red-400/50 text-red-300 bg-red-500/10',
        successMessage:
          status === 'declined'
            ? t('Markering borttagen.', 'Marking removed.')
            : t('Markerad som kan inte jobba.', "Marked as can't work."),
        onClick: (eventId) =>
          status === 'declined'
            ? clearStaffResponseStatus(eventId, row.id)
            : markStaffDeclined(eventId, row.id),
      },
    ]
  }

  // The one status without a self-toggling icon — everything else undoes via its own icon.
  const buildClearAction = (): PopoverAction | undefined => {
    if (status !== 'interested') return undefined
    return {
      label: t('Ta bort markering', 'Remove marking'),
      variant: 'negative',
      successMessage: t('Markering borttagen.', 'Marking removed.'),
      onClick: (eventId) => clearStaffResponseStatus(eventId, row.id),
    }
  }

  return (
    <div
      className={`admin-panel velvet-surface transition-all duration-300 overflow-hidden cursor-pointer ${rowStatusClass}`}
      style={{ padding: 0 }}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div className="grid grid-cols-12 gap-4 items-center flex-1 min-w-0">
          <div className="col-span-12 sm:col-span-4 flex items-center gap-3 min-w-0">
            <div className="text-accent/50 shrink-0">
              {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </div>
            <div className="truncate">
              <div className="font-decorative text-base text-foreground tracking-wide truncate flex items-center gap-1.5">
                <span className="truncate">{row.name || t('(Namnlös)', '(Unnamed)')}</span>
                {status === 'confirmed' && (
                  <span className="shrink-0 not-italic font-body font-semibold text-[10px] text-green-400">
                    {t('Bekräftad', 'Confirmed')}
                  </span>
                )}
                {status === 'interested' && (
                  <span className="shrink-0 not-italic font-body font-semibold text-[10px] text-sky-400">
                    {t('Intresserad', 'Interested')}
                  </span>
                )}
                {status === 'declined' && (
                  <span className="shrink-0 not-italic font-body font-semibold text-[10px] text-red-400">
                    {t('Kan inte jobba', "Can't work")}
                  </span>
                )}
                {status === 'not_needed' && (
                  <span className="shrink-0 not-italic font-body font-semibold text-[10px] text-amber-400">
                    {t('Inte aktuell', 'Not needed')}
                  </span>
                )}
                {eventStatus?.contactedAt && (
                  <span
                    title={t(
                      `Kontaktad ${formatDate(language, eventStatus.contactedAt)}`,
                      `Contacted ${formatDate(language, eventStatus.contactedAt)}`
                    )}
                    className="shrink-0 text-violet-400"
                  >
                    <Mail className="h-3 w-3" />
                  </span>
                )}
              </div>
              {row.role_details && (
                <div className="text-accent italic text-xs font-heading truncate">
                  {row.role_details}
                </div>
              )}
            </div>
          </div>

          <div className="col-span-6 sm:col-span-3 text-sm text-foreground/60 font-body truncate">
            <span className="block uppercase tracking-wider text-[10px] text-accent/50 font-semibold mb-0.5">
              {t('E-post', 'Email')}
            </span>
            <span className="truncate block">{row.email || '—'}</span>
          </div>

          <div className="col-span-6 sm:col-span-2 text-sm text-foreground/60 font-body truncate">
            <span className="block uppercase tracking-wider text-[10px] text-accent/50 font-semibold mb-0.5">
              {t('Telefon', 'Phone')}
            </span>
            <span className="truncate block">{row.phone || '—'}</span>
          </div>

          <div className="col-span-6 sm:col-span-2 text-sm text-foreground/60 font-body">
            <span className="block uppercase tracking-wider text-[10px] text-accent/50 font-semibold mb-0.5">
              {t('Arvode', 'Fee')}
            </span>
            <span className="block">{row.fee != null ? `${row.fee} SEK` : '—'}</span>
          </div>

          <div className="col-span-6 sm:col-span-1 text-sm">
            {row.worked_with && (
              <span
                title={t('Har jobbat med oss förut', 'Has worked with us before')}
                className="text-green-400"
              >
                ✓
              </span>
            )}
          </div>
        </div>

        <div
          className="flex items-center gap-2 shrink-0 self-end sm:self-center"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => row.email && onEmail(row)}
            disabled={!row.email}
            className={`p-2 border rounded-md transition-colors shrink-0 ${
              !row.email
                ? 'opacity-0 pointer-events-none'
                : eventStatus?.contactedAt
                  ? 'bg-violet-500/10 border-violet-500/30 text-violet-300 hover:bg-violet-500 hover:text-black'
                  : 'bg-accent/10 border-accent/20 text-accent hover:bg-accent hover:text-black'
            }`}
            title={
              row.email
                ? eventStatus?.contactedAt
                  ? t('Redan kontaktad för eventet — skicka igen?', 'Already contacted for this event — send again?')
                  : t('Skicka mail', 'Send email')
                : undefined
            }
          >
            <Mail className="h-4 w-4" />
          </button>
          {!isNew && (
            <>
              <button
                onClick={() => setShowEventPopover(true)}
                className="p-2 border rounded-md transition-colors shrink-0 bg-accent/10 border-accent/20 text-accent hover:bg-accent hover:text-black"
                title={t('Lägg till i event', 'Add to event')}
              >
                <CalendarPlus className="h-4 w-4" />
              </button>
              {showEventPopover && (
                <AddToEventPopover
                  onClose={() => setShowEventPopover(false)}
                  actions={buildActions()}
                  toggleActions={buildToggleActions()}
                  clearAction={buildClearAction()}
                  onChanged={onEventStatusChanged}
                />
              )}
            </>
          )}
        </div>
      </div>

      {isExpanded && (
        <div
          className="border-t border-accent/10 bg-black/20 p-6 space-y-4 text-left cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="form-label-gold block">{t('Namn', 'Name')}</label>
              <input
                type="text"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="w-full h-9 text-sm bg-black/40 border border-accent/20 rounded p-2 focus:border-accent text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="form-label-gold block">{t('Roll', 'Role')}</label>
              <select
                value={draft.role}
                onChange={(e) => setDraft({ ...draft, role: e.target.value as StaffVolunteerType })}
                className="w-full h-9 flex items-center text-sm bg-black/40 border border-accent/20 rounded py-2 pl-2 pr-8 focus:border-accent text-white"
              >
                {roleOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="form-label-gold block">{t('E-post', 'Email')}</label>
              <input
                type="email"
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                className="w-full h-9 text-sm bg-black/40 border border-accent/20 rounded p-2 focus:border-accent text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="form-label-gold block">{t('Telefon', 'Phone')}</label>
              <input
                type="text"
                value={draft.phone}
                onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                className="w-full h-9 text-sm bg-black/40 border border-accent/20 rounded p-2 focus:border-accent text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="form-label-gold block">{t('Länk', 'Link')}</label>
              <input
                type="text"
                value={draft.link}
                onChange={(e) => setDraft({ ...draft, link: e.target.value })}
                className="w-full h-9 text-sm bg-black/40 border border-accent/20 rounded p-2 focus:border-accent text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="form-label-gold block">{t('Arvode (SEK)', 'Fee (SEK)')}</label>
              <input
                type="number"
                value={draft.fee}
                onChange={(e) => setDraft({ ...draft, fee: e.target.value })}
                className="w-full h-9 text-sm bg-black/40 border border-accent/20 rounded p-2 focus:border-accent text-white"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="form-label-gold block">{t('Rolldetaljer', 'Role details')}</label>
              <textarea
                value={draft.role_details}
                onChange={(e) => setDraft({ ...draft, role_details: e.target.value })}
                className="w-full h-20 text-sm bg-black/40 border border-accent/20 font-sans p-2 leading-relaxed rounded resize-none focus:border-accent text-white"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-foreground/80 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.worked_with}
                onChange={(e) => setDraft({ ...draft, worked_with: e.target.checked })}
                className="h-4 w-4 accent-accent"
              />
              {t('Har jobbat med oss förut', 'Has worked with us before')}
            </label>
            <span className="text-xs text-foreground/40 flex items-center gap-1.5">
              {row.agreed_to_terms
                ? `✓ ${t('Samtycke godkänt', 'Consent given')}`
                : `— ${t('Inget samtycke registrerat', 'No consent on record')}`}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2 border-t border-accent/10">
            {!isNew ? (
              <button
                type="button"
                onClick={handleDelete}
                className="btn-red text-xs py-2 px-4"
              >
                {t('Radera', 'Delete')}
              </button>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-2">
              {isNew && onCancelNew && (
                <button
                  type="button"
                  onClick={() => onCancelNew(row.id)}
                  className="px-4 py-2 text-xs border border-accent/20 rounded text-foreground/70 hover:bg-white/5 transition-colors"
                >
                  {t('Avbryt', 'Cancel')}
                </button>
              )}
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
        </div>
      )}
    </div>
  )
}
