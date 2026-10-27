import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import QRCode from 'qrcode'
import {
  Plus,
  X,
  Copy,
  Download,
  Eye,
  EyeOff,
  ListPlus,
  Quote,
  Trash2,
  CheckCheck,
} from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useCurrentEvent } from '@/contexts/CurrentEventContext'
import { useConfirm } from '@/contexts/ConfirmContext'
import { EventPicker } from '@/components/admin/EventPicker'
import { StarRating } from '@/components/feedback/StarRating'
import { createTodo } from '@/services/todoService'
import {
  aspectsForEvent,
  archiveCustomAspect,
  createCustomAspect,
  listAllCustomAspects,
  removeAspectFromUpcomingEvents,
  deleteFeedback,
  getFeedbackSettings,
  listAllRatings,
  listFeedback,
  updateFeedback,
  updateFeedbackSettings,
  type EventRatingRow,
  type FeedbackEvent,
  type FeedbackMode,
  type FeedbackRow,
  feedbackLink,
} from '@/services/feedbackService'
import {
  FEEDBACK_ASPECTS,
  HOW_FOUND_OPTIONS,
  resolveAspect,
  type CustomAspect,
} from '@/lib/feedbackAspects'

type CommentFilter = 'all' | 'improve' | 'liked' | 'open'

const average = (nums: number[]) =>
  nums.length ? nums.reduce((sum, n) => sum + n, 0) / nums.length : 0

