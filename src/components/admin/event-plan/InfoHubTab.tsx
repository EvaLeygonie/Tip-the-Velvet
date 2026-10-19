import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Copy, Download, ExternalLink, Mail, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import { useConfirm } from '@/contexts/ConfirmContext'
import { useCurrentEvent } from '@/contexts/CurrentEventContext'
import {
  INFO_AUDIENCES,
  audiencesFromStored,
  showStartMinutesFromItems,
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
  setDoorSignupOpen,
  type EventAccessFields,
} from '@/services/eventInfoService'
import type {
  AdminEventActRow,
  AdminEventPerformerRow,
  AdminEventStaffRow,
} from '@/services/eventService'
import { getDocumentHint } from '@/lib/documentHints'
import { groupStaffRowsByPerson } from '@/lib/staffRowGrouping'
import { downloadEventDocuments, loadEventDocContext } from '@/lib/eventDocuments'
import { GroupMailModal, type MailRecipient as Recipient } from './GroupMailModal'
import { doorSplitMailDefaults, infoMailDefaults, infoUpdateMailDefaults } from '@/lib/mailDefaults'
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
  const { selectedEvent } = useCurrentEvent()
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
  const [doorSplitMail, setDoorSplitMail] = useState<Recipient[] | null>(null)
  const [mailTarget, setMailTarget] = useState<{
    audience: InfoAudience
    kind: 'info' | 'update'
  } | null>(null)

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

  // Clicking a row opens its edit form below it; clicking again closes it.
  const toggleEditing = (item: EventInfoItem) =>
    setEditing((prev) =>
      prev?.item?.id === item.id ? null : { kind: item.kind as EditableKind, item }
    )

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

  const handleToggleSignup = async (open: boolean) => {
    try {
      await setDoorSignupOpen(eventId, open)
      setAccess((prev) => (prev ? { ...prev, door_signup_open: open } : prev))
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte spara.', 'Could not save.'))
    }
  }

  // After 1-hour shifts were split into 30 minutes: offer an email to everyone who was moved.
  const handleDoorSplit = (movedNames: string[]) => {
    const wanted = new Set(movedNames.map((n) => n.toLowerCase()))
    const seen = new Set<string>()
    const people: Recipient[] = []
    for (const row of staffRows.filter(isDoorStaffRow)) {
      const key = row.staff.name.toLowerCase()
      if (!wanted.has(key) || seen.has(key) || !row.staff.email) continue
      seen.add(key)
      people.push({
        email: row.staff.email,
        name: row.staff.name,
        language: row.staff.language === 'eng' ? 'eng' : 'sv',
      })
    }
    if (people.length > 0) setDoorSplitMail(people)
    if (!access?.door_signup_open) {
      toast.info(
        t(
          'Dörrpassen är fortfarande dolda för volontärerna – slå på dem innan du mejlar.',
          'The door shifts are still hidden from volunteers – switch them on before you email.'
        )
      )
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

  // Downloads the document exactly as the role page would serve it (the VIP list without emails),
  // so what gets released can be checked first.
  const handlePreviewDocument = async (key: InfoDocKey) => {
    try {
      const ctx = await loadEventDocContext(
        {
          t,
          eventTitle,
          eventStart: access?.event_start ?? undefined,
          acts,
          performers,
          groupedStaff: groupStaffRowsByPerson(staffRows),
          omitEmails: key === 'vipList',
        },
        eventId
      )
      await downloadEventDocuments([key], ctx)
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte skapa dokumentet.', 'Could not create the document.'))
    }
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
      : audiencesFromStored(item.audiences).length === 0
        ? t('Dold', 'Hidden')
        : audiencesFromStored(item.audiences)
            .map((a) => infoAudienceLabel(t, a))
            .join(', ')

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
                  href={links?.[audience] ? infoLinkUrl(links[audience]) : undefined}
                  aria-disabled={!links?.[audience]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-1.5 text-xs py-1.5 px-3 border border-accent/20 rounded text-accent hover:bg-accent hover:text-black transition-colors ${
                    links?.[audience] ? '' : 'opacity-30 pointer-events-none'
                  }`}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {t('Förhandsgranska', 'Preview')}
                </a>
                <button
                  type="button"
                  disabled={count === 0}
                  onClick={() => setMailTarget({ audience, kind: 'info' })}
                  className="flex items-center gap-1.5 text-xs py-1.5 px-3 border border-accent/20 rounded text-accent hover:bg-accent hover:text-black transition-colors disabled:opacity-30 disabled:pointer-events-none"
                >
                  <Mail className="h-3.5 w-3.5" />
                  {t('Mejla gruppen', 'Email group')}
                </button>
                <button
                  type="button"
                  disabled={count === 0}
                  onClick={() => setMailTarget({ audience, kind: 'update' })}
                  title={t(
                    'Skicka uppdatering – något har ändrats',
                    'Send update – something changed'
                  )}
                  aria-label={t('Skicka uppdatering', 'Send update')}
                  className="flex items-center gap-1.5 text-xs py-1.5 px-2.5 border border-accent/20 rounded text-accent hover:bg-accent hover:text-black transition-colors disabled:opacity-30 disabled:pointer-events-none"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
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
            const hint = getDocumentHint(t, def.key, acts)
            return (
              <li key={def.key} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-48 text-foreground">
                  {language === 'sv' ? def.title_sv : def.title_eng}
                  {hint && (
                    <Link
                      to="/admin/casting"
                      state={{ tab: 'show' }}
                      title={t('Öppna showplaneringen', 'Open show planning')}
                      className="ml-1.5 text-xs text-amber-400 hover:underline"
                    >
                      ({hint})
                    </Link>
                  )}
                  <span className="ml-2 text-xs text-foreground/50">
                    → {def.audiences.map((a) => infoAudienceLabel(t, a)).join(', ')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handlePreviewDocument(def.key)}
                  title={t('Ladda ner för kontroll', 'Download to check')}
                  className="flex items-center justify-center gap-1.5 w-40 text-xs py-1.5 px-3 border border-accent/20 rounded text-accent hover:bg-accent hover:text-black transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  {t('Förhandsgranska', 'Preview')}
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleDocument(def)}
                  title={
                    released ? t('Klicka för att dra tillbaka', 'Click to withdraw') : undefined
                  }
                  className={`flex items-center justify-center w-40 whitespace-nowrap text-xs py-1.5 px-3 border rounded transition-colors ${
                    released
                      ? 'bg-accent text-black border-accent hover:bg-accent/80'
                      : 'border-accent/20 text-accent hover:bg-accent hover:text-black'
                  }`}
                >
                  {released
                    ? t('Släppt till sidan', 'Released to page')
                    : t('Släpp till sidan', 'Release to page')}
                </button>
              </li>
            )
          })}
        </ul>
        <p className="text-xs text-foreground/60">
          {t('Gästlistelänk:', 'Guest list link:')}{' '}
          <span className={access?.checkin_url ? 'text-foreground/80' : 'text-amber-400'}>
            {access?.checkin_url ? t('inlagd', 'set') : t('inte inlagd än', 'not set yet')}
          </span>
          {selectedEvent?.slug && (
            <>
              {' · '}
              <Link
                to={`/admin/event-editor/${selectedEvent.slug}`}
                className="underline hover:text-accent"
              >
                {t('Redigera i eventredigeraren', 'Edit in the Event Editor')}
              </Link>
            </>
          )}
        </p>
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
                  className="flex h-7 w-7 items-center justify-center rounded border border-accent/40 bg-accent/10 text-accent hover:bg-accent hover:text-black transition-colors"
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
                  {rows.map((item) => (
                    <li key={item.id}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleEditing(item)}
                        onKeyDown={(e) => e.key === 'Enter' && toggleEditing(item)}
                        className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-accent/5"
                      >
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
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteItem(item)
                          }}
                          className="p-1.5 text-foreground/40 hover:text-red-400"
                          aria-label={t('Radera', 'Delete')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      {editing?.item?.id === item.id && <div className="p-2">{editor(item)}</div>}
                    </li>
                  ))}
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
            'Alla tar två pass på 30 min: ett under de första två timmarna och ett efter. På sidan går det inte att ta två pass i samma del, men här kan du lägga in vem som helst var som helst. Man får ta fler än två. När varje tid har minst en person visas en + på tider med en person, så man kan lägga till en plats och vara två. Det som är ledigt inför eventet fyller du i här.',
            'Everyone takes two 30-minute shifts: one in the first two hours and one after. On the page nobody can take two in the same part, but here you can put anyone anywhere. You can take more than two. Once every time slot has at least one person, a + appears on slots with one person, so a spot can be added to sit two. Whatever is still open before the event, you fill in here.'
          )}
        </p>
        <label className="admin-panel velvet-surface flex cursor-pointer items-center gap-3 px-4 py-3">
          <input
            type="checkbox"
            checked={access?.door_signup_open ?? false}
            onChange={(e) => handleToggleSignup(e.target.checked)}
            className="h-4 w-4 accent-accent"
          />
          <span className="text-foreground">
            {t('Visa dörrpassen på volontärsidan', 'Show the door shifts on the volunteer page')}
          </span>
          <span className="ml-auto text-xs text-foreground/50">
            {access?.door_signup_open
              ? t('Volontärerna kan boka', 'Volunteers can book')
              : t('Dold – de ser ett "pausad"-meddelande', 'Hidden – they see an "on hold" notice')}
          </span>
        </label>
        <InfoDoorShifts
          eventId={eventId}
          eventStart={access?.event_start ?? null}
          volunteerNames={volunteerNames}
          showStartMinutes={showStartMinutesFromItems(items)}
          slots={slots}
          onSlotsChange={setSlots}
          onSplit={handleDoorSplit}
        />
      </section>

      {doorSplitMail && links && (
        <GroupMailModal
          title={t('Be om ett pass till', 'Ask for one more shift')}
          recipients={doorSplitMail}
          defaults={doorSplitMailDefaults(eventTitle, infoLinkUrl(links.volunteer))}
          onClose={() => setDoorSplitMail(null)}
        />
      )}

      {mailTarget && links && (
        <GroupMailModal
          title={`${mailTarget.kind === 'update' ? t('Skicka uppdatering till', 'Send update to') : t('Mejla', 'Email')} ${infoAudienceLabel(t, mailTarget.audience)}`}
          recipients={recipients.get(mailTarget.audience) ?? []}
          defaults={
            mailTarget.kind === 'update'
              ? infoUpdateMailDefaults(eventTitle, infoLinkUrl(links[mailTarget.audience]))
              : infoMailDefaults(eventTitle, infoLinkUrl(links[mailTarget.audience]))
          }
          onClose={() => setMailTarget(null)}
        />
      )}
    </div>
  )
}
