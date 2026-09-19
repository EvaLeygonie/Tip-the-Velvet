import { useState } from 'react'
import { Mail, Send, UtensilsCrossed, TriangleAlert } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { dietaryCategoryLabel } from '@/lib/contactLabels'
import { buildFoodRoster, type FoodPerson } from '@/lib/foodRoster'
import { DietaryCategoryPicker } from './DietaryCategoryPicker'
import { ContactMailModal } from '@/components/admin/contacts/ContactMailModal'
import type { AdminEventPerformerRow, AdminEventOrganizerFoodRow } from '@/services/eventService'
import type { GroupedStaffPerson } from '@/lib/staffRowGrouping'
import type { DietaryCategory } from '@/types/types'

type FoodPatch = {
  needs_food?: boolean
  dietary_category?: DietaryCategory | null
  dietary_notes?: string | null
}

interface FoodTabProps {
  eventTitle: string
  performers: AdminEventPerformerRow[]
  groupedStaff: GroupedStaffPerson[]
  organizers: AdminEventOrganizerFoodRow[]
  onUpdatePerformerDietary: (performerId: string, category: DietaryCategory) => void
  onStaffFoodUpdated: (staffId: string, patch: FoodPatch) => void
  onOrganizerFoodUpdated: (staffId: string, patch: FoodPatch) => void
}

const CATEGORY_ORDER: DietaryCategory[] = ['all_eater', 'vegetarian', 'vegan']

