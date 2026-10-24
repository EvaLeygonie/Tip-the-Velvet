import { useState } from 'react'
import { Copy, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import { volunteerShiftLabel } from '@/lib/contactLabels'
import { EventStaffRow } from './EventStaffRow'
import { GroupMailModal } from './GroupMailModal'
import { blankMailDefaults } from '@/lib/mailDefaults'
import { VOLUNTEER_SHIFT_ORDER } from './constants'
import type { AdminEventStaffRow } from '@/services/eventService'

interface VolunteerShiftGroupsProps {
  rows: AdminEventStaffRow[]
  eventId: string
  eventTitle: string
  onRemoved: (id: string) => void
  onUpdated: (id: string, patch: Partial<AdminEventStaffRow>) => void
  onShiftsChanged: () => Promise<void> | void
}

// Splits the Volontär role section into its real shift subsections (driving/setup/
// guestlist/takedown, in that order) instead of one flat list — every other role keeps
// rendering as a flat list in AdminEventPlan.tsx, unchanged. Anyone without a shift set yet
// (pre-migration confirmations, or confirmed without picking one) falls into a final
// "no shift" bucket rather than being hidden.
export const VolunteerShiftGroups = ({
  rows,
  eventId,
  eventTitle,
  onRemoved,
  onUpdated,
  onShiftsChanged,
}: VolunteerShiftGroupsProps) => {
  const { t } = useLanguage()
  const [mailGroup, setMailGroup] = useState<string | null>(null)

  const groups = [
    ...VOLUNTEER_SHIFT_ORDER.map((shift) => ({
      key: shift,
      label: volunteerShiftLabel(t, shift),
      rows: rows.filter((r) => r.shift === shift),
    })),
    {
      key: 'none',
      label: t('Inget pass tilldelat', 'No shift assigned'),
      rows: rows.filter((r) => !r.shift),
    },
  ]

  const copyEmails = async (groupRows: AdminEventStaffRow[]) => {
    const emails = [...new Set(groupRows.flatMap((r) => (r.staff.email ? [r.staff.email] : [])))]
    try {
      await navigator.clipboard.writeText(emails.join(', '))
      toast.success(t(`${emails.length} adresser kopierade!`, `${emails.length} addresses copied!`))
    } catch {
      toast.error(t('Kunde inte kopiera.', 'Could not copy.'))
    }
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => {
        if (group.rows.length === 0) return null
        return (
          <div key={group.key} className="space-y-1.5 pl-3 border-l border-accent/10">
            <div className="flex items-center justify-between">
              <h6 className="text-xs uppercase tracking-wider text-foreground/50 font-semibold">
                {group.label}
              </h6>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => copyEmails(group.rows)}
                  disabled={!group.rows.some((r) => r.staff.email)}
                  title={t('Kopiera alla mejladresser', 'Copy all email addresses')}
                  className="p-1 border border-accent/20 rounded text-accent hover:bg-accent hover:text-black transition-colors disabled:opacity-30 disabled:pointer-events-none"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setMailGroup(group.key)}
                  disabled={!group.rows.some((r) => r.staff.email)}
                  title={t('Maila alla i passet', 'Email everyone in this shift')}
                  className="p-1 border border-accent/20 rounded text-accent hover:bg-accent hover:text-black transition-colors disabled:opacity-30 disabled:pointer-events-none"
                >
                  <Mail className="h-3.5 w-3.5" />
                </button>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-accent/5 border-accent/20 text-accent/80">
                  {group.rows.length}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              {group.rows.map((row) => (
                <EventStaffRow
                  key={row.id}
                  row={row}
                  eventId={eventId}
                  onRemoved={onRemoved}
                  onUpdated={onUpdated}
                  siblingShifts={rows.filter((r) => r.staff.id === row.staff.id && r.id !== row.id)}
                  onShiftsChanged={onShiftsChanged}
                />
              ))}
            </div>
          </div>
        )
      })}
      {mailGroup && (
        <GroupMailModal
          title={`${t('Mejla', 'Email')} ${groups.find((g) => g.key === mailGroup)?.label ?? ''}`}
          recipients={
            groups
              .find((g) => g.key === mailGroup)
              ?.rows.flatMap((r) =>
                r.staff.email
                  ? [{ email: r.staff.email, name: r.staff.name, language: r.staff.language }]
                  : []
              ) ?? []
          }
          defaults={blankMailDefaults(eventTitle)}
          onClose={() => setMailGroup(null)}
        />
      )}
    </div>
  )
}
