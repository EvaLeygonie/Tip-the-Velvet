import { useRef, useState } from 'react'
import { Loader2, Trash2, Upload } from 'lucide-react'
import { FilesMenu } from '@/components/admin/economy/FilesMenu'
import { useLanguage } from '@/contexts/LanguageContext'
import {
  PAYMENT_ROUTES,
  PRIVATE_PAYMENT_LIMIT,
  effectiveRoute,
  exceedsPrivateLimit,
  vatPart,
  rowFiles,
  todayIso,
  type PayableWithFiles,
  type RowFile,
} from '@/lib/payables'
import type { PayablePatchInput } from '@/services/payablesService'
import type { PayableFile } from '@/types/types'

interface PartPanelProps {
  kind: 'job' | 'travel'
  row: PayableWithFiles
  // Titles the panel Job / Travel when a row has both; a single panel needs no title
  showKindTitle: boolean
  onPatch: (id: string, patch: PayablePatchInput) => Promise<void>
  onUpload: (row: PayableWithFiles, files: File[]) => Promise<void>
  onOpenFile: (file: RowFile) => Promise<void>
  onDownloadFile: (file: RowFile) => Promise<void>
  onDownloadMany: (row: PayableWithFiles) => Promise<void>
  onDeleteFile: (row: PayableWithFiles, file: PayableFile) => Promise<void>
  onRemove: () => Promise<void>
  removeLabel: string
}

const parseAmount = (text: string): number | null => {
  const cleaned = text.replace(/\s/g, '').replace(',', '.')
  if (cleaned === '') return null
  const n = Number(cleaned)
  return Number.isFinite(n) && n >= 0 ? n : null
}

// Compact inputs: the global field style is roomy, and an open row has a lot of them.
const FIELD = '!py-2 text-sm'
const VAT_RATES = [0, 6, 12, 25]

