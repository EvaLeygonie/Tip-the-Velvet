import { useRef, useState } from 'react'
import { ExternalLink, Loader2, Paperclip, Trash2, X } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import {
  PAYABLE_SECTIONS,
  PAYMENT_ROUTES,
  PRIVATE_PAYMENT_LIMIT,
  exceedsPrivateLimit,
  type PayableWithFiles,
} from '@/lib/payables'
import type { PayablePatchInput } from '@/services/payablesService'
import type { PayableFile } from '@/types/types'

interface PartPanelProps {
  kind: 'job' | 'travel'
  row: PayableWithFiles
  personName: string
  // The first row of a line also carries the line's own settings (tag, section) when it was
  // added by hand.
  isManualMain: boolean
  onPatch: (id: string, patch: PayablePatchInput) => Promise<void>
  onUpload: (row: PayableWithFiles, files: File[]) => Promise<void>
  onOpenFile: (file: PayableFile) => Promise<void>
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

// The details of one payment: its invoices and receipts (any number), how it is billed, when it
// was paid, and the small print.
export const PartPanel = ({
  kind,
  row,
  personName,
  isManualMain,
  onPatch,
  onUpload,
  onOpenFile,
  onDeleteFile,
  onRemove,
  removeLabel,
}: PartPanelProps) => {
  const { t } = useLanguage()
  const fileInput = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [vatDraft, setVatDraft] = useState(row.vat_amount === null ? '' : String(row.vat_amount))
  const [noteDraft, setNoteDraft] = useState(row.note ?? '')
  const [advancedDraft, setAdvancedDraft] = useState(row.advanced_by ?? '')
  const [tagDraft, setTagDraft] = useState(row.tag ?? '')

  const title =
    kind === 'travel'
      ? t(`Resa, ${personName}`, `Travel, ${personName}`)
      : t(`Faktura och kvitton, ${personName}`, `Invoices and receipts, ${personName}`)

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

  const saveText = (key: 'note' | 'advanced_by' | 'tag', draft: string, current: string | null) => {
    const next = draft.trim()
    if ((current ?? '') === next) return
    void onPatch(row.id, { [key]: next || null })
  }

  const saveVat = () => {
    const next = parseAmount(vatDraft)
    if (next === row.vat_amount) return
    void onPatch(row.id, { vat_amount: next })
  }

  return (
    <div className="border-t border-accent/10 p-3 bg-black/20 space-y-4">
      <h4 className="font-decorative text-sm text-accent uppercase tracking-wider">{title}</h4>

      <div className="space-y-2">
        <span className="form-label-gold block">
          {t('Fakturor och kvitton', 'Invoices and receipts')}
        </span>
        {row.files.length === 0 && (
          <p className="text-sm text-foreground/50">
            {t('Inga filer uppladdade än.', 'No files uploaded yet.')}
          </p>
        )}
        <ul className="space-y-1">
          {row.files.map((file) => (
            <li
              key={file.id}
              className="flex items-center justify-between gap-3 text-sm border border-accent/15 rounded-lg px-3 py-1.5"
            >
              <button
                type="button"
                onClick={() => void onOpenFile(file)}
                className="flex items-center gap-2 min-w-0 text-left text-foreground hover:text-accent"
              >
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{file.name ?? file.path}</span>
              </button>
              <button
                type="button"
                onClick={() => void onDeleteFile(row, file)}
                aria-label={t(
                  `Ta bort ${file.name ?? 'filen'}`,
                  `Remove ${file.name ?? 'the file'}`
                )}
                className="text-foreground/50 hover:text-red-300 shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
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
          className="flex items-center gap-2 text-xs text-accent border border-accent/30 rounded-full px-4 py-2 hover:bg-accent/10 disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Paperclip className="h-3.5 w-3.5" />
          )}
          {t('Lägg till filer', 'Add files')}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="form-label-gold" htmlFor={`route-${row.id}`}>
            {t('Faktureras via', 'Billed through')}
          </label>
          <select
            id={`route-${row.id}`}
            value={row.payment_route ?? ''}
            onChange={(e) => void onPatch(row.id, { payment_route: e.target.value || null })}
            className="w-full"
          >
            <option value="">{t('Inte valt', 'Not chosen')}</option>
            {PAYMENT_ROUTES.map((r) => (
              <option key={r.key} value={r.key}>
                {t(r.sv, r.eng)}
              </option>
            ))}
          </select>
          {exceedsPrivateLimit(row.payment_route, row.amount) && (
            <p className="text-[11px] text-red-300 mt-1">
              {t(
                `Över ${PRIVATE_PAYMENT_LIMIT} kr kräver faktura från företag eller FrilansFinans.`,
                `Above ${PRIVATE_PAYMENT_LIMIT} kr needs an invoice from a company or FrilansFinans.`
              )}
            </p>
          )}
        </div>

        <div>
          <label className="form-label-gold" htmlFor={`paid-${row.id}`}>
            {t('Betald den', 'Paid on')}
          </label>
          <input
            id={`paid-${row.id}`}
            type="date"
            value={row.paid_on ?? ''}
            onChange={(e) => void onPatch(row.id, { paid_on: e.target.value || null })}
            className="w-full"
          />
        </div>

        <div>
          <label className="form-label-gold" htmlFor={`vat-${row.id}`}>
            {t('Varav moms (kr)', 'Of which VAT (kr)')}
          </label>
          <input
            id={`vat-${row.id}`}
            type="text"
            inputMode="decimal"
            value={vatDraft}
            onChange={(e) => setVatDraft(e.target.value)}
            onBlur={saveVat}
            className="w-full"
          />
        </div>

        <div>
          <label className="form-label-gold" htmlFor={`adv-${row.id}`}>
            {t('Utlagt av (ska betalas tillbaka)', 'Paid out of pocket by (to be repaid)')}
          </label>
          <input
            id={`adv-${row.id}`}
            type="text"
            value={advancedDraft}
            onChange={(e) => setAdvancedDraft(e.target.value)}
            onBlur={() => saveText('advanced_by', advancedDraft, row.advanced_by)}
            placeholder={t(
              'Namn, tomt om föreningen betalar',
              'Name, empty if the association pays'
            )}
            className="w-full"
          />
        </div>

        {isManualMain && (
          <>
            <div>
              <label className="form-label-gold" htmlFor={`tag-${row.id}`}>
                {t('Etikett under namnet', 'Tag under the name')}
              </label>
              <input
                id={`tag-${row.id}`}
                type="text"
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onBlur={() => saveText('tag', tagDraft, row.tag)}
                placeholder={t('Till exempel Dekor eller Tryck', 'For example Decor or Print')}
                className="w-full"
              />
            </div>
            <div>
              <label className="form-label-gold" htmlFor={`section-${row.id}`}>
                {t('Avdelning', 'Section')}
              </label>
              <select
                id={`section-${row.id}`}
                value={row.section}
                onChange={(e) => void onPatch(row.id, { section: e.target.value })}
                className="w-full"
              >
                {PAYABLE_SECTIONS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {t(s.sv, s.eng)}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        <div className="sm:col-span-2">
          <label className="form-label-gold" htmlFor={`note-${row.id}`}>
            {t('Anteckning', 'Note')}
          </label>
          <textarea
            id={`note-${row.id}`}
            rows={2}
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            onBlur={() => saveText('note', noteDraft, row.note)}
            className="w-full"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void onRemove()}
          className="flex items-center gap-1 text-xs text-red-300/80 hover:text-red-300"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {removeLabel}
        </button>
      </div>
    </div>
  )
}
