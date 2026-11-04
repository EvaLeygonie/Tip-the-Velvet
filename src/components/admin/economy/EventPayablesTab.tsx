import { useEffect, useMemo, useState } from 'react'
import { Download, Loader2, Plus, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import { useConfirm } from '@/contexts/ConfirmContext'
import { downloadBlob } from '@/lib/utils'
import { PayableLineRow } from '@/components/admin/economy/PayableLineRow'
import {
  PAYABLE_SECTIONS,
  TRAVEL_SUFFIX,
  buildLines,
  formatKr,
  isTravelRow,
  payableStatus,
  rowFiles,
  summarizePayables,
  type PayableLine,
  type PayableSection,
  type PayableWithFiles,
  type RowFile,
} from '@/lib/payables'
import {
  addTravelRow,
  attachPayableFile,
  createPayable,
  deletePayable,
  deletePayableFile,
  fetchRowFileBlob,
  getEventPayables,
  getInvoiceUrl,
  syncEventPayables,
  zipRowFiles,
  updatePayable,
  type PayablePatchInput,
} from '@/services/payablesService'
import type { EventPayable, PayableFile } from '@/types/types'

interface EventPayablesTabProps {
  eventId: string
}

const isLineSettled = (line: PayableLine): boolean => {
  const parts = [line.main, line.travel && !line.travel.dismissed ? line.travel : null].filter(
    (r): r is PayableWithFiles => r !== null
  )
  return parts.every((r) => payableStatus(r, r.files.length) === 'paid')
}

// Every bill to pay out after one show. A line per person (artists, paid staff) with a slot for the
// job and one for travel, since the two are paid separately, plus lines for the venue and for
// whatever the board adds by hand. Each payment can hold any number of invoices and receipts.
export const EventPayablesTab = ({ eventId }: EventPayablesTabProps) => {
  const { t } = useLanguage()
  const confirm = useConfirm()
  const [rows, setRows] = useState<PayableWithFiles[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [hidePaid, setHidePaid] = useState(false)
  const [justAddedId, setJustAddedId] = useState<string | null>(null)
  // Bumped by "Try again" so the effect below runs once more.
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        await syncEventPayables(eventId)
        const data = await getEventPayables(eventId)
        if (!cancelled) {
          setRows(data)
          setFailed(false)
        }
      } catch (err) {
        console.error('Kunde inte hämta betalningar:', err)
        if (!cancelled) setFailed(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [eventId, reloadKey])

  const retry = () => {
    setLoading(true)
    setFailed(false)
    setReloadKey((k) => k + 1)
  }

  // The row from the database has no files attached, so keep the ones the screen already has.
  const mergeRow = (updated: EventPayable) =>
    setRows((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)))

  // The screen follows at once; if the save fails the row is put back the way it was.
  const handlePatch = async (id: string, patch: PayablePatchInput) => {
    const before = rows.find((r) => r.id === id)
    if (!before) return
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
    try {
      mergeRow(await updatePayable(id, patch))
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte spara.', 'Could not save.'))
      setRows((prev) => prev.map((r) => (r.id === id ? before : r)))
    }
  }

  const handleAdd = async (section: PayableSection) => {
    try {
      const nextOrder =
        Math.max(0, ...rows.filter((r) => r.section === section).map((r) => r.sort_order)) + 2
      const created = await createPayable(eventId, section, nextOrder)
      setRows((prev) => [...prev, { ...created, files: [] }])
      setJustAddedId(created.id)
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte lägga till raden.', 'Could not add the row.'))
    }
  }

  const handleAddTravel = async (job: PayableWithFiles): Promise<PayableWithFiles | null> => {
    try {
      const travel = await addTravelRow(job)
      let result: PayableWithFiles = { ...travel, files: [] }
      setRows((prev) => {
        const existing = prev.find((r) => r.id === travel.id)
        if (existing) {
          result = { ...existing, ...travel }
          return prev.map((r) => (r.id === travel.id ? result : r))
        }
        return [...prev, result]
      })
      return result
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte lägga till resa.', 'Could not add travel.'))
      return null
    }
  }

  // Several files can be chosen at once; each is stored and recorded on the row.
  const handleUpload = async (row: PayableWithFiles, files: File[]) => {
    let added = 0
    for (const file of files) {
      try {
        const saved = await attachPayableFile(eventId, row.id, file)
        setRows((prev) =>
          prev.map((r) => (r.id === row.id ? { ...r, files: [...r.files, saved] } : r))
        )
        added += 1
      } catch (err) {
        console.error(err)
        toast.error(t(`Kunde inte ladda upp ${file.name}.`, `Could not upload ${file.name}.`))
      }
    }
    if (added > 0) {
      toast.success(
        added === 1
          ? t('Filen är uppladdad.', 'File uploaded.')
          : t(`${added} filer uppladdade.`, `${added} files uploaded.`)
      )
    }
  }

  const handleOpenFile = async (file: RowFile) => {
    try {
      const url = file.origin === 'board' && file.path ? await getInvoiceUrl(file.path) : file.url
      if (url) window.open(url, '_blank', 'noopener')
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte öppna filen.', 'Could not open the file.'))
    }
  }

  const handleDownloadFile = async (file: RowFile) => {
    try {
      downloadBlob(await fetchRowFileBlob(file), file.name)
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte ladda ner filen.', 'Could not download the file.'))
    }
  }

  // Every file of a list of rows in one zip, each name starting with the row it belongs to
  const downloadZip = async (targets: PayableWithFiles[], zipName: string) => {
    const entries = targets.flatMap((row) =>
      rowFiles(row).map((file) => ({ prefix: row.label || t('Rad', 'Row'), file }))
    )
    if (entries.length === 0) {
      toast.error(t('Inga filer att ladda ner.', 'No files to download.'))
      return
    }
    try {
      downloadBlob(await zipRowFiles(entries), zipName)
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte ladda ner filerna.', 'Could not download the files.'))
    }
  }

  const handleDownloadMany = (row: PayableWithFiles) => downloadZip([row], 'fakturor-kvitton.zip')

  const handleDeleteFile = async (row: PayableWithFiles, file: PayableFile) => {
    const ok = await confirm({
      message: t(`Ta bort ${file.name ?? 'filen'}?`, `Remove ${file.name ?? 'the file'}?`),
      destructive: true,
    })
    if (!ok) return
    try {
      await deletePayableFile(file)
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id ? { ...r, files: r.files.filter((f) => f.id !== file.id) } : r
        )
      )
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte ta bort filen.', 'Could not remove the file.'))
    }
  }

  const dismissRows = async (targets: PayableWithFiles[], dismissed: boolean) => {
    const updated = await Promise.all(targets.map((r) => updatePayable(r.id, { dismissed })))
    updated.forEach(mergeRow)
  }

  const handleRemoveLine = async (line: PayableLine) => {
    const isManual = line.main.source_type === null
    const ok = await confirm({
      message: isManual
        ? t('Ta bort den här raden?', 'Delete this row?')
        : t(
            'Dölj raden? Den räknas inte med i summan.',
            'Hide this row? It will not count in the totals.'
          ),
      destructive: isManual,
    })
    if (!ok) return
    try {
      if (isManual) {
        for (const file of line.main.files) await deletePayableFile(file)
        await deletePayable(line.main.id)
        setRows((prev) => prev.filter((r) => r.id !== line.main.id))
      } else {
        await dismissRows([line.main, ...(line.travel ? [line.travel] : [])], true)
      }
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte ta bort.', 'Could not remove.'))
    }
  }

  const handleRemoveTravel = async (travel: PayableWithFiles) => {
    const ok = await confirm({
      message: t(
        'Ingen resa för den här personen? Resan döljs och räknas inte med.',
        'No travel for this person? The travel row is hidden and left out of the totals.'
      ),
    })
    if (!ok) return
    try {
      await dismissRows([travel], true)
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte ta bort.', 'Could not remove.'))
    }
  }

  const handleRestore = async (row: PayableWithFiles) => {
    const travelType = `${row.source_type}${TRAVEL_SUFFIX}`
    const travel = rows.find(
      (r) =>
        row.source_type !== null &&
        r.source_type === travelType &&
        r.source_id === row.source_id &&
        r.dismissed
    )
    try {
      await dismissRows([row, ...(travel ? [travel] : [])], false)
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte återställa.', 'Could not restore.'))
    }
  }

  const { all, bySection } = useMemo(() => summarizePayables(rows), [rows])
  const totalFiles = rows.filter((r) => !r.dismissed).reduce((n, r) => n + rowFiles(r).length, 0)
  const hiddenRows = rows.filter((r) => r.dismissed && !isTravelRow(r))

  if (loading) {
    return (
      <div className="flex justify-center py-16" role="status">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
        <span className="sr-only">{t('Laddar...', 'Loading...')}</span>
      </div>
    )
  }

  if (failed) {
    return (
      <div className="callout-panel max-w-xl">
        <p className="text-info">
          {t(
            'Kunde inte läsa betalningarna. Har docs/event-payables.sql och docs/event-payables-v2.sql körts i Supabase?',
            'Could not load the payments. Have docs/event-payables.sql and docs/event-payables-v2.sql been run in Supabase?'
          )}
        </p>
        <button type="button" onClick={retry} className="btn-gold-outline">
          {t('Försök igen', 'Try again')}
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 space-y-8 pb-16">
      <section className="admin-panel p-5 sm:p-6" aria-label={t('Sammanfattning', 'Summary')}>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-xs uppercase tracking-widest text-foreground/60">
              {t('Kvar att betala', 'Left to pay')}
            </div>
            <div className="font-decorative text-2xl sm:text-3xl text-accent mt-1">
              {formatKr(all.outstanding)}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-foreground/60">
              {t('Betalt', 'Paid')}
            </div>
            <div className="font-decorative text-2xl sm:text-3xl text-emerald-400 mt-1">
              {formatKr(all.paid)}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-foreground/60">
              {t('Totalt', 'Total')}
            </div>
            <div className="font-decorative text-2xl sm:text-3xl text-foreground mt-1">
              {formatKr(all.total)}
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-foreground/70 text-center">
          <span>
            {t(
              `${all.paidRows} av ${all.rows} betalningar gjorda`,
              `${all.paidRows} of ${all.rows} payments made`
            )}
            {all.withoutAmount > 0 && (
              <span className="text-amber-400">
                {' · '}
                {t(`${all.withoutAmount} saknar belopp`, `${all.withoutAmount} without an amount`)}
              </span>
            )}
          </span>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hidePaid}
              onChange={(e) => setHidePaid(e.target.checked)}
              className="h-4 w-4 accent-[#F9C31F]"
            />
            {t('Dölj betalda rader', 'Hide paid rows')}
          </label>
          {totalFiles > 0 && (
            <button
              type="button"
              onClick={() =>
                void downloadZip(
                  rows.filter((r) => !r.dismissed),
                  'fakturor-och-kvitton.zip'
                )
              }
              className="flex items-center gap-2 text-accent hover:underline"
            >
              <Download className="h-4 w-4" />
              {t(`Ladda ner alla filer (${totalFiles})`, `Download all files (${totalFiles})`)}
            </button>
          )}
        </div>
      </section>

      {PAYABLE_SECTIONS.map((section) => {
        const lines = buildLines(
          rows.filter((r) => !r.dismissed || isTravelRow(r)),
          section.key
        )
        const shown = hidePaid ? lines.filter((l) => !isLineSettled(l)) : lines
        const totals = bySection[section.key]
        return (
          <section key={section.key} className="space-y-3" aria-label={t(section.sv, section.eng)}>
            <div className="flex items-center justify-between gap-3 border-b border-accent/20 pb-2">
              <h3 className="font-decorative text-lg text-accent uppercase tracking-wider">
                {t(section.sv, section.eng)}
              </h3>
              <div className="flex items-center gap-3">
                {totals && (
                  <span className="text-sm text-foreground/70">
                    {t('Kvar', 'Left')} {formatKr(totals.outstanding)} {t('av', 'of')}{' '}
                    {formatKr(totals.total)}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => void handleAdd(section.key)}
                  title={t('Lägg till rad', 'Add a row')}
                  aria-label={t(`Lägg till rad i ${section.sv}`, `Add a row to ${section.eng}`)}
                  className="h-8 w-8 shrink-0 rounded-full bg-accent/90 text-black flex items-center justify-center hover:bg-accent transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {lines.length === 0 && (
              <p className="text-sm text-foreground/50">{t(section.emptySv, section.emptyEng)}</p>
            )}
            {lines.length > 0 && shown.length === 0 && (
              <p className="text-sm text-foreground/50">
                {t('Alla rader här är betalda.', 'Every row here is paid.')}
              </p>
            )}

            <div className="space-y-2">
              {shown.map((line) => (
                <PayableLineRow
                  key={line.main.id}
                  line={line}
                  onPatch={handlePatch}
                  onUpload={handleUpload}
                  onOpenFile={handleOpenFile}
                  onDownloadFile={handleDownloadFile}
                  onDownloadMany={handleDownloadMany}
                  onDeleteFile={handleDeleteFile}
                  onRemoveLine={handleRemoveLine}
                  onRemoveTravel={handleRemoveTravel}
                  onAddTravel={handleAddTravel}
                  autoFocusLabel={line.main.id === justAddedId}
                />
              ))}
            </div>
          </section>
        )
      })}

      {hiddenRows.length > 0 && (
        <section className="space-y-2" aria-label={t('Dolda rader', 'Hidden rows')}>
          <h3 className="font-decorative text-sm text-foreground/60 uppercase tracking-wider">
            {t('Dolda rader', 'Hidden rows')}
          </h3>
          {hiddenRows.map((row) => (
            <div
              key={row.id}
              className="flex items-center justify-between gap-3 text-sm text-foreground/60 border border-accent/10 rounded-lg px-3 py-2"
            >
              <span className="truncate">{row.label}</span>
              <button
                type="button"
                onClick={() => void handleRestore(row)}
                className="flex items-center gap-1 text-xs text-accent/80 hover:text-accent shrink-0"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t('Återställ', 'Restore')}
              </button>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
