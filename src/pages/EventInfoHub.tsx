import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ClipboardList, Clock, FileText, KeyRound, MapPin, Music2, Phone } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import {
  claimDoorSlot,
  getEventInfoByToken,
  releaseDoorSlot,
  type EventInfoPayload,
} from '@/services/eventInfoService'
import {
  INFO_TOKEN_STORAGE_KEY,
  formatClock,
  doorPlanSentence,
  formatDateLong,
  infoAudienceLabel,
  planDoorShifts,
  sortInfoItems,
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
  const { token } = useParams()
  const [info, setInfo] = useState<EventInfoPayload | null>(null)
  const [loading, setLoading] = useState(!!token)
  const [slots, setSlots] = useState<DoorSlot[]>([])
  const [name, setName] = useState(() => readStorage(NAME_STORAGE_KEY))
  const [busySlot, setBusySlot] = useState<string | null>(null)
  const [busyDoc, setBusyDoc] = useState<InfoDocKey | null>(null)
  const [busyZip, setBusyZip] = useState(false)

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
        writeStorage(INFO_TOKEN_STORAGE_KEY, token)
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

  const handleClaim = async (slotId: string) => {
    const trimmed = name.trim()
    if (!token || !trimmed) {
      toast.error(t('Skriv ditt namn först.', 'Please enter your name first.'))
      return
    }
    setBusySlot(slotId)
    writeStorage(NAME_STORAGE_KEY, trimmed)
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
      await downloadHubDocument(token, doc, t)
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

  const handleRelease = async (slot: DoorSlot) => {
    if (!token) return
    if (
      !window.confirm(
        t(
          `Ta bort ${slot.volunteer_name} från passet?`,
          `Remove ${slot.volunteer_name} from this shift?`
        )
      )
    )
      return
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
  const generals = info.contacts.filter((c) => c.kind === 'general')
  const others = info.contacts.filter((c) => c.kind !== 'general')
  const venueInfo = venue ? pick(venue.practical_info_sv, venue.practical_info_eng) : ''

  const doorPlan = planDoorShifts(slots, info.door_people ?? 0)

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

  return (
    <div className="page-shell">
      <div className="bg-glow-spot" />
      <h1>{event.title}</h1>
      <p className="text-center text-accent italic font-heading -mt-2">
        {formatDateLong(event.event_start, language)} · {infoAudienceLabel(t, audience)}
      </p>
      <div className="gold-divider" />

      <div className="max-w-3xl mx-auto space-y-6 text-left">
        {/* Access + contacts */}
        {(access?.has_door_code || access?.has_checkin_url || info.contacts.length > 0) && (
          <section className="admin-panel velvet-surface p-5 space-y-4">
            {access?.has_door_code && (
              <div className="flex items-start gap-3">
                <KeyRound className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                <div>
                  <div className="form-label-gold">{t('Portkod / väg in', 'Entry code')}</div>
                  {access.door_code ? (
                    <div className="text-2xl font-mono tracking-widest text-foreground">
                      {access.door_code}
                    </div>
                  ) : (
                    <p className="text-sm text-foreground/70">
                      {t(
                        `Koden visas här från ${formatDateTime(access.reveal_at, language)}.`,
                        `The code appears here from ${formatDateTime(access.reveal_at, language)}.`
                      )}
                    </p>
                  )}
                </div>
              </div>
            )}
            {access?.has_checkin_url && (
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
            )}
            {generals.length > 0 && (
              <ContactList
                label={t(
                  'Dina generaler – rapportera till dem under kvällen',
                  'Your generals – report to them during the evening'
                )}
                contacts={generals}
              />
            )}
            {others.length > 0 && (
              <ContactList
                label={t('Nå oss under dagen', 'Reach us on the day')}
                contacts={others}
                backupLabel={t('reserv', 'backup')}
              />
            )}
          </section>
        )}

        {/* Schedule */}
        {schedule.length > 0 && (
          <section className="space-y-3">
            <h2 className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-accent" />
              {t('Kvällens schema', 'Schedule')}
            </h2>
            <ul className="admin-panel velvet-surface divide-y divide-accent/10">
              {schedule.map((item) => (
                <li key={item.id} className="flex gap-4 px-4 py-2.5">
                  <span className="w-28 shrink-0 font-mono text-accent text-sm pt-0.5">
                    {item.time_text}
                  </span>
                  <span className="text-foreground">
                    {pick(item.title_sv, item.title_eng)}
                    {pick(item.body_sv, item.body_eng) && (
                      <span className="block text-sm text-foreground/60 whitespace-pre-line">
                        {pick(item.body_sv, item.body_eng)}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Door shifts (volunteer link only) */}
        {audience === 'volunteer' && slotGroups.length > 0 && (
          <section className="space-y-3">
            <h2>{t('Dörrpass', 'Door shifts')}</h2>
            <div className="admin-panel velvet-surface p-4 space-y-3">
              {doorPlan && (
                <p className="text-sm text-foreground/80">{doorPlanSentence(doorPlan, language)}</p>
              )}
              <div className="space-y-1">
                <label className="form-label-gold block" htmlFor="door-name">
                  {t('Ditt namn', 'Your name')}
                </label>
                <input
                  id="door-name"
                  type="text"
                  value={name}
                  maxLength={60}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-9 text-sm bg-black/40 border border-accent/20 rounded p-2 focus:border-accent text-white"
                />
              </div>
              <ul className="divide-y divide-accent/10">
                {slotGroups.map((group) => (
                  <li key={group.start} className="py-2.5 flex gap-4">
                    <span className="w-28 shrink-0 font-mono text-accent text-sm pt-1">
                      {formatClock(group.start)}–{formatClock(group.end)}
                    </span>
                    <div className="flex-1 space-y-1.5">
                      {group.rows.map((slot) =>
                        slot.volunteer_name ? (
                          <div
                            key={slot.id}
                            className="flex items-center justify-between gap-2 text-sm"
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
                              className="text-xs text-foreground/50 hover:text-red-400"
                            >
                              {t('Ta bort', 'Remove')}
                            </button>
                          </div>
                        ) : (
                          <button
                            key={slot.id}
                            type="button"
                            disabled={busySlot === slot.id}
                            onClick={() => handleClaim(slot.id)}
                            className="btn-gold-outline text-xs py-1.5 px-3"
                          >
                            {t('Ta det här passet', 'Take this shift')}
                          </button>
                        )
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Venue */}
        {venue && (venueInfo || venue.location) && (
          <section className="space-y-3">
            <h2 className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-accent" />
              {venue.name}
            </h2>
            <div className="admin-panel velvet-surface p-5 space-y-3">
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
              {venueInfo && <p className="text-foreground/80 whitespace-pre-line">{venueInfo}</p>}
            </div>
          </section>
        )}

        {/* Text blocks */}
        {texts.map((item) => (
          <section key={item.id} className="space-y-3">
            <h2>{pick(item.title_sv, item.title_eng)}</h2>
            <div className="admin-panel velvet-surface p-5">
              <p className="text-foreground/80 whitespace-pre-line">
                {pick(item.body_sv, item.body_eng)}
              </p>
            </div>
          </section>
        ))}

        {/* Documents — generated fresh on each download */}
        {documents.length > 0 && (
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
                      {pick(item.title_sv, item.title_eng)}
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
        )}
      </div>
    </div>
  )
}

interface ContactListProps {
  label: string
  contacts: EventInfoPayload['contacts']
  backupLabel?: string
}

const ContactList = ({ label, contacts, backupLabel }: ContactListProps) => (
  <div className="flex items-start gap-3">
    <Phone className="h-5 w-5 text-accent shrink-0 mt-0.5" />
    <div className="space-y-1">
      <div className="form-label-gold">{label}</div>
      <ul className="space-y-0.5">
        {contacts.map((c) => (
          <li key={`${c.kind}-${c.name}`}>
            <a
              href={`tel:${c.phone.replace(/\s/g, '')}`}
              className="text-foreground hover:text-accent"
            >
              {c.name} · {c.phone}
            </a>
            {c.kind === 'backup' && backupLabel && (
              <span className="ml-2 text-xs text-foreground/50">({backupLabel})</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  </div>
)
