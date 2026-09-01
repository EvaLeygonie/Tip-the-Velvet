import { CheckCircle2, AlertTriangle } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { staffRoleLabel } from '@/lib/contactLabels'
import { FIXED_STAFF_ROLES } from './constants'
import type { AdminEventStaffRow } from '@/services/eventService'

interface StaffingCoverageStripProps {
  staffRows: AdminEventStaffRow[]
}

// No stored "N required" system (per admin-portal-roadmap.md, 2026-08-19) — just a
// computed check for the 3 roles that historically need exactly one person, so a gap is
// visible at a glance instead of only surfacing when someone notices at the door.
export const StaffingCoverageStrip = ({ staffRows }: StaffingCoverageStripProps) => {
  const { t } = useLanguage()
  const volunteerCount = staffRows.filter((r) => r.role === 'volunteer').length

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {FIXED_STAFF_ROLES.map((role) => {
        const rows = staffRows.filter((r) => r.role === role)
        const filled = rows.length > 0
        return (
          <div
            key={role}
            className={`admin-panel velvet-surface p-3 flex flex-col gap-1 border ${
              filled ? 'border-emerald-500/20' : 'border-amber-500/30'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-heading text-foreground/60">
              {filled ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              )}
              <span className="truncate">{staffRoleLabel(t, role)}</span>
            </div>
            <div className="text-sm text-foreground truncate">
              {filled ? rows.map((r) => r.staff.name).join(', ') : t('Ej tillsatt', 'Not assigned')}
            </div>
          </div>
        )
      })}
      <div className="admin-panel velvet-surface p-3 flex flex-col gap-1 border border-accent/10">
        <div className="text-xs font-heading text-foreground/60">{t('Volontärer', 'Volunteers')}</div>
        <div className="text-sm text-foreground">{volunteerCount}</div>
      </div>
    </div>
  )
}
