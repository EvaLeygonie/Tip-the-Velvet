import { useState } from 'react'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import { useConfirm } from '@/contexts/ConfirmContext'
import {
  buildDoorSlots,
  countUncoveredDoorWindows,
  formatDurationShort,
  findUnplacedDoorStaff,
  formatClock,
  planDoorShifts,
  type DoorSlot,
} from '@/lib/eventInfo'
import { createDoorSlots, deleteDoorSlots, setDoorSlotName } from '@/services/eventInfoService'

interface InfoDoorShiftsProps {
  eventId: string
  eventStart: string | null
  // Door staff for this event (guest-list volunteers) — the dropdown options and auto-fill pool.
  volunteerNames: string[]
  slots: DoorSlot[]
  onSlotsChange: (slots: DoorSlot[]) => void
}

const inputClass = 'velvet-input'

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

// Volunteers fill these in themselves from their info link; anything still empty near the show
// is for the board to assign — hence the unfilled count and the auto-fill button.
export const InfoDoorShifts = ({
  eventId,
  eventStart,
  volunteerNames,
  slots,
  onSlotsChange,
}: InfoDoorShiftsProps) => {
  const { t } = useLanguage()
  const confirm = useConfirm()
  const [from, setFrom] = useState('19:00')
  const [to, setTo] = useState('01:00')
  const [minutes, setMinutes] = useState(60)
  const [seats, setSeats] = useState(2) // two spots per slot, only one needs filling
  const [busy, setBusy] = useState(false)

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
  // Guidance for what's typed in the generator right now (not for shifts already created), so
  // the board sees the effect of changing the hours before creating anything.
  const formPlan = (() => {
    if (!eventStart) return null
    const day = new Date(eventStart)
    const start = timeOnDay(day, from)
    let end = timeOnDay(day, to)
    if (!start || !end || minutes < 15) return null
    if (end <= start) end = new Date(end.getTime() + 24 * 3_600_000)
    return planDoorShifts(buildDoorSlots(start, end, minutes, 1), volunteerNames.length)
  })()

  const handleGenerate = async () => {
    if (!eventStart) return
    const day = new Date(eventStart)
    const start = timeOnDay(day, from)
    let end = timeOnDay(day, to)
    if (!start || !end || minutes < 15 || seats < 1) {
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
      const created = await createDoorSlots(eventId, buildDoorSlots(start, end, minutes, seats))
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
            <option value={30}>{t('30 minuter', '30 minutes')}</option>
            <option value={60}>{t('1 timme', '1 hour')}</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="form-label-gold block">{t('Personer/pass', 'People/shift')}</span>
          <input
            type="number"
            min={1}
            value={seats}
            onChange={(e) => setSeats(Number(e.target.value))}
            className={`${inputClass} w-24`}
          />
        </label>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={busy || !eventStart}
          className="btn-gold text-xs py-2 px-4"
        >
          {t('Skapa pass', 'Create shifts')}
        </button>
        <div className="ml-auto text-sm text-foreground/70 whitespace-nowrap text-right leading-tight">
          <div>{t(`${volunteerNames.length} personer`, `${volunteerNames.length} people`)}</div>
          {formPlan && (
            <div>
              {t(
                `ca ${formatDurationShort(formPlan.soloMinutes, 'sv')} var · ${formatDurationShort(formPlan.tandemMinutes, 'sv')} i par`,
                `~${formatDurationShort(formPlan.soloMinutes, 'eng')} each · ${formatDurationShort(formPlan.tandemMinutes, 'eng')} in pairs`
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
                  {group.map((slot) => (
                    <select
                      key={slot.id}
                      value={slot.volunteer_name ?? ''}
                      onChange={(e) => handleName(slot, e.target.value)}
                      className={`${inputClass} flex-1 min-w-32`}
                    >
                      <option value="">{t('Ledig', 'Open')}</option>
                      {/* A name typed in by the volunteer themselves may not match a profile. */}
                      {slot.volunteer_name && !volunteerNames.includes(slot.volunteer_name) && (
                        <option value={slot.volunteer_name}>{slot.volunteer_name}</option>
                      )}
                      {volunteerNames.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  ))}
                </div>
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

          {unplaced.length > 0 && (
            <p className="text-sm text-foreground/70">
              {t('Inte på något pass än: ', 'Not on a shift yet: ')}
              {unplaced.map((p) => p.name).join(', ')}
            </p>
          )}
        </>
      )}
    </div>
  )
}
