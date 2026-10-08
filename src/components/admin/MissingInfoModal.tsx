import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import { groupByEmail, joinNames } from '@/lib/emailGrouping'
import type { MissingInfoPerson, MissingItem } from '@/lib/missingInfo'
import {
  buildDefaultTemplates,
  renderMissingInfoEmail,
  type RenderedEmail,
  type ArtistBlocks,
  type MissingInfoTemplates,
  type StaffBlocks,
} from '@/lib/missingInfoTemplates'
import {
  getInfoReminders,
  logInfoReminders,
  type InfoReminder,
} from '@/services/infoReminderService'
import type { Language } from '@/types/types'

export type MissingInfoFilter = MissingItem | 'all'

interface MissingInfoModalProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
  eventTitle: string
  people: MissingInfoPerson[]
  // The Dashboard card the admin clicked — only decides who is listed first; every email
  // still asks each person for everything they're missing.
  initialFilter: MissingInfoFilter
}

const ITEM_ORDER: MissingItem[] = ['food', 'notes', 'receipt']

// Module-level so the render body doesn't call Date.now() itself (same reasoning as
// AdminDashboard's isRecent).
const daysSince = (iso: string): number =>
  Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000))

const firstName = (name: string): string => name.trim().split(/\s+/)[0]
const greetingName = (p: MissingInfoPerson): string =>
  p.kind === 'staff' ? firstName(p.name) : p.name

const inputClass =
  'w-full text-sm bg-black/40 border border-accent/20 rounded p-2 focus:border-accent text-white'
const labelClass = 'text-[11px] uppercase tracking-wider text-muted-foreground font-mono block'

const LANGUAGE_LABELS: { value: Language; label: string }[] = [
  { value: 'sv', label: 'Svenska' },
  { value: 'eng', label: 'English' },
]