export const AdminFeedback = () => {
  const { t } = useLanguage()
  const confirm = useConfirm()
  const { selectedEventId, events } = useCurrentEvent()
  const [settings, setSettings] = useState<FeedbackEvent | null>(null)
  const [rows, setRows] = useState<FeedbackRow[]>([])
  const [allRatings, setAllRatings] = useState<EventRatingRow[]>([])
  // loading is derived, so the load effect never has to set state before its first await
  const [loadedEventId, setLoadedEventId] = useState('')
  const [filter, setFilter] = useState<CommentFilter>('all')
  const [minStars, setMinStars] = useState(0)
  const [maxStars, setMaxStars] = useState(5)
  const [search, setSearch] = useState('')
  // Every custom category ever made (removed ones too), only for labelling answers
  const [allCustoms, setAllCustoms] = useState<CustomAspect[]>([])
  const [adding, setAdding] = useState(false)
  const [newSv, setNewSv] = useState('')
  const [newEng, setNewEng] = useState('')
  const [newScope, setNewScope] = useState<'event' | 'template'>('event')
  // The category whose "remove from…" choice is open
  const [removing, setRemoving] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!selectedEventId) return
    try {
      const [s, r, all, customs] = await Promise.all([
        getFeedbackSettings(selectedEventId),
        listFeedback(selectedEventId),
        listAllRatings(),
        listAllCustomAspects(),
      ])
      setSettings(s)
      setRows(r)
      setAllRatings(all)
      setAllCustoms(customs)
    } catch (err) {
      console.error(err)
      toast.error(
        t(
          'Kunde inte läsa in omdömen. Har docs/event-feedback.sql körts?',
          'Could not load feedback. Has docs/event-feedback.sql been run?'
        )
      )
    } finally {
      setLoadedEventId(selectedEventId)
    }
    // t is stable per language; reloading on a language toggle isn't needed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEventId])

  useEffect(() => {
    // load only sets state after its awaits; the rule can't see that
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  const loading = loadedEventId !== selectedEventId
  const visible = rows.filter((r) => !r.is_hidden)
  const stats = useMemo(() => {
    const rated = visible.flatMap((r) => (r.rating === null ? [] : [r.rating]))
    const dist = [1, 2, 3, 4, 5].map((n) => rated.filter((v) => Math.round(v) === n).length)
    const aspectKeys = new Set(visible.flatMap((r) => Object.keys(r.aspect_ratings ?? {})))
    const aspectAverages = [...aspectKeys].map((key) => {
      const values = visible.map((r) => r.aspect_ratings?.[key]).filter((v): v is number => !!v)
      return { key, avg: average(values), n: values.length }
    })
    const recommend = visible.filter((r) => r.would_recommend)
    return {
      avg: average(rated),
      ratedCount: rated.length,
      dist,
      aspectAverages,
      recommendYes: recommend.filter((r) => r.would_recommend === 'yes').length,
      recommendTotal: recommend.length,
    }
  }, [visible])

  const perEvent = useMemo(() => {
    const byEvent = new Map<string, number[]>()
    for (const r of allRatings)
      byEvent.set(r.event_id, [...(byEvent.get(r.event_id) ?? []), r.rating])
    return events
      .filter((e) => byEvent.has(e.id))
      .map((e) => ({ event: e, avg: average(byEvent.get(e.id)!), n: byEvent.get(e.id)!.length }))
      .sort((a, b) => (a.event.event_start ?? '').localeCompare(b.event.event_start ?? ''))
  }, [allRatings, events])

  const patchRow = async (id: string, patch: Partial<FeedbackRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
    try {
      await updateFeedback(id, patch)
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte spara.', 'Could not save.'))
      void load()
    }
  }

  const removeRow = async (id: string) => {
    const ok = await confirm({
      message: t(
        'Ta bort omdömet för gott? Det går inte att ångra.',
        'Delete this feedback for good? This cannot be undone.'
      ),
      destructive: true,
    })
    if (!ok) return
    try {
      await deleteFeedback(id)
      setRows((prev) => prev.filter((r) => r.id !== id))
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte ta bort.', 'Could not delete.'))
    }
  }

  const makeTodo = async (row: FeedbackRow) => {
    try {
      await createTodo({
        title: t('Förbättra: ', 'Improve: ') + (row.improve ?? '').slice(0, 80),
        details: row.improve,
        event_id: selectedEventId,
      })
      await patchRow(row.id, { is_actioned: true })
      toast.success(t('Att göra-punkt skapad.', 'To-do created.'))
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte skapa att göra-punkt.', 'Could not create the to-do.'))
    }
  }

  const saveSettings = async (
    patch: Partial<Pick<FeedbackEvent, 'feedback_mode' | 'feedback_aspects'>>
  ) => {
    if (!settings) return
    setSettings({ ...settings, ...patch })
    try {
      await updateFeedbackSettings(settings.id, patch)
      if (patch.feedback_mode) void load()
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte spara inställningen.', 'Could not save the setting.'))
      void load()
    }
  }

  const addCategory = async () => {
    if (!settings || !newSv.trim()) return
    try {
      const created = await createCustomAspect({
        labelSv: newSv,
        labelEng: newEng,
        scope: newScope,
        eventId: settings.id,
      })
      const current = aspectsForEvent(settings)
      await updateFeedbackSettings(settings.id, {
        feedback_aspects: current.includes(created.key) ? current : [...current, created.key],
      })
      setNewSv('')
      setNewEng('')
      setAdding(false)
      toast.success(t('Kategori tillagd.', 'Category added.'))
      void load()
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte lägga till kategorin.', 'Could not add the category.'))
    }
  }

  // "Only this event" unticks it here (and retires an event-only category); "all upcoming events"
  // takes it off every event that hasn't happened yet (and retires a template category).
  const removeCategory = async (key: string, scope: 'event' | 'all') => {
    if (!settings) return
    const custom = settings.custom_aspects.find((a) => a.key === key)
    const templateKeys = settings.custom_aspects.filter((a) => a.in_template).map((a) => a.key)
    try {
      if (scope === 'event') {
        await updateFeedbackSettings(settings.id, {
          feedback_aspects: aspectsForEvent(settings).filter((k) => k !== key),
        })
        if (custom && !custom.in_template) await archiveCustomAspect(key)
      } else {
        await removeAspectFromUpcomingEvents(key, templateKeys)
        if (custom) await archiveCustomAspect(key)
      }
      setRemoving(null)
      toast.success(t('Kategori borttagen.', 'Category removed.'))
      void load()
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte ta bort kategorin.', 'Could not remove the category.'))
    }
  }

  const feedbackUrl = settings ? feedbackLink(settings.slug) : ''

  // Black on white, big and with a quiet zone, so it prints and scans reliably from a poster.
  const downloadQr = async () => {
    if (!settings) return
    try {
      const dataUrl = await QRCode.toDataURL(feedbackUrl, { width: 1200, margin: 3 })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `omdomen-qr-${settings.slug}.png`
      a.click()
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte skapa QR-koden.', 'Could not create the QR code.'))
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(feedbackUrl)
      toast.success(t('Länk kopierad!', 'Link copied!'))
    } catch {
      toast.error(t('Kunde inte kopiera.', 'Could not copy.'))
    }
  }

  // What each comment type means (a guest often fills in both "liked" and "can do better", so a
  // card shows only the part the chosen filter is about):
  //   all     everything a guest wrote
  //   improve what they think we can do better
  //   open    "can do better" you haven't marked as handled (check mark or "make a to-do") yet
  //   liked   what they liked
  const hasImprove = (r: FeedbackRow) => !!r.improve || !!r.improve_aspects?.length
  const hasLiked = (r: FeedbackRow) => !!r.liked || !!r.liked_aspects?.length
  const hasAnyText = (r: FeedbackRow) =>
    hasImprove(r) || hasLiked(r) || !!r.review || !!r.extra_comment
  const matchesType = (r: FeedbackRow, type: CommentFilter) =>
    type === 'improve'
      ? hasImprove(r)
      : type === 'liked'
        ? hasLiked(r)
        : type === 'open'
          ? hasImprove(r) && !r.is_actioned
          : hasAnyText(r)

  const query = search.trim().toLowerCase()
  // Star range and search apply to every filter; the counts on the buttons use the same two
  const matchesStarsAndSearch = (r: FeedbackRow) => {
    // Answers without an overall rating (old forms) only show under "all ratings"
    if (r.rating === null) {
      if (minStars !== 0 || maxStars !== 5) return false
    } else if (r.rating < minStars || r.rating > maxStars) return false
    return (
      !query ||
      `${r.review ?? ''} ${r.liked ?? ''} ${r.improve ?? ''} ${r.extra_comment ?? ''}`
        .toLowerCase()
        .includes(query)
    )
  }
  const comments = rows.filter((r) => matchesStarsAndSearch(r) && matchesType(r, filter))
  const countFor = (type: CommentFilter) =>
    rows.filter((r) => matchesStarsAndSearch(r) && matchesType(r, type)).length
  const showLikedPart = filter === 'all' || filter === 'liked'
  const showImprovePart = filter === 'all' || filter === 'improve' || filter === 'open'
  const showReviewPart = filter === 'all'

  const aspectLabel = (key: string) => {
    const aspect = resolveAspect(key, allCustoms)
    return aspect ? t(aspect.sv, aspect.eng) : key
  }

  // Imported answers can list several channels ("facebook,friends"); guests pick one.
  const howFoundLabel = (value: string | null) => {
    const labels = (value ?? '')
      .split(',')
      .map((key) => HOW_FOUND_OPTIONS.find((o) => o.key === key.trim()))
      .flatMap((option) => (option ? [t(option.sv, option.eng)] : []))
    return labels.length > 0 ? labels.join(', ') : null
  }

  const activeAspects = settings ? aspectsForEvent(settings) : []

  return (
    <div className="page-shell">
      <div className="bg-glow-spot" />
      <h1>{t('Omdömen', 'Feedback')}</h1>
      <div className="gold-divider" />

      <EventPicker />

      {selectedEventId && settings && (
        <div className="max-w-5xl mx-auto px-4 space-y-8 mb-12">
          <section className="admin-panel p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <label className="form-label-gold whitespace-nowrap">
                  {t('Omdömen öppnar', 'Feedback opens')}
                </label>
                <select
                  className="velvet-select w-56"
                  value={settings.feedback_mode}
                  onChange={(e) =>
                    void saveSettings({ feedback_mode: e.target.value as FeedbackMode })
                  }
                >
                  <option value="auto">
                    {t('Kl. 23:00 på eventdagen', '23:00 on the event day')}
                  </option>
                  <option value="open">{t('Öppna nu', 'Open now')}</option>
                  <option value="closed">{t('Stängda', 'Closed')}</option>
                </select>
                <span
                  role="img"
                  aria-label={
                    settings.is_open
                      ? t('Öppna för gäster', 'Open to guests')
                      : t('Stängda för gäster', 'Closed to guests')
                  }
                  title={
                    settings.is_open
                      ? t('Öppna för gäster just nu', 'Open to guests right now')
                      : settings.feedback_mode === 'auto' && settings.opens_at
                        ? t(
                            `Stängda just nu. Öppnar ${new Date(settings.opens_at).toLocaleString('sv-SE', { dateStyle: 'long', timeStyle: 'short' })}`,
                            `Closed right now. Opens ${new Date(settings.opens_at).toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' })}`
                          )
                        : t('Stängda för gäster just nu', 'Closed to guests right now')
                  }
                  className={`h-3 w-3 shrink-0 rounded-full ${
                    settings.is_open
                      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]'
                      : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'
                  }`}
                />
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3 ml-auto">
                <a
                  href={`/events/event/${settings.slug}/feedback?preview=1`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-gold-outline text-xs py-2 px-4"
                >
                  <Eye size={14} className="inline mr-2" />
                  {t('Förhandsvisa', 'Preview')}
                </a>
                <button
                  type="button"
                  onClick={copyLink}
                  className="btn-gold-outline text-xs py-2 px-4"
                >
                  <Copy size={14} className="inline mr-2" />
                  {t('Kopiera länk', 'Copy link')}
                </button>
                <button
                  type="button"
                  onClick={() => void downloadQr()}
                  className="btn-gold-outline text-xs py-2 px-4"
                >
                  <Download size={14} className="inline mr-2" />
                  {t('Ladda ner QR-kod', 'Download QR code')}
                </button>
              </div>
            </div>

            <div>
              <p className="form-label-gold mb-2 text-center">
                {t(
                  'Delar av kvällen gästerna får betygsätta',
                  'Parts of the night guests can rate'
                )}
              </p>
              <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
                {[
                  ...FEEDBACK_ASPECTS,
                  ...settings.custom_aspects.map((a) => ({
                    key: a.key,
                    sv: a.label_sv,
                    eng: a.label_eng,
                  })),
                ].map((aspect) => (
                  <span key={aspect.key} className="flex items-center gap-1.5 text-sm">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activeAspects.includes(aspect.key)}
                        onChange={(e) =>
                          void saveSettings({
                            feedback_aspects: e.target.checked
                              ? [...activeAspects, aspect.key]
                              : activeAspects.filter((k) => k !== aspect.key),
                          })
                        }
                      />
                      {t(aspect.sv, aspect.eng)}
                    </label>
                    <button
                      type="button"
                      onClick={() => setRemoving(removing === aspect.key ? null : aspect.key)}
                      title={t('Ta bort kategorin…', 'Remove this category…')}
                      className="p-0.5 text-foreground/30 hover:text-red-400"
                    >
                      <X size={13} />
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  onClick={() => setAdding((v) => !v)}
                  className="flex items-center gap-1 text-sm text-accent hover:underline"
                >
                  <Plus size={14} />
                  {t('Egen kategori', 'Add category')}
                </button>
              </div>

              {removing && (
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm">
                  <span>
                    {t('Ta bort', 'Remove')}{' '}
                    <strong>
                      {(() => {
                        const aspect = resolveAspect(removing, settings.custom_aspects)
                        return aspect ? t(aspect.sv, aspect.eng) : removing
                      })()}
                    </strong>
                    :
                  </span>
                  <button
                    type="button"
                    onClick={() => void removeCategory(removing, 'event')}
                    className="btn-gold-outline text-xs py-1.5 px-3"
                  >
                    {t('Bara det här eventet', 'Only this event')}
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeCategory(removing, 'all')}
                    className="btn-red text-xs py-1.5 px-3"
                  >
                    {t('Alla kommande event', 'All upcoming events')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRemoving(null)}
                    className="text-xs text-foreground/50 hover:text-foreground"
                  >
                    {t('Avbryt', 'Cancel')}
                  </button>
                </div>
              )}

              {adding && (
                <div className="mt-3 grid gap-3 rounded-lg border border-accent/20 bg-black/20 p-3 sm:grid-cols-2 text-left">
                  <input
                    className="velvet-input"
                    placeholder={t('Namn på svenska', 'Name in Swedish')}
                    value={newSv}
                    onChange={(e) => setNewSv(e.target.value)}
                  />
                  <input
                    className="velvet-input"
                    placeholder={t('Namn på engelska (valfritt)', 'Name in English (optional)')}
                    value={newEng}
                    onChange={(e) => setNewEng(e.target.value)}
                  />
                  <select
                    className="velvet-select"
                    value={newScope}
                    onChange={(e) => setNewScope(e.target.value as 'event' | 'template')}
                  >
                    <option value="event">{t('Bara det här eventet', 'Only this event')}</option>
                    <option value="template">
                      {t('Mall: erbjuds på alla event', 'Template: offered on every event')}
                    </option>
                  </select>
                  <button
                    type="button"
                    disabled={!newSv.trim()}
                    onClick={() => void addCategory()}
                    className="btn-gold text-xs py-2 px-4 justify-self-end"
                  >
                    {t('Lägg till', 'Add')}
                  </button>
                </div>
              )}
            </div>
          </section>

          {loading ? (
            <p className="loading-text text-center">{t('Laddar...', 'Loading...')}</p>
          ) : visible.length === 0 ? (
            <p className="empty-state">
              {t('Inga omdömen för det här eventet ännu.', 'No feedback for this event yet.')}
            </p>
          ) : (
            <>
              <section className="admin-panel p-5 sm:p-6 space-y-5">
                <div className="flex flex-wrap items-center gap-4">
                  {stats.ratedCount > 0 && (
                    <>
                      <span className="text-3xl font-decorative text-accent">
                        {stats.avg.toFixed(1)}
                      </span>
                      <StarRating value={stats.avg} size={24} label={stats.avg.toFixed(1)} />
                    </>
                  )}
                  <span className="text-info">
                    {t(`${visible.length} svar`, `${visible.length} answers`)}
                    {stats.ratedCount < visible.length &&
                      ' · ' +
                        t(`${stats.ratedCount} med betyg`, `${stats.ratedCount} with a rating`)}
                    {stats.recommendTotal > 0 &&
                      ' · ' +
                        t(
                          `${stats.recommendYes} av ${stats.recommendTotal} rekommenderar oss`,
                          `${stats.recommendYes} of ${stats.recommendTotal} would recommend us`
                        )}
                  </span>
                </div>

                <div className="space-y-1">
                  {[5, 4, 3, 2, 1].map((n) => (
                    <div key={n} className="flex items-center gap-3 text-xs">
                      <span className="w-4 text-right">{n}</span>
                      <div className="progress-track flex-1">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${(stats.dist[n - 1] / Math.max(stats.ratedCount, 1)) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="w-6">{stats.dist[n - 1]}</span>
                    </div>
                  ))}
                </div>

                {stats.aspectAverages.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                    {stats.aspectAverages.map(({ key, avg, n }) => {
                      const aspect = resolveAspect(key, allCustoms)
                      return (
                        <div key={key} className="flex items-center justify-between text-sm">
                          <span>{aspect ? t(aspect.sv, aspect.eng) : key}</span>
                          <span className="text-accent">
                            {avg.toFixed(1)} <span className="text-foreground/40">({n})</span>
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>

              <section className="space-y-4">
                <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
                  {(
                    [
                      ['all', t('Alla', 'All')],
                      ['liked', t('Gillade', 'Liked')],
                      ['improve', t('Kan göras bättre', 'Can do better')],
                      ['open', t('Att hantera', 'To handle')],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFilter(key)}
                      title={
                        key === 'open'
                          ? t(
                              'Kan göras bättre-kommentarer som du inte markerat som hanterade än',
                              'Can-do-better comments you have not marked as handled yet'
                            )
                          : undefined
                      }
                      className={
                        filter === key
                          ? 'btn-gold text-xs py-2 px-3 shrink-0 whitespace-nowrap !min-w-0'
                          : 'btn-gold-outline text-xs py-2 px-3 shrink-0 whitespace-nowrap !min-w-0'
                      }
                    >
                      {label} <span className="opacity-60">{countFor(key)}</span>
                    </button>
                  ))}
                  <select
                    className="velvet-select !w-44 shrink-0"
                    value={`${minStars}-${maxStars}`}
                    onChange={(e) => {
                      const [lo, hi] = e.target.value.split('-').map(Number)
                      setMinStars(lo)
                      setMaxStars(hi)
                    }}
                  >
                    <option value="0-5">{t('Alla betyg', 'All ratings')}</option>
                    <option value="1-2">{t('1-2 stjärnor', '1-2 stars')}</option>
                    <option value="3-3">{t('3 stjärnor', '3 stars')}</option>
                    <option value="4-5">{t('4-5 stjärnor', '4-5 stars')}</option>
                  </select>
                  <input
                    className="velvet-input min-w-[8rem] flex-1"
                    placeholder={t('Sök...', 'Search...')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                {comments.length === 0 ? (
                  <p className="empty-state">{t('Inga kommentarer här.', 'No comments here.')}</p>
                ) : (
                  comments.map((row) => (
                    <article
                      key={row.id}
                      className={`velvet-card-list p-4 space-y-2 ${row.is_hidden ? 'opacity-50' : ''}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          {row.rating !== null && (
                            <>
                              <StarRating value={row.rating} size={16} label={`${row.rating}/5`} />
                              {!Number.isInteger(row.rating) && (
                                <span className="text-xs text-accent">{row.rating.toFixed(1)}</span>
                              )}
                            </>
                          )}
                          {row.source !== 'site' && (
                            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-accent/20 text-foreground/50">
                              {t('Gammalt formulär', 'Old form')}
                              {row.rating === null && ` · ${t('inget betyg', 'no rating')}`}
                            </span>
                          )}
                          <span className="text-xs text-foreground/50">
                            {new Date(row.created_at).toLocaleDateString()}
                            {howFoundLabel(row.how_found) && ` · ${howFoundLabel(row.how_found)}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {row.improve && (
                            <button
                              type="button"
                              title={t('Gör till att göra-punkt', 'Make a to-do')}
                              onClick={() => void makeTodo(row)}
                              className="p-2 hover:text-accent"
                            >
                              <ListPlus size={16} />
                            </button>
                          )}
                          {row.improve && (
                            <button
                              type="button"
                              title={t('Markera som hanterad', 'Mark as handled')}
                              onClick={() =>
                                void patchRow(row.id, { is_actioned: !row.is_actioned })
                              }
                              className={`p-2 hover:text-accent ${row.is_actioned ? 'text-accent' : ''}`}
                            >
                              <CheckCheck size={16} />
                            </button>
                          )}
                          {row.review && row.may_quote && (
                            <button
                              type="button"
                              title={t('Visa recensionen på sidan', 'Show the review on the page')}
                              onClick={() =>
                                void patchRow(row.id, { is_quote_approved: !row.is_quote_approved })
                              }
                              className={`p-2 hover:text-accent ${row.is_quote_approved ? 'text-accent' : ''}`}
                            >
                              <Quote size={16} />
                            </button>
                          )}
                          <button
                            type="button"
                            title={t('Dölj från statistik', 'Hide from the stats')}
                            onClick={() => void patchRow(row.id, { is_hidden: !row.is_hidden })}
                            className="p-2 hover:text-accent"
                          >
                            <EyeOff size={16} />
                          </button>
                          <button
                            type="button"
                            title={t('Ta bort', 'Delete')}
                            onClick={() => void removeRow(row.id)}
                            className="p-2 hover:text-red-400"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      {showReviewPart && row.review && (
                        <p className="text-sm">
                          <span className="form-label-gold mr-2">
                            {t('Recension', 'Review')}
                            {row.may_quote &&
                              ` (${row.is_quote_approved ? t('visas på sidan', 'shown on the site') : t('får visas, ej godkänd', 'may be shown, not approved')})`}
                          </span>
                          {row.review}
                        </p>
                      )}
                      {showLikedPart && !!row.liked_aspects?.length && (
                        <p className="flex flex-wrap items-center gap-1.5 text-sm">
                          <span className="form-label-gold mr-1">{t('Gillade', 'Liked')}</span>
                          {row.liked_aspects.map((key) => (
                            <span
                              key={key}
                              className="text-xs px-2 py-0.5 rounded-full border border-emerald-500/30 text-emerald-300"
                            >
                              {aspectLabel(key)}
                            </span>
                          ))}
                        </p>
                      )}
                      {showLikedPart && row.liked && (
                        <p className="text-sm">
                          <span className="form-label-gold mr-2">{t('Gillade', 'Liked')}</span>
                          {row.liked}
                        </p>
                      )}
                      {showImprovePart && !!row.improve_aspects?.length && (
                        <p className="flex flex-wrap items-center gap-1.5 text-sm">
                          <span className="form-label-gold mr-1">
                            {t('Kan göras bättre', 'Can do better')}
                          </span>
                          {row.improve_aspects.map((key) => (
                            <span
                              key={key}
                              className="text-xs px-2 py-0.5 rounded-full border border-amber-500/30 text-amber-300"
                            >
                              {aspectLabel(key)}
                            </span>
                          ))}
                        </p>
                      )}
                      {showImprovePart && row.improve && (
                        <p className="text-sm">
                          <span className="form-label-gold mr-2">
                            {t('Kan göras bättre', 'Can do better')}
                          </span>
                          {row.improve}
                        </p>
                      )}
                      {showReviewPart && row.extra_comment && (
                        <p className="text-sm">
                          <span className="form-label-gold mr-2">
                            {t('Extra kommentar', 'Extra comment')}
                          </span>
                          {row.extra_comment}
                        </p>
                      )}
                    </article>
                  ))
                )}
              </section>
            </>
          )}

          {perEvent.length > 0 && (
            <section className="admin-panel p-5 sm:p-6 space-y-3">
              <p className="form-label-gold">{t('Betyg över tid', 'Rating over time')}</p>
              {perEvent.map(({ event, avg, n }) => (
                <div key={event.id} className="flex items-center gap-3 text-sm">
                  <span className="w-48 truncate">{event.title}</span>
                  <div className="progress-track flex-1">
                    <div className="progress-fill" style={{ width: `${(avg / 5) * 100}%` }} />
                  </div>
                  <span className="w-24 text-right text-accent">
                    {avg.toFixed(1)} <span className="text-foreground/40">({n})</span>
                  </span>
                </div>
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  )
}
