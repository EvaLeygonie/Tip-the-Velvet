import { CheckCircle2, AlertTriangle, Music2 } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { staffRoleLabel } from '@/lib/contactLabels'
import {
  ROLE_ORDER,
  FIXED_STAFF_ROLES,
  STAGE_KITTEN_MIN,
  allVolunteerShiftsCovered,
} from './constants'
import { missingMusicItems } from './musicCoverage'
import type { AdminEventStaffRow } from '@/services/eventService'
import type { StaffVolunteerType } from '@/types/types'

interface StaffingCoverageStripProps {
  staffRows: AdminEventStaffRow[]
  // The pre-party playlist (before the show and between the acts) can only be covered by an
  // actual saved playlist.
  hasPrePartyPlaylist: boolean
  // The afterparty can be covered by its own playlist or by a booked DJ — feeds the "Musik"
  // card's status below.
  hasAfterpartyPlaylist: boolean
}

// Shorter labels for this strip specifically (not staffRoleLabel itself, which stays full
// everywhere else — section headers, the Contacts role dropdown, etc.) — these two cards
// were the widest, and space here is at a premium per feedback. "dj" specifically is
// relabeled "Musik"/"Music" here since that card now covers the two music slots, not
// just whether a DJ is booked — see the "dj" branch below.
const shortLabel = (t: (sv: string, en: string) => string, role: StaffVolunteerType): string => {
  if (role === 'doorman') return t('Dörrvakt', 'Guard')
  if (role === 'stage_kitten') return t('Stage', 'Stage')
  if (role === 'dj') return t('Musik', 'Music')
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
export const StaffingCoverageStrip = ({
  staffRows,
  hasPrePartyPlaylist,
  hasAfterpartyPlaylist,
}: StaffingCoverageStripProps) => {
  const { t } = useLanguage()

  return (
    // auto-fit/minmax instead of a fixed column count — every card is at least wide enough
    // for the longest label ("Underhållning"/"Entertainment") to sit comfortably, and they
    // all stay the same width as each other per row (minmax's 1fr) rather than each hugging
    // its own short content, which left them feeling small/empty against how much row width
    // a rigid 7-column grid actually gave them. Bigger and closer to square, direct
    // feedback 2026-09-21.
    <div className="grid grid-cols-[repeat(auto-fit,minmax(7.5rem,1fr))] gap-2">
      {COVERAGE_CARD_ROLES.map((role) => {
        // Distinct people, not rows — a volunteer holding two shifts is still one person,
        // not two, for headcount purposes (only role: 'volunteer' can actually produce more
        // than one row per person, but deduping unconditionally is a harmless no-op for
        // every other role).
        const count = new Set(staffRows.filter((r) => r.role === role).map((r) => r.staff.id)).size
        // What the card actually displays — a plain headcount for every role except
        // "dj"/Musik, which shows a 0–2 coverage count instead (see below).
        let displayCount = count

        let filled = false
        let missing = false
        // DJ/"Musik" card only: the afterparty slot is covered by a playlist even with 0 DJ
        // staff — shown as a music icon so it's clear *how* it's covered. The pre-party slot has
        // no such substitute, so the card is only "filled" once both are covered.
        let coveredByPlaylist = false

        if (role === 'dj') {
          // Shows 0–2 instead of a DJ headcount: one point for the pre-party playlist and one
          // for the afterparty (its own playlist or a DJ) — 2/2 is what makes the card green.
          const missingMusic = missingMusicItems(t, staffRows, {
            hasPrePartyPlaylist,
            hasAfterpartyPlaylist,
          })
          displayCount = 2 - missingMusic.length
          coveredByPlaylist = count === 0 && hasAfterpartyPlaylist
          filled = missingMusic.length === 0
          missing = !filled
        } else if (role === 'doorman' || role === 'entertainment') {
          // Voluntary / optional positions — worth a checkmark once someone is added, but never a
          // warning (entertainment: direct feedback 2026-10-26).
          filled = count > 0
        } else if (role === 'volunteer') {
          // Shows everyone who volunteers (all shifts); green only once every shift has its minimum
          // (VOLUNTEER_SHIFT_MIN), otherwise a warning. Each shift's own count sits in its list
          // section header (VolunteerShiftGroups.tsx).
          const shiftsCovered = allVolunteerShiftsCovered(staffRows)
          filled = shiftsCovered
          missing = !shiftsCovered
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
            className={`admin-panel velvet-surface p-4 flex flex-col items-center justify-center gap-1.5 text-center border ${
              filled
                ? 'border-emerald-500/20'
                : missing
                  ? 'border-amber-500/30'
                  : 'border-accent/10'
            }`}
          >
            <div className="text-sm font-heading text-foreground/60 truncate w-full">
              {shortLabel(t, role)}
            </div>
            <div className="flex items-center justify-center gap-1.5">
              {/* Checkmark/warning always leads, same as every other card — the music note
                  is a trailing annotation on top of that (not a replacement for it), noting
                  *how* it's covered rather than *whether* it is. Direct feedback 2026-09-21. */}
              {filled && <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />}
              {missing && <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />}
              <span className="text-xl text-foreground">{displayCount}</span>
              {coveredByPlaylist && <Music2 className="h-4 w-4 text-emerald-400 shrink-0" />}
            </div>
          </div>
        )
      })}
    </div>
  )
}
