import { useState } from 'react'
import { Car, FileText } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { payableStatus, todayIso, type PayableWithFiles } from '@/lib/payables'
import type { PayablePatchInput } from '@/services/payablesService'

// Same width for every slot on every line, so the two slots line up down the whole list.
export const PART_CELL_WIDTH = 'w-[228px] shrink-0'

const ICON_STYLE = {
  awaiting: 'border-amber-500/50 text-amber-400 bg-amber-500/10',
  invoice: 'border-sky-400/50 text-sky-300 bg-sky-400/15',
  paid: 'border-emerald-500/50 text-emerald-400 bg-emerald-500/15',
} as const

const parseAmount = (text: string): number | null => {
  const cleaned = text.replace(/\s/g, '').replace(',', '.')
  if (cleaned === '') return null
  const n = Number(cleaned)
  return Number.isFinite(n) && n >= 0 ? n : null
}

interface PartCellProps {
  kind: 'job' | 'travel'
  // The row behind this slot, or null when the slot is switched off for this line
  row: PayableWithFiles | null
  // False on lines that have no travel slot at all (the venue, a receipt): an empty space keeps
  // the lines the same width.
  hasSlot: boolean
  open: boolean
  personName: string
  onToggle: () => void
  onPatch: (id: string, patch: PayablePatchInput) => Promise<void>
}

// One payment of a line: the paid tick, the amount, and the icon that opens its invoices and
// receipts. The job and the travel are two of these side by side.
export const PartCell = ({
  kind,
  row,
  hasSlot,
  open,
  personName,
  onToggle,
  onPatch,
}: PartCellProps) => {
  const { t } = useLanguage()
  const [amountDraft, setAmountDraft] = useState(
    row && row.amount !== null ? String(row.amount) : ''
  )
  const Icon = kind === 'job' ? FileText : Car
  const kindLabel = kind === 'job' ? t('Jobb', 'Job') : t('Resa', 'Travel')

  if (!hasSlot) return <div className={`${PART_CELL_WIDTH} hidden sm:block`} aria-hidden="true" />

  // The slot exists but nothing is booked for it: a quiet icon that adds the row when pressed.
  if (!row || row.dismissed) {
    return (
      <div className={`${PART_CELL_WIDTH} flex items-center justify-end gap-2`}>
        <span className="sm:hidden text-[10px] uppercase tracking-widest text-foreground/40 mr-auto">
          {kindLabel}
        </span>
        <button
          type="button"
          onClick={onToggle}
          title={
            kind === 'travel'
              ? t('Ingen resa. Tryck för att lägga till.', 'No travel. Press to add some.')
              : t('Lägg till', 'Add')
          }
          aria-label={
            kind === 'travel'
              ? t(`Lägg till resa för ${personName}`, `Add travel for ${personName}`)
              : t(`Lägg till jobb för ${personName}`, `Add job for ${personName}`)
          }
          className="h-9 w-9 shrink-0 rounded-full border border-dashed border-foreground/20 text-foreground/25 flex items-center justify-center hover:text-accent hover:border-accent/50 transition-colors"
        >
          <Icon className="h-4 w-4" />
        </button>
      </div>
    )
  }

  const status = payableStatus(row, row.files.length)
  const statusText = {
    awaiting: t('väntar på faktura', 'awaiting invoice'),
    invoice: t('faktura mottagen', 'invoice received'),
    paid: t('betald', 'paid'),
  }[status]

  const saveAmount = () => {
    const next = parseAmount(amountDraft)
    if (next === row.amount) return
    void onPatch(row.id, { amount: next })
  }

  return (
    <div className={`${PART_CELL_WIDTH} flex items-center gap-2`}>
      <span className="sm:hidden text-[10px] uppercase tracking-widest text-foreground/40 w-11">
        {kindLabel}
      </span>
      <input
        type="checkbox"
        checked={status === 'paid'}
        onChange={(e) => void onPatch(row.id, { paid_on: e.target.checked ? todayIso() : null })}
        className="h-5 w-5 shrink-0 accent-[#F9C31F]"
        aria-label={t(`${kindLabel} betald, ${personName}`, `${kindLabel} paid, ${personName}`)}
      />
      <div className="flex items-center gap-1 flex-1 min-w-0">
        <input
          type="text"
          inputMode="decimal"
          value={amountDraft}
          onChange={(e) => setAmountDraft(e.target.value)}
          onBlur={saveAmount}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          placeholder="0"
          aria-label={t(`${kindLabel}, belopp i kronor`, `${kindLabel}, amount in kronor`)}
          className="w-full min-w-0 text-right bg-black/30 border border-accent/20 rounded-md px-2 py-1.5 text-sm text-foreground focus:outline-none focus:border-accent"
        />
        <span className="text-xs text-foreground/60">kr</span>
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        title={`${kindLabel}: ${statusText}`}
        aria-label={t(
          `${kindLabel} för ${personName}: ${statusText}, ${row.files.length} filer`,
          `${kindLabel} for ${personName}: ${statusText}, ${row.files.length} files`
        )}
        className={`relative h-9 w-9 shrink-0 rounded-full border flex items-center justify-center transition-colors ${ICON_STYLE[status]} ${
          open ? 'ring-2 ring-accent/60' : ''
        }`}
      >
        <Icon className="h-4 w-4" />
        {row.files.length > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-accent text-black text-[10px] font-semibold flex items-center justify-center">
            {row.files.length}
          </span>
        )}
      </button>
    </div>
  )
}
