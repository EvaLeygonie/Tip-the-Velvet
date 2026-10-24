import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ClipboardList,
  Clock,
  FileText,
  KeyRound,
  ListMusic,
  MapPin,
  Music2,
  ListOrdered,
  Phone,
  Plus,
} from 'lucide-react'
import { hubLinkExpiry, saveMyLink } from '@/lib/myLinks'
import { useLanguage } from '@/contexts/LanguageContext'
import { useConfirm } from '@/contexts/ConfirmContext'
import {
  addDoorSpot,
  claimDoorSlot,
  getEventInfoByToken,
  getShowOrder,
  type ShowOrderRow,
  releaseDoorSlot,
  type EventInfoPayload,
} from '@/services/eventInfoService'
import {
  formatClock,
  doorBookingInfo,
  slotPartyPhase,
  showStartMinutesFromItems,
  formatDateLong,
  infoAudienceLabel,
  sortInfoItems,
  cleanVenueNote,
  VENUE_NOTE_AUDIENCES,
  timeSortKey,
  type DoorSlot,
  type InfoDocKey,
} from '@/lib/eventInfo'

const NAME_STORAGE_KEY = 'ttv_info_name'

const readStorage = (key: string): string => {
  try {
    return localStorage.getItem(key) ?? ''
  } catch {
    return ''
  }
}
const writeStorage = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value)
  } catch {
    // storage unavailable — the page works the same without it
  }
}

const formatDateTime = (iso: string, language: 'sv' | 'eng') =>
  `${formatDateLong(iso, language)} ${formatClock(iso)}`

