import { useEffect, useMemo, useState } from 'react'
import { Copy, ExternalLink, Mail, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import { useConfirm } from '@/contexts/ConfirmContext'
import {
  INFO_AUDIENCES,
  INFO_DOCUMENTS,
  audienceForStaffRole,
  isDoorStaffRow,
  infoAudienceLabel,
  hasPlaceholder,
  templateKeyFor,
  sortInfoItems,
  type InfoTemplateItem,
  type DoorSlot,
  type EventInfoItem,
  type EventInfoItemInput,
  type InfoAudience,
  type InfoDocKey,
  type InfoItemKind,
} from '@/lib/eventInfo'
import {
  createInfoItem,
  deleteInfoItem,
  ensureInfoLinks,
  getDoorSlots,
  getEventAccessFields,
  deleteSavedTemplateItem,
  seedIfEmpty,
  getSavedTemplateItem,
  getTemplateItems,
  saveTemplateItem,
  infoLinkUrl,
  updateInfoItem,
  type EventAccessFields,
} from '@/services/eventInfoService'
import { sendAdminEmail } from '@/services/emailService'
import type {
  AdminEventActRow,
  AdminEventPerformerRow,
  AdminEventStaffRow,
} from '@/services/eventService'
import { actHasMusic } from '@/lib/actMusic'
import { InfoItemEditor } from './InfoItemEditor'
import { VenueInfoCard } from './VenueInfoCard'
import { InfoDoorShifts } from './InfoDoorShifts'

interface InfoHubTabProps {
  eventId: string
  eventTitle: string
  performers: AdminEventPerformerRow[]
  staffRows: AdminEventStaffRow[]
  acts: AdminEventActRow[]
}

interface Recipient {
  email: string
  name: string
  language: 'sv' | 'eng'
}

const inputClass =
  'w-full h-9 text-sm bg-black/40 border border-accent/20 rounded p-2 focus:border-accent text-white'

type EditableKind = Exclude<InfoItemKind, 'document'>
const KIND_ORDER: EditableKind[] = ['text', 'schedule']

export const InfoHubTab = ({
  eventId,
  eventTitle,
  performers,
  staffRows,
  acts,
}: InfoHubTabProps) => {
  const { t, language } = useLanguage()
  const confirm = useConfirm()
  const [links, setLinks] = useState<Record<InfoAudience, string> | null>(null)
  const [items, setItems] = useState<EventInfoItem[]>([])
  const [slots, setSlots] = useState<DoorSlot[]>([])
  const [access, setAccess] = useState<EventAccessFields | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<{ kind: EditableKind; item?: EventInfoItem } | null>(null)
  const [template, setTemplate] = useState<Map<string, InfoTemplateItem>>(new Map())
  // The last "set as new template", so it can be undone: what the template row and the item's
  // template_key were before.
  const [templateUndo, setTemplateUndo] = useState<{
    itemId: string
    key: string
    previousRow: InfoTemplateItem | null
    previousItemKey: string | null
  } | null>(null)
  const [mailTarget, setMailTarget] = useState<InfoAudience | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const [linkMap, itemRows, slotRows, accessRow, templateRows] = await Promise.all([
          ensureInfoLinks(eventId),
          // A brand-new event starts from the template, with [placeholders] for what's missing.
          seedIfEmpty(eventId),
          getDoorSlots(eventId),
          getEventAccessFields(eventId),
          getTemplateItems(),
        ])
        if (cancelled) return
        setTemplate(new Map(templateRows.map((r) => [r.key, r])))
        setLinks(linkMap)
        setItems(itemRows)
        setSlots(slotRows)
        setAccess(accessRow)
      } catch (err) {
        console.error(err)
        toast.error(
          t(
            'Kunde inte ladda infosidan. Har migrationen körts?',
            'Could not load the info hub. Has the migration been run?'
          )
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
    // t changes identity with the language toggle — reloading on that would drop unsaved edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  const recipients = useMemo(() => {
    const byAudience = new Map<InfoAudience, Recipient[]>(INFO_AUDIENCES.map((a) => [a, []]))
    const seen = new Set<string>()
    const add = (audience: InfoAudience, email: string | null, name: string, lang: string) => {
      const key = `${audience}:${email?.toLowerCase()}`
      if (!email || seen.has(key)) return
      seen.add(key)
      byAudience.get(audience)!.push({ email, name, language: lang === 'eng' ? 'eng' : 'sv' })
    }
    for (const row of performers) {
      add('artist', row.performer.email, row.performer.performer_name, row.performer.language)
    }
    for (const row of staffRows) {
      const audience = audienceForStaffRole(row.role)
      if (audience) add(audience, row.staff.email, row.staff.name, row.staff.language)
    }
    return byAudience
  }, [performers, staffRows])

  const volunteerNames = useMemo(
    () => Array.from(new Set(staffRows.filter(isDoorStaffRow).map((r) => r.staff.name))),
    [staffRows]
  )

  const sortedItems = useMemo(() => sortInfoItems(items), [items])
  const nextSortOrder = items.reduce((max, i) => Math.max(max, i.sort_order), 0) + 1

  const handleSaveItem = async (input: EventInfoItemInput) => {
    if (editing?.item) {
      const updated = await updateInfoItem(editing.item.id, input)
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
    } else {
      const created = await createInfoItem(eventId, input)
      setItems((prev) => [...prev, created])
    }
    setEditing(null)
  }

  const handleDeleteItem = async (item: EventInfoItem) => {
    const ok = await confirm({
      message: t('Radera det här objektet?', 'Delete this item?'),
      destructive: true,
    })
    if (!ok) return
    try {
      await deleteInfoItem(item.id)
      setItems((prev) => prev.filter((i) => i.id !== item.id))
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte radera.', 'Could not delete.'))
    }
  }

  const documentItems = items.filter((i) => i.kind === 'document')

  const handleToggleDocument = async (def: (typeof INFO_DOCUMENTS)[number]) => {
    const existing = documentItems.find((i) => i.doc_key === def.key)
    try {
      if (existing) {
        await deleteInfoItem(existing.id)
        setItems((prev) => prev.filter((i) => i.id !== existing.id))
      } else {
        const created = await createInfoItem(eventId, {
          kind: 'document',
          audiences: def.audiences,
          sort_order: nextSortOrder,
          time_text: null,
          title_sv: def.title_sv,
          title_eng: def.title_eng,
          body_sv: null,
          body_eng: null,
          doc_key: def.key,
        })
        setItems((prev) => [...prev, created])
      }
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte spara.', 'Could not save.'))
    }
  }

  // What's still missing from the data a document is built from — shown next to its switch so
  // the board knows whether it's safe to release.
  const documentHint = (key: InfoDocKey): string | null => {
    const real = acts.filter((a) => a.performer)
    if (real.length === 0) return null
    if (key === 'setList') {
      const missing = real.filter((a) => !a.stage_preparations?.trim()).length
      return missing > 0
        ? t(
            `${missing} av ${real.length} akter saknar scenanteckningar`,
            `${missing} of ${real.length} acts have no stage notes yet`
          )
        : null
    }
    if (key === 'soundLight') {
      const noMusic = real.filter((a) => !actHasMusic(a.audio_files)).length
      const noNotes = real.filter((a) => !a.act_notes?.trim()).length
      const parts = [
        noMusic > 0 ? t(`${noMusic} utan musik`, `${noMusic} without music`) : null,
        noNotes > 0
          ? t(`${noNotes} utan ljus-/ljudönskemål`, `${noNotes} without light/sound notes`)
          : null,
      ].filter(Boolean)
      return parts.length > 0 ? `${t('Av', 'Of')} ${real.length}: ${parts.join(', ')}` : null
    }
    return null
  }

  // Pushes the text as it is now back as the template for future events. Remembers the old
  // template row so "undo" can restore it.
  const handleSetTemplate = async (item: EventInfoItem, input: EventInfoItemInput) => {
    const inferred = templateKeyFor(item)
    const key = template.has(inferred) ? inferred : `custom:${crypto.randomUUID()}`
    const previousRow = template.has(inferred) ? await getSavedTemplateItem(key) : null
    const row: InfoTemplateItem = {
      key,
      kind: input.kind,
      audiences: input.audiences,
      sort_order: item.sort_order,
      time_text: input.time_text,
      title_sv: input.title_sv,
      title_eng: input.title_eng,
      body_sv: input.body_sv,
      body_eng: input.body_eng,
      doc_key: null,
    }
    await saveTemplateItem(row)
    const updated = await updateInfoItem(item.id, { ...input, template_key: key })
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
    setEditing((prev) => (prev ? { ...prev, item: updated } : prev))
    setTemplate((prev) => new Map(prev).set(key, row))
    setTemplateUndo({
      itemId: item.id,
      key,
      previousRow,
      previousItemKey: item.template_key ?? null,
    })
    toast.success(t('Mallen är uppdaterad.', 'Template updated.'))
  }

  const handleUndoTemplate = async () => {
    if (!templateUndo) return
    const { itemId, key, previousRow, previousItemKey } = templateUndo
    if (previousRow) await saveTemplateItem(previousRow)
    else await deleteSavedTemplateItem(key)
    const updated = await updateInfoItem(itemId, { template_key: previousItemKey })
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
    setEditing((prev) => (prev ? { ...prev, item: updated } : prev))
    // Back to the built-in default (or nothing, for a custom row).
    const fresh = await getTemplateItems()
    setTemplate(new Map(fresh.map((r) => [r.key, r])))
    setTemplateUndo(null)
    toast.success(t('Ångrade mallen.', 'Template change undone.'))
  }

  const copyLink = async (audience: InfoAudience) => {
    if (!links) return
    try {
      await navigator.clipboard.writeText(infoLinkUrl(links[audience]))
      toast.success(t('Länk kopierad!', 'Link copied!'))
    } catch {
      toast.error(t('Kunde inte kopiera.', 'Could not copy.'))
    }
  }

  const itemTitle = (item: EventInfoItem) =>
    (language === 'sv' ? item.title_sv || item.title_eng : item.title_eng || item.title_sv) || '—'

  const audienceChips = (item: EventInfoItem) =>
    item.audiences.length === 0
      ? t('Alla', 'Everyone')
      : item.audiences.map((a) => infoAudienceLabel(t, a)).join(', ')

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-text">{t('Öppnar ridån...', 'Opening the curtain...')}</div>
      </div>
    )
  }

  return (
    <div className="space-y-8 text-left">
      {/* Links + email */}
      <section className="space-y-3">
        <h4 className="font-decorative text-lg text-accent text-center">
          {t('Länkar per grupp', 'Links per group')}
        </h4>
        <p className="text-sm text-foreground/60">
          {t(
            'Varje grupp har en egen länk till en infosida på hemsidan. Sidan uppdateras direkt när du ändrar nedan – du behöver inte skicka något nytt.',
            'Each group has its own link to an info page on the website. The page updates as soon as you change anything below – no need to resend.'
          )}
        </p>
        <ul className="admin-panel velvet-surface divide-y divide-accent/10">
          {INFO_AUDIENCES.map((audience) => {
            const count = recipients.get(audience)?.length ?? 0
            return (
              <li key={audience} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="flex-1 min-w-40 text-foreground">
                  {infoAudienceLabel(t, audience)}
                  <span className="ml-2 text-xs text-foreground/50">
                    {t(`${count} mottagare`, `${count} recipients`)}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => copyLink(audience)}
                  className="flex items-center gap-1.5 text-xs py-1.5 px-3 border border-accent/20 rounded text-accent hover:bg-accent hover:text-black transition-colors"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {t('Kopiera länk', 'Copy link')}
                </button>
                <a
                  href={links ? infoLinkUrl(links[audience]) : '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs py-1.5 px-3 border border-accent/20 rounded text-accent hover:bg-accent hover:text-black transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {t('Förhandsgranska', 'Preview')}
                </a>
                <button
                  type="button"
                  disabled={count === 0}
                  onClick={() => setMailTarget(audience)}
                  className="flex items-center gap-1.5 text-xs py-1.5 px-3 border border-accent/20 rounded text-accent hover:bg-accent hover:text-black transition-colors disabled:opacity-30 disabled:pointer-events-none"
                >
                  <Mail className="h-3.5 w-3.5" />
                  {t('Mejla gruppen', 'Email group')}
                </button>
              </li>
            )
          })}
        </ul>
        <p className="text-xs text-foreground/50">
          {t(
            'DJ:s, underhållare och "övrigt" har ingen egen länk än.',
            'DJs, entertainers and "other" do not have a link of their own yet.'
          )}
        </p>
      </section>

      {/* Documents — generated live on download; "released" = marked ready */}
      <section className="space-y-3">
        <h4 className="font-decorative text-lg text-accent text-center">
          {t('Dokument', 'Documents')}
        </h4>
        <p className="text-sm text-foreground/60">
          {t(
            'Dokumenten skapas färska vid varje nedladdning. Släpp ett först när det är klart.',
            'Documents are generated fresh on every download. Release one only when it is ready.'
          )}
        </p>
        <ul className="admin-panel velvet-surface divide-y divide-accent/10">
          {INFO_DOCUMENTS.map((def) => {
            const released = documentItems.some((i) => i.doc_key === def.key)
            const hint = documentHint(def.key)
            return (
              <li key={def.key} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-48">
                  <div className="text-foreground">
                    {language === 'sv' ? def.title_sv : def.title_eng}
                    <span className="ml-2 text-xs text-foreground/50">
                      → {def.audiences.map((a) => infoAudienceLabel(t, a)).join(', ')}
                    </span>
                  </div>
                  {hint && <div className="text-xs text-amber-400">{hint}</div>}
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleDocument(def)}
                  title={
                    released ? t('Klicka för att dra tillbaka', 'Click to withdraw') : undefined
                  }
                  className={`whitespace-nowrap ${
                    released
                      ? 'btn-gold text-xs py-1.5 px-3'
                      : 'btn-gold-outline text-xs py-1.5 px-3'
                  }`}
                >
                  {t('Släpp till sidan', 'Release to page')}
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      {/* Content */}
      <section className="space-y-3">
        <h4 className="font-decorative text-lg text-accent text-center">
          {t('Innehåll', 'Content')}
        </h4>
        {KIND_ORDER.map((kind) => {
          const rows = sortedItems.filter((i) => i.kind === kind)
          const addingHere = editing && !editing.item && editing.kind === kind
          if (rows.length === 0 && !addingHere && kind !== 'text') return null
          const editor = (item?: EventInfoItem) => (
            <InfoItemEditor
              key={item?.id ?? `new-${kind}`}
              kind={kind}
              item={item}
              template={item ? (template.get(templateKeyFor(item)) ?? null) : null}
              canUndoTemplate={Boolean(item && templateUndo?.itemId === item.id)}
              onSetTemplate={item ? (input) => handleSetTemplate(item, input) : undefined}
              onUndoTemplate={handleUndoTemplate}
              nextSortOrder={nextSortOrder}
              onSave={handleSaveItem}
              onCancel={() => setEditing(null)}
            />
          )
          return (
            <div key={kind} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <h6 className="text-xs uppercase tracking-wider text-foreground/50 font-semibold">
                  {kind === 'schedule'
                    ? t('Schema', 'Schedule')
                    : t('Textavsnitt', 'Text sections')}
                </h6>
                <button
                  type="button"
                  onClick={() => setEditing({ kind })}
                  className="btn-gold p-1.5"
                  aria-label={
                    kind === 'schedule'
                      ? t('Lägg till tid i schemat', 'Add schedule row')
                      : t('Lägg till textavsnitt', 'Add text section')
                  }
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              {kind === 'text' && access?.venue && (
                <VenueInfoCard
                  venue={access.venue}
                  onSaved={(venue) => setAccess((prev) => (prev ? { ...prev, venue } : prev))}
                />
              )}
              {rows.length > 0 && (
                <ul className="admin-panel velvet-surface divide-y divide-accent/10">
                  {rows.map((item) =>
                    editing?.item?.id === item.id ? (
                      <li key={item.id} className="p-2">
                        {editor(item)}
                      </li>
                    ) : (
                      <li key={item.id} className="flex items-center gap-3 px-4 py-2">
                        {kind === 'schedule' && (
                          <span className="w-24 shrink-0 font-mono text-accent text-sm">
                            {item.time_text}
                          </span>
                        )}
                        <span className="flex-1 min-w-0 truncate text-foreground">
                          {itemTitle(item)}
                        </span>
                        {hasPlaceholder(item) && (
                          <span className="shrink-0 text-xs px-2 py-0.5 rounded-full border border-accent/40 text-accent bg-accent/10">
                            {t('Fyll i', 'To fill in')}
                          </span>
                        )}
                        <span className="hidden sm:block text-xs text-foreground/50 truncate max-w-48">
                          {audienceChips(item)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditing({ kind: item.kind as EditableKind, item })}
                          className="p-1.5 text-foreground/50 hover:text-accent"
                          aria-label={t('Redigera', 'Edit')}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item)}
                          className="p-1.5 text-foreground/40 hover:text-red-400"
                          aria-label={t('Radera', 'Delete')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    )
                  )}
                </ul>
              )}
              {addingHere && editor()}
            </div>
          )
        })}
      </section>

      {/* Door shifts */}
      <section className="space-y-3">
        <h4 className="font-decorative text-lg text-accent text-center">
          {t('Dörrpass', 'Door shifts')}
        </h4>
        <p className="text-sm text-foreground/60">
          {t(
            'Volontärer skriver upp sig själva på sin länk. Det som är ledigt inför eventet fyller du i här.',
            'Volunteers sign up themselves on their link. Whatever is still open before the event, you fill in here.'
          )}
        </p>
        <InfoDoorShifts
          eventId={eventId}
          eventStart={access?.event_start ?? null}
          volunteerNames={volunteerNames}
          slots={slots}
          onSlotsChange={setSlots}
        />
      </section>

      {mailTarget && links && (
        <InfoMailModal
          audience={mailTarget}
          eventTitle={eventTitle}
          link={infoLinkUrl(links[mailTarget])}
          recipients={recipients.get(mailTarget) ?? []}
          onClose={() => setMailTarget(null)}
        />
      )}
    </div>
  )
}

interface InfoMailModalProps {
  audience: InfoAudience
  eventTitle: string
  link: string
  recipients: Recipient[]
  onClose: () => void
}

// One short email per group — the link does the work, so the text stays brief and never goes
// stale. Each recipient gets it in their own saved language.
const InfoMailModal = ({ audience, eventTitle, link, recipients, onClose }: InfoMailModalProps) => {
  const { t } = useLanguage()
  const [sending, setSending] = useState(false)
  const [subjectSv, setSubjectSv] = useState(`Praktisk info inför ${eventTitle}`)
  const [subjectEng, setSubjectEng] = useState(`Practical info for ${eventTitle}`)
  const [bodySv, setBodySv] = useState(
    `All praktisk info inför ${eventTitle} finns samlad här:\n${link}\n\nSidan uppdateras löpande, så titta gärna in igen inför eventet. Portkoden dyker upp på sidan 38 timmar innan dörrarna öppnar.\n\nVarma hälsningar,\nTip the Velvet`
  )
  const [bodyEng, setBodyEng] = useState(
    `All the practical info for ${eventTitle} is collected here:\n${link}\n\nThe page is updated as we go, so check back before the event. The entry code appears on the page 38 hours before doors open.\n\nBest regards,\nTip the Velvet`
  )

  const handleSend = async () => {
    setSending(true)
    try {
      const results = await Promise.all(
        recipients.map((r) => {
          const sv = r.language === 'sv'
          return sendAdminEmail({
            to: r.email,
            name: r.name,
            subject: sv ? subjectSv : subjectEng,
            bodyText: sv ? bodySv : bodyEng,
            language: sv ? 'sv' : 'en',
            fromName: 'Tip the Velvet',
            greeting: sv ? 'Hej!' : 'Hey!',
          })
        })
      )
      const failed = results.filter((r) => !r.ok).length
      if (failed === 0) {
        toast.success(t('Mailet är skickat!', 'Email sent!'))
        onClose()
      } else {
        toast.error(
          t(
            `${failed} av ${recipients.length} mail kunde inte skickas.`,
            `${failed} of ${recipients.length} emails could not be sent.`
          )
        )
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
      <div className="admin-panel velvet-surface bg-background w-full max-w-3xl p-5 space-y-3 max-h-[90vh] overflow-y-auto">
        <h3>
          {t('Mejla', 'Email')} {infoAudienceLabel(t, audience)} ({recipients.length})
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="form-label-gold block">
              {t('Ämne (svenska)', 'Subject (Swedish)')}
            </span>
            <input
              value={subjectSv}
              onChange={(e) => setSubjectSv(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="space-y-1">
            <span className="form-label-gold block">
              {t('Ämne (engelska)', 'Subject (English)')}
            </span>
            <input
              value={subjectEng}
              onChange={(e) => setSubjectEng(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="space-y-1">
            <span className="form-label-gold block">{t('Text (svenska)', 'Text (Swedish)')}</span>
            <textarea
              rows={9}
              value={bodySv}
              onChange={(e) => setBodySv(e.target.value)}
              className="w-full text-sm bg-black/40 border border-accent/20 rounded p-2 focus:border-accent text-white"
            />
          </label>
          <label className="space-y-1">
            <span className="form-label-gold block">{t('Text (engelska)', 'Text (English)')}</span>
            <textarea
              rows={9}
              value={bodyEng}
              onChange={(e) => setBodyEng(e.target.value)}
              className="w-full text-sm bg-black/40 border border-accent/20 rounded p-2 focus:border-accent text-white"
            />
          </label>
        </div>
        <p className="text-xs text-foreground/50">
          {t(
            'Varje mottagare får mailet på sitt sparade språk.',
            'Each recipient gets the email in their saved language.'
          )}
        </p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-gold-outline text-xs py-2 px-4">
            {t('Avbryt', 'Cancel')}
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={sending}
            className="btn-gold text-xs py-2 px-4"
          >
            {sending ? t('Skickar…', 'Sending…') : t('Skicka', 'Send')}
          </button>
        </div>
      </div>
    </div>
  )
}
