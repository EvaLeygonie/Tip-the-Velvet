import { useState } from 'react'
import { AlertTriangle, Minus, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import { useConfirm } from '@/contexts/ConfirmContext'
import {
  buildDoorNeed,
  buildDoorReport,
  buildDoorShiftsForPeople,
  countUncoveredDoorWindows,
  findUnplacedDoorStaff,
  formatClock,
  formatDurationShort,
  type DoorSlot,
} from '@/lib/eventInfo'
import { createDoorSlots, deleteDoorSlots, setDoorSlotName } from '@/services/eventInfoService'

interface InfoDoorShiftsProps {
  eventId: string
  eventStart: string | null
  // Door staff for this event (guest-list volunteers) — the dropdown options and auto-fill pool.
  volunteerNames: string[]
  // When the show starts (minutes after midnight) — marks the show shifts in the report.
  showStartMinutes?: number | null
  // Door volunteers who also work setup — they only need 30 minutes, or nothing.
  setupNames?: string[]
  slots: DoorSlot[]
  onSlotsChange: (slots: DoorSlot[]) => void
  // Called after 1-hour shifts were split into 30-minute ones, with the names that were moved
  // (they now only have the first half-hour and need to pick another).
  onSplit?: (movedNames: string[]) => void
}

const inputClass = 'velvet-input'
const OTHER_PERSON = '__other__'

const durationOf = (s: Pick<DoorSlot, 'slot_start' | 'slot_end'>) =>
  Math.round((new Date(s.slot_end).getTime() - new Date(s.slot_start).getTime()) / 60_000)

// "HH:MM" on the event's date (local time of the browser — the board plans in Swedish time).
const timeOnDay = (day: Date, hhmm: string): Date | null => {
  const match = hhmm.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    Number(match[1]),
    Number(match[2])
  )
}

