import { CheckCircle2, AlertTriangle, Music2 } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { staffRoleLabel } from '@/lib/contactLabels'
import { ROLE_ORDER, FIXED_STAFF_ROLES } from './constants'
import { missingMusicItems } from './musicCoverage'
import type { AdminEventStaffRow } from '@/services/eventService'
import type { StaffVolunteerType } from '@/types/types'

interface StaffingCoverageStripProps {
  staffRows: AdminEventStaffRow[]
  // The before-show and intermission slots only ever have one way to be covered — an actual
  // saved playlist, there's no "or a person" option for those the way afterparty has a DJ.
  hasBeforePlaylist: boolean
  hasIntermissionPlaylist: boolean
  // Afterparty is the one slot a DJ can cover instead of a playlist — feeds the "dj"/"Musik"
  // card's status below, direct feedback 2026-09-02.
  hasAfterpartyPlaylist: boolean
}

// Needs at least 2 people, not just 1 — per direct feedback (2026-09-02).
const STAGE_KITTEN_MIN = 2

// Shorter labels for this strip specifically (not staffRoleLabel itself, which stays full
// everywhere else — section headers, the Contacts role dropdown, etc.) — these two cards
// were the widest, and space here is at a premium per feedback. "dj" specifically is
// relabeled "Musik"/"Music" here since that card now covers all three playlist slots, not
// just whether a DJ is booked — see the "dj" branch below.
const shortLabel = (t: (sv: string, en: string) => string, role: StaffVolunteerType): string => {
  if (role === 'doorman') return t('Värd', 'Host')
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
  hasBeforePlaylist,
  hasIntermissionPlaylist,
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
        // "dj"/Musik, which shows a 0–3 coverage count instead (see below).
        let displayCount = count

        let filled = false
        let missing = false
        // DJ/"Musik" card only: the afterparty slot is covered by a playlist even with 0 DJ
        // staff — shown as a music icon instead of the usual checkmark so it's clear *how*
        // it's covered. But before/intermission have no such substitute — both need their
        // own saved playlist regardless of DJ staffing, so the card overall is only "filled"
        // once all three are actually covered. Direct feedback 2026-09-19.
        let coveredByPlaylist = false

        if (role === 'dj') {
          // Showing the DJ headcount here was misleading — a fully-covered event with 0 DJs
          // (both playlists saved, afterparty covered by its own playlist too) displayed
          // "0" despite being green. Shows 0–3 instead: one point per music "moment"
          // (before/intermission/afterparty), matching missingMusicItems' own 3 possible
          // gaps — 3/3 is what actually makes the card green. Direct feedback 2026-09-21.
          const missingMusic = missingMusicItems(t, staffRows, {
            hasBeforePlaylist,
            hasIntermissionPlaylist,
            hasAfterpartyPlaylist,
          })
          displayCount = 3 - missingMusic.length
          coveredByPlaylist = count === 0 && hasAfterpartyPlaylist
          filled = missingMusic.length === 0
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
