import { CheckCircle2, AlertTriangle, Music2 } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { staffRoleLabel } from '@/lib/contactLabels'
import { ROLE_ORDER, FIXED_STAFF_ROLES } from './constants'
import type { AdminEventStaffRow } from '@/services/eventService'
import type { StaffVolunteerType } from '@/types/types'

interface StaffingCoverageStripProps {
  staffRows: AdminEventStaffRow[]
  // Whether the event has a stored playlist (events.afterparty_playlist) — either an
  // assigned DJ or a playlist covers the music need, per direct feedback, so this feeds
  // the DJ card's own status below.
  hasPlaylist: boolean
}

// Needs at least 2 people, not just 1 — per direct feedback (2026-09-02).
const STAGE_KITTEN_MIN = 2

// Shorter labels for this strip specifically (not staffRoleLabel itself, which stays full
// everywhere else — section headers, the Contacts role dropdown, etc.) — these two cards
// were the widest, and space here is at a premium per feedback.
const shortLabel = (t: (sv: string, en: string) => string, role: StaffVolunteerType): string => {
  if (role === 'doorman') return t('Värd', 'Host')
  if (role === 'stage_kitten') return t('Stage', 'Stage')
  return staffRoleLabel(t, role)
}

// 'other' dropped from these cards specifically (still a valid role elsewhere — the
// Contacts dropdown, the role-grouped list below — just not expected to ever be assigned,
// per feedback, so its card is a waste of the row).
const COVERAGE_CARD_ROLES = ROLE_ORDER.filter((role) => role !== 'other')

// One compact card per role category — a plain count instead of spelling out names, so it
// stays scannable as a headcount overview rather than a second roster. The checkmark/
// warning icon lives on the count row (not the label row) to save horizontal space. Most
// roles have no stored target ("take anyone who wants to help") and just show a plain
// number; photographer/technician/stage_kitten/doorman/dj each get a bespoke rule below.
export const StaffingCoverageStrip = ({ staffRows, hasPlaylist }: StaffingCoverageStripProps) => {
  const { t } = useLanguage()

  return (
    <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
      {COVERAGE_CARD_ROLES.map((role) => {
        // Distinct people, not rows — a volunteer holding two shifts is still one person,
        // not two, for headcount purposes (only role: 'volunteer' can actually produce more
        // than one row per person, but deduping unconditionally is a harmless no-op for
        // every other role).
        const count = new Set(staffRows.filter((r) => r.role === role).map((r) => r.staff.id)).size

        let filled = false
        let missing = false
        // DJ-only: the music need is covered by a playlist even with 0 DJ staff — shown
        // as a music icon instead of the usual checkmark so it's clear *how* it's covered.
        let coveredByPlaylist = false

        if (role === 'dj') {
          coveredByPlaylist = count === 0 && hasPlaylist
          filled = count > 0 || hasPlaylist
          missing = !filled
        } else if (role === 'doorman') {
          // Voluntary position — worth a checkmark when filled, but never a warning.
          filled = count > 0
        } else if (role === 'stage_kitten') {
          filled = count >= STAGE_KITTEN_MIN
          missing = count < STAGE_KITTEN_MIN
        } else if (FIXED_STAFF_ROLES.includes(role)) {
          filled = count > 0
          missing = count === 0
        }

        return (
          <div
            key={role}
            className={`admin-panel velvet-surface p-2 flex flex-col gap-0.5 border ${
              filled ? 'border-emerald-500/20' : missing ? 'border-amber-500/30' : 'border-accent/10'
            }`}
          >
            <div className="text-[11px] font-heading text-foreground/60 truncate">
              {shortLabel(t, role)}
            </div>
            <div className="flex items-center gap-1">
              {coveredByPlaylist && <Music2 className="h-3 w-3 text-emerald-400 shrink-0" />}
              {filled && !coveredByPlaylist && (
                <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
              )}
              {missing && <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0" />}
              <span className="text-sm text-foreground">{count}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