// One-hour shifts by default (30 minutes is possible too). The generator makes exactly as many spots as there are door staff: one
// per hour, with the extra people as a second spot in the earliest hours (two at the door as far
// into the night as the numbers allow, then one). Individual hours can be given or lose a second
// spot afterwards with the +/- buttons. Volunteers pick their own name from their info link;
// anything still empty near the show is for the board to assign.
export const InfoDoorShifts = ({
  eventId,
  eventStart,
  volunteerNames,
  showStartMinutes = null,
  setupNames = [],
  slots,
  onSlotsChange,
  onSplit,
}: InfoDoorShiftsProps) => {
  const { t, language } = useLanguage()
  const confirm = useConfirm()
  const [from, setFrom] = useState('19:00')
  const [to, setTo] = useState('01:00')
  const [minutes, setMinutes] = useState(60)
  const [busy, setBusy] = useState(false)
  // A spot where the board is typing a name that isn't in the door staff list (e.g. a board
  // member sitting in for a bit).
  const [typing, setTyping] = useState<{ id: string; value: string } | null>(null)

  // One row per time window, holding its (usually two) spots.
  const windows = slots.reduce<DoorSlot[][]>((groups, slot) => {
    const last = groups[groups.length - 1]
    if (last && last[0].slot_start === slot.slot_start) last.push(slot)
    else groups.push([slot])
    return groups
  }, [])
  const empty = slots.filter((s) => !s.volunteer_name)
  const unplaced = findUnplacedDoorStaff(
    volunteerNames.map((name) => ({ name })),
    slots.map((s) => s.volunteer_name)
  )
  const uncovered = countUncoveredDoorWindows(slots)
  // What the generator would make with the hours typed in right now, so the effect shows before
  // anything is created.
  const formPlan = (() => {
    if (!eventStart) return null
    const day = new Date(eventStart)
    const start = timeOnDay(day, from)
    let end = timeOnDay(day, to)
    if (!start || !end) return null
    if (end <= start) end = new Date(end.getTime() + 24 * 3_600_000)
    return buildDoorShiftsForPeople(start, end, minutes, volunteerNames.length)
  })()

  const handleGenerate = async () => {
    if (!eventStart) return
    const day = new Date(eventStart)
    const start = timeOnDay(day, from)
    let end = timeOnDay(day, to)
    if (!start || !end) {
      toast.error(t('Kontrollera tiderna (HH:MM).', 'Check the times (HH:MM).'))
      return
    }
    // An end time at or before the start means "after midnight".
    if (end <= start) end = new Date(end.getTime() + 24 * 3_600_000)
    if (
      slots.length > 0 &&
      !(await confirm({
        message: t(
          'Det finns redan pass. Lägga till fler ovanpå?',
          'There are already shifts. Add more on top?'
        ),
      }))
    )
      return
    setBusy(true)
    try {
      const created = await createDoorSlots(
        eventId,
        buildDoorShiftsForPeople(start, end, minutes, volunteerNames.length).slots
      )
      onSlotsChange([...slots, ...created].sort((a, b) => a.slot_start.localeCompare(b.slot_start)))
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte skapa passen.', 'Could not create the shifts.'))
    } finally {
      setBusy(false)
    }
  }

  const handleName = async (slot: DoorSlot, value: string) => {
    const name = value.trim() || null
    if (name === slot.volunteer_name) return
    try {
      await setDoorSlotName(slot.id, name)
      onSlotsChange(slots.map((s) => (s.id === slot.id ? { ...s, volunteer_name: name } : s)))
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte spara.', 'Could not save.'))
    }
  }

  const handleDelete = async (ids: string[]) => {
    try {
      await deleteDoorSlots(ids)
      onSlotsChange(slots.filter((s) => !ids.includes(s.id)))
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte radera.', 'Could not delete.'))
    }
  }

  // Split every 1-hour shift into two 30-minute ones. Everyone keeps their name on the first half
  // and the second half opens up, so each person has to pick one more 30-minute shift (an hour in
  // total, as before). Done as create-new, name, delete-old so nothing is lost if a step fails.
  const handleSplitToHalfHours = async () => {
    if (slots.length === 0 || slots.some((s) => durationOf(s) !== 60)) {
      toast.error(
        t('Det går bara att dela upp pass som är 1 timme.', 'Only 1-hour shifts can be split.')
      )
      return
    }
    const moved = Array.from(
      new Set(slots.map((s) => s.volunteer_name).filter((n): n is string => Boolean(n)))
    )
    const ok = await confirm({
      message: t(
        `Dela alla pass i två på 30 minuter? ${moved.length} personer flyttas till första halvtimmen och behöver välja ett pass till.`,
        `Split every shift into two 30-minute ones? ${moved.length} people move to the first half-hour and need to pick one more.`
      ),
    })
    if (!ok) return
    setBusy(true)
    try {
      const halves = slots.flatMap((s) => {
        const mid = new Date(
          (new Date(s.slot_start).getTime() + new Date(s.slot_end).getTime()) / 2
        ).toISOString()
        return [
          { slot_start: s.slot_start, slot_end: mid },
          { slot_start: mid, slot_end: s.slot_end },
        ]
      })
      const created = await createDoorSlots(eventId, halves)
      // Names go on the first half of their hour, in the order they were seated.
      const namesByStart = new Map<string, string[]>()
      for (const s of slots) {
        if (!s.volunteer_name) continue
        namesByStart.set(s.slot_start, [
          ...(namesByStart.get(s.slot_start) ?? []),
          s.volunteer_name,
        ])
      }
      const assigned = new Map<string, string>()
      const seen = new Map<string, number>()
      for (const c of created) {
        const names = namesByStart.get(c.slot_start)
        if (!names) continue
        const i = seen.get(c.slot_start) ?? 0
        if (names[i]) assigned.set(c.id, names[i])
        seen.set(c.slot_start, i + 1)
      }
      await Promise.all(Array.from(assigned).map(([id, n]) => setDoorSlotName(id, n)))
      await deleteDoorSlots(slots.map((s) => s.id))
      onSlotsChange(
        created
          .map((c) => ({ ...c, volunteer_name: assigned.get(c.id) ?? null }))
          .sort((a, b) => a.slot_start.localeCompare(b.slot_start))
      )
      if (moved.length > 0) onSplit?.(moved)
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte dela upp passen.', 'Could not split the shifts.'))
    } finally {
      setBusy(false)
    }
  }

  // Give an hour a second spot, or take one away (only an empty one, and never the last).
  const handleAddSeat = async (group: DoorSlot[]) => {
    setBusy(true)
    try {
      const [created] = await createDoorSlots(eventId, [
        { slot_start: group[0].slot_start, slot_end: group[0].slot_end },
      ])
      onSlotsChange([...slots, created].sort((a, b) => a.slot_start.localeCompare(b.slot_start)))
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte skapa platsen.', 'Could not add the spot.'))
    } finally {
      setBusy(false)
    }
  }

  const handleRemoveSeat = async (group: DoorSlot[]) => {
    const spare = [...group].reverse().find((s) => !s.volunteer_name)
    if (group.length < 2 || !spare) {
      toast.info(t('Ta först bort namnet på platsen.', 'Clear the name on a spot first.'))
      return
    }
    await handleDelete([spare.id])
  }

  // Volunteers who haven't picked anything yet go into the remaining empty seats, in order.
  const handleAutoFill = async () => {
    const unassigned = findUnplacedDoorStaff(
      volunteerNames.map((name) => ({ name })),
      slots.map((s) => s.volunteer_name)
    ).map((p) => p.name)
    // Fill one spot per empty time window first, so every window gets someone before any gets two.
    const seen = new Set<string>()
    const firstSpots = empty.filter((s) => {
      const covered = slots.some((o) => o.slot_start === s.slot_start && o.volunteer_name)
      if (covered || seen.has(s.slot_start)) return false
      seen.add(s.slot_start)
      return true
    })
    const pairs = firstSpots
      .slice(0, unassigned.length)
      .map((slot, i) => ({ slot, name: unassigned[i] }))
    if (pairs.length === 0) {
      toast.info(t('Inga volontärer att placera ut.', 'No unassigned volunteers to place.'))
      return
    }
    const ok = await confirm({
      message: t(
        `Sätta ut ${pairs.length} volontärer på lediga pass?`,
        `Assign ${pairs.length} volunteers to empty shifts?`
      ),
    })
    if (!ok) return
    setBusy(true)
    try {
      await Promise.all(pairs.map(({ slot, name }) => setDoorSlotName(slot.id, name)))
      const byId = new Map(pairs.map(({ slot, name }) => [slot.id, name]))
      onSlotsChange(
        slots.map((s) => (byId.has(s.id) ? { ...s, volunteer_name: byId.get(s.id)! } : s))
      )
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte spara.', 'Could not save.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="admin-panel velvet-surface p-4 flex flex-wrap items-end gap-3">
        <label className="space-y-1">
          <span className="form-label-gold block">{t('Från', 'From')}</span>
          <input
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className={`${inputClass} w-24`}
          />
        </label>
        <label className="space-y-1">
          <span className="form-label-gold block">{t('Till', 'To')}</span>
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className={`${inputClass} w-24`}
          />
        </label>
        <label className="space-y-1">
          <span className="form-label-gold block">{t('Passlängd', 'Shift length')}</span>
          <select
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
            className={`${inputClass} w-32`}
          >
            <option value={60}>{t('1 timme', '1 hour')}</option>
            <option value={30}>{t('30 minuter', '30 minutes')}</option>
          </select>
        </label>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={busy || !eventStart}
          className="btn-gold text-xs py-2 px-4"
        >
          {t('Skapa pass', 'Create shifts')}
        </button>
        <div className="ml-auto text-sm text-foreground/70 text-right leading-tight">
          <div>
            {t(
              `${volunteerNames.length} personer · pass om ${minutes === 60 ? '1 timme' : '30 min'}`,
              `${volunteerNames.length} people · ${minutes === 60 ? '1-hour' : '30-minute'} shifts`
            )}
          </div>
          {formPlan && (
            <div>
              {t(
                `${formPlan.windows} pass: ${formPlan.doubled} med två personer, ${formPlan.windows - formPlan.doubled} med en`,
                `${formPlan.windows} shifts: ${formPlan.doubled} with two people, ${formPlan.windows - formPlan.doubled} with one`
              )}
            </div>
          )}
          {formPlan && formPlan.emptyHours > 0 && (
            <div className="text-amber-400">
              {t(
                `${formPlan.emptyHours} pass får ingen – för få volontärer`,
                `${formPlan.emptyHours} shifts would get nobody – too few volunteers`
              )}
            </div>
          )}
          {formPlan && formPlan.unplaced > 0 && (
            <div className="text-amber-400">
              {t(
                `${formPlan.unplaced} personer får ingen plats`,
                `${formPlan.unplaced} people would not fit`
              )}
            </div>
          )}
        </div>
      </div>

      {slots.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            {uncovered > 0 ? (
              <span className="flex items-center gap-1.5 text-sm text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                {t(`${uncovered} pass utan någon`, `${uncovered} shifts with nobody yet`)}
              </span>
            ) : (
              <span className="text-sm text-emerald-400">
                {t('Alla pass har minst en person', 'Every shift has at least one person')}
              </span>
            )}
            <div className="flex gap-2">
              {uncovered > 0 && unplaced.length > 0 && (
                <button
                  type="button"
                  onClick={handleAutoFill}
                  disabled={busy}
                  className="btn-gold-outline text-xs py-1.5 px-3"
                >
                  {t('Fyll lediga med volontärer', 'Fill open spots with volunteers')}
                </button>
              )}
              {slots.length > 0 && slots.every((s) => durationOf(s) === 60) && (
                <button
                  type="button"
                  onClick={handleSplitToHalfHours}
                  disabled={busy}
                  className="btn-gold-outline text-xs py-1.5 px-3"
                >
                  {t('Dela upp i 30 min', 'Split into 30 min')}
                </button>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  if (
                    await confirm({
                      message: t('Radera alla dörrpass?', 'Delete all door shifts?'),
                      destructive: true,
                    })
                  )
                    handleDelete(slots.map((s) => s.id))
                }}
                className="text-xs text-foreground/50 hover:text-red-400"
              >
                {t('Radera alla', 'Delete all')}
              </button>
            </div>
          </div>

          <ul className="admin-panel velvet-surface divide-y divide-accent/10">
            {windows.map((group) => (
              <li key={group[0].slot_start} className="flex items-center gap-3 px-4 py-2">
                <span className="w-28 shrink-0 font-mono text-accent text-sm">
                  {formatClock(group[0].slot_start)}–{formatClock(group[0].slot_end)}
                </span>
                <div className="flex flex-1 min-w-0 flex-wrap gap-2">
                  {group.map((slot) =>
                    typing?.id === slot.id ? (
                      <input
                        key={slot.id}
                        autoFocus
                        value={typing.value}
                        maxLength={60}
                        placeholder={t('Skriv ett namn…', 'Type a name…')}
                        onChange={(e) => setTyping({ id: slot.id, value: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') setTyping(null)
                          if (e.key === 'Enter') e.currentTarget.blur()
                        }}
                        onBlur={() => {
                          const value = typing.value.trim()
                          setTyping(null)
                          if (value) handleName(slot, value)
                        }}
                        className={`${inputClass} flex-1 min-w-32`}
                      />
                    ) : (
                      <select
                        key={slot.id}
                        value={slot.volunteer_name ?? ''}
                        onChange={(e) =>
                          e.target.value === OTHER_PERSON
                            ? setTyping({ id: slot.id, value: '' })
                            : handleName(slot, e.target.value)
                        }
                        className={`${inputClass} flex-1 min-w-32`}
                      >
                        <option value="">{t('Ledig', 'Open')}</option>
                        {/* A name typed in by hand may not match a profile. */}
                        {slot.volunteer_name && !volunteerNames.includes(slot.volunteer_name) && (
                          <option value={slot.volunteer_name}>{slot.volunteer_name}</option>
                        )}
                        {volunteerNames.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                        <option value={OTHER_PERSON}>{t('Annan person…', 'Someone else…')}</option>
                      </select>
                    )
                  )}
                </div>
                <button
                  type="button"
                  disabled={busy || group.length < 2}
                  onClick={() => handleRemoveSeat(group)}
                  className="p-1.5 text-foreground/40 hover:text-accent disabled:opacity-30"
                  aria-label={t('Ta bort en plats', 'Remove a spot')}
                  title={t('Ta bort en plats', 'Remove a spot')}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={busy || group.length >= 2}
                  onClick={() => handleAddSeat(group)}
                  className="p-1.5 text-foreground/40 hover:text-accent disabled:opacity-30"
                  aria-label={t('Lägg till en plats', 'Add a spot')}
                  title={t('Lägg till en plats', 'Add a spot')}
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(group.map((s) => s.id))}
                  className="p-1.5 text-foreground/40 hover:text-red-400"
                  aria-label={t('Radera pass', 'Delete shift')}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>

          {(() => {
            // How long each door volunteer has booked: an hour is the target, ideally one shift in
            // the first two hours and one after (a note marks people who have two in the same part).
            const report = buildDoorReport(slots, volunteerNames, showStartMinutes, setupNames)
            const need = buildDoorNeed(slots, report)
            const person = (p: { name: string; minutes: number; show: boolean; early: number }) =>
              `${p.name}: ${formatDurationShort(p.minutes, language)}${p.show ? ' (show)' : ''}${
                p.minutes >= 60 && (p.early === 0 || p.early === p.minutes)
                  ? t(' – två pass i samma del', ' – both shifts in the same part')
                  : ''
              }`
            return (
              <div className="admin-panel velvet-surface p-4 space-y-3 text-sm">
                <h5 className="font-decorative text-base text-foreground/80">
                  {t('Rapport – vem har bokat vad', 'Report – who has booked what')}
                </h5>
                <div className="rounded border border-accent/20 bg-black/20 p-3 space-y-1">
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-foreground/80">
                    <span>
                      {t('Lediga platser', 'Open spots')}:{' '}
                      <strong className="text-foreground">
                        {need.openSpots} {t('av', 'of')} {need.totalSpots}
                      </strong>
                    </span>
                    <span>
                      {t('Tider utan någon', 'Times with nobody')}:{' '}
                      <strong
                        className={need.uncoveredSlots > 0 ? 'text-amber-400' : 'text-emerald-400'}
                      >
                        {need.uncoveredSlots}
                        {need.uncoveredSlots > 0 &&
                          ` (${formatDurationShort(need.uncoveredMinutes, language)})`}
                      </strong>
                    </span>
                  </div>
                  <div className={need.extraVolunteers > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                    {need.extraVolunteers > 0
                      ? t(
                          `Saknas: ungefär ${need.extraVolunteers} volontär${need.extraVolunteers > 1 ? 'er' : ''} till (1 timme var)`,
                          `Short by about ${need.extraVolunteers} more volunteer${need.extraVolunteers > 1 ? 's' : ''} (1 hour each)`
                        )
                      : need.uncoveredSlots > 0
                        ? t(
                            'Räcker om alla som saknar tid bokar sitt pass.',
                            'Enough if everyone who still owes time books their share.'
                          )
                        : t('Alla tider är täckta.', 'Every time is covered.')}
                  </div>
                </div>
                <div>
                  <div className="form-label-gold !text-amber-400">
                    {t('Inget bokat', 'Nothing booked')} ({report.notBooked.length})
                  </div>
                  <p className="text-foreground/80">
                    {report.notBooked.length > 0 ? report.notBooked.join(', ') : '–'}
                  </p>
                </div>
                {report.setupFree.length > 0 && (
                  <div>
                    <div className="form-label-gold">
                      {t('Jobbar redan med uppsättningen', 'Already working setup')} (
                      {report.setupFree.length})
                    </div>
                    <p className="text-foreground/80">
                      {report.setupFree.join(', ')}
                      <span className="text-foreground/50">
                        {' '}
                        {t(
                          '– 30 min räcker, helst inget om vi hittar fler',
                          '– 30 min is enough, ideally none if we find more people'
                        )}
                      </span>
                    </p>
                  </div>
                )}
                <div>
                  <div className="form-label-gold">
                    {t('Behöver mer tid', 'Needs more time')} ({report.needsMore.length})
                  </div>
                  <p className="text-foreground/80">
                    {report.needsMore.length > 0 ? report.needsMore.map(person).join(', ') : '–'}
                  </p>
                </div>
                <div>
                  <div className="form-label-gold !text-emerald-400">
                    {t('Klara', 'Done')} ({report.done.length})
                  </div>
                  <p className="text-foreground/80">
                    {report.done.length > 0 ? report.done.map(person).join(', ') : '–'}
                  </p>
                </div>
              </div>
            )
          })()}
        </>
      )}
    </div>
  )
}
