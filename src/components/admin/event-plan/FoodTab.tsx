import { useState } from 'react'
import { Mail, Send, UtensilsCrossed, TriangleAlert, X } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { dietaryCategoryLabel } from '@/lib/contactLabels'
import {
  buildFoodRoster,
  foodPriorityRank,
  foodSubtitle,
  staffFoodPriorityRank,
  type FoodPerson,
} from '@/lib/foodRoster'
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
  onUpdatePerformerDietaryNotes: (performerId: string, notes: string | null) => void
  onUpdatePerformerNeedsFood: (performerId: string, needsFood: boolean) => void
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
  onUpdatePerformerDietaryNotes,
  onUpdatePerformerNeedsFood,
  onStaffFoodUpdated,
  onOrganizerFoodUpdated,
}: FoodTabProps) => {
  const { t } = useLanguage()
  // Which person lists are open — the summary counts above open their list when clicked.
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set())
  const setGroupOpen = (key: string, open: boolean) =>
    setOpenGroups((prev) => {
      const next = new Set(prev)
      if (open) next.add(key)
      else next.delete(key)
      return next
    })
  const [mailTarget, setMailTarget] = useState<FoodPerson | null>(null)
  const [bulkMailGroup, setBulkMailGroup] = useState<{
    label: string
    people: FoodPerson[]
  } | null>(null)

  const roster = buildFoodRoster(t, performers, groupedStaff, organizers)
  // Everyone flagged needs_food = false (performers default to true; staff/organizers to
  // false) — merged into one list of {id, name, kind} so they share the same re-add button.
  const notEating = [
    ...performers
      .filter((p) => !p.needs_food)
      .map((p) => ({
        id: p.performer_id,
        name: p.performer.performer_name,
        subtitle: t('Artist', 'Artist'),
        rank: foodPriorityRank('performer'),
        kind: 'performer' as const,
      })),
    ...groupedStaff
      .filter((p) => !p.needs_food)
      .map((p) => ({
        id: p.staff.id,
        name: p.staff.name,
        subtitle: foodSubtitle(t, p.rows),
        rank: staffFoodPriorityRank(p.rows),
        kind: 'staff' as const,
      })),
    ...organizers
      .filter((o) => !o.needs_food)
      .map((o) => ({
        id: o.staff_id,
        name: o.staff.name,
        subtitle: t('Arrangör', 'Organizer'),
        rank: foodPriorityRank('organizer'),
        kind: 'organizer' as const,
      })),
  ].sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name))
  // Identical notes (ignoring case/whitespace) collapse into one badge with a count.
  const noteBadgesFor = (people: FoodPerson[]) =>
    Array.from(
      people
        .filter((p) => p.notes && p.notes.trim())
        .reduce((map, p) => {
          const text = p.notes!.trim()
          const key = text.toLowerCase().replace(/\s+/g, ' ')
          const existing = map.get(key)
          if (existing) existing.count += 1
          else map.set(key, { key, text, count: 1 })
          return map
        }, new Map<string, { key: string; text: string; count: number }>())
        .values()
    )

  const byCategory = (cat: DietaryCategory) => roster.filter((p) => p.category === cat)
  const uncategorized = roster.filter((p) => !p.category)

  const setNeedsFood = (kind: 'performer' | 'staff' | 'organizer', id: string, value: boolean) =>
    kind === 'performer'
      ? onUpdatePerformerNeedsFood(id, value)
      : foodUpdateFor(kind)(id, { needs_food: value })

  const foodUpdateFor = (kind: 'staff' | 'organizer') =>
    kind === 'organizer' ? onOrganizerFoodUpdated : onStaffFoodUpdated

  const setCategory = (person: FoodPerson, category: DietaryCategory) => {
    if (person.kind === 'performer' && person.performerId) {
      onUpdatePerformerDietary(person.performerId, category)
    } else if ((person.kind === 'staff' || person.kind === 'organizer') && person.staffId) {
      foodUpdateFor(person.kind)(person.staffId, { dietary_category: category })
    }
  }

  const setNotes = (person: FoodPerson, notes: string) => {
    const value = notes.trim() || null
    if (person.kind === 'performer' && person.performerId) {
      if (value !== (person.notes?.trim() || null)) {
        onUpdatePerformerDietaryNotes(person.performerId, value)
      }
    } else if ((person.kind === 'staff' || person.kind === 'organizer') && person.staffId) {
      foodUpdateFor(person.kind)(person.staffId, { dietary_notes: value })
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
      {/* Order sheet: total + uncategorized warning on top, then one column per diet (big
          count, label, allergy badges) — for ordering, nobody needs to know *who*, just what.
          Anyone not categorised yet is flagged, since they can't be counted into a kind. */}
      <div className="admin-panel velvet-surface overflow-hidden">
        <div className="relative flex flex-wrap items-center justify-center gap-3 p-4 border-b border-accent/10">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <UtensilsCrossed className="h-4 w-4 text-accent/60 shrink-0" />
            {t(`${roster.length} personer behöver mat`, `${roster.length} people need food`)}
          </div>
          {uncategorized.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setGroupOpen('uncategorized', true)
                document
                  .getElementById('food-group-uncategorized')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-amber-500/40 text-amber-400 sm:absolute sm:right-4 sm:top-1/2 sm:-translate-y-1/2"
            >
              <TriangleAlert className="h-3.5 w-3.5" />
              {t(
                `${uncategorized.length} ej kategoriserade`,
                `${uncategorized.length} uncategorized`
              )}
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-accent/10">
          {CATEGORY_ORDER.map((cat) => {
            const people = byCategory(cat)
            const badges = noteBadgesFor(people)
            return (
              <div key={cat} className="p-4 space-y-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setGroupOpen(cat, true)
                    document
                      .getElementById(`food-group-${cat}`)
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                  title={t('Visa personerna', 'Show the people')}
                  className="group block w-full"
                >
                  <span className="block font-decorative text-3xl text-accent leading-none">
                    {people.length}
                  </span>
                  <span className="block mt-1.5 text-[11px] uppercase tracking-widest text-foreground/70 group-hover:text-accent">
                    {dietaryCategoryLabel(t, cat)}
                  </span>
                </button>
                {badges.length > 0 && (
                  <ul className="flex flex-wrap justify-center gap-1.5">
                    {badges.map((b) => (
                      <li
                        key={b.key}
                        className="text-xs text-foreground/80 bg-black/30 border border-accent/10 rounded-full px-2.5 py-1"
                      >
                        {b.text}
                        {b.count > 1 && <span className="text-accent ml-1">x{b.count}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
        {noteBadgesFor(uncategorized).length > 0 && (
          <div className="p-4 space-y-1.5 text-center border-t border-amber-500/20">
            <div className="text-sm text-amber-400">
              {t('Ej kategoriserade – anteckningar', 'Uncategorized – notes')}
            </div>
            <ul className="flex flex-wrap justify-center gap-1.5">
              {noteBadgesFor(uncategorized).map((b) => (
                <li
                  key={b.key}
                  className="text-xs text-foreground/80 bg-black/30 border border-amber-500/20 rounded-full px-2.5 py-1"
                >
                  {b.text}
                  {b.count > 1 && <span className="text-accent ml-1">x{b.count}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {groups.map((group) => {
        const emailable = group.people.filter((p) => p.email)
        return (
          <details
            key={group.key}
            id={`food-group-${group.key}`}
            open={openGroups.has(group.key)}
            onToggle={(e) => setGroupOpen(group.key, e.currentTarget.open)}
            className="group"
          >
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
                    {/* Grouped into 2 flex items (identity, controls) instead of 5 loose ones
                        — flex-wrap can only ever split a row across as many lines as it has
                        top-level items, so this caps it at 2 lines no matter how narrow the
                        panel is, instead of each of the 5 wrapping onto its own line
                        unpredictably (what was producing 3 lines before). Direct feedback
                        2026-10-07. */}
                    <div className="flex flex-col min-w-[90px] flex-1">
                      <span className="truncate">{person.name}</span>
                      <span className="text-accent/70 italic text-xs truncate">
                        {person.subtitle}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <DietaryCategoryPicker
                        value={person.category}
                        onChange={(value) => setCategory(person, value)}
                        className="shrink-0"
                      />
                      {/* Editable for everyone, performers included (their value originates in the
                          artist's booking form, but the board often needs to clear things like
                          "none"). w-40 + max-w-40 both: Safari lets an input's intrinsic size win
                          over `width` in a flex row, max-width clamps it. */}
                      <input
                        key={person.notes ?? ''}
                        type="text"
                        defaultValue={person.notes ?? ''}
                        onBlur={(e) => setNotes(person, e.target.value)}
                        placeholder={t('Allergier etc.', 'Allergies etc.')}
                        className="w-40 max-w-40 shrink-0 velvet-input-sm"
                      />
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
                      {(person.performerId ?? person.staffId) && (
                        <button
                          type="button"
                          onClick={() =>
                            setNeedsFood(
                              person.kind,
                              (person.performerId ?? person.staffId)!,
                              false
                            )
                          }
                          title={t('Behöver inte mat', "Doesn't need food")}
                          className="text-accent/60 hover:text-accent shrink-0"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
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
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="truncate">{person.name}</span>
                  <span className="text-accent/70 italic text-xs truncate">{person.subtitle}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setNeedsFood(person.kind, person.id, true)}
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
          recipients={[
            { name: mailTarget.name, email: mailTarget.email, language: mailTarget.language },
          ]}
          defaultSv={{
            subject: `Fråga om mat — ${eventTitle}`,
            greeting: 'Hej {name}!',
            body: `Vi ville dubbelkolla din mat inför ${eventTitle}. Hör av dig om något behöver ändras.\n\nVarma hälsningar,\nTip the Velvet`,
          }}
          defaultEng={{
            subject: `Food question — ${eventTitle}`,
            greeting: 'Hi {name}!',
            body: `We wanted to double-check your food for ${eventTitle}. Let us know if anything needs to change.\n\nWarmly,\nTip the Velvet`,
          }}
        />
      )}
      {bulkMailGroup && (
        <ContactMailModal
          isOpen={Boolean(bulkMailGroup)}
          onClose={() => setBulkMailGroup(null)}
          recipients={bulkMailGroup.people
            .filter((p): p is FoodPerson & { email: string } => Boolean(p.email))
            .map((p) => ({ name: p.name, email: p.email, language: p.language }))}
          defaultSv={{
            subject: `Om maten på ${eventTitle}`,
            greeting: 'Hej allihopa!',
            body: `En snabb fråga om maten inför ${eventTitle} — hör av er om något behöver ändras.\n\nVarma hälsningar,\nTip the Velvet`,
          }}
          defaultEng={{
            subject: `About the food at ${eventTitle}`,
            greeting: 'Hi everyone!',
            body: `A quick question about the food for ${eventTitle} — let us know if anything needs to change.\n\nWarmly,\nTip the Velvet`,
          }}
        />
      )}
    </div>
  )
}