// The details of one payment, in three tight rows: amount, VAT and the upload button; how it is
// billed, who paid out of pocket and when; then the note. Uploaded files sit as small chips
// between the first two rows.
export const PartPanel = ({
  kind,
  row,
  showKindTitle,
  onPatch,
  onUpload,
  onOpenFile,
  onDownloadFile,
  onDownloadMany,
  onDeleteFile,
  onRemove,
  removeLabel,
}: PartPanelProps) => {
  const { t } = useLanguage()
  const fileInput = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [amountDraft, setAmountDraft] = useState(row.amount === null ? '' : String(row.amount))
  const [noteDraft, setNoteDraft] = useState(row.note ?? '')
  const [advancedDraft, setAdvancedDraft] = useState(row.advanced_by ?? '')
  const [accountDraft, setAccountDraft] = useState(row.payment_account ?? '')

  // An artist who drives gets the fuel paid with the fee, so their travel is called fuel
  const travelTitle = row.artist?.byCar ? t('Bensin', 'Fuel') : t('Resa', 'Travel')
  // Swedish VAT rates; a rate that was converted from an old amount is added so it still shows
  const vatValue = row.vat_rate == null ? '' : String(row.vat_rate)
  const vatRates = [
    ...new Set([...VAT_RATES, ...(row.vat_rate == null ? [] : [row.vat_rate])]),
  ].sort((x, y) => x - y)

  const title = kind === 'travel' ? travelTitle : t('Jobb', 'Job')
  const files = rowFiles(row)
  const route = effectiveRoute(row)
  // Only a receipt has someone to pay back
  const advancedBy = route === 'receipt' ? (row.advanced_by?.trim() ?? '') : ''

  const handleFiles = async (list: FileList | null) => {
    const files = list ? Array.from(list) : []
    if (!files.length) return
    setUploading(true)
    try {
      await onUpload(row, files)
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const saveText = (
    key: 'note' | 'advanced_by' | 'payment_account',
    draft: string,
    current: string | null
  ) => {
    const next = draft.trim()
    if ((current ?? '') === next) return
    void onPatch(row.id, { [key]: next || null })
  }

  const saveAmount = (draft: string, current: number | null) => {
    const next = parseAmount(draft)
    if (next === current) return
    void onPatch(row.id, { amount: next })
  }

  const commitOnEnter = (e: React.KeyboardEvent<HTMLInputElement>) =>
    e.key === 'Enter' && e.currentTarget.blur()

  return (
    <div className="border-t border-accent/10 px-3 py-3 bg-black/20 space-y-3 last:rounded-b-xl">
      {showKindTitle && (
        <h4 className="font-decorative text-sm text-accent uppercase tracking-wider">{title}</h4>
      )}

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 items-end">
        <div>
          <label className="form-label-gold" htmlFor={`amount-${row.id}`}>
            {t('Belopp (kr)', 'Amount (kr)')}
          </label>
          <input
            id={`amount-${row.id}`}
            type="text"
            inputMode="decimal"
            value={amountDraft}
            onChange={(e) => setAmountDraft(e.target.value)}
            onBlur={() => saveAmount(amountDraft, row.amount)}
            onKeyDown={commitOnEnter}
            placeholder="0"
            className={FIELD}
          />
        </div>
        <div>
          <label className="form-label-gold" htmlFor={`vat-${row.id}`}>
            {t('Moms (%)', 'VAT (%)')}
          </label>
          <select
            id={`vat-${row.id}`}
            value={vatValue}
            onChange={(e) =>
              void onPatch(row.id, {
                vat_rate: e.target.value === '' ? null : Number(e.target.value),
              })
            }
            title={
              vatPart(row.amount, row.vat_rate) !== null
                ? t(
                    `Moms ${vatPart(row.amount, row.vat_rate)} kr av beloppet`,
                    `VAT ${vatPart(row.amount, row.vat_rate)} kr of the amount`
                  )
                : undefined
            }
            className={FIELD}
          >
            <option value="">{t('Inte angiven', 'Not set')}</option>
            {vatRates.map((rate) => (
              <option key={rate} value={rate}>
                {rate} %
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2 sm:col-span-1 flex items-stretch gap-2">
          <input
            ref={fileInput}
            type="file"
            multiple
            accept="application/pdf,image/*"
            className="hidden"
            onChange={(e) => void handleFiles(e.target.files)}
          />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            title={t('Ladda upp faktura eller kvitto', 'Upload an invoice or receipt')}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-accent/90 text-black text-sm font-semibold py-2 hover:bg-accent disabled:opacity-50 transition-colors"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {t('Ladda upp', 'Upload')}
          </button>
          <FilesMenu
            files={files}
            onOpenFile={onOpenFile}
            onDownloadFile={onDownloadFile}
            onDownloadAll={() => onDownloadMany(row)}
            onDeleteFile={(file) => onDeleteFile(row, file)}
          />
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
        <div className="col-span-2 sm:col-span-1">
          <label className="form-label-gold" htmlFor={`route-${row.id}`}>
            {t('Betalas via', 'Paid through')}
          </label>
          <select
            id={`route-${row.id}`}
            value={route}
            onChange={(e) => void onPatch(row.id, { payment_route: e.target.value })}
            className={FIELD}
          >
            {PAYMENT_ROUTES.map((r) => (
              <option key={r.key} value={r.key}>
                {t(r.sv, r.eng)}
              </option>
            ))}
          </select>
        </div>
        {route === 'invoice' && (
          <div>
            <label className="form-label-gold" htmlFor={`due-${row.id}`}>
              {t('Förfaller', 'Due')}
            </label>
            <input
              id={`due-${row.id}`}
              type="date"
              value={row.due_on ?? ''}
              onChange={(e) => void onPatch(row.id, { due_on: e.target.value || null })}
              className={FIELD}
            />
          </div>
        )}
        {route === 'receipt' && (
          <div>
            <label
              className="form-label-gold"
              htmlFor={`adv-${row.id}`}
              title={t(
                'Den som lade ut pengarna och ska få dem tillbaka.',
                'Whoever paid out of pocket and is to be paid back.'
              )}
            >
              {t('Utlagt av', 'Paid by')}
            </label>
            <input
              id={`adv-${row.id}`}
              type="text"
              value={advancedDraft}
              onChange={(e) => setAdvancedDraft(e.target.value)}
              onBlur={() => saveText('advanced_by', advancedDraft, row.advanced_by)}
              onKeyDown={commitOnEnter}
              placeholder={t('Namn', 'Name')}
              className={FIELD}
            />
          </div>
        )}
        {route === 'private' && (
          <div>
            <label
              className="form-label-gold"
              htmlFor={`acct-${row.id}`}
              title={t(
                'Kontot pengarna ska föras över till. Utomlands: IBAN eller det personen skickar.',
                'The account to transfer the money to. Abroad: an IBAN or whatever they send.'
              )}
            >
              {t('Konto', 'Account')}
            </label>
            <input
              id={`acct-${row.id}`}
              type="text"
              value={accountDraft}
              onChange={(e) => setAccountDraft(e.target.value)}
              onBlur={() => saveText('payment_account', accountDraft, row.payment_account)}
              onKeyDown={commitOnEnter}
              placeholder={t('Kontonummer eller IBAN', 'Account number or IBAN')}
              className={FIELD}
            />
          </div>
        )}
        <div>
          <label className="form-label-gold" htmlFor={`paid-${row.id}`}>
            {route === 'receipt' ? t('Återbetald den', 'Paid back on') : t('Betald den', 'Paid on')}
          </label>
          <div className="flex items-center gap-3">
            <input
              id={`paid-${row.id}`}
              type="date"
              value={row.paid_on ?? ''}
              onChange={(e) => void onPatch(row.id, { paid_on: e.target.value || null })}
              className={FIELD}
            />
            <input
              type="checkbox"
              checked={row.paid_on !== null}
              onChange={(e) =>
                void onPatch(row.id, { paid_on: e.target.checked ? todayIso() : null })
              }
              aria-label={t(`${title} betald`, `${title} paid`)}
              title={
                advancedBy
                  ? t(
                      `Markera när ${advancedBy} har fått pengarna tillbaka`,
                      `Mark when ${advancedBy} has been paid back`
                    )
                  : t('Markera som betald', 'Mark as paid')
              }
              className="h-5 w-5 shrink-0 accent-[#F9C31F] cursor-pointer"
            />
          </div>
        </div>
      </div>

      {exceedsPrivateLimit(route, row.amount) && (
        <p className="text-[11px] text-red-300">
          {t(
            `Över ${PRIVATE_PAYMENT_LIMIT} kr kräver en faktura.`,
            `Above ${PRIVATE_PAYMENT_LIMIT} kr needs an invoice.`
          )}
        </p>
      )}

      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="form-label-gold" htmlFor={`note-${row.id}`}>
            {t('Anteckning', 'Note')}
          </label>
          <textarea
            id={`note-${row.id}`}
            rows={1}
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            onBlur={() => saveText('note', noteDraft, row.note)}
            className={`${FIELD} resize-y`}
          />
        </div>
        <button
          type="button"
          onClick={() => void onRemove()}
          className="flex items-center gap-1 text-xs text-red-300/80 hover:text-red-300 pb-2.5 shrink-0"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {removeLabel}
        </button>
      </div>
    </div>
  )
}