// The dedicated food/dietary tab — everyone who eats at the event (every confirmed
// performer, plus any staff/volunteer flagged needs_food, regardless of how many roles they
// hold — see groupStaffRowsByPerson) in one place, grouped by diet so the board can both fix
// up categories and contact a group about their food without hunting across the Artists/
// Staffing tabs the way this used to be split.
export const FoodTab = ({
  eventTitle,
  performers,
  groupedStaff,
  organizers,
  onUpdatePerformerDietary,
  onStaffFoodUpdated,
  onOrganizerFoodUpdated,
}: FoodTabProps) => {
  const { t } = useLanguage()
  const [mailTarget, setMailTarget] = useState<FoodPerson | null>(null)
  const [bulkMailGroup, setBulkMailGroup] = useState<{
    label: string
    people: FoodPerson[]
  } | null>(null)

  const roster = buildFoodRoster(t, performers, groupedStaff, organizers)
  // Not-eating is staff/organizer-only (performers are always assumed to attend & eat) —
  // merged into one list of {id, name, kind} so both can share the same re-add button.
  const notEating: { id: string; name: string; kind: 'staff' | 'organizer' }[] = [
    ...groupedStaff
      .filter((p) => !p.needs_food)
      .map((p) => ({ id: p.staff.id, name: p.staff.name, kind: 'staff' as const })),
    ...organizers
      .filter((o) => !o.needs_food)
      .map((o) => ({ id: o.staff_id, name: o.staff.name, kind: 'organizer' as const })),
  ]
  const notesGiven = roster.filter((p) => p.notes && p.notes.trim())

  const byCategory = (cat: DietaryCategory) => roster.filter((p) => p.category === cat)
  const uncategorized = roster.filter((p) => !p.category)

  const foodUpdateFor = (kind: 'staff' | 'organizer') =>
    kind === 'organizer' ? onOrganizerFoodUpdated : onStaffFoodUpdated

  const setCategory = (person: FoodPerson, category: DietaryCategory) => {
    if (person.kind === 'performer' && person.performerId) {
      onUpdatePerformerDietary(person.performerId, category)
    } else if ((person.kind === 'staff' || person.kind === 'organizer') && person.staffId) {
      foodUpdateFor(person.kind)(person.staffId, { dietary_category: category })
    }
  }

  const setStaffNotes = (person: FoodPerson, notes: string) => {
    if ((person.kind === 'staff' || person.kind === 'organizer') && person.staffId) {
      foodUpdateFor(person.kind)(person.staffId, { dietary_notes: notes.trim() || null })
    }
  }

  const groups: { key: string; label: string; people: FoodPerson[] }[] = [
    { key: 'uncategorized', label: t('Ej kategoriserad', 'Uncategorized'), people: uncategorized },
    ...CATEGORY_ORDER.map((cat) => ({
      key: cat,
      label: dietaryCategoryLabel(t, cat),
      people: byCategory(cat),
    })),
  ]

  return (
    <div className="space-y-4">
      <div className="admin-panel velvet-surface p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Left: general headcount/diet stats — what decides how many pizzas of each kind
            to order. Right: allergy/special-diet markers only, with no name attached — for
            a pizza run nobody needs to know *who* needs gluten-free, just that one pizza
            should be. Direct feedback 2026-09-21. Split into 2 columns (was 1 stacked
            column) since the panel felt awkwardly empty/wide as a single block. */}
        <div className="space-y-2 text-center sm:pr-4 sm:border-r sm:border-accent/10">
          <div className="flex items-center justify-center gap-2 text-sm text-foreground">
            <UtensilsCrossed className="h-4 w-4 text-accent/60 shrink-0" />
            <span>
              {t(`${roster.length} personer behöver mat`, `${roster.length} people need food`)}
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-foreground/60">
            {CATEGORY_ORDER.map((cat) => (
              <span key={cat}>
                {byCategory(cat).length} {dietaryCategoryLabel(t, cat).toLowerCase()}
              </span>
            ))}
            {uncategorized.length > 0 && (
              <span className="text-amber-400">
                {uncategorized.length} {t('okategoriserade', 'uncategorized')}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-2 text-center pt-4 sm:pt-0 border-t sm:border-t-0 border-accent/10">
          <div className="flex items-center justify-center gap-2 text-sm text-foreground">
            <TriangleAlert className="h-4 w-4 text-accent/60 shrink-0" />
            <span>{t('Allergier & specialkost', 'Allergies & special diets')}</span>
          </div>
          {notesGiven.length === 0 ? (
            <p className="text-xs text-foreground/40 italic">
              {t('Inga anteckningar.', 'No notes.')}
            </p>
          ) : (
            <ul className="flex flex-wrap justify-center gap-1.5">
              {notesGiven.map((p) => (
                <li
                  key={p.key}
                  className="text-xs text-foreground/80 bg-black/30 border border-accent/10 rounded-full px-2.5 py-1"
                >
                  {p.notes}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {groups.map((group) => {
        const emailable = group.people.filter((p) => p.email)
        return (
          <details key={group.key} className="group">
            <summary className="cursor-pointer font-decorative text-base text-foreground/80 border-b border-accent/10 pb-2 flex items-center justify-between">
              <span className="flex items-center gap-2">
                {group.label}
                <span className="text-xs font-mono text-foreground/40">{group.people.length}</span>
              </span>
              {emailable.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setBulkMailGroup({ label: group.label, people: group.people })
                  }}
                  title={t('Mejla alla i gruppen', 'Email everyone in this group')}
                  className="text-accent/60 hover:text-accent shrink-0"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              )}
            </summary>
            <div className="space-y-2 pt-2">
              {group.people.length === 0 ? (
                <p className="text-sm text-foreground/40 italic">
                  {t('Ingen här.', 'Nobody here.')}
                </p>
              ) : (
                group.people.map((person) => (
                  <div
                    key={person.key}
                    className="admin-panel velvet-surface p-3 flex flex-wrap items-center gap-2 text-sm text-foreground"
                  >
                    <span className="flex-1 min-w-[120px] truncate">{person.name}</span>
                    <span className="text-accent/70 italic text-xs shrink-0">
                      {person.subtitle}
                    </span>
                    <DietaryCategoryPicker
                      value={person.category}
                      onChange={(value) => setCategory(person, value)}
                      className="shrink-0"
                    />
                    {person.notesEditable ? (
                      <input
                        type="text"
                        defaultValue={person.notes ?? ''}
                        onBlur={(e) => setStaffNotes(person, e.target.value)}
                        placeholder={t('Allergier etc.', 'Allergies etc.')}
                        className="min-w-[120px] flex-1 h-7 text-xs bg-black/40 border border-accent/20 rounded px-2 focus:border-accent text-white"
                      />
                    ) : person.notes ? (
                      <span
                        title={person.notes}
                        className="text-xs text-foreground/50 italic truncate max-w-[140px]"
                      >
                        {person.notes}
                      </span>
                    ) : null}
                    {person.email && (
                      <button
                        type="button"
                        onClick={() => setMailTarget(person)}
                        title={t('Mejla', 'Email')}
                        className="text-accent/60 hover:text-accent shrink-0"
                      >
                        <Mail className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </details>
        )
      })}

      <details className="group">
        <summary className="cursor-pointer font-decorative text-base text-foreground/80 border-b border-accent/10 pb-2 flex items-center justify-between">
          {t('Behöver inte mat', "Doesn't need food")}
          <span className="text-xs font-mono text-foreground/40">{notEating.length}</span>
        </summary>
        <div className="space-y-2 pt-2">
          {notEating.length === 0 ? (
            <p className="text-sm text-foreground/40 italic">{t('Ingen här.', 'Nobody here.')}</p>
          ) : (
            notEating.map((person) => (
              <div
                key={person.id}
                className="admin-panel velvet-surface p-3 flex items-center gap-3 text-sm text-foreground"
              >
                <span className="flex-1 min-w-0 truncate">{person.name}</span>
                <button
                  type="button"
                  onClick={() => foodUpdateFor(person.kind)(person.id, { needs_food: true })}
                  className="text-xs py-1 px-2.5 border border-accent/20 rounded text-accent hover:bg-accent hover:text-black transition-colors shrink-0"
                >
                  {t('Lägg till i matlistan', 'Add to food list')}
                </button>
              </div>
            ))
          )}
        </div>
      </details>

      {mailTarget && mailTarget.email && (
        <ContactMailModal
          isOpen={Boolean(mailTarget)}
          onClose={() => setMailTarget(null)}
          recipients={[{ name: mailTarget.name, email: mailTarget.email }]}
          defaultSubject={t(`Fråga om mat — ${eventTitle}`, `Food question — ${eventTitle}`)}
          defaultGreeting={t(`Hej ${mailTarget.name}!`, `Hi ${mailTarget.name}!`)}
          defaultBody={t(
            `Vi ville dubbelkolla din mat inför ${eventTitle}. Hör av dig om något behöver ändras.\n\nVarma hälsningar,\nTip the Velvet`,
            `We wanted to double-check your food for ${eventTitle}. Let us know if anything needs to change.\n\nWarmly,\nTip the Velvet`
          )}
        />
      )}
      {bulkMailGroup && (
        <ContactMailModal
          isOpen={Boolean(bulkMailGroup)}
          onClose={() => setBulkMailGroup(null)}
          recipients={bulkMailGroup.people
            .filter((p): p is FoodPerson & { email: string } => Boolean(p.email))
            .map((p) => ({ name: p.name, email: p.email }))}
          defaultSubject={t(`Om maten på ${eventTitle}`, `About the food at ${eventTitle}`)}
          defaultGreeting={t('Hej allihopa!', 'Hi everyone!')}
          defaultBody={t(
            `En snabb fråga om maten inför ${eventTitle} — hör av er om något behöver ändras.\n\nVarma hälsningar,\nTip the Velvet`,
            `A quick question about the food for ${eventTitle} — let us know if anything needs to change.\n\nWarmly,\nTip the Velvet`
          )}
        />
      )}
    </div>
  )
}
