import { useLanguage } from '@/contexts/LanguageContext'
import { volunteerShiftLabel } from '@/lib/contactLabels'
import { EventStaffRow } from './EventStaffRow'
import { VOLUNTEER_SHIFT_ORDER } from './constants'
import type { AdminEventStaffRow } from '@/services/eventService'

interface VolunteerShiftGroupsProps {
  rows: AdminEventStaffRow[]
  eventId: string
  onRemoved: (id: string) => void
  onUpdated: (id: string, patch: Partial<AdminEventStaffRow>) => void
}

// Splits the Volontär role section into its real shift subsections (driving/setup/
// guestlist/takedown, in that order) instead of one flat list — every other role keeps
// rendering as a flat list in AdminEventPlan.tsx, unchanged. Anyone without a shift set yet
// (pre-migration confirmations, or confirmed without picking one) falls into a final
// "no shift" bucket rather than being hidden.
export const VolunteerShiftGroups = ({ rows, eventId, onRemoved, onUpdated }: VolunteerShiftGroupsProps) => {
  const { t } = useLanguage()

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
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-accent/5 border-accent/20 text-accent/80">
                {group.rows.length}
              </span>
            </div>
            <div className="space-y-2">
              {group.rows.map((row) => (
                <EventStaffRow
                  key={row.id}
                  row={row}
                  eventId={eventId}
                  onRemoved={onRemoved}
                  onUpdated={onUpdated}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
