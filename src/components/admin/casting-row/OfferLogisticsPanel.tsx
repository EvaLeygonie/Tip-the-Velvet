import { Save, BusFront, Home, DollarSign, Loader2, Crown } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import type { CastingApplication, CastingApplicationWithActs } from '@/types/types'

interface OfferLogisticsPanelProps {
  application: CastingApplicationWithActs
  chosenActsCount: number
  offerFee: number
  needsTravel: boolean
  travelAmount: number
  needsAccom: boolean
  lineupRole: CastingApplication['lineup_role']
  onOfferFeeChange: (value: number) => void
  onNeedsTravelChange: (checked: boolean) => void
  onTravelAmountChange: (value: number) => void
  onNeedsAccomChange: (checked: boolean) => void
  onLineupRoleChange: (value: CastingApplication['lineup_role']) => void
  isDirty: boolean
  saving: boolean
  onSave: (e?: React.MouseEvent) => void
}

// Fee / travel / accommodation / role editing for an application the board has said yes to.
export const OfferLogisticsPanel = ({
  application,
  chosenActsCount,
  offerFee,
  needsTravel,
  travelAmount,
  needsAccom,
  lineupRole,
  onOfferFeeChange,
  onNeedsTravelChange,
  onTravelAmountChange,
  onNeedsAccomChange,
  onLineupRoleChange,
  isDirty,
  saving,
  onSave,
}: OfferLogisticsPanelProps) => {
  const { t } = useLanguage()
  const acts = application.casting_application_acts ?? []
  return (
    <div className="bg-black/50 border border-accent/20 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-accent/10 pb-2">
        <span className="text-xs uppercase tracking-wider text-gold font-mono font-bold flex items-center gap-1.5 shrink-0">
          <DollarSign className="h-4 w-4" />
          {t('Erbjudande', 'Offer')}
        </span>
        <label className="flex items-center gap-2 mx-auto">
          <span className="text-xs font-medium text-foreground flex items-center gap-1.5 shrink-0">
            <Crown className="h-3.5 w-3.5 text-accent" />
            {t('Roll', 'Role')}
          </span>
          <select
            value={lineupRole ?? 'performer'}
            onChange={(e) =>
              onLineupRoleChange(e.target.value as CastingApplication['lineup_role'])
            }
            className="text-xs bg-black/60 border border-accent/20 rounded py-1.5 pl-2 pr-8 focus:border-accent text-white"
          >
            <option value="performer">{t('Artist', 'Performer')}</option>
            <option value="host">Host</option>
            <option value="headliner">Headliner</option>
          </select>
        </label>
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !isDirty}
          className={`text-[11px] py-1 px-3 flex items-center gap-1 rounded-lg shrink-0 whitespace-nowrap min-h-0 sm:min-w-0 ${
            isDirty ? 'btn-gold btn-gold-glow-active' : 'btn-gold-inactive'
          }`}
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          {t('Uppdatera', 'Update')}
        </button>
      </div>

      {acts.length > 1 && chosenActsCount === 0 && (
        <div className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded px-3 py-2">
          {t(
            'Inga akter är valda — välj minst en akt nedan innan du skickar erbjudandet.',
            'No acts are selected — choose at least one act below before sending the offer.'
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 items-start">
        {/* Kolumn 1: ERBJUDET GAGE */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase text-muted-foreground font-mono block">
            {acts.length > 1
              ? t('Erbjudet Gage — Totalt (SEK)', 'Offered Fee — Total (SEK)')
              : t('Erbjudet Gage (SEK)', 'Offered Fee (SEK)')}
          </label>
          <input
            type="number"
            min="0"
            value={offerFee}
            onChange={(e) => onOfferFeeChange(Number(e.target.value))}
            className="w-full text-xs bg-black/60 border border-accent/20 rounded p-2 focus:border-accent text-white font-bold"
          />
          {acts.length > 1 ? (
            <span className="text-[10px] text-muted-foreground block pt-0.5">
              {t('Önskat', 'Requested')}: {application.requested_fee ?? 0} SEK × {chosenActsCount} ={' '}
              {(Number(application.requested_fee) || 0) * chosenActsCount} SEK
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground block pt-0.5">
              {t('Önskat:', 'Requested:')} {application.requested_fee ?? '—'} SEK
            </span>
          )}
        </div>

        {/* Kolumn 2: KRYSSRUTOR */}
        <div className="flex flex-col justify-center space-y-2.5 pt-4">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={needsTravel}
              onChange={(e) => onNeedsTravelChange(e.target.checked)}
              className="accent-accent h-4 w-4 rounded"
            />
            <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <BusFront className="h-3.5 w-3.5 text-gold" />
              {t('Erbjud reseersättning', 'Offer Travel Support')}
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={needsAccom}
              onChange={(e) => onNeedsAccomChange(e.target.checked)}
              className="accent-accent h-4 w-4 rounded"
            />
            <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Home className="h-3.5 w-3.5 text-accent" />
              {t('Erbjud boende', 'Offer Accommodation')}
            </span>
          </label>
        </div>

        {/* Kolumn 3: ERBJUDEN RESEERSÄTTNING */}
        <div>
          {needsTravel ? (
            <div className="space-y-1">
              <label className="text-[10px] uppercase text-gold font-mono block">
                {t('Erbjuden reseersättning (SEK)', 'Offered Travel Support (SEK)')}
              </label>
              <input
                type="number"
                min="0"
                value={travelAmount}
                onChange={(e) => onTravelAmountChange(Number(e.target.value))}
                className="w-full text-xs bg-black/60 border border-accent/20 rounded p-2 focus:border-accent text-white font-bold"
                placeholder="0"
              />
              {application.original_travel_estimate != null && (
                <span className="text-[10px] text-muted-foreground block pt-0.5">
                  {t('Uppskattad summa:', 'Estimated sum:')} {application.original_travel_estimate}{' '}
                  SEK
                </span>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center text-[11px] text-muted-foreground/40 italic pt-5">
              {t('Ingen reseersättning vald', 'No travel compensation selected')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
