import { Loader2, FileText, ExternalLink, Trash2, Plus, Car } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { dietaryCategoryLabel } from '@/lib/contactLabels'
import type { CastingApplicationPortalData, DietaryCategory } from '@/types/types'
import type { BookedFormData, FormChangeEvent, ReceiptItem } from './types'

interface LogisticsSectionProps {
  application: CastingApplicationPortalData
  formData: BookedFormData
  onChange: (e: FormChangeEvent) => void
  receiptFiles: ReceiptItem[]
  uploadingReceipt: boolean
  onReceiptUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveReceipt: (id: string) => void
}

export const LogisticsSection = ({
  application,
  formData,
  onChange,
  receiptFiles,
  uploadingReceipt,
  onReceiptUpload,
  onRemoveReceipt,
}: LogisticsSectionProps) => {
  const { t } = useLanguage()
  return (
    <div className="login-card space-y-6">
      <div className="flex items-center gap-2 text-lg font-bold text-accent border-b border-border/50 pb-3 justify-center">
        <h2>{t('Logistik', 'Logistics')}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="form-field">
          <label className="form-label-block text-xs">{t('Matpreferens', 'Food preference')}</label>
          <select
            name="dietary_category"
            value={formData.dietary_category}
            onChange={onChange}
            className="login-input"
          >
            <option value="" disabled>
              {t('Välj...', 'Select...')}
            </option>
            {(['all_eater', 'vegetarian', 'vegan'] as DietaryCategory[]).map((option) => (
              <option key={option} value={option}>
                {dietaryCategoryLabel(t, option)}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label className="form-label-block text-xs">
            {t('Allergier & övrigt', 'Allergies & other notes')}
          </label>
          <input
            type="text"
            name="dietary_requirements"
            placeholder={t(
              'T.ex. nötallergi – lämna tomt om inga',
              'e.g. nut allergy – leave empty if none'
            )}
            value={formData.dietary_requirements}
            onChange={onChange}
            className="login-input"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-border/40 pt-4">
        <div className="form-field">
          <label className="form-label-block text-xs">{t('Plus One Namn', 'Plus One Name')}</label>
          <input
            type="text"
            name="plus_one_name"
            placeholder={t('T.ex. Anna Karlsson', 'e.g. Anna Karlsson')}
            value={formData.plus_one_name}
            onChange={onChange}
            className="login-input"
          />
        </div>
        <div className="form-field">
          <label className="form-label-block text-xs">{t('Plus One mail', 'Plus One Email')}</label>
          <input
            type="text"
            name="plus_one_email"
            placeholder={t('T.ex. anna.karlsson@example.com', 'e.g. anna.karlsson@example.com')}
            value={formData.plus_one_email}
            onChange={onChange}
            className="login-input"
          />
        </div>
        {/* Only shown when the artist themselves needs housing — a +1 sharing that
                accommodation is meaningless otherwise. Direct feedback 2026-09-22, the
                Luminous Starling case. */}
        {application.needs_accommodation && (
          <label className="flex items-center gap-2 cursor-pointer select-none md:col-span-2">
            <input
              type="checkbox"
              name="plus_one_needs_accommodation"
              checked={formData.plus_one_needs_accommodation}
              onChange={onChange}
              className="accent-accent h-4 w-4 rounded"
            />
            <span className="text-xs font-medium text-foreground">
              {t('Mitt plus one behöver också boende', 'My plus one also needs accommodation')}
            </span>
          </label>
        )}
      </div>

      <div className="form-field border-t border-border/40 pt-4">
        <label className="form-label-block text-xs">
          {t('Övrig anteckning till styrelsen', 'Other note for the board')}
        </label>
        <input
          type="text"
          name="artist_note"
          placeholder={t(
            'T.ex. "Reser med bil tillsammans med ..."',
            'E.g. "Travelling by car together with ..."'
          )}
          value={formData.artist_note}
          onChange={onChange}
          className="login-input"
        />
      </div>

      {(application.needs_travel_costs || (application.travel_cost_amount ?? 0) > 0) && (
        <div className="form-field border-t border-border/40 pt-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="form-field flex-1">
              <label className="form-label-block text-xs">
                {t('Slutliga reseräkning', 'Final Travel Reimbursement')}
              </label>
              <input
                type="number"
                name="travel_covered"
                placeholder={
                  application.travel_cost_amount
                    ? t(
                        `Uppskattat ca ${application.travel_cost_amount}`,
                        `Estimated ~${application.travel_cost_amount}`
                      )
                    : t('T.ex. 500', 'e.g. 500')
                }
                value={formData.travel_covered}
                onChange={onChange}
                className="login-input"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none shrink-0 sm:pb-2.5">
              <input
                type="checkbox"
                name="travels_by_car"
                checked={formData.travels_by_car}
                onChange={onChange}
                className="accent-accent h-4 w-4 rounded shrink-0"
              />
              <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Car className="h-3.5 w-3.5 text-accent shrink-0" />
                {t(
                  'Reser med bil (inget resekvitto - summan betalas med gaget)',
                  'Traveling by car (no travel receipt - the amount is paid with the fee)'
                )}
              </span>
            </label>
          </div>

          {/* No receipt to upload when traveling by car — the sum above is paid out
                  directly instead. Direct feedback 2026-09-22. */}
          {!formData.travels_by_car && (
            <>
              <div className="flex items-center justify-between">
                <label className="form-label-block text-xs">
                  {t('Resekvitton (PDF/Bild)', 'Travel Receipts (PDF/Image)')}
                </label>
                <label
                  htmlFor="receipt-up-multi"
                  className="btn-gold-outline text-xs py-1.5 px-3 cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  {uploadingReceipt ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus size={14} />
                  )}
                  {t('Ladda upp kvitto(n)', 'Upload receipt(s)')}
                </label>
                <input
                  type="file"
                  id="receipt-up-multi"
                  className="hidden"
                  accept="image/*,.pdf"
                  multiple
                  onChange={onReceiptUpload}
                />
              </div>

              {receiptFiles.length > 0 ? (
                <div className="space-y-2">
                  {receiptFiles.map((receipt, idx) => (
                    <div
                      key={receipt.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-accent/40 bg-accent/10"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
                        <FileText className="w-5 h-5 text-accent shrink-0" />
                        <div className="min-w-0 flex-1 flex flex-col items-start">
                          <p className="text-xs font-semibold text-foreground truncate w-full text-left">
                            {idx + 1}. {receipt.name}
                          </p>
                          <p className="text-[10px] text-accent font-medium text-left">
                            ✓ Kvitto bifogat
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={receipt.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-md border border-border hover:border-accent text-foreground/80 hover:text-accent transition-colors"
                          title={t('Öppna kvitto', 'Open receipt')}
                        >
                          <ExternalLink size={14} />
                        </a>
                        <button
                          type="button"
                          onClick={() => onRemoveReceipt(receipt.id)}
                          className="p-1.5 rounded-md border border-destructive/30 hover:bg-destructive/20 text-destructive transition-colors"
                          title={t('Ta bort', 'Remove')}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-foreground/50 italic pt-1">
                  {t('Inga kvitton uppladdade ännu.', 'No receipts uploaded yet.')}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
