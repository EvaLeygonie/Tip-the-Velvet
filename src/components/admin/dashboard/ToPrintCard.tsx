import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Archive, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import { useConfirm } from '@/contexts/ConfirmContext'
import {
  addPrintRow,
  deletePrintStandard,
  getPrintRows,
  removePrintRowForEvent,
  resetPrintRows,
  setPrintRowDone,
  updatePrintRow,
  type PrintRow,
} from '@/services/printListService'

interface ToPrintCardProps {
  // null = the general list (things to print that belong to no event)
  eventId: string | null
  title: string
  // Only passed for a past event's list: hides it from the dashboard (its rows are kept)
  onArchive?: () => void
}

const PAGE_SIZES = ['A6', 'A5', 'A4', 'A3', 'A2', 'A1']

const NO_SPIN =
  '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'

interface RowModalProps {
  // The row being edited, or null when adding a new one.
  row: PrintRow | null
  // False on the general list, which has no standard rows to repeat on every event
  allowStandard: boolean
  onClose: () => void
  onSave: (values: {
    label: string
    copies: number
    professional: boolean
    pageSize: string | null
    makeStandard: boolean
  }) => Promise<void>
}

// One modal for both adding and editing a row. Copies and "how it's printed" are this event's
// own choice; the text of a standard row is shared by every event.
const RowModal = ({ row, allowStandard, onClose, onSave }: RowModalProps) => {
  const { t } = useLanguage()
  const [label, setLabel] = useState(row?.label ?? '')
  const [copies, setCopies] = useState(String(row?.copies ?? 1))
  const [professional, setProfessional] = useState(row?.professional ?? false)
  const [pageSize, setPageSize] = useState(row?.pageSize ?? '')
  const [makeStandard, setMakeStandard] = useState(row?.standardId ? true : false)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!label.trim()) return
    setSaving(true)
    try {
      await onSave({
        label: label.trim(),
        copies: Math.max(1, Number(copies) || 1),
        professional,
        pageSize: pageSize || null,
        makeStandard: allowStandard && makeStandard,
      })
    } finally {
      setSaving(false)
    }
  }

  const choice = (active: boolean) =>
    `flex-1 rounded px-3 py-1.5 text-xs transition-colors ${
      active ? 'bg-accent text-black' : 'text-foreground/70 hover:bg-white/5'
    }`

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="velvet-surface border border-accent/30 max-w-sm w-full p-5 space-y-4 rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h4 className="font-decorative text-base text-accent text-center">
          {row ? t('Redigera rad', 'Edit row') : t('Ny rad att skriva ut', 'New row to print')}
        </h4>

        <div className="space-y-1.5">
          <label className="form-label-gold block">
            {t('Vad ska skrivas ut?', 'What to print')}
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="velvet-input"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="form-label-gold block">{t('Antal exemplar', 'Copies')}</label>
            <input
              type="number"
              min={1}
              max={999}
              value={copies}
              onChange={(e) => setCopies(e.target.value)}
              className={`velvet-input text-center ${NO_SPIN}`}
            />
          </div>
          <div className="space-y-1.5">
            <label className="form-label-gold block">{t('Sidstorlek', 'Page size')}</label>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value)}
              className="velvet-select"
            >
              <option value="">{t('Ej angiven', 'Not set')}</option>
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </div>

        {allowStandard && (
          <label className="flex cursor-pointer items-center gap-2 text-xs text-foreground/70">
            <input
              type="checkbox"
              checked={makeStandard}
              onChange={(e) => setMakeStandard(e.target.checked)}
              className="h-3.5 w-3.5 accent-accent"
            />
            {t('Upprepas på alla event', 'Repeats on all events')}
          </label>
        )}

        <div className="space-y-1.5">
          <label className="form-label-gold block">
            {t('Hur skrivs det ut?', 'How is it printed?')}
          </label>
          <div
            role="radiogroup"
            className="flex gap-1 rounded border border-accent/30 bg-black/40 p-1"
          >
            <button
              type="button"
              role="radio"
              aria-checked={!professional}
              onClick={() => setProfessional(false)}
              className={choice(!professional)}
            >
              {t('Vi skriver ut själva', 'We print it ourselves')}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={professional}
              onClick={() => setProfessional(true)}
              className={choice(professional)}
            >
              {t('Professionellt tryck', 'Professional printing')}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-accent/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs border border-accent/20 rounded text-foreground/70 hover:bg-white/5 transition-colors"
          >
            {t('Avbryt', 'Cancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !label.trim()}
            className="btn-gold text-xs py-2 px-4 disabled:opacity-40"
          >
            {t('Spara', 'Save')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// One event's "to print" checklist: the standard rows every event starts with, plus custom rows,
// split into what we print ourselves and what goes to a print shop. Ticks are per event, so a new
// event starts unticked on its own; the reset button unticks by hand.
export const ToPrintCard = ({ eventId, title, onArchive }: ToPrintCardProps) => {
  const { t } = useLanguage()
  const confirm = useConfirm()
  const [rows, setRows] = useState<PrintRow[] | null>(null)
  // 'new' = the add modal, a row = editing that row, null = closed.
  const [modal, setModal] = useState<PrintRow | 'new' | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const [reloadKey, setReloadKey] = useState(0)
  const load = () => setReloadKey((k) => k + 1)

  useEffect(() => {
    let cancelled = false
    const fetchRows = async () => {
      try {
        const data = await getPrintRows(eventId)
        if (!cancelled) setRows(data)
      } catch (err) {
        console.error(err)
        if (cancelled) return
        setRows([])
        toast.error(
          t(
            'Kunde inte ladda "Att skriva ut". Har SQL-filen körts?',
            'Could not load "To print". Has the SQL file been run?'
          )
        )
      }
    }
    fetchRows()
    return () => {
      cancelled = true
    }
    // t changes identity with the language toggle — reloading on that would flicker the list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, reloadKey])

  const run = async (action: () => Promise<void>) => {
    try {
      await action()
      load()
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte spara.', 'Could not save.'))
    }
  }

  const handleSaveModal: RowModalProps['onSave'] = async (values) => {
    await run(async () => {
      if (modal === 'new' || modal === null) {
        await addPrintRow(
          eventId,
          values.label,
          values.makeStandard,
          values.professional,
          values.copies,
          values.pageSize
        )
      } else {
        await updatePrintRow(eventId, modal, {
          label: values.label,
          copies: values.copies,
          professional: values.professional,
          pageSize: values.pageSize,
          repeats: values.makeStandard,
        })
      }
    })
    setModal(null)
  }

  const handleReset = async () => {
    const ok = await confirm({
      message:
        eventId === null
          ? t('Bocka ur alla rader i listan?', 'Untick every row in the list?')
          : t('Bocka ur alla rader för det här eventet?', 'Untick every row for this event?'),
    })
    if (ok) run(() => resetPrintRows(eventId))
  }

  const handleArchive = async () => {
    const ok = await confirm({
      message: t(
        `Arkivera utskriftslistan för ${title}? Den försvinner från Dashboarden.`,
        `Archive the print list for ${title}? It disappears from the Dashboard.`
      ),
      confirmLabel: t('Arkivera', 'Archive'),
    })
    if (ok) onArchive?.()
  }

  const doneCount = rows?.filter((r) => r.done).length ?? 0
  const sections = [
    {
      key: 'self',
      label: t('Skriver ut själva', 'We print'),
      rows: rows?.filter((r) => !r.professional) ?? [],
    },
    {
      key: 'pro',
      label: t('Professionellt tryck', 'Professional printing'),
      rows: rows?.filter((r) => r.professional) ?? [],
    },
  ].filter((s) => s.rows.length > 0)

  const renderRow = (row: PrintRow) => (
    <li key={row.key} className="space-y-1">
      <div className="flex items-center gap-2 text-left">
        <input
          type="checkbox"
          checked={row.done}
          onChange={(e) => run(() => setPrintRowDone(eventId, row, e.target.checked))}
          className="h-4 w-4 shrink-0 accent-accent cursor-pointer"
        />
        <span
          className={`flex-1 min-w-0 truncate text-sm leading-5 ${
            row.done ? 'text-foreground/40 line-through' : 'text-foreground'
          }`}
          title={`${row.copies}x ${row.pageSize ? `${row.pageSize} ` : ''}${row.label}`}
        >
          <span className="mr-1.5 font-mono text-base font-semibold text-accent">
            {row.copies}x
          </span>
          {row.pageSize && (
            <span className="mr-1.5 rounded border border-accent/30 px-1 py-px font-mono text-[10px] text-accent/80">
              {row.pageSize}
            </span>
          )}
          {row.label}
        </span>
        <button
          type="button"
          onClick={() => setModal(row)}
          aria-label={t('Redigera rad', 'Edit row')}
          title={t('Redigera', 'Edit')}
          className="p-0.5 text-foreground/30 hover:text-accent"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setDeleting(deleting === row.key ? null : row.key)}
          aria-label={t('Ta bort rad', 'Delete row')}
          title={t('Ta bort', 'Delete')}
          className="p-0.5 text-foreground/30 hover:text-red-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {deleting === row.key && (
        <div className="ml-6 flex flex-wrap items-center gap-2 rounded border border-red-500/30 bg-red-950/20 p-2 text-xs">
          <span className="text-foreground/70">{t('Ta bort:', 'Delete:')}</span>
          <button
            type="button"
            onClick={() =>
              run(async () => {
                await removePrintRowForEvent(eventId, row)
                setDeleting(null)
              })
            }
            className="rounded border border-red-500/40 px-2 py-0.5 text-red-300 hover:bg-red-900/40"
          >
            {eventId === null
              ? t('Ta bort raden', 'Delete the row')
              : t('Bara det här eventet', 'This event only')}
          </button>
          {row.standardId && (
            <button
              type="button"
              onClick={async () => {
                const ok = await confirm({
                  message: t(
                    'Ta bort raden från standardlistan? Den försvinner från alla event.',
                    'Remove the row from the standard list? It disappears from every event.'
                  ),
                  destructive: true,
                })
                if (!ok) return
                run(async () => {
                  await deletePrintStandard(row.standardId!)
                  setDeleting(null)
                })
              }}
              className="rounded border border-red-500/40 px-2 py-0.5 text-red-300 hover:bg-red-900/40"
            >
              {t('Från standardlistan (alla event)', 'From the standard list (all events)')}
            </button>
          )}
          <button
            type="button"
            onClick={() => setDeleting(null)}
            className="ml-auto text-foreground/50 hover:text-foreground"
          >
            {t('Avbryt', 'Cancel')}
          </button>
        </div>
      )}
    </li>
  )

  return (
    <div className="admin-panel velvet-surface p-3 space-y-2">
      <div className="flex items-center gap-2">
        <h4 className="font-decorative text-sm text-foreground/80 flex-1 min-w-0 truncate">
          {title}
        </h4>
        {rows && rows.length > 0 && (
          <span className="text-xs font-mono text-foreground/50">
            {doneCount}/{rows.length}
          </span>
        )}
        <button
          type="button"
          onClick={handleReset}
          title={t('Bocka ur alla', 'Reset all ticks')}
          aria-label={t('Bocka ur alla', 'Reset all ticks')}
          className="p-1 text-foreground/40 hover:text-accent"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
        {onArchive && (
          <button
            type="button"
            onClick={() => void handleArchive()}
            title={t('Arkivera listan', 'Archive the list')}
            aria-label={t('Arkivera listan', 'Archive the list')}
            className="p-1 text-foreground/40 hover:text-accent"
          >
            <Archive className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={() => setModal('new')}
          title={t('Lägg till rad', 'Add a row')}
          aria-label={t('Lägg till rad', 'Add a row')}
          className="flex h-6 w-6 items-center justify-center rounded border border-accent/40 bg-accent/10 text-accent hover:bg-accent hover:text-black transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {rows === null ? (
        <p className="text-xs text-foreground/40 italic text-left">{t('Laddar…', 'Loading…')}</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-foreground/40 italic text-left">
          {t('Inget att skriva ut.', 'Nothing to print.')}
        </p>
      ) : (
        sections.map((section) => (
          <div key={section.key} className="space-y-1.5">
            <div className="space-y-1 pt-1">
              <div className="text-center text-[10px] font-semibold uppercase tracking-widest text-accent">
                {section.label}
              </div>
              <div className="h-px bg-accent/25" />
            </div>
            <ul className="space-y-0.5">{section.rows.map(renderRow)}</ul>
          </div>
        ))
      )}

      {modal && (
        <RowModal
          key={modal === 'new' ? 'new' : modal.key}
          row={modal === 'new' ? null : modal}
          allowStandard={eventId !== null}
          onClose={() => setModal(null)}
          onSave={handleSaveModal}
        />
      )}
    </div>
  )
}
