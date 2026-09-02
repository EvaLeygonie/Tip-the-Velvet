import type { ReactNode } from 'react'
import { CheckCircle2, AlertTriangle, Drama, Users, Gift, Crown, UtensilsCrossed } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import type {
  AdminEventPerformerRow,
  AdminEventStaffRow,
  AdminEventSponsorRow,
  AdminEventActRow,
} from '@/services/eventService'
import type { VipManualEntry, DietaryCategory } from '@/types/types'
import { STANDING_ORGANIZERS, FIXED_STAFF_ROLES, PRIZE_SLOT_COUNT } from './constants'
import { dietaryCategoryLabel } from '@/lib/contactLabels'

export type EventPlanTab = 'artists' | 'show' | 'staff' | 'sponsors' | 'vip'

interface EventProgressOverviewProps {
  performers: AdminEventPerformerRow[]
  acts: AdminEventActRow[]
  staffRows: AdminEventStaffRow[]
  sponsorRows: AdminEventSponsorRow[]
  vipEntries: VipManualEntry[]
  onSelectTab: (tab: EventPlanTab) => void
}

interface StatusCardProps {
  label: string
  value: string
  ok: boolean | null
  icon: ReactNode
  onClick: () => void
}

const StatusCard = ({ label, value, ok, icon, onClick }: StatusCardProps) => (
  <button
    type="button"
    onClick={onClick}
    className={`admin-panel velvet-surface p-3 flex flex-col gap-1 text-left border transition-colors hover:border-accent/50 ${
      ok === null ? 'border-accent/10' : ok ? 'border-emerald-500/20' : 'border-amber-500/30'
    }`}
  >
    <div className="flex items-center gap-1.5 text-xs font-heading text-foreground/60">
      {icon}
      <span className="truncate">{label}</span>
      {ok === true && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 ml-auto shrink-0" />}
      {ok === false && <AlertTriangle className="h-3.5 w-3.5 text-amber-400 ml-auto shrink-0" />}
    </div>
    <div className="text-sm text-foreground truncate">{value}</div>
  </button>
)

// The page's "what's left to do for this event" summary — every card is a pure read-time
// computation over data the tabs below already load, nothing stored. Clicking a card jumps
// straight to the relevant tab.
export const EventProgressOverview = ({
  performers,
  acts,
  staffRows,
  sponsorRows,
  vipEntries,
  onSelectTab,
}: EventProgressOverviewProps) => {
  const { t } = useLanguage()

  // Showplanering — every confirmed artist always has at least one act (created by the
  // booking flow itself), so the only real gap left to flag is missing stage notes.
  const actsMissingNotes = acts.filter((a) => !a.stage_preparations && !a.pick_up_cleaning).length
  const showOk = performers.length === 0 ? null : actsMissingNotes === 0
  const showValue =
    performers.length === 0
      ? t('Inga artister än', 'No artists yet')
      : showOk
        ? t(`${acts.length} akter klara`, `${acts.length} acts ready`)
        : t(
            `${actsMissingNotes} utan scenanteckningar`,
            `${actsMissingNotes} without stage notes`
          )

  // Bemanning
  const missingRoles = FIXED_STAFF_ROLES.filter((role) => !staffRows.some((r) => r.role === role))
  const staffOk = missingRoles.length === 0
  // Distinct people, not rows — same reasoning as StaffingCoverageStrip's own count: a
  // volunteer on two shifts is still one volunteer.
  const volunteerCount = new Set(
    staffRows.filter((r) => r.role === 'volunteer').map((r) => r.staff.id)
  ).size
  const staffValue = staffOk
    ? t(`Nyckelroller klara, ${volunteerCount} volontärer`, `Key roles filled, ${volunteerCount} volunteers`)
    : t(`Saknas: ${missingRoles.length} roll(er)`, `Missing: ${missingRoles.length} role(s)`)

  // Sponsorer
  const prizeCount = sponsorRows.filter((r) => r.role === 'prize').length
  const sponsorsOk = prizeCount >= PRIZE_SLOT_COUNT
  const sponsorsValue = `${prizeCount}/${PRIZE_SLOT_COUNT}`

  // VIP-lista — a plain count, always "in progress" by nature, no done/not-done state
  const vipTotal =
    STANDING_ORGANIZERS.length +
    performers.length +
    staffRows.length +
    performers.filter((p) => p.plus_one_name).length +
    vipEntries.length
  const vipValue = t(`${vipTotal} personer`, `${vipTotal} people`)

  // Mat — needs every confirmed performer + every food-flagged staff row categorized
  // before it can compute a real headcount summary
  const foodPeople: (DietaryCategory | null)[] = [
    ...performers.map((p) => p.dietary_category),
    ...staffRows.filter((r) => r.needs_food).map((r) => r.dietary_category),
  ]
  const needsCategorizing = foodPeople.some((c) => !c)
  const foodOk = foodPeople.length > 0 && !needsCategorizing
  const counts: Record<DietaryCategory, number> = { all_eater: 0, vegetarian: 0, vegan: 0 }
  foodPeople.forEach((c) => {
    if (c) counts[c]++
  })
  const foodValue =
    foodPeople.length === 0
      ? t('Inga att kategorisera än', 'Nobody to categorize yet')
      : needsCategorizing
        ? t('Behöver kategoriseras', 'Needs categorizing')
        : (['all_eater', 'vegetarian', 'vegan'] as DietaryCategory[])
            .filter((c) => counts[c] > 0)
            .map((c) => `${counts[c]} ${dietaryCategoryLabel(t, c).toLowerCase()}`)
            .join(', ')

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-6">
      <StatusCard
        label={t('Showplanering', 'Show planning')}
        value={showValue}
        ok={showOk}
        icon={<Drama className="h-3.5 w-3.5 shrink-0" />}
        onClick={() => onSelectTab('show')}
      />
      <StatusCard
        label={t('Bemanning', 'Staffing')}
        value={staffValue}
        ok={staffOk}
        icon={<Users className="h-3.5 w-3.5 shrink-0" />}
        onClick={() => onSelectTab('staff')}
      />
      <StatusCard
        label={t('Sponsorer', 'Sponsors')}
        value={sponsorsValue}
        ok={sponsorsOk}
        icon={<Gift className="h-3.5 w-3.5 shrink-0" />}
        onClick={() => onSelectTab('sponsors')}
      />
      <StatusCard
        label={t('VIP-lista', 'VIP list')}
        value={vipValue}
        ok={null}
        icon={<Crown className="h-3.5 w-3.5 shrink-0" />}
        onClick={() => onSelectTab('vip')}
      />
      <StatusCard
        label={t('Mat', 'Food')}
        value={foodValue}
        ok={foodPeople.length === 0 ? null : foodOk}
        icon={<UtensilsCrossed className="h-3.5 w-3.5 shrink-0" />}
        onClick={() => onSelectTab('vip')}
      />
    </div>
  )
}
