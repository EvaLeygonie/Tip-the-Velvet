import { useState, useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  Gift,
  Drama,
  CalendarClock,
  UtensilsCrossed,
  Music2,
  CheckCircle2,
} from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useCurrentEvent } from '@/contexts/CurrentEventContext'
import { getStaffVolunteers, getSponsors } from '@/services/contactsService'
import {
  getRecentCastingApplications,
  getApplicationsFromEvent,
  type CastingApplicationWithEvent,
} from '@/services/applicationService'
import {
  getEventStaffForAdmin,
  getEventActsForAdmin,
  getEventPerformersForAdmin,
  getEventPlaylists,
  getEventSponsorsForAdmin,
} from '@/services/eventService'
import type {
  AdminEventPerformerRow,
  AdminEventActRow,
  AdminEventStaffRow,
  AdminEventSponsorRow,
  EventPlaylists,
} from '@/services/eventService'
import {
  getTodos,
  createTodo,
  setTodoDone,
  updateTodo,
  setTodoOrder,
  deleteTodo,
} from '@/services/todoService'
import { TodoListCard } from '@/components/admin/dashboard/TodoListCard'
import { EventHighlightCard } from '@/components/admin/dashboard/EventHighlightCard'
import { ContactMailModal, type MailRecipient } from '@/components/admin/contacts/ContactMailModal'
import { missingMusicItems } from '@/components/admin/event-plan/musicCoverage'
import { FIXED_STAFF_ROLES, PRIZE_SLOT_COUNT } from '@/components/admin/event-plan/constants'
import type { EventPlanTab } from '@/components/admin/event-plan/EventProgressOverview'
import { groupStaffRowsByPerson } from '@/lib/staffRowGrouping'
import { staffRoleLabel, sponsorTypeLabel } from '@/lib/contactLabels'
import { formatDate } from '@/lib/utils'
import type { StaffVolunteers, Sponsors, Todo, CastingApplicationWithActs } from '@/types/types'

// Just what the Dashboard's own highlight cards need per event — deliberately narrower than
// the Event Plan page's own full status strip (which this used to reuse wholesale). Direct
// feedback 2026-09-21: showing the exact same cards twice was redundant; the Dashboard's job
// is to flag that something needs attention, not restate the whole breakdown.
interface EventOverviewData {
  eventId: string
  eventTitle: string
  hasCastingCall: boolean
  performers: AdminEventPerformerRow[]
  acts: AdminEventActRow[]
  staffRows: AdminEventStaffRow[]
  sponsorRows: AdminEventSponsorRow[]
  playlists: EventPlaylists
  applications: CastingApplicationWithActs[]
}

interface EmailTarget {
  recipients: MailRecipient[]
  defaultSubject: string
  defaultGreeting: string
  defaultBody: string
}

const NEW_WINDOW_DAYS = 7

// created_at is the only timestamp either table has — no reviewed/seen flag exists yet, so
// "new" is a plain rolling window rather than "since you last looked."
const isRecent = (createdAt: string): boolean => {
  const cutoff = Date.now() - NEW_WINDOW_DAYS * 24 * 60 * 60 * 1000
  return new Date(createdAt).getTime() >= cutoff
}

// Module-level (not inline in the component body) so the render body never calls the
// impure Date constructor/Date.now() directly — same reasoning as isRecent above.
const isOverdue = (dueDate: string): boolean => dueDate < new Date().toISOString().slice(0, 10)
const isDueSoon = (dueDate: string): boolean => {
  const weekOut = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  return dueDate <= weekOut
}

