import { useState, useEffect } from 'react'
import { Users, Gift, Drama, CheckCircle2, AlertTriangle, CalendarClock } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useCurrentEvent } from '@/contexts/CurrentEventContext'
import { getStaffVolunteers, getSponsors } from '@/services/contactsService'
import {
  getRecentCastingApplications,
  type CastingApplicationWithEvent,
} from '@/services/applicationService'
import {
  getEventStaffForAdmin,
  getEventActsForAdmin,
  getEventPerformersForAdmin,
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
import { staffRoleLabel, sponsorTypeLabel } from '@/lib/contactLabels'
import { FIXED_STAFF_ROLES } from '@/components/admin/event-plan/constants'
import { formatDate } from '@/lib/utils'
import type { StaffVolunteers, Sponsors, StaffVolunteerType, Todo } from '@/types/types'

interface EventGap {
  eventId: string
  eventTitle: string
  missingRoles: StaffVolunteerType[]
  actsMissingNotes: number
  performersMissingDiet: number
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
  const { upcomingEvents } = useCurrentEvent()
  const [staffVolunteers, setStaffVolunteers] = useState<StaffVolunteers[]>([])
  const [sponsors, setSponsors] = useState<Sponsors[]>([])
  const [castingApplications, setCastingApplications] = useState<CastingApplicationWithEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [eventGaps, setEventGaps] = useState<EventGap[]>([])
  const [gapsLoading, setGapsLoading] = useState(true)
  const [todos, setTodos] = useState<Todo[]>([])

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

  // display_order only matters for tasks with no due_date (see todoService.ts) — appended to
  // the end of that list's existing dateless tasks, so a brand-new (or newly-undated) one
  // doesn't unexpectedly jump to the top of the manual order.
  const nextDatelessOrder = (listTodos: Todo[]): number => {
    const existing = listTodos.filter((td) => !td.due_date).map((td) => td.display_order)
    return existing.length > 0 ? Math.max(...existing) + 1 : 0
  }

  const handleAddTodo = async (
    listTodos: Todo[],
    title: string,
    eventId: string | null,
    dueDate: string | null,
    details: string | null
  ) => {
    const display_order = dueDate ? 0 : nextDatelessOrder(listTodos)
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
    const patch = {
      title,
      due_date: dueDate,
      details,
      ...(dueDate
        ? {}
        : { display_order: nextDatelessOrder(listTodos.filter((td) => td.id !== id)) }),
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
      ...(dueDate
        ? {}
        : { display_order: nextDatelessOrder(listTodos.filter((td) => td.id !== id)) }),
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
  // ever operates on the dateless group — dated tasks don't show arrows at all.
  const handleMoveTodo = async (listTodos: Todo[], id: string, direction: -1 | 1) => {
    const sorted = listTodos
      .filter((td) => !td.is_done && !td.due_date)
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
    const loadGaps = async () => {
      if (!upcomingEventIdsKey) {
        setGapsLoading(false)
        setEventGaps([])
        return
      }
      setGapsLoading(true)
      try {
        const gaps = await Promise.all(
          upcomingEvents.map(async (evt): Promise<EventGap> => {
            const [staff, acts, performersData] = await Promise.all([
              getEventStaffForAdmin(evt.id),
              getEventActsForAdmin(evt.id),
              getEventPerformersForAdmin(evt.id),
            ])
            const missingRoles = FIXED_STAFF_ROLES.filter(
              (role) => !staff.some((r) => r.role === role)
            )
            const actsMissingNotes = acts.filter(
              (a) => !a.stage_preparations && !a.pick_up_cleaning
            ).length
            const performersMissingDiet = performersData.performers.filter(
              (p) => !p.dietary_category
            ).length
            return {
              eventId: evt.id,
              eventTitle: evt.title,
              missingRoles,
              actsMissingNotes,
              performersMissingDiet,
            }
          })
        )
        setEventGaps(
          gaps.filter(
            (g) => g.missingRoles.length > 0 || g.actsMissingNotes > 0 || g.performersMissingDiet > 0
          )
        )
      } catch (err) {
        console.error('Kunde inte hämta eventstatus:', err)
      } finally {
        setGapsLoading(false)
      }
    }
    loadGaps()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upcomingEventIdsKey])

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
        <div className="max-w-3xl mx-auto mt-8 space-y-2">
          <h3 className="font-decorative text-lg text-amber-400 flex items-center justify-center gap-1.5">
            <CalendarClock className="h-4 w-4 shrink-0" />
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

      {!loading && (
        <div className="max-w-3xl mx-auto mt-8 space-y-2">
          <h3 className="font-decorative text-lg text-foreground/90 text-center">
            {t(
              `Nya ansökningar (senaste ${NEW_WINDOW_DAYS} dagarna)`,
              `New applications (last ${NEW_WINDOW_DAYS} days)`
            )}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-1.5 text-sm text-foreground/70">
                <Drama className="h-4 w-4 text-accent/60" />
                {t('Casting', 'Casting')}
                <span className="text-xs font-mono px-2 py-0.5 rounded-full border bg-accent/10 border-accent/30 text-accent">
                  {newCastingApplications.length}
                </span>
              </div>
              {newCastingApplications.length === 0 ? (
                <p className="text-sm text-foreground/40 italic text-center">
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

            <div className="space-y-2">
              <div className="flex items-center justify-center gap-1.5 text-sm text-foreground/70">
                <Users className="h-4 w-4 text-accent/60" />
                {t('Personal & volontärer', 'Staff & volunteers')}
                <span className="text-xs font-mono px-2 py-0.5 rounded-full border bg-accent/10 border-accent/30 text-accent">
                  {newStaff.length}
                </span>
              </div>
              {newStaff.length === 0 ? (
                <p className="text-sm text-foreground/40 italic text-center">
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

            <div className="space-y-2">
              <div className="flex items-center justify-center gap-1.5 text-sm text-foreground/70">
                <Gift className="h-4 w-4 text-accent/60" />
                {t('Sponsorer', 'Sponsors')}
                <span className="text-xs font-mono px-2 py-0.5 rounded-full border bg-accent/10 border-accent/30 text-accent">
                  {newSponsors.length}
                </span>
              </div>
              {newSponsors.length === 0 ? (
                <p className="text-sm text-foreground/40 italic text-center">
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
      )}

      {!gapsLoading && (
        <div className="max-w-3xl mx-auto mt-8 space-y-2">
          <h3 className="font-decorative text-lg text-foreground/90 text-center">
            {t('Vad som återstår för kommande event', "What's left for upcoming events")}
          </h3>

          {eventGaps.length === 0 ? (
            <div className="admin-panel velvet-surface p-3 flex items-center gap-2 text-sm text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {t(
                'Allt klart för kommande event!',
                'Everything is in order for upcoming events!'
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {eventGaps.map((gap) => (
                <div key={gap.eventId} className="admin-panel velvet-surface p-3 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-sm text-foreground font-decorative">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    {gap.eventTitle}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground/60 pl-5">
                    {gap.missingRoles.length > 0 && (
                      <span>
                        {t('Saknas:', 'Missing:')}{' '}
                        {gap.missingRoles.map((role) => staffRoleLabel(t, role)).join(', ')}
                      </span>
                    )}
                    {gap.actsMissingNotes > 0 && (
                      <span>
                        {t(
                          `${gap.actsMissingNotes} akter utan scenanteckningar`,
                          `${gap.actsMissingNotes} acts without stage notes`
                        )}
                      </span>
                    )}
                    {gap.performersMissingDiet > 0 && (
                      <span>
                        {t(
                          `${gap.performersMissingDiet} artister utan matkategori`,
                          `${gap.performersMissingDiet} artists without a food category`
                        )}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!loading && (
        <div className="max-w-3xl mx-auto mt-8 space-y-3">
          <h3 className="font-decorative text-lg text-foreground/90 text-center">
            {t('Att göra', 'To-do')}
          </h3>

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
      )}
    </div>
  )
}
