import { useState } from 'react'
import { ChevronDown, ChevronUp, Mail, CalendarPlus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import { AddToEventPopover, type PopoverAction } from './AddToEventPopover'
import {
  markStaffInterested,
  confirmStaffForEvent,
  removeStaffInterest,
  removeStaffFromEvent,
} from '@/services/contactsService'
import type { StaffVolunteers, StaffVolunteerType, EventStaffInvitationStatus } from '@/types/types'

// Mirrors CastingApplicationRow.tsx's statusRowClass convention rather than inventing a
// new one — plain border/bg tint, no pill, so it reads at a glance without competing with
// the name badge.
const EVENT_STATUS_ROW_CLASS: Record<string, string> = {
  confirmed: 'border-emerald-500/70 bg-emerald-950/20',
  interested: 'border-sky-500/60 bg-sky-950/10',
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
  eventStatus?: EventStaffInvitationStatus
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
  const { t } = useLanguage()
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

  const rowStatusClass = eventStatus ? (EVENT_STATUS_ROW_CLASS[eventStatus] ?? '') : ''

  // Which 2 actions make sense depends on where this person already stands for the event —
  // e.g. once confirmed, "Mark interested" again would be a no-op; what's actually useful
  // is a way back down to interested, or off the event entirely.
  const buildPopoverActions = (): PopoverAction[] => {
    const markInterested: PopoverAction = {
      label: t('Markera intresserad', 'Mark interested'),
      variant: 'positive',
      successMessage: t('Markerad som intresserad!', 'Marked as interested!'),
      onClick: (eventId) => markStaffInterested(eventId, row.id),
    }
    const confirm: PopoverAction = {
      label: t('Bekräfta', 'Confirm'),
      variant: 'positive',
      successMessage: t('Bekräftad för eventet!', 'Confirmed for the event!'),
      onClick: (eventId) =>
        confirmStaffForEvent(eventId, row.id, row.name, row.role, row.role_details),
    }
    const removeInterest: PopoverAction = {
      label: t('Ta bort intresse', 'Remove interest'),
      variant: 'negative',
      successMessage: t('Intresse borttaget.', 'Interest removed.'),
      onClick: (eventId) => removeStaffInterest(eventId, row.id),
    }
    const removeFromEvent: PopoverAction = {
      label: t('Ta bort från event', 'Remove from event'),
      variant: 'negative',
      successMessage: t('Borttagen från eventet.', 'Removed from the event.'),
      onClick: (eventId) => removeStaffFromEvent(eventId, row.id, row.role),
    }
    // Downgrading from confirmed has to both leave the confirmed roster and record the
    // interest — confirmed always wins over interested in the status map (see
    // getStaffEventStatuses), so marking interested alone wouldn't visibly change anything.
    const downgradeToInterested: PopoverAction = {
      ...markInterested,
      onClick: async (eventId) => {
        await removeStaffFromEvent(eventId, row.id, row.role)
        await markStaffInterested(eventId, row.id)
      },
    }

    if (eventStatus === 'confirmed') return [downgradeToInterested, removeFromEvent]
    if (eventStatus === 'interested') return [removeInterest, confirm]
    return [markInterested, confirm]
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
                {eventStatus === 'confirmed' && (
                  <span className="shrink-0 not-italic font-body font-semibold text-[10px] text-green-400">
                    {t('Bekräftad', 'Confirmed')}
                  </span>
                )}
                {eventStatus === 'interested' && (
                  <span className="shrink-0 not-italic font-body font-semibold text-[10px] text-sky-400">
                    {t('Intresserad', 'Interested')}
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
              row.email
                ? 'bg-accent/10 border-accent/20 text-accent hover:bg-accent hover:text-black'
                : 'opacity-0 pointer-events-none'
            }`}
            title={row.email ? t('Skicka mail', 'Send email') : undefined}
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
                  actions={buildPopoverActions()}
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