export const AdminDashboard = () => {
  const { t, language } = useLanguage()
  const navigate = useNavigate()
  const { upcomingEvents, setSelectedEventId } = useCurrentEvent()
  const [staffVolunteers, setStaffVolunteers] = useState<StaffVolunteers[]>([])
  const [sponsors, setSponsors] = useState<Sponsors[]>([])
  const [castingApplications, setCastingApplications] = useState<CastingApplicationWithEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [eventOverviews, setEventOverviews] = useState<EventOverviewData[]>([])
  const [eventOverviewsLoading, setEventOverviewsLoading] = useState(true)
  const [todos, setTodos] = useState<Todo[]>([])
  const [emailTarget, setEmailTarget] = useState<EmailTarget | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [staff, sponsorRows, castingRows, todoRows] = await Promise.all([
          getStaffVolunteers(),
          getSponsors(),
          getRecentCastingApplications(),
          getTodos(),
        ])
        setStaffVolunteers(staff)
        setSponsors(sponsorRows)
        setCastingApplications(castingRows)
        setTodos(todoRows)
      } catch (err) {
        console.error('Kunde inte hämta nya ansökningar:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // display_order only breaks ties within tasks that share the same due_date (including
  // "no date" as its own shared value) — appended to the end of that specific group's
  // existing tasks, so a brand-new (or newly-moved) one doesn't unexpectedly jump to the
  // front. Tasks on different dates never compete for order at all; the date itself decides
  // that. Direct feedback 2026-09-21: event-related tasks that all share the event's date
  // needed a way to be manually ordered against each other too, not just dateless ones.
  const nextOrderInGroup = (listTodos: Todo[], dueDate: string | null): number => {
    const existing = listTodos.filter((td) => td.due_date === dueDate).map((td) => td.display_order)
    return existing.length > 0 ? Math.max(...existing) + 1 : 0
  }

  const handleAddTodo = async (
    listTodos: Todo[],
    title: string,
    eventId: string | null,
    dueDate: string | null,
    details: string | null
  ) => {
    const display_order = nextOrderInGroup(listTodos, dueDate)
    const created = await createTodo({
      title,
      event_id: eventId,
      due_date: dueDate,
      details,
      display_order,
    })
    setTodos((prev) => [...prev, created])
  }
  const handleEditTodo = async (
    listTodos: Todo[],
    id: string,
    title: string,
    dueDate: string | null,
    details: string | null
  ) => {
    const original = listTodos.find((td) => td.id === id)
    const others = listTodos.filter((td) => td.id !== id)
    const patch = {
      title,
      due_date: dueDate,
      details,
      // Only re-slotted when the date itself actually changed — editing just the title/
      // details of a task you've already manually positioned shouldn't silently move it.
      ...(original?.due_date !== dueDate
        ? { display_order: nextOrderInGroup(others, dueDate) }
        : {}),
    }
    await updateTodo(id, patch)
    setTodos((prev) => prev.map((td) => (td.id === id ? { ...td, ...patch } : td)))
  }
  const handleToggleTodo = async (id: string, isDone: boolean) => {
    await setTodoDone(id, isDone)
    setTodos((prev) => prev.map((td) => (td.id === id ? { ...td, is_done: isDone } : td)))
  }
  const handleSetTodoDueDate = async (listTodos: Todo[], id: string, dueDate: string | null) => {
    const patch = {
      due_date: dueDate,
      display_order: nextOrderInGroup(
        listTodos.filter((td) => td.id !== id),
        dueDate
      ),
    }
    await updateTodo(id, patch)
    setTodos((prev) => prev.map((td) => (td.id === id ? { ...td, ...patch } : td)))
  }
  const handleDeleteTodo = async (id: string) => {
    await deleteTodo(id)
    setTodos((prev) => prev.filter((td) => td.id !== id))
  }

  // Scoped to whichever list (one event's tasks, or the org-wide ones) the arrow was clicked
  // in — the caller passes that list's own already-filtered todos, same idea as
  // handleMoveAct on the Show Planning tab swapping two adjacent display_order values. Only
  // ever swaps within tasks sharing the same due_date as the one being moved (dated tasks on
  // different dates never show arrows toward each other at all — see TodoListCard).
  const handleMoveTodo = async (listTodos: Todo[], id: string, direction: -1 | 1) => {
    const target = listTodos.find((td) => td.id === id)
    if (!target) return
    const sorted = listTodos
      .filter((td) => !td.is_done && td.due_date === target.due_date)
      .sort((a, b) => a.display_order - b.display_order)
    const index = sorted.findIndex((td) => td.id === id)
    const otherIndex = index + direction
    if (index === -1 || otherIndex < 0 || otherIndex >= sorted.length) return
    const a = sorted[index]
    const b = sorted[otherIndex]
    try {
      await Promise.all([setTodoOrder(a.id, b.display_order), setTodoOrder(b.id, a.display_order)])
      setTodos((prev) =>
        prev.map((td) => {
          if (td.id === a.id) return { ...td, display_order: b.display_order }
          if (td.id === b.id) return { ...td, display_order: a.display_order }
          return td
        })
      )
    } catch (err) {
      console.error('Kunde inte ändra ordning:', err)
    }
  }

  // Overdue or due within a week — the same threshold TodoListCard's own per-item coloring
  // uses — surfaced together at the very top of the page regardless of which list (org-wide
  // or a specific event) a task belongs to, per direct feedback: an admin shouldn't have to
  // open the dashboard and separately scan every list to notice something's due soon.
  const upcomingDeadlines = todos
    .filter((td) => !td.is_done && td.due_date)
    .filter((td) => isDueSoon(td.due_date as string))
    .sort((a, b) => (a.due_date as string).localeCompare(b.due_date as string))

  // A plain string key, not the upcomingEvents array itself, as the effect dependency — the
  // array is a fresh reference every render from CurrentEventContext, which would otherwise
  // refetch every event's staff/acts/performers on every render.
  const upcomingEventIdsKey = upcomingEvents.map((e) => e.id).join(',')

  useEffect(() => {
    const loadOverviews = async () => {
      if (!upcomingEventIdsKey) {
        setEventOverviewsLoading(false)
        setEventOverviews([])
        return
      }
      setEventOverviewsLoading(true)
      try {
        const overviews = await Promise.all(
          upcomingEvents.map(async (evt): Promise<EventOverviewData> => {
            const [performersData, acts, staffRows, playlists, sponsorRows, applications] =
              await Promise.all([
                getEventPerformersForAdmin(evt.id),
                getEventActsForAdmin(evt.id),
                getEventStaffForAdmin(evt.id),
                getEventPlaylists(evt.id),
                getEventSponsorsForAdmin(evt.id),
                evt.has_casting_call ? getApplicationsFromEvent(evt.id) : Promise.resolve([]),
              ])
            return {
              eventId: evt.id,
              eventTitle: evt.title,
              hasCastingCall: evt.has_casting_call,
              performers: performersData.performers,
              acts,
              staffRows,
              sponsorRows,
              playlists,
              applications,
            }
          })
        )
        setEventOverviews(overviews)
      } catch (err) {
        console.error('Kunde inte hämta eventöversikt:', err)
      } finally {
        setEventOverviewsLoading(false)
      }
    }
    loadOverviews()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upcomingEventIdsKey])

  // Deep-links straight to the tab that actually shows the detail behind a highlight card,
  // rather than always landing on the default Bemanning tab — see AdminEventPlan.tsx's own
  // useLocation read of this state.
  const goToEventPlan = (eventId: string, tab: EventPlanTab) => {
    setSelectedEventId(eventId)
    navigate('/admin/event-plan', { state: { tab } })
  }
  const goToCasting = (eventId: string) => {
    setSelectedEventId(eventId)
    navigate('/admin/casting')
  }

  // The stage-notes reminder goes out to performers only — no one else fills those in. Bulk-
  // sent individually to each recipient via ContactMailModal, same as everywhere else in the
  // app.
  const handleEmailMissingNotes = (ov: EventOverviewData) => {
    const performerIdsMissingNotes = new Set(
      ov.acts.filter((a) => !a.stage_preparations && !a.pick_up_cleaning).map((a) => a.performer_id)
    )
    const recipients: MailRecipient[] = ov.performers
      .filter((p) => performerIdsMissingNotes.has(p.performer_id) && p.performer.email)
      .map((p) => ({ name: p.performer.performer_name, email: p.performer.email as string }))
    setEmailTarget({
      recipients,
      defaultSubject: t(`Scenanteckningar — ${ov.eventTitle}`, `Stage notes — ${ov.eventTitle}`),
      defaultGreeting: t('Hej!', 'Hi!'),
      defaultBody: t(
        'Vi saknar fortfarande dina scenanteckningar (ljud, ljus & scenkrav) inför showen — kan du fylla i dem så snart som möjligt via din bokningslänk?\n\nVarma hälsningar,\nTip the Velvet',
        "We're still missing your stage notes (sound, lighting & stage requirements) for the show — could you fill them in as soon as possible via your booking link?\n\nWarmly,\nTip the Velvet"
      ),
    })
  }
  // Now covers staff/volunteers needing food as well as performers — direct feedback
  // 2026-09-21 that the count already did, but the email target didn't.
  const handleEmailMissingFood = (ov: EventOverviewData) => {
    const performerRecipients: MailRecipient[] = ov.performers
      .filter((p) => !p.dietary_category && p.performer.email)
      .map((p) => ({ name: p.performer.performer_name, email: p.performer.email as string }))
    const staffRecipients: MailRecipient[] = groupStaffRowsByPerson(ov.staffRows)
      .filter((p) => p.needs_food && !p.dietary_category && p.staff.email)
      .map((p) => ({ name: p.staff.name, email: p.staff.email as string }))
    const recipients = [...performerRecipients, ...staffRecipients]
    setEmailTarget({
      recipients,
      defaultSubject: t(`Matpreferenser — ${ov.eventTitle}`, `Food preferences — ${ov.eventTitle}`),
      defaultGreeting: t('Hej!', 'Hi!'),
      defaultBody: t(
        'Vi saknar fortfarande din matpreferens inför showen — kan du fylla i den så snart som möjligt via din bokningslänk?\n\nVarma hälsningar,\nTip the Velvet',
        "We're still missing your food preference for the show — could you fill it in as soon as possible via your booking link?\n\nWarmly,\nTip the Velvet"
      ),
    })
  }

  const newStaff = staffVolunteers
    .filter((row) => isRecent(row.created_at))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
  const newSponsors = sponsors
    .filter((row) => isRecent(row.created_at))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
  const newCastingApplications = castingApplications
    .filter((row) => isRecent(row.created_at))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))

  return (
    <div className="page-shell">
      <div className="bg-glow-spot" />
      <h1>Dashboard</h1>
      <div className="gold-divider" />

      {!loading && upcomingDeadlines.length > 0 && (
        <div className="max-w-5xl mx-auto mt-8 space-y-2">
          <h3 className="font-decorative text-2xl text-amber-400 flex items-center justify-center gap-2">
            <CalendarClock className="h-5 w-5 shrink-0" />
            {t('Deadlines inom en vecka', 'Deadlines within a week')}
          </h3>
          <div className="space-y-1.5">
            {upcomingDeadlines.map((todo) => {
              const eventTitle = todo.event_id
                ? (upcomingEvents.find((e) => e.id === todo.event_id)?.title ?? null)
                : null
              const overdue = isOverdue(todo.due_date as string)
              return (
                <div
                  key={todo.id}
                  className={`admin-panel velvet-surface p-2.5 flex items-center gap-2 text-sm border ${
                    overdue ? 'border-red-500/40' : 'border-amber-500/30'
                  }`}
                >
                  <span className="flex-1 min-w-0 truncate text-foreground">{todo.title}</span>
                  <span className="text-accent italic text-xs shrink-0 truncate max-w-[100px]">
                    {eventTitle ?? t('Organisationen', 'Organization')}
                  </span>
                  <span
                    className={`text-xs font-mono shrink-0 ${
                      overdue ? 'text-red-400' : 'text-amber-400'
                    }`}
                  >
                    {formatDate(language, todo.due_date)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!eventOverviewsLoading && eventOverviews.length > 0 && (
        <div className="max-w-5xl mx-auto mt-8 space-y-6">
          {eventOverviews.map((ov) => {
            const missingNotesCount = new Set(
              ov.acts
                .filter((a) => !a.stage_preparations && !a.pick_up_cleaning)
                .map((a) => a.performer_id)
            ).size
            // Performers plus staff/volunteers who need food but have no dietary category yet
            // — same headcount EventProgressOverview's own "Mat" card uses. Direct feedback
            // 2026-09-21: this card only ever counted artists, not the staff side too.
            const groupedStaff = groupStaffRowsByPerson(ov.staffRows)
            const missingFoodCount =
              ov.performers.filter((p) => !p.dietary_category).length +
              groupedStaff.filter((p) => p.needs_food && !p.dietary_category).length
            const missingMusic = missingMusicItems(t, ov.staffRows, {
              hasBeforePlaylist: Boolean(ov.playlists.before_playlist?.trim()),
              hasIntermissionPlaylist: Boolean(ov.playlists.intermission_playlist?.trim()),
              hasAfterpartyPlaylist: Boolean(ov.playlists.afterparty_playlist?.trim()),
            })
            const missingRoles = FIXED_STAFF_ROLES.filter(
              (role) => !ov.staffRows.some((r) => r.role === role)
            )
            const missingSponsorSlots = Math.max(
              0,
              PRIZE_SLOT_COUNT - ov.sponsorRows.filter((r) => r.role === 'prize').length
            )
            // One generic "unfinished casting business" flag rather than a breakdown —
            // direct feedback 2026-09-21: the specific reason doesn't need to show on the
            // Dashboard, just that the Casting page has something to look at. True while
            // either some applications still haven't been reviewed, or some "yes"
            // applications haven't been resolved to confirmed/declined yet. Only checked at
            // all for events actually running an open casting call (hasCastingCall) —
            // nothing to review otherwise.
            const needsCastingAttention =
              ov.hasCastingCall &&
              (ov.applications.some((a) => a.review_status === 'pending') ||
                ov.applications.some(
                  (a) =>
                    a.review_status === 'yes' &&
                    a.booking_status !== 'confirmed' &&
                    a.booking_status !== 'declined'
                ))

            // Only ever cards for something actually missing — an event with nothing
            // outstanding shows one plain confirmation line instead of a wall of green
            // checkmarks. Direct feedback 2026-09-21.
            const cards: {
              key: string
              label: string
              value: string
              icon: ReactNode
              onClick: () => void
              onEmailAll?: () => void
              emailTitle?: string
            }[] = []
            if (needsCastingAttention) {
              cards.push({
                key: 'casting',
                label: t('Casting', 'Casting'),
                value: t('Kräver uppmärksamhet', 'Needs attention'),
                icon: <Drama className="h-4 w-4 shrink-0" />,
                onClick: () => goToCasting(ov.eventId),
              })
            }
            if (missingNotesCount > 0) {
              cards.push({
                key: 'notes',
                label: t('Scenanteckningar', 'Stage notes'),
                value: t(`Saknas: ${missingNotesCount} artister`, `Missing: ${missingNotesCount} artists`),
                icon: <Drama className="h-4 w-4 shrink-0" />,
                onClick: () => goToEventPlan(ov.eventId, 'show'),
                onEmailAll: () => handleEmailMissingNotes(ov),
                emailTitle: t('Mejla berörda artister', 'Email affected artists'),
              })
            }
            if (missingFoodCount > 0) {
              cards.push({
                key: 'food',
                label: t('Matpreferenser', 'Food preferences'),
                value: t(`Saknas: ${missingFoodCount} personer`, `Missing: ${missingFoodCount} people`),
                icon: <UtensilsCrossed className="h-4 w-4 shrink-0" />,
                onClick: () => goToEventPlan(ov.eventId, 'food'),
                onEmailAll: () => handleEmailMissingFood(ov),
                emailTitle: t('Mejla berörda personer', 'Email affected people'),
              })
            }
            if (missingMusic.length > 0) {
              cards.push({
                key: 'music',
                label: t('Musik', 'Music'),
                value: t(`Saknas: ${missingMusic.length}`, `Missing: ${missingMusic.length}`),
                icon: <Music2 className="h-4 w-4 shrink-0" />,
                onClick: () => goToEventPlan(ov.eventId, 'staff'),
              })
            }
            if (missingRoles.length > 0) {
              cards.push({
                key: 'roles',
                label: t('Nyckelroller', 'Key roles'),
                value: t(`Saknas: ${missingRoles.length}`, `Missing: ${missingRoles.length}`),
                icon: <Users className="h-4 w-4 shrink-0" />,
                onClick: () => goToEventPlan(ov.eventId, 'staff'),
              })
            }
            if (missingSponsorSlots > 0) {
              cards.push({
                key: 'sponsors',
                label: t('Sponsorer', 'Sponsors'),
                value: t(`Saknas: ${missingSponsorSlots}`, `Missing: ${missingSponsorSlots}`),
                icon: <Gift className="h-4 w-4 shrink-0" />,
                onClick: () => goToEventPlan(ov.eventId, 'sponsors'),
              })
            }

            return (
              <div key={ov.eventId} className="space-y-2">
                <h2 className="font-decorative text-2xl text-accent text-center whitespace-nowrap">
                  {ov.eventTitle}
                </h2>
                {cards.length === 0 ? (
                  <div className="admin-panel velvet-surface p-3 flex items-center justify-center gap-2 text-sm text-emerald-400">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    {t('Allt klart!', 'All set!')}
                  </div>
                ) : (
                  <div className="flex flex-wrap justify-center gap-2">
                    {cards.map(({ key, ...card }) => (
                      <EventHighlightCard key={key} {...card} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {!loading && (
        <div className="max-w-5xl mx-auto mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className="space-y-3">
            <h2 className="font-decorative text-2xl text-accent text-center whitespace-nowrap">
              {t('Att göra', 'To-do')}
            </h2>

            {upcomingEvents.map((evt) => {
              const listTodos = todos.filter((td) => td.event_id === evt.id)
              return (
                <TodoListCard
                  key={evt.id}
                  title={evt.title}
                  todos={listTodos}
                  onAdd={(title, dueDate, details) =>
                    handleAddTodo(listTodos, title, evt.id, dueDate, details)
                  }
                  onEdit={(id, title, dueDate, details) =>
                    handleEditTodo(listTodos, id, title, dueDate, details)
                  }
                  onToggle={handleToggleTodo}
                  onSetDueDate={(id, dueDate) => handleSetTodoDueDate(listTodos, id, dueDate)}
                  onMoveUp={(id) => handleMoveTodo(listTodos, id, -1)}
                  onMoveDown={(id) => handleMoveTodo(listTodos, id, 1)}
                  onDelete={handleDeleteTodo}
                />
              )
            })}

            {(() => {
              const orgTodos = todos.filter((td) => !td.event_id)
              return (
                <TodoListCard
                  title={t('Organisationen', 'Organization')}
                  todos={orgTodos}
                  onAdd={(title, dueDate, details) =>
                    handleAddTodo(orgTodos, title, null, dueDate, details)
                  }
                  onEdit={(id, title, dueDate, details) =>
                    handleEditTodo(orgTodos, id, title, dueDate, details)
                  }
                  onToggle={handleToggleTodo}
                  onSetDueDate={(id, dueDate) => handleSetTodoDueDate(orgTodos, id, dueDate)}
                  onMoveUp={(id) => handleMoveTodo(orgTodos, id, -1)}
                  onMoveDown={(id) => handleMoveTodo(orgTodos, id, 1)}
                  onDelete={handleDeleteTodo}
                />
              )
            })()}
          </div>

          <div className="space-y-3">
            <h2 className="font-decorative text-2xl text-accent text-center whitespace-nowrap">
              {t('Nya ansökningar', 'New applications')}
            </h2>

            <div className="admin-panel velvet-surface p-4 space-y-5">
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-sm text-foreground/70">
                  <Drama className="h-4 w-4 text-accent/60" />
                  {t('Casting', 'Casting')}
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full border bg-accent/10 border-accent/30 text-accent ml-auto">
                    {newCastingApplications.length}
                  </span>
                </div>
                {newCastingApplications.length === 0 ? (
                  <p className="text-sm text-foreground/40 italic text-left">
                    {t('Inga nya ännu.', 'None yet.')}
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {newCastingApplications.map((row) => (
                      <div
                        key={row.id}
                        className="admin-panel velvet-surface p-2.5 flex items-center gap-2 text-sm"
                      >
                        <span className="flex-1 min-w-0 truncate text-foreground">
                          {row.performer_name}
                        </span>
                        {row.event && (
                          <span className="text-accent italic text-xs shrink-0 truncate max-w-[100px]">
                            {row.event.title}
                          </span>
                        )}
                        <span className="text-foreground/40 text-xs shrink-0">
                          {formatDate(language, row.created_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-3 border-t border-accent/10">
                <div className="flex items-center gap-1.5 text-sm text-foreground/70">
                  <Users className="h-4 w-4 text-accent/60" />
                  {t('Personal & volontärer', 'Staff & volunteers')}
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full border bg-accent/10 border-accent/30 text-accent ml-auto">
                    {newStaff.length}
                  </span>
                </div>
                {newStaff.length === 0 ? (
                  <p className="text-sm text-foreground/40 italic text-left">
                    {t('Inga nya ännu.', 'None yet.')}
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {newStaff.map((row) => (
                      <div
                        key={row.id}
                        className="admin-panel velvet-surface p-2.5 flex items-center gap-2 text-sm"
                      >
                        <span className="flex-1 min-w-0 truncate text-foreground">{row.name}</span>
                        <span className="text-accent italic text-xs shrink-0">
                          {staffRoleLabel(t, row.role)}
                        </span>
                        <span className="text-foreground/40 text-xs shrink-0">
                          {formatDate(language, row.created_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-3 border-t border-accent/10">
                <div className="flex items-center gap-1.5 text-sm text-foreground/70">
                  <Gift className="h-4 w-4 text-accent/60" />
                  {t('Sponsorer', 'Sponsors')}
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full border bg-accent/10 border-accent/30 text-accent ml-auto">
                    {newSponsors.length}
                  </span>
                </div>
                {newSponsors.length === 0 ? (
                  <p className="text-sm text-foreground/40 italic text-left">
                    {t('Inga nya ännu.', 'None yet.')}
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {newSponsors.map((row) => (
                      <div
                        key={row.id}
                        className="admin-panel velvet-surface p-2.5 flex items-center gap-2 text-sm"
                      >
                        <span className="flex-1 min-w-0 truncate text-foreground">{row.name}</span>
                        {row.sponsor_type && (
                          <span className="text-accent italic text-xs shrink-0">
                            {sponsorTypeLabel(t, row.sponsor_type)}
                          </span>
                        )}
                        <span className="text-foreground/40 text-xs shrink-0">
                          {formatDate(language, row.created_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <ContactMailModal
        isOpen={emailTarget !== null}
        onClose={() => setEmailTarget(null)}
        recipients={emailTarget?.recipients ?? []}
        defaultSubject={emailTarget?.defaultSubject ?? ''}
        defaultGreeting={emailTarget?.defaultGreeting ?? ''}
        defaultBody={emailTarget?.defaultBody ?? ''}
      />
    </div>
  )
}
