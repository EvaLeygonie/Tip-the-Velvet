import { Mic2, Crown } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import type { CastingApplicationPortalData } from '@/types/types'

interface AgreedCompensationCardProps {
  application: CastingApplicationPortalData
  // The live "final travel reimbursement" value from the logistics section.
  travelCovered: number | string
  actCount: number
}

// Read-only summary of the fee the board offered.
// Fee comes from proposed_fee (fixed at offer time, not editable here). Travel reads the live
// travel_covered value, since that IS the editable "final reimbursement" field above, so this
// stays in sync as the artist fills it in.
//
// Three states, not two — travel being *part of the offer* (needs_travel_costs) and travel
// having a *settled amount* (travel_covered, filled in once the artist knows it) are different
// things. No line when travel isn't part of the offer at all; a firm "+ Travel: X SEK" and
// "= Total" once a real figure is entered; and, in between, a "Travel costs to be added
// (~estimate)" placeholder with no "=" line — a real total shouldn't be stated until travel
// actually has a number.
export const AgreedCompensationCard = ({
  application,
  travelCovered: travelCoveredValue,
  actCount,
}: AgreedCompensationCardProps) => {
  const { t } = useLanguage()
  const proposedFee = Number(application.proposed_fee) || 0
  const travelCovered = Number(travelCoveredValue) || 0
  const needsTravel = application.needs_travel_costs || false
  const offeredTravelEstimate = Number(application.travel_cost_amount) || 0
  const roleLabel =
    application.lineup_role === 'host'
      ? 'Host'
      : application.lineup_role === 'headliner'
        ? 'Headliner'
        : null

  return (
    <div className="login-card space-y-3">
      <div className="flex items-center gap-2 text-lg font-bold text-accent border-b border-border/50 pb-3 justify-center">
        <h2>{t('Överenskommet Gage', 'Agreed Compensation')}</h2>
      </div>
      <div className="text-sm text-foreground space-y-1.5 font-mono">
        <p>
          {proposedFee} SEK
          {actCount > 1 && ` ${t('för', 'for')} ${actCount} ${t('akter', 'acts')}`}
        </p>
        {needsTravel && travelCovered > 0 && (
          <>
            <p>
              + {t('Reseersättning', 'Travel Reimbursement')}: {travelCovered} SEK
            </p>
            <p className="text-accent font-bold pt-1.5 border-t border-border/30">
              = {t('Totalt', 'Total')}: {proposedFee + travelCovered} SEK
            </p>
          </>
        )}
        {needsTravel && travelCovered === 0 && (
          <>
            <p className="text-foreground/60 italic">
              +{' '}
              {t(
                `Reseersättning tillkommer (uppskattat ca ${offeredTravelEstimate} SEK)`,
                `Travel reimbursement to be added (estimated ~${offeredTravelEstimate} SEK)`
              )}
            </p>
            <p className="text-foreground/60 italic">
              {t(
                'Fyll i den slutliga summan ovan när den är klar.',
                'Fill in the final amount above once known.'
              )}
            </p>
          </>
        )}
        {roleLabel && (
          <p className="pt-1.5 border-t border-border/30 flex items-center justify-center gap-1.5 text-center">
            {application.lineup_role === 'host' ? (
              <Mic2 className="w-3.5 h-3.5 text-accent" />
            ) : (
              <Crown className="w-3.5 h-3.5 text-accent" />
            )}
            {t('Roll', 'Role')}: <span className="text-accent font-bold">{roleLabel}</span>
          </p>
        )}
      </div>
    </div>
  )
}