export const MissingInfoModal = ({
  isOpen,
  onClose,
  eventId,
  eventTitle,
  people,
  initialFilter,
}: MissingInfoModalProps) => {
  const { t } = useLanguage()
  const [filter, setFilter] = useState<MissingInfoFilter>(initialFilter)
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  // Items the admin has clicked off for one person (e.g. the board is buying their ticket and
  // uploading the receipt itself) — left out of that person's email and reminder log, while
  // the rest of what they're missing is still asked for.
  const [skippedItems, setSkippedItems] = useState<Record<string, MissingItem[]>>({})
  const [templates, setTemplates] = useState<MissingInfoTemplates>(() =>
    buildDefaultTemplates(eventTitle)
  )
  const [reminders, setReminders] = useState<InfoReminder[]>([])
  const [openKey, setOpenKey] = useState<string | null>(null)
  // A hand-written email for one person, replacing what the templates would generate for
  // them. Once set it stops following template/badge changes until reset.
  const [overrides, setOverrides] = useState<Record<string, RenderedEmail>>({})
  const [isSending, setIsSending] = useState(false)

  const loadReminders = async () => {
    try {
      setReminders(await getInfoReminders(eventId))
    } catch (err) {
      console.error('Kunde inte hämta påminnelser:', err)
    }
  }

  useEffect(() => {
    const reset = () => {
      if (!isOpen) return
      setFilter(initialFilter)
      setExcluded(new Set())
      setSkippedItems({})
      setTemplates(buildDefaultTemplates(eventTitle))
      setOpenKey(null)
      setOverrides({})
      loadReminders()
    }
    reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  if (!isOpen || typeof window === 'undefined') return null

  const itemLabel = (item: MissingItem): string =>
    item === 'food'
      ? t('Mat', 'Food')
      : item === 'notes'
        ? t('Scenanteckningar', 'Stage notes')
        : t('Reskvitto', 'Receipt')

  const filterOptions: { value: MissingInfoFilter; label: string; count: number }[] = [
    { value: 'all' as MissingInfoFilter, label: t('Alla', 'All'), count: people.length },
    ...ITEM_ORDER.map((item) => ({
      value: item as MissingInfoFilter,
      label: itemLabel(item),
      count: people.filter((p) => p.items.includes(item)).length,
    })),
  ].filter((option) => option.value === 'all' || option.count > 0)

  const activeItems = (p: MissingInfoPerson): MissingItem[] =>
    p.items.filter((item) => !skippedItems[p.key]?.includes(item))

  const toggleItem = (key: string, item: MissingItem) =>
    setSkippedItems((prev) => {
      const current = prev[key] ?? []
      return {
        ...prev,
        [key]: current.includes(item) ? current.filter((i) => i !== item) : [...current, item],
      }
    })

  const visible = filter === 'all' ? people : people.filter((p) => p.items.includes(filter))
  const selected = visible.filter(
    (p) => p.email && !excluded.has(p.key) && activeItems(p).length > 0
  )

  const toggleExcluded = (key: string) =>
    setExcluded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  // Most recent time anyone chased this person for something they're *still* missing.
  const lastReminderDays = (p: MissingInfoPerson): number | null => {
    const latest = reminders
      .filter(
        (r) =>
          p.items.includes(r.item) &&
          (p.performerId ? r.performer_id === p.performerId : r.staff_id === p.staffId)
      )
      .map((r) => r.reminded_at)
      .sort()
      .at(-1)
    return latest ? daysSince(latest) : null
  }

  const reminderText = (days: number): string =>
    days === 0
      ? t('Påmind idag', 'Reminded today')
      : t(`Påmind för ${days} d sedan`, `Reminded ${days} d ago`)

  const selectedGroups = groupByEmail(
    selected.map((p) => ({ ...p, email: p.email as string, items: activeItems(p) }))
  )
  const sharedInboxCount = selected.length - selectedGroups.length
  const countFor = (kind: MissingInfoPerson['kind'], lang: Language) =>
    selectedGroups.filter((g) => g.language === lang && g.members.some((m) => m.kind === kind))
      .length

  const updateArtist = (lang: Language, field: keyof ArtistBlocks, value: string) =>
    setTemplates((prev) => ({
      ...prev,
      artist: { ...prev.artist, [lang]: { ...prev.artist[lang], [field]: value } },
    }))
  const updateStaff = (lang: Language, field: keyof StaffBlocks, value: string) =>
    setTemplates((prev) => ({
      ...prev,
      staff: { ...prev.staff, [lang]: { ...prev.staff[lang], [field]: value } },
    }))

  const handleSend = async () => {
    setIsSending(true)
    try {
      const outcomes = await Promise.all(
        selectedGroups.map(async (group) => {
          const kind = group.members.some((m) => m.kind === 'artist') ? 'artist' : 'staff'
          const items = ITEM_ORDER.filter((i) => group.members.some((m) => m.items.includes(i)))
          // A hand-edited email wins over the template (for a shared inbox, the first
          // member that has one).
          const email =
            group.members.map((m) => overrides[m.key]).find(Boolean) ??
            renderMissingInfoEmail(
              templates,
              kind,
              group.language,
              joinNames(group.members.map(greetingName), group.language),
              items,
              group.members.find((m) => m.bookingLink)?.bookingLink ?? null
            )
          const ok = await fetch('/api/send-casting-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: group.email,
              name: joinNames(
                group.members.map((m) => m.name),
                group.language
              ),
              subject: email.subject,
              bodyText: email.body,
              // The edge function's own language value is 'en', not 'eng'.
              language: group.language === 'eng' ? 'en' : 'sv',
              fromName: 'Tip the Velvet',
              greeting: email.greeting,
            }),
          }).then((res) => res.ok)
          return { group, ok }
        })
      )

      const sentPeople = outcomes.filter((o) => o.ok).flatMap((o) => o.group.members)
      try {
        await logInfoReminders(eventId, sentPeople)
      } catch (err) {
        console.error('Kunde inte spara påminnelser:', err)
      }
      await loadReminders()

      const failed = outcomes.filter((o) => !o.ok).flatMap((o) => o.group.members)
      if (failed.length === 0) {
        toast.success(
          t(`Mail skickat till ${sentPeople.length}.`, `Email sent to ${sentPeople.length}.`)
        )
        onClose()
      } else {
        // Leave only the ones that failed ticked, so a retry doesn't re-send to the rest.
        setExcluded(
          new Set(people.filter((p) => !failed.some((f) => f.key === p.key)).map((p) => p.key))
        )
        toast.error(
          t(
            `Skickat till ${sentPeople.length}/${selected.length} — resten misslyckades.`,
            `Sent to ${sentPeople.length}/${selected.length} — the rest failed.`
          )
        )
      }
    } catch (err) {
      console.error('Kunde inte skicka mail:', err)
      toast.error(t('Kunde inte skicka mail.', 'Could not send email.'))
    } finally {
      setIsSending(false)
    }
  }

  const renderPerson = (p: MissingInfoPerson) => {
    const reminded = lastReminderDays(p)
    const isOpen = openKey === p.key
    const isEdited = Boolean(overrides[p.key])
    // What this person would get right now: their hand-written version if there is one,
    // otherwise the templates' output.
    const email: RenderedEmail | null = isOpen
      ? (overrides[p.key] ??
        renderMissingInfoEmail(
          templates,
          p.kind,
          p.language,
          greetingName(p),
          activeItems(p),
          p.bookingLink
        ))
      : null
    return (
      <div key={p.key} className="border border-accent/10 rounded bg-black/20 p-2 text-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="checkbox"
            checked={Boolean(p.email) && !excluded.has(p.key) && activeItems(p).length > 0}
            disabled={!p.email || activeItems(p).length === 0}
            onChange={() => toggleExcluded(p.key)}
            className="h-4 w-4 accent-accent shrink-0"
          />
          <span className="font-semibold text-foreground min-w-0 truncate">{p.name}</span>
          <span className="text-[10px] font-mono text-accent/70 border border-accent/30 rounded px-1 leading-4">
            {p.language === 'eng' ? 'EN' : 'SV'}
          </span>
          <span className="flex gap-1 flex-wrap">
            {p.items.map((item) => {
              const skipped = skippedItems[p.key]?.includes(item)
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleItem(p.key, item)}
                  title={
                    skipped
                      ? t('Klicka för att be om detta igen', 'Click to ask for this again')
                      : t('Klicka för att inte be om detta', 'Click to leave this out')
                  }
                  className={`text-[11px] px-1.5 py-0.5 rounded-full border transition-colors ${
                    skipped
                      ? 'border-foreground/20 text-foreground/30 line-through hover:border-accent/30'
                      : 'border-accent/30 text-accent/90 hover:bg-accent/10'
                  }`}
                >
                  {itemLabel(item)}
                </button>
              )
            })}
          </span>
          <span className="ml-auto flex items-center gap-2 text-[11px]">
            {!p.email ? (
              <span className="text-red-400">{t('Ingen e-post', 'No email')}</span>
            ) : reminded !== null ? (
              <span className="text-amber-400">{reminderText(reminded)}</span>
            ) : null}
            {isEdited && <span className="text-accent/70">{t('Egen text', 'Custom text')}</span>}
            {p.email && (
              <button
                type="button"
                onClick={() => setOpenKey(isOpen ? null : p.key)}
                className="p-1 text-foreground/60 hover:text-accent"
                title={t('Visa / redigera mailet', 'View / edit the email')}
              >
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            )}
          </span>
        </div>
        {email && (
          <div className="mt-2 border-t border-accent/10 pt-2 space-y-2">
            {renderField(`${p.key}:subject`, t('Ämnesrad', 'Subject'), 1, email.subject, (v) =>
              setOverrides((prev) => ({ ...prev, [p.key]: { ...email, subject: v } }))
            )}
            {renderField(`${p.key}:greeting`, t('Hälsning', 'Greeting'), 1, email.greeting, (v) =>
              setOverrides((prev) => ({ ...prev, [p.key]: { ...email, greeting: v } }))
            )}
            {renderField(`${p.key}:body`, t('Mailtext', 'Email Text'), 8, email.body, (v) =>
              setOverrides((prev) => ({ ...prev, [p.key]: { ...email, body: v } }))
            )}
            {isEdited && (
              <div className="flex items-center justify-between gap-3 text-[11px] text-foreground/50">
                <span>
                  {t(
                    'Egen text — ändringar i mallarna eller etiketterna påverkar inte detta mail.',
                    'Custom text — changes to the templates or badges no longer affect this email.'
                  )}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setOverrides((prev) => {
                      const next = { ...prev }
                      delete next[p.key]
                      return next
                    })
                  }
                  className="text-accent hover:underline shrink-0"
                >
                  {t('Återställ till mall', 'Reset to template')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const artists = visible.filter((p) => p.kind === 'artist')
  const staff = visible.filter((p) => p.kind === 'staff')

  const artistFields: { field: keyof ArtistBlocks; label: string; rows: number }[] = [
    { field: 'subject', label: t('Ämnesrad', 'Subject'), rows: 1 },
    { field: 'greeting', label: t('Hälsning', 'Greeting'), rows: 1 },
    { field: 'intro', label: t('Inledning', 'Intro'), rows: 2 },
    { field: 'food', label: t('Rad: mat', 'Line: food'), rows: 2 },
    { field: 'notes', label: t('Rad: scenanteckningar', 'Line: stage notes'), rows: 3 },
    { field: 'receipt', label: t('Rad: reskvitto', 'Line: receipt'), rows: 2 },
    {
      field: 'outro',
      label: t('Avslutning ({link} = bokningslänk)', 'Outro ({link} = booking link)'),
      rows: 4,
    },
  ]
  const staffFields: { field: keyof StaffBlocks; label: string; rows: number }[] = [
    { field: 'subject', label: t('Ämnesrad', 'Subject'), rows: 1 },
    { field: 'greeting', label: t('Hälsning', 'Greeting'), rows: 1 },
    { field: 'body', label: t('Mailtext', 'Email Text'), rows: 8 },
  ]

  const renderField = (
    key: string,
    label: string,
    rows: number,
    value: string,
    onChange: (value: string) => void
  ) => (
    <div key={key} className="space-y-1">
      <label className={labelClass}>{label}</label>
      {rows === 1 ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      ) : (
        <textarea
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass} font-sans leading-relaxed resize-y`}
        />
      )}
    </div>
  )

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 text-left"
      onClick={onClose}
    >
      <div
        className="velvet-surface border border-accent/30 max-w-3xl w-full p-6 space-y-4 rounded-lg shadow-2xl max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: '#141111' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h4 className="font-decorative text-lg text-accent text-center">
            {t('Be om saknad information', 'Ask for missing info')}
          </h4>
          <p className="text-xs text-muted-foreground text-center">{eventTitle}</p>
          <p className="text-[11px] text-foreground/50 text-center mt-1">
            {t(
              'Varje person får ett mail om allt de saknar, på sitt språk — oavsett filtret nedan. Klicka på en etikett för att utelämna just den saken för personen.',
              'Each person gets one email about everything they are missing, in their language — whatever the filter below. Click a badge to leave that item out for that person.'
            )}
          </p>
        </div>

        <div className="flex gap-2 flex-wrap justify-center">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                filter === option.value
                  ? 'bg-accent text-black border-accent'
                  : 'border-accent/30 text-accent hover:bg-accent/10'
              }`}
            >
              {option.label} · {option.count}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <p className="text-sm text-foreground/50 italic text-center py-4">
            {t('Ingen saknar något här.', 'Nobody is missing anything here.')}
          </p>
        ) : (
          <div className="space-y-4">
            {artists.length > 0 && (
              <div className="space-y-2">
                <h5 className="font-decorative text-sm text-foreground/80 border-b border-accent/10 pb-1">
                  {t('Artister', 'Artists')}
                </h5>
                {artists.map(renderPerson)}
              </div>
            )}
            {staff.length > 0 && (
              <div className="space-y-2">
                <h5 className="font-decorative text-sm text-foreground/80 border-b border-accent/10 pb-1">
                  {t('Volontärer & personal', 'Volunteers & staff')}
                </h5>
                {staff.map(renderPerson)}
              </div>
            )}
          </div>
        )}

        {sharedInboxCount > 0 && (
          <p className="text-[11px] text-accent/70 text-center">
            {t(
              `${sharedInboxCount} delar mailadress med någon annan och får ett gemensamt mail.`,
              `${sharedInboxCount} share an email address and will get one joint email.`
            )}
          </p>
        )}

        <details className="group border-t border-accent/10 pt-3">
          <summary className="cursor-pointer text-sm text-accent/90">
            {t('Redigera mallar', 'Edit templates')}
          </summary>
          <div className="space-y-5 pt-3">
            <div className="space-y-2">
              <h5 className="font-decorative text-sm text-foreground/80">
                {t('Artister', 'Artists')}
              </h5>
              <p className="text-[11px] text-foreground/50">
                {t(
                  'Mailet byggs av inledning + en rad per sak som saknas + avslutning.',
                  'The email is built from the intro + one line per missing item + the outro.'
                )}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {LANGUAGE_LABELS.map(({ value, label }) => (
                  <div key={value} className="space-y-3">
                    <div className="flex items-center justify-between border-b border-accent/10 pb-1">
                      <span className="font-decorative text-sm text-accent">{label}</span>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {t(
                          `${countFor('artist', value)} mail`,
                          `${countFor('artist', value)} emails`
                        )}
                      </span>
                    </div>
                    {artistFields.map(({ field, label: fieldLabel, rows }) =>
                      renderField(field, fieldLabel, rows, templates.artist[value][field], (v) =>
                        updateArtist(value, field, v)
                      )
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <h5 className="font-decorative text-sm text-foreground/80">
                {t('Volontärer & personal', 'Volunteers & staff')}
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {LANGUAGE_LABELS.map(({ value, label }) => (
                  <div key={value} className="space-y-3">
                    <div className="flex items-center justify-between border-b border-accent/10 pb-1">
                      <span className="font-decorative text-sm text-accent">{label}</span>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {t(
                          `${countFor('staff', value)} mail`,
                          `${countFor('staff', value)} emails`
                        )}
                      </span>
                    </div>
                    {staffFields.map(({ field, label: fieldLabel, rows }) =>
                      renderField(field, fieldLabel, rows, templates.staff[value][field], (v) =>
                        updateStaff(value, field, v)
                      )
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </details>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-accent/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs border border-accent/20 rounded text-foreground/70 hover:bg-white/5 transition-colors"
            disabled={isSending}
          >
            {t('Avbryt', 'Cancel')}
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={isSending || selected.length === 0}
            className="btn-gold text-xs py-2 px-4 flex items-center gap-1.5"
          >
            {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {t(`Skicka till ${selected.length}`, `Send to ${selected.length}`)}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