export const EventInfoHub = () => {
  const { t, language } = useLanguage()
  const confirm = useConfirm()
  const { token } = useParams()
  const [info, setInfo] = useState<EventInfoPayload | null>(null)
  const [loading, setLoading] = useState(!!token)
  const [slots, setSlots] = useState<DoorSlot[]>([])
  const [name, setName] = useState(() => readStorage(NAME_STORAGE_KEY))
  const [busySlot, setBusySlot] = useState<string | null>(null)
  const [busyDoc, setBusyDoc] = useState<InfoDocKey | null>(null)
  const [busyZip, setBusyZip] = useState(false)
  const [showOrder, setShowOrder] = useState<ShowOrderRow[] | null>(null)

  const [reloadKey, setReloadKey] = useState(0)
  const reload = () => setReloadKey((k) => k + 1)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    const fetchInfo = async () => {
      try {
        const data = await getEventInfoByToken(token)
        if (cancelled) return
        setInfo(data)
        setSlots(data.door_slots ?? [])
        // Artists and stage kittens get the running order as a quick section on the page.
        const hasSetList = data.items.some((i) => i.kind === 'document' && i.doc_key === 'setList')
        if (hasSetList && (data.audience === 'artist' || data.audience === 'stage_kitten')) {
          const order = await getShowOrder(token)
          if (!cancelled) setShowOrder(order)
        }
        saveMyLink(
          {
            path: `/info/${token}`,
            kind: 'hub',
            eventTitle: data.event.title,
            audience: data.audience,
          },
          hubLinkExpiry(data.event.event_start)
        )
      } catch (err) {
        console.error('Kunde inte hämta eventinfo:', err)
        if (!cancelled) setInfo(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchInfo()
    return () => {
      cancelled = true
    }
  }, [token, reloadKey])

  const pick = (sv: string | null, eng: string | null) =>
    language === 'sv' ? sv || eng || '' : eng || sv || ''

  const handleClaim = async (slotId: string, chosenName?: string) => {
    const trimmed = (chosenName ?? name).trim()
    if (!token || !trimmed) {
      toast.error(t('Välj eller skriv ditt namn först.', 'Please choose or enter your name first.'))
      return
    }
    setBusySlot(slotId)
    writeStorage(NAME_STORAGE_KEY, trimmed)
    setName(trimmed)
    try {
      await claimDoorSlot(token, slotId, trimmed)
      toast.success(t('Du står nu på passet!', 'You are on the shift!'))
    } catch {
      toast.error(t('Passet hann bli taget – välj ett annat.', 'That shift was just taken.'))
    } finally {
      setBusySlot(null)
      reload()
    }
  }

  const handleDownload = async (doc: InfoDocKey) => {
    if (!token) return
    setBusyDoc(doc)
    try {
      const { downloadHubDocument } = await import('@/lib/hubDocuments')
      await downloadHubDocument(token, doc, t, info?.audience)
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte skapa dokumentet.', 'Could not create the document.'))
    } finally {
      setBusyDoc(null)
    }
  }

  const handleMusicZip = async () => {
    if (!token) return
    setBusyZip(true)
    try {
      const { downloadHubMusicZip } = await import('@/lib/hubDocuments')
      const { included, failed } = await downloadHubMusicZip(token, t)
      if (included === 0) {
        toast.info(t('Ingen musik uppladdad än.', 'No music uploaded yet.'))
      } else if (failed.length > 0) {
        toast.warning(
          t(
            `${failed.length} fil(er) kunde inte läggas i ZIP-filen: ${failed.join(', ')}`,
            `${failed.length} file(s) couldn't be added to the ZIP: ${failed.join(', ')}`
          )
        )
      }
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte skapa ZIP-filen.', 'Could not create the ZIP.'))
    } finally {
      setBusyZip(false)
    }
  }

  const handleAddSpot = async (slotStart: string) => {
    if (!token) return
    setBusySlot(slotStart)
    try {
      await addDoorSpot(token, slotStart)
    } catch {
      toast.error(
        t('Det gick inte att lägga till en plats just nu.', 'Could not add a spot right now.')
      )
    } finally {
      setBusySlot(null)
      reload()
    }
  }

  const handleRelease = async (slot: DoorSlot) => {
    if (!token) return
    const confirmed = await confirm({
      message: t(
        `Ta bort ${slot.volunteer_name} från passet?`,
        `Remove ${slot.volunteer_name} from this shift?`
      ),
      confirmLabel: t('Ta bort', 'Remove'),
      destructive: true,
    })
    if (!confirmed) return
    setBusySlot(slot.id)
    try {
      await releaseDoorSlot(token, slot.id)
    } catch {
      toast.error(t('Kunde inte ta bort namnet.', 'Could not remove the name.'))
    } finally {
      setBusySlot(null)
      reload()
    }
  }

  if (loading) {
    return (
      <div className="page-shell">
        <div className="loading-container">
          <div className="loading-text">{t('Öppnar ridån...', 'Opening the curtain...')}</div>
        </div>
      </div>
    )
  }

  if (!info) {
    return (
      <div className="page-shell text-center">
        <h1>{t('Länken fungerar inte', 'This link does not work')}</h1>
        <div className="gold-divider" />
        <p className="text-foreground/70 max-w-md mx-auto">
          {t(
            'Vi hittade ingen info för den här länken. Kontrollera att du kopierat hela länken, eller hör av dig till oss.',
            "We couldn't find any info for this link. Check that you copied the whole link, or get in touch with us."
          )}
        </p>
      </div>
    )
  }

  const { event, access, venue, audience } = info
  const items = sortInfoItems(info.items)
  const schedule = items.filter((i) => i.kind === 'schedule')
  const texts = items.filter((i) => i.kind === 'text')
  const documents = items.filter((i) => i.kind === 'document')
  // Only once the board has released the VIP list to the volunteer link.
  const hasVipList = audience === 'volunteer' && documents.some((i) => i.doc_key === 'vipList')
  // On the volunteer page a general shows inside the shift they are in charge of; only generals
  // without one of those shifts stay in the contact list at the top.
  const SHIFT_KEYS = ['setup', 'guestlist', 'takedown']
  const shiftGenerals = info.contacts.filter(
    (c) => c.kind === 'general' && SHIFT_KEYS.includes(c.shift ?? '')
  )
  const generals = info.contacts.filter(
    (c) => c.kind === 'general' && !SHIFT_KEYS.includes(c.shift ?? '')
  )
  const others = info.contacts.filter((c) => c.kind !== 'general')
  const playlistSlots = [
    {
      key: 'preparty',
      label: t(
        'Pre-party – innan showen & mellan akterna',
        'Pre-party – before the show & between acts'
      ),
      url: info.playlists?.before,
    },
    { key: 'afterparty', label: t('After-party', 'After-party'), url: info.playlists?.afterparty },
  ]
  const missingPlaylists = playlistSlots.filter((p) => !p.url).length
  // Everyone sees the address and nearest stop; the note (stage size, mirrors…) only goes to the
  // roles in VENUE_NOTE_AUDIENCES.
  const venueNote =
    venue && VENUE_NOTE_AUDIENCES.includes(audience)
      ? pick(cleanVenueNote(venue.practical_info_sv), cleanVenueNote(venue.practical_info_eng))
      : ''

  // Names for the sign-up dropdown (door staff). Without them the page falls back to typing a name.
  const doorNames = info.door_names ?? null
  // The board switches door shift booking on and off per event (Info & links tab).
  const signupOpen = info.door_signup_open === true
  // 30-minute shifts mean two per person: a name stays selectable until it has all of them.
  const firstSlot = slots[0]
  // Two 30-minute shifts make an hour; with 1-hour shifts everyone takes one.
  const shiftsPerPerson =
    firstSlot &&
    (new Date(firstSlot.slot_end).getTime() - new Date(firstSlot.slot_start).getTime()) / 60_000 <=
      30
      ? 2
      : 1
  // Approximate stage of the party at each shift (mingle, show, break, show, dancefloor).
  const showStart = showStartMinutesFromItems(items)
  const bookedCount = new Map<string, number>()
  for (const sl of slots) {
    const key = sl.volunteer_name?.toLowerCase()
    if (!key) continue
    bookedCount.set(key, (bookedCount.get(key) ?? 0) + 1)
  }
  // Done = all their shifts booked (two half-hours). Done names move to the bottom of the
  // dropdown but can still be picked.
  const placedNames = {
    has: (name: string) => (bookedCount.get(name) ?? 0) >= shiftsPerPerson,
  }

  // Door shifts grouped by start time — a slot with two seats is two rows with the same start.
  const slotGroups = slots.reduce<{ start: string; end: string; rows: DoorSlot[] }[]>(
    (groups, slot) => {
      const last = groups[groups.length - 1]
      if (last && last.start === slot.slot_start) last.rows.push(slot)
      else groups.push({ start: slot.slot_start, end: slot.slot_end, rows: [slot] })
      return groups
    },
    []
  )
  const myName = name.trim().toLowerCase()

  // Volunteer page: one card per shift (driving is coordinated by hand, so it has none). Items
  // are placed by what they are about — time of day for the schedule, keywords in the title
  // for text blocks — since info items are tagged by role, not by shift.
  const isVolunteer = audience === 'volunteer'
  const SETUP_BEFORE = 18 * 60
  const TAKEDOWN_FROM = 25 * 60
  // Doors open (19:00) is the one evening time that matters to the setup people too; the photo
  // booth is not something the guest list shift needs.
  const isDoorsOpen = (item: (typeof schedule)[number]) =>
    timeSortKey(item.time_text) === 19 * 60 &&
    /dörrarna|doors/i.test(`${item.title_sv} ${item.title_eng}`)
  const isPhotoBooth = (item: (typeof schedule)[number]) =>
    /fotohörn|photo ?booth/i.test(`${item.title_sv} ${item.title_eng}`)
  const shiftOfSchedule = (item: (typeof schedule)[number]) => {
    const key = timeSortKey(item.time_text)
    if (key === null) return 'guestlist'
    return key < SETUP_BEFORE ? 'setup' : key >= TAKEDOWN_FROM ? 'takedown' : 'guestlist'
  }
  const shiftOfText = (item: (typeof texts)[number]) => {
    const title = `${item.title_sv ?? ''} ${item.title_eng ?? ''}`.toLowerCase()
    if (/dörr|door|gästlista|guest ?list|vip/.test(title)) return 'guestlist'
    if (/uppsättning|set.?up/.test(title)) return 'setup'
    if (/nedmontering|take.?down|städ|clean/.test(title)) return 'takedown'
    return 'general'
  }
  const generalTexts = isVolunteer ? texts.filter((i) => shiftOfText(i) === 'general') : texts

  const renderSchedule = (rows: typeof schedule) => (
    <ul className="divide-y divide-accent/10">
      {rows.map((item) => (
        <li key={item.id} className="flex gap-4 py-2.5">
          <span className="w-28 shrink-0 font-mono text-accent text-sm pt-0.5">
            {item.time_text}
          </span>
          <span className="min-w-0 text-foreground [overflow-wrap:anywhere]">
            {pick(item.title_sv, item.title_eng)}
            {pick(item.body_sv, item.body_eng) && (
              <span className="block text-sm text-foreground/60 whitespace-pre-line [overflow-wrap:anywhere]">
                {pick(item.body_sv, item.body_eng)}
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  )

  const renderTextCard = (item: (typeof texts)[number]) => (
    <section key={item.id} className="space-y-3 break-inside-avoid">
      <h2>{pick(item.title_sv, item.title_eng)}</h2>
      <div className="admin-panel velvet-surface p-5">
        <p className="text-foreground/80 whitespace-pre-line [overflow-wrap:anywhere]">
          {pick(item.body_sv, item.body_eng)}
        </p>
      </div>
    </section>
  )

  const documentsBlock = documents.length > 0 && (
    <section className="space-y-3">
      <h2>{t('Dokument', 'Documents')}</h2>
      <ul className="admin-panel velvet-surface divide-y divide-accent/10">
        {documents.map((item) =>
          item.doc_key ? (
            <li key={item.id}>
              <button
                type="button"
                disabled={busyDoc === item.doc_key}
                onClick={() => handleDownload(item.doc_key as InfoDocKey)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-foreground hover:text-accent disabled:opacity-60"
              >
                <FileText className="h-4 w-4 shrink-0" />
                {audience === 'artist' && item.doc_key === 'setList'
                  ? t('Showordning', 'Show order')
                  : pick(item.title_sv, item.title_eng)}
                <span className="ml-auto text-xs text-foreground/50">
                  {busyDoc === item.doc_key
                    ? t('Skapar…', 'Creating…')
                    : t('Ladda ner PDF', 'Download PDF')}
                </span>
              </button>
              {item.doc_key === 'soundLight' && (
                <button
                  type="button"
                  disabled={busyZip}
                  onClick={handleMusicZip}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-foreground hover:text-accent disabled:opacity-60"
                >
                  <Music2 className="h-4 w-4 shrink-0" />
                  {t('Alla musikfiler', 'All music files')}
                  <span className="ml-auto text-xs text-foreground/50">
                    {busyZip
                      ? t('Samlar filerna…', 'Gathering files…')
                      : t('Ladda ner ZIP', 'Download ZIP')}
                  </span>
                </button>
              )}
            </li>
          ) : null
        )}
      </ul>
    </section>
  )

  const playlistsBlock = audience === 'technician' && (
    <section className="space-y-3">
      <h2 className="flex items-center justify-center gap-2">
        <ListMusic className="h-5 w-5 text-accent" />
        {t('Spellistor', 'Playlists')}
      </h2>
      {missingPlaylists > 0 && (
        <p className="velvet-warning-box text-sm">
          {t(
            `${missingPlaylists} av 2 spellistor saknas än – vi lägger upp dem här så fort de är klara.`,
            `${missingPlaylists} of 2 playlists are still missing – we'll add them here as soon as they're ready.`
          )}
        </p>
      )}
      <ul className="admin-panel velvet-surface divide-y divide-accent/10">
        {playlistSlots.map((p) => (
          <li key={p.key}>
            {p.url ? (
              <a
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-3 px-4 py-3 text-foreground hover:text-accent"
              >
                <Music2 className="h-4 w-4 shrink-0" />
                {p.label}
                <span className="ml-auto text-xs text-foreground/50">{t('Öppna', 'Open')}</span>
              </a>
            ) : (
              <div className="w-full flex items-center gap-3 px-4 py-3 text-foreground/50">
                <Music2 className="h-4 w-4 shrink-0" />
                {p.label}
                <span className="ml-auto text-xs italic text-accent/80">
                  {t('Saknas än', 'Not added yet')}
                </span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  )

  const doorCodeBlock = access?.door_code && (
    <div className="flex items-start gap-3">
      <KeyRound className="h-5 w-5 text-accent shrink-0 mt-0.5" />
      <div>
        <div className="form-label-gold">{t('Portkod / väg in', 'Entry code')}</div>
        <div className="text-2xl font-mono tracking-widest text-foreground">{access.door_code}</div>
      </div>
    </div>
  )

  const checkinBlock = access?.has_checkin_url && (
    <div className="flex items-start gap-3">
      <ClipboardList className="h-5 w-5 text-accent shrink-0 mt-0.5" />
      <div>
        <div className="form-label-gold">
          {t('Gästlista (incheckning)', 'Guest list (check-in)')}
        </div>
        {access.checkin_url ? (
          <a
            href={access.checkin_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            {t('Öppna gästlistan', 'Open the guest list')}
          </a>
        ) : (
          <p className="text-sm text-foreground/70">
            {t(
              `Länken visas här från ${formatDateTime(access.checkin_reveal_at, language)}.`,
              `The link appears here from ${formatDateTime(access.checkin_reveal_at, language)}.`
            )}
          </p>
        )}
      </div>
    </div>
  )

  const contactsBlock = (generals.length > 0 || others.length > 0) && (
    <div className="space-y-2">
      {generals.length > 0 && (
        <ContactList
          centered
          label={t(
            'Dina generaler – rapportera till dem under kvällen',
            'Your generals – report to them during the evening'
          )}
          contacts={generals}
        />
      )}
      {others.length > 0 && (
        <ContactList
          centered
          label={t('Nå oss under dagen', 'Reach us on the day')}
          contacts={others}
        />
      )}
    </div>
  )

  // Entry code, guest list and VIP list belong to the door shift on the volunteer page.
  // The Kontakt card looks the same on every page. Entry code and check-in link sit in it for
  // every role except volunteers (theirs live in the Guest list & door section).
  const accessBlock = (!isVolunteer && (doorCodeBlock || checkinBlock) ? true : contactsBlock) && (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center justify-center gap-2">
        <Phone className="h-5 w-5 text-accent" />
        {t('Kontakt', 'Contact')}
      </h2>
      <div className="admin-panel velvet-surface p-4 flex-1 flex flex-col justify-center gap-2 text-center text-lg leading-7 [&>div]:justify-center">
        {!isVolunteer && access?.door_code && (
          <div>
            <span className="form-label-gold !text-base">{t('Portkod', 'Entry code')}</span>{' '}
            <span className="font-mono tracking-widest text-accent">{access.door_code}</span>
          </div>
        )}
        {contactsBlock}
      </div>
    </section>
  )

  const scheduleBlock = schedule.length > 0 && !isVolunteer && (
    <section className="space-y-3">
      <h2 className="flex items-center justify-center gap-2">
        <Clock className="h-5 w-5 text-accent" />
        {t('Kvällens schema', 'Schedule')}
      </h2>
      <div className="admin-panel velvet-surface px-4">{renderSchedule(schedule)}</div>
    </section>
  )

  const showOrderBlock = showOrder && showOrder.length > 0 && (
    <section className="space-y-3">
      <h2 className="flex items-center justify-center gap-2">
        <ListOrdered className="h-5 w-5 text-accent" />
        {t('Showordning', 'Show order')}
      </h2>
      <div className="admin-panel velvet-surface px-4">
        <ol className="divide-y divide-accent/10">
          {showOrder.map((row, i) => (
            <li key={row.position}>
              {row.setNumber === 2 && showOrder[i - 1]?.setNumber === 1 && (
                <div className="py-2 text-center text-xs font-semibold uppercase tracking-widest text-accent">
                  {t('— Paus —', '— Break —')}
                </div>
              )}
              <div className="flex gap-3 py-2.5">
                <span className="w-7 shrink-0 font-mono text-accent text-sm pt-0.5">
                  {row.position}.
                </span>
                <span className="min-w-0 text-foreground">
                  {row.performer && <span className="font-semibold">{row.performer}</span>}
                  {row.performer && row.act ? ' – ' : ''}
                  <span className={row.performer ? 'text-foreground/70' : ''}>{row.act}</span>
                </span>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )

  const venueBlock = venue && (venue.location || venueNote) && (
    <section className="flex flex-col gap-3 break-inside-avoid">
      <h2 className="flex items-center justify-center gap-2">
        <MapPin className="h-5 w-5 text-accent" />
        {t('Plats', 'Place')}
      </h2>
      <div className="admin-panel velvet-surface p-4 space-y-2 text-center flex-1 flex flex-col justify-center text-lg leading-7">
        <p className="text-foreground font-semibold">{venue.name}</p>
        <p className="text-foreground">
          {venue.location}
          {venue.map_link && (
            <>
              {' · '}
              <a
                href={venue.map_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                {t('Karta', 'Map')}
              </a>
            </>
          )}
        </p>
        {venue.nearest_stop && (
          <p className="text-foreground/80">
            {t('Närmaste hållplats', 'Nearest stop')}: {venue.nearest_stop}
          </p>
        )}
        {venueNote && (
          <p className="text-foreground/80 whitespace-pre-line [overflow-wrap:anywhere]">
            {venueNote}
          </p>
        )}
      </div>
    </section>
  )

  // Once every time slot has at least one person, a one-person slot can get a second spot (+).
  const allSlotsCovered =
    slotGroups.length > 0 && slotGroups.every((g) => g.rows.some((r) => r.volunteer_name))

  // Fair booking with 30-minute shifts: one shift in the first two hours (the easiest ones) and
  // one after. Names that already have a shift in a part are greyed out on the other slots there.
  const earlyEndMs = slots[0] ? new Date(slots[0].slot_start).getTime() + 2 * 3_600_000 : 0
  const namesIn = (early: boolean) =>
    new Set(
      slots
        .filter(
          (sl) => sl.volunteer_name && new Date(sl.slot_start).getTime() < earlyEndMs === early
        )
        .map((sl) => sl.volunteer_name!.toLowerCase())
    )
  const earlyEndClock = formatClock(new Date(earlyEndMs).toISOString())
  const earlyNames = namesIn(true)
  const lateNames = namesIn(false)

  // The dropdown's options for one time slot: names still to book first, then "done" (all their
  // shifts booked — still pickable), then names already on an early shift (not pickable for
  // another early slot).
  const renderNameOptions = (group: { start: string; rows: DoorSlot[] }, names: string[]) => {
    const early = new Date(group.start).getTime() < earlyEndMs
    const inRow = (n: string) =>
      group.rows.some((r) => r.volunteer_name?.toLowerCase() === n.toLowerCase())
    const blocked = (n: string) =>
      shiftsPerPerson === 2 && (early ? earlyNames : lateNames).has(n.toLowerCase())
    const free = names.filter((n) => !inRow(n) && !blocked(n) && !placedNames.has(n.toLowerCase()))
    const done = names.filter((n) => !inRow(n) && !blocked(n) && placedNames.has(n.toLowerCase()))
    const alreadyInPart = names.filter((n) => !inRow(n) && blocked(n))
    return (
      <>
        <option value="">{t('Välj ditt namn…', 'Choose your name…')}</option>
        {free.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
        {done.length > 0 && (
          <optgroup label={t('Klara', 'Done')}>
            {done.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </optgroup>
        )}
        {alreadyInPart.length > 0 && (
          <optgroup
            label={
              early
                ? t(
                    `Har redan ett pass före ${earlyEndClock} – ett per del`,
                    `Already has a shift before ${earlyEndClock} – one per part`
                  )
                : t(
                    `Har redan ett pass efter ${earlyEndClock} – ett per del`,
                    `Already has a shift after ${earlyEndClock} – one per part`
                  )
            }
          >
            {alreadyInPart.map((n) => (
              <option key={n} value={n} disabled>
                {n}
              </option>
            ))}
          </optgroup>
        )}
      </>
    )
  }

  const doorBlock = slotGroups.length > 0 && (
    <div className="space-y-3">
      <ul className="divide-y divide-accent/10">
        {slotGroups.map((group) => (
          <li key={group.start} className="py-2.5 flex items-center gap-4">
            <span className="w-28 shrink-0 font-mono text-accent text-sm">
              {formatClock(group.start)}–{formatClock(group.end)}
              {showStart !== null && (
                <span
                  className={`block font-body text-[11px] italic ${
                    slotPartyPhase(group.start, showStart) === 'show'
                      ? 'text-accent'
                      : 'text-foreground/50'
                  }`}
                >
                  (
                  {
                    {
                      mingle: t('mingel', 'mingle'),
                      show: 'show',
                      break: t('paus', 'break'),
                      dancefloor: t('dansgolv', 'dancefloor'),
                    }[slotPartyPhase(group.start, showStart)]
                  }
                  )
                </span>
              )}
            </span>
            <div className="grid flex-1 grid-cols-1 items-center gap-3 sm:grid-cols-[1fr_1fr_2rem]">
              {group.rows.map((slot) =>
                slot.volunteer_name ? (
                  <div
                    key={slot.id}
                    className="flex min-w-0 items-center justify-between gap-2 text-sm"
                  >
                    <span
                      className={
                        slot.volunteer_name.toLowerCase() === myName
                          ? 'text-accent font-semibold'
                          : 'text-foreground'
                      }
                    >
                      {slot.volunteer_name}
                    </span>
                    <button
                      type="button"
                      disabled={busySlot === slot.id}
                      onClick={() => handleRelease(slot)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      {t('Ta bort', 'Remove')}
                    </button>
                  </div>
                ) : doorNames ? (
                  <select
                    key={slot.id}
                    value=""
                    disabled={busySlot === slot.id}
                    onChange={(e) => e.target.value && handleClaim(slot.id, e.target.value)}
                    className="velvet-input min-w-0"
                  >
                    {renderNameOptions(group, doorNames)}
                  </select>
                ) : (
                  <button
                    key={slot.id}
                    type="button"
                    disabled={busySlot === slot.id}
                    onClick={() => {
                      const typed = window.prompt(t('Ditt namn?', 'Your name?'), name)
                      if (typed) handleClaim(slot.id, typed)
                    }}
                    className="btn-gold-outline text-xs py-1.5 px-3"
                  >
                    {t('Ta det här passet', 'Take this shift')}
                  </button>
                )
              )}
              {allSlotsCovered && group.rows.length === 1 && doorNames && (
                <button
                  type="button"
                  disabled={busySlot === group.start}
                  onClick={() => handleAddSpot(group.start)}
                  title={t('Lägg till en plats så ni kan vara två', 'Add a spot so two can sit')}
                  aria-label={t('Lägg till en plats', 'Add a spot')}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-accent/40 bg-accent/10 text-accent transition-colors hover:bg-accent hover:text-black sm:col-start-3"
                >
                  <Plus className="h-4 w-4" />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )

  // A strip with the general(s) in charge, right under a section title: name plus a big,
  // tap-to-call number. Setup and takedown share one strip.
  const renderGeneralsRow = (shiftKeys: string[]) => {
    const seen = new Set<string>()
    const people = shiftGenerals.filter((c) => {
      if (!shiftKeys.includes(c.shift ?? '') || seen.has(c.name)) return false
      seen.add(c.name)
      return true
    })
    if (people.length === 0) return null
    return (
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 rounded-lg border border-accent/40 bg-accent/10 px-4 py-3">
        <span className="form-label-gold text-center">
          {people.length > 1
            ? t('Generalerna som ansvarar för ditt pass:', 'The generals in charge of your shift:')
            : t('Generalen som ansvarar för ditt pass:', 'The general in charge of your shift:')}
        </span>
        {people.map((c) => (
          <a
            key={c.name}
            href={`tel:${c.phone.replace(/\s/g, '')}`}
            className="flex items-center gap-3 hover:text-accent"
          >
            <span className="text-foreground">{c.name}</span>
            <span className="font-mono text-accent">{c.phone}</span>
          </a>
        ))}
      </div>
    )
  }

  const renderSectionTitle = (title: string) => (
    <div className="text-center space-y-2">
      <h2 className="!pb-0">{title}</h2>
      <div className="gold-divider" />
    </div>
  )

  const renderShiftContent = (shiftKey: string) => {
    const rows = schedule.filter(
      (i) =>
        (shiftOfSchedule(i) === shiftKey && !(shiftKey === 'guestlist' && isPhotoBooth(i))) ||
        (shiftKey === 'setup' && isDoorsOpen(i))
    )
    const shiftTexts = texts.filter((i) => shiftOfText(i) === shiftKey)
    if (rows.length === 0 && shiftTexts.length === 0) return null
    return (
      <div className="space-y-5">
        {rows.length > 0 && renderSchedule(rows)}
        {shiftTexts.map((item) => (
          <div key={item.id} className="space-y-1.5">
            <h3 className="form-label-gold">{pick(item.title_sv, item.title_eng)}</h3>
            <p className="text-foreground/80 whitespace-pre-line [overflow-wrap:anywhere]">
              {pick(item.body_sv, item.body_eng)}
            </p>
          </div>
        ))}
      </div>
    )
  }

  const pairCards = [
    { key: 'setup', title: t('Uppsättning', 'Setup') },
    { key: 'takedown', title: t('Nedmontering', 'Takedown') },
  ]
  const guestlistContent = renderShiftContent('guestlist')
  const vipBlock = hasVipList && (
    <div className="flex items-start gap-3">
      <FileText className="h-5 w-5 text-accent shrink-0 mt-0.5" />
      <div>
        <div className="form-label-gold">{t('VIP-lista', 'VIP list')}</div>
        <Link to={`/info/${token}/vip`} className="text-sm text-white hover:underline">
          {t('Öppna VIP-listan', 'Open the VIP list')}
        </Link>
      </div>
    </div>
  )
  const linksBlock = (checkinBlock || vipBlock) && (
    <div className="space-y-3">
      <h3 className="font-decorative text-lg text-accent">{t('Länkar', 'Links')}</h3>
      {checkinBlock}
      {vipBlock}
    </div>
  )
  const guestlistSide = (doorCodeBlock || linksBlock || doorBlock) && (
    <div className="space-y-5">
      {doorCodeBlock}
      {linksBlock}
      {doorBlock && !signupOpen && (
        <div className="space-y-2 border-t border-accent/10 pt-5">
          <h3 className="font-decorative text-lg text-accent">{t('Dörrpass', 'Door shifts')}</h3>
          <p className="text-sm text-left text-foreground/80">
            {t(
              'Bokningen av dörrpass är pausad just nu medan vi reder ut några praktiska detaljer. Vi skickar ett mejl till dig så fort den är öppen igen och du kan välja ditt/dina pass.',
              'Booking of door shifts is on hold for the moment while we sort out some logistics. We will send you an email as soon as it is ready and you can pick your shift(s).'
            )}
          </p>
        </div>
      )}
      {doorBlock && signupOpen && (
        <div className="space-y-3 border-t border-accent/10 pt-5">
          <h3 className="font-decorative text-lg text-accent">
            {t('Dörrpass – skriv upp dig', 'Door shifts – sign up')}
          </h3>
          <p className="text-sm text-left text-foreground/80">{doorBookingInfo(slots, language)}</p>
          {doorBlock}
        </div>
      )}
    </div>
  )

  return (
    <div className="page-shell">
      <div className="bg-glow-spot" />
      <h1>{event.title}</h1>
      <p
        className={`text-center text-accent italic font-heading -mt-3 ${isVolunteer ? 'mb-1' : 'mb-6'}`}
      >
        {formatDateLong(event.event_start, language)} · {infoAudienceLabel(t, audience)}
      </p>
      {isVolunteer && (
        <p className="text-center text-base italic text-foreground/70 mb-6">
          {t('Leta upp avsnittet för ditt/dina pass', 'Find the section for your shift(s)')}
        </p>
      )}
      <div className="gold-divider" />

      {isVolunteer ? (
        <div className="space-y-10 text-left mt-10">
          {(accessBlock || venueBlock) && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-stretch">
              {venueBlock}
              {accessBlock}
            </div>
          )}

          <section className="space-y-5">
            {renderSectionTitle(t('Uppsättning & nedmontering', 'Setup & takedown'))}
            {renderGeneralsRow(['setup', 'takedown'])}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-stretch">
              {pairCards.map((card) => {
                const content = renderShiftContent(card.key)
                return (
                  <div key={card.key} className="admin-panel velvet-surface p-5 md:p-6 space-y-4">
                    <h3 className="font-decorative text-lg text-accent">{card.title}</h3>
                    {content ?? (
                      <p className="text-sm text-foreground/50 italic">
                        {t(
                          'Mer info om det här passet kommer här.',
                          'More info about this shift will appear here.'
                        )}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </section>

          <section className="space-y-5">
            {renderSectionTitle(t('Gästlista & dörr', 'Guest list & door'))}
            {renderGeneralsRow(['guestlist'])}
            <div className="admin-panel velvet-surface p-5 md:p-6 space-y-6">
              {(guestlistContent || guestlistSide) && (
                <div
                  className={`grid grid-cols-1 gap-8 items-start ${guestlistContent && guestlistSide ? 'lg:grid-cols-2' : ''}`}
                >
                  {guestlistContent}
                  {guestlistSide}
                </div>
              )}
            </div>
          </section>

          {generalTexts.length > 0 && (
            <div className="lg:columns-2 gap-6 space-y-6">{generalTexts.map(renderTextCard)}</div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 items-start text-left mt-10">
          {/* Artists have the most text, so contact goes at the top of the left column and documents
              below the schedule. The photographer has contact and place together on the left and
              the schedule on the right. Every other role: place and schedule on the left, contact
              and documents at the top of the right column. */}
          <div className="space-y-6 min-w-0">
            {(audience === 'artist' || audience === 'photographer') && accessBlock}
            {venueBlock}
            {audience !== 'photographer' && scheduleBlock}
            {showOrderBlock}
            {audience === 'artist' && documentsBlock}
          </div>
          <div className="space-y-6 min-w-0">
            {audience === 'photographer' && (
              <>
                {documentsBlock}
                {scheduleBlock}
              </>
            )}
            {audience !== 'artist' && audience !== 'photographer' && (
              <>
                {accessBlock}
                {documentsBlock}
                {playlistsBlock}
              </>
            )}
            {generalTexts.map(renderTextCard)}
          </div>
        </div>
      )}
    </div>
  )
}

interface ContactListProps {
  label: string
  contacts: EventInfoPayload['contacts']
  // Centered, compact rows without an icon, for the volunteer page's Kontakt card (the icon
  // sits in the card's heading there).
  centered?: boolean
}

const ContactList = ({ label, contacts, centered }: ContactListProps) => (
  <div className={centered ? 'text-center space-y-2' : 'flex items-start gap-3'}>
    {!centered && <Phone className="h-5 w-5 text-accent shrink-0 mt-0.5" />}
    <div className={centered ? 'space-y-2' : 'space-y-1'}>
      <div className="form-label-gold !text-base">{label}</div>
      <ul className={centered ? 'space-y-2' : 'space-y-0.5'}>
        {contacts.map((c) => (
          <li key={`${c.kind}-${c.name}`}>
            <a
              href={`tel:${c.phone.replace(/\s/g, '')}`}
              className="text-foreground hover:text-accent"
            >
              {c.name} · {c.phone}
            </a>
          </li>
        ))}
      </ul>
    </div>
  </div>
)
