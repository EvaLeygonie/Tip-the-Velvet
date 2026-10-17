import type { StaffVolunteerType } from '@/types/types'

// The info hub: one token link per role per event.
// An item with no stored audiences is shown to everyone; see audiencesToStored for how the editor
// maps "all roles ticked" and "none ticked" onto that.

export type InfoAudience = 'artist' | 'technician' | 'stage_kitten' | 'photographer' | 'volunteer'
export type InfoItemKind = 'schedule' | 'text' | 'document'
export type InfoDocKey = 'setList' | 'soundLight' | 'vipList'

export const INFO_AUDIENCES: InfoAudience[] = [
  'artist',
  'technician',
  'stage_kitten',
  'photographer',
  'volunteer',
]

// Stored in `audiences` for an item that is hidden from every role for this event. It matches no
// link's audience, so get_event_info leaves the item out without any server-side change.
export const HIDDEN_AUDIENCE = 'hidden'

// Editor <-> database: the editor shows exactly who sees an item. Every role ticked is stored as
// [] (what the server treats as "everyone"), none ticked as ['hidden'].
export const audiencesFromStored = (stored: string[]): InfoAudience[] =>
  stored.length === 0 ? [...INFO_AUDIENCES] : INFO_AUDIENCES.filter((a) => stored.includes(a))

export const audiencesToStored = (selected: InfoAudience[]): InfoAudience[] =>
  selected.length === INFO_AUDIENCES.length
    ? []
    : selected.length === 0
      ? ([HIDDEN_AUDIENCE] as unknown as InfoAudience[])
      : selected

// The venue's note (stage size, dressing rooms…) is only shown to these roles; everyone with a
// link sees the address and the nearest stop. Earlier versions used a "---" line to split the
// note in two — stripped here so an old note doesn't show the line.
export const VENUE_NOTE_AUDIENCES: InfoAudience[] = ['artist']
export const cleanVenueNote = (text: string | null | undefined): string =>
  (text ?? '')
    .replace(/^\s*---+\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

export const infoAudienceLabel = (
  t: (sv: string, eng: string) => string,
  audience: InfoAudience
): string => {
  switch (audience) {
    case 'artist':
      return t('Artister', 'Artists')
    case 'technician':
      return t('Tekniker', 'Technician')
    case 'stage_kitten':
      return t('Stage kittens', 'Stage kittens')
    case 'photographer':
      return t('Fotograf', 'Photographer')
    case 'volunteer':
      return t('Volontärer & dörrvakter', 'Volunteers & door staff')
  }
}

// Which info link a confirmed staff row gets. DJs, pre-show entertainers and "other" have no
// link of their own yet — they're handled by hand.
export const audienceForStaffRole = (role: StaffVolunteerType): InfoAudience | null => {
  switch (role) {
    case 'photographer':
      return 'photographer'
    case 'technician':
      return 'technician'
    case 'stage_kitten':
      return 'stage_kitten'
    case 'volunteer':
    case 'doorman':
      return 'volunteer'
    default:
      return null
  }
}

// The documents the board can release to a role's page. Generated fresh on every download from
// the same data as the admin buttons; "released" just means the board has marked it ready.
export const INFO_DOCUMENTS: {
  key: InfoDocKey
  audiences: InfoAudience[]
  title_sv: string
  title_eng: string
}[] = [
  {
    key: 'setList',
    audiences: ['stage_kitten', 'artist'],
    title_sv: 'Setlista & scenanteckningar',
    title_eng: 'Set list & stage notes',
  },
  {
    key: 'soundLight',
    audiences: ['technician'],
    title_sv: 'Ljud & ljus',
    title_eng: 'Sound & light',
  },
  {
    key: 'vipList',
    audiences: ['volunteer'],
    title_sv: 'VIP-lista',
    title_eng: 'VIP list',
  },
]

export interface EventInfoItem {
  id: string
  kind: InfoItemKind
  audiences: InfoAudience[]
  sort_order: number
  time_text: string | null
  title_sv: string | null
  title_eng: string | null
  body_sv: string | null
  body_eng: string | null
  // Only for kind 'document': which generated document this releases (generated on download).
  doc_key: InfoDocKey | null
  // Which template item this was created from (see info_template_items); null = custom.
  template_key?: string | null
  created_at: string
}

export type EventInfoItemInput = Omit<EventInfoItem, 'id' | 'created_at'>

// Minutes since midnight of the first HH:MM in a time label ("ca 22:30", "17:00–18:00"), with
// small hours (00:00–05:59) counted as after midnight so "01:20 Last drinks" sorts after
// "21:00 Show". null when there's no time to sort by.
export const timeSortKey = (timeText: string | null): number | null => {
  const match = timeText?.match(/(\d{1,2})[:.](\d{2})/)
  if (!match) return null
  const hours = Number(match[1])
  return (hours < 6 ? hours + 24 : hours) * 60 + Number(match[2])
}

// Schedule rows by clock time; everything else keeps its manual sort_order.
export const sortInfoItems = <T extends Pick<EventInfoItem, 'kind' | 'time_text' | 'sort_order'>>(
  items: T[]
): T[] =>
  [...items].sort((a, b) => {
    if (a.kind === 'schedule' && b.kind === 'schedule') {
      const ka = timeSortKey(a.time_text)
      const kb = timeSortKey(b.time_text)
      if (ka !== null && kb !== null && ka !== kb) return ka - kb
    }
    return a.sort_order - b.sort_order
  })

// A volunteer's door-shift slot. Time-of-day is rendered in Swedish local time regardless of
// the viewer's device so the page never disagrees with the printed schedule.
export interface DoorSlot {
  id: string
  slot_start: string
  slot_end: string
  volunteer_name: string | null
}

export const formatClock = (iso: string): string =>
  new Date(iso).toLocaleTimeString('sv-SE', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Stockholm',
  })

export const formatDateLong = (iso: string, language: 'sv' | 'eng'): string =>
  new Date(iso).toLocaleDateString(language === 'sv' ? 'sv-SE' : 'en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Stockholm',
  })

// Splits [start, end) into consecutive slots of `minutes`, `seats` rows per slot (a slot with
// two people on the door is two rows with the same start). The last slot is shortened to fit.
export const buildDoorSlots = (
  start: Date,
  end: Date,
  minutes: number,
  seats: number
): { slot_start: string; slot_end: string }[] => {
  const slots: { slot_start: string; slot_end: string }[] = []
  const step = minutes * 60_000
  for (let from = start.getTime(); from < end.getTime(); from += step) {
    const to = Math.min(from + step, end.getTime())
    for (let i = 0; i < seats; i++) {
      slots.push({
        slot_start: new Date(from).toISOString(),
        slot_end: new Date(to).toISOString(),
      })
    }
  }
  return slots
}

// Door staff = the "doorman" role plus volunteers on the guest-list shift (the people who
// sign up for door slots).
export const isDoorStaffRow = (row: { role: string; shift: string | null }): boolean =>
  row.role === 'doorman' || (row.role === 'volunteer' && row.shift === 'guestlist')

const normName = (name: string): string => name.trim().toLowerCase()

// Door staff who haven't put their name on any slot. Volunteers type their own name on the
// page, so a first name alone counts when it is unambiguous among the door staff.
export const findUnplacedDoorStaff = <T extends { name: string }>(
  people: T[],
  slotNames: (string | null)[]
): T[] => {
  const used = new Set(slotNames.filter(Boolean).map((n) => normName(n as string)))
  const firstNames = people.map((p) => normName(p.name).split(/\s+/)[0])
  return people.filter((p, i) => {
    const full = normName(p.name)
    if (used.has(full)) return false
    const first = firstNames[i]
    const unique = firstNames.filter((f) => f === first).length === 1
    return !(unique && used.has(first))
  })
}

// Time windows (distinct start times) where nobody has put their name yet. A window with two
// seats only needs one name.
export const countUncoveredDoorWindows = (slots: DoorSlot[]): number => {
  const windows = new Map<string, boolean>()
  for (const s of slots) windows.set(s.slot_start, windows.get(s.slot_start) || !!s.volunteer_name)
  return Array.from(windows.values()).filter((covered) => !covered).length
}

export interface DoorPlan {
  people: number
  coverageMinutes: number
  // Alone on the door / sharing a shift with someone (double the time).
  soloMinutes: number
  tandemMinutes: number
  // Total time to cover divided by the people, to the nearest 5 minutes — what each person sits
  // on average (the half-hour rounding above is only a rough planning aid).
  averageMinutes: number
  // How many spots exist and how long one is. When there are exactly as many spots as people,
  // everyone simply works one shift.
  spots: number
  slotMinutes: number
}

const roundToHalfHour = (minutes: number): number => Math.max(30, Math.round(minutes / 30) * 30)

// How long each person should expect to stand on the door: the total time the door must be
// covered (one person per window) divided by the number of people, to the nearest half hour.
// Sharing a shift means working it with someone else, so it takes twice as long.
export const planDoorShifts = (
  slots: Pick<DoorSlot, 'slot_start' | 'slot_end'>[],
  people: number
): DoorPlan | null => {
  if (people < 1) return null
  const windows = new Map<string, number>()
  for (const s of slots) {
    windows.set(s.slot_start, new Date(s.slot_end).getTime() - new Date(s.slot_start).getTime())
  }
  const coverageMinutes = Array.from(windows.values()).reduce((sum, ms) => sum + ms / 60_000, 0)
  if (coverageMinutes <= 0) return null
  const soloMinutes = roundToHalfHour(coverageMinutes / people)
  const averageMinutes = Math.max(5, Math.round(coverageMinutes / people / 5) * 5)
  const first = slots[0]
  const slotMinutes = Math.round(
    (new Date(first.slot_end).getTime() - new Date(first.slot_start).getTime()) / 60_000
  )
  return {
    people,
    coverageMinutes,
    soloMinutes,
    tandemMinutes: soloMinutes * 2,
    averageMinutes,
    spots: slots.length,
    slotMinutes,
  }
}

export const formatDuration = (minutes: number, language: 'sv' | 'eng'): string => {
  if (minutes < 60) return `${minutes} min`
  const hours = minutes / 60
  const num = Number.isInteger(hours) ? String(hours) : hours.toFixed(1)
  const shown = language === 'sv' ? num.replace('.', ',') : num
  const plural = hours !== 1
  return language === 'sv'
    ? `${shown} ${plural ? 'timmar' : 'timme'}`
    : `${shown} ${plural ? 'hours' : 'hour'}`
}

// Compact version for tight spots: "1 tim" / "1,5 tim" / "1 h" / "30 min".
export const formatDurationShort = (minutes: number, language: 'sv' | 'eng'): string => {
  if (minutes < 60) return `${minutes} min`
  const hours = minutes / 60
  const num = Number.isInteger(hours) ? String(hours) : hours.toFixed(1)
  return language === 'sv' ? `${num.replace('.', ',')} tim` : `${num} h`
}

export const doorPlanSentence = (plan: DoorPlan, language: 'sv' | 'eng'): string => {
  const total = formatDuration(plan.coverageMinutes, language)
  if (plan.spots === plan.people) {
    const one = formatDuration(plan.slotMinutes, language)
    return language === 'sv'
      ? `Vi är ${plan.people} dörrvolontärer och ${total} att täcka – du står ett pass på ${one}. Välj ditt pass på infosidan.`
      : `We are ${plan.people} door volunteers with ${total} to cover – you work one shift of ${one}. Pick yours on the info page.`
  }
  const average = formatDuration(plan.averageMinutes, language)
  return language === 'sv'
    ? `Vi är ${plan.people} dörrvolontärer och ${total} att täcka, så det blir i snitt ungefär ${average} var. Varje pass måste ha minst en person, så skriv upp dig på minst ett – och ta gärna fler om det behövs.`
    : `We are ${plan.people} door volunteers with ${total} to cover, so it comes to about ${average} each on average. Every shift needs at least one person, so please sign up for at least one – and take more if you can.`
}

// One-hour shifts with exactly as many spots as there are people: every hour gets one spot,
// and the extra people become a second spot in the earliest hours — two at the door as far into
// the night as the numbers allow, then one on the last hours.
export const buildDoorShiftsForPeople = (
  start: Date,
  end: Date,
  minutes: number,
  people: number
) => {
  const windows = buildDoorSlots(start, end, minutes, 1)
  // With 30-minute shifts each person takes two, so there are twice as many spots as people.
  const spots = people * Math.max(Math.round(60 / minutes), 1)
  const doubled = Math.min(Math.max(spots - windows.length, 0), windows.length)
  return {
    slots: windows.flatMap((w, i) => (i < doubled ? [w, { ...w }] : [w])),
    windows: windows.length,
    doubled,
    // People who would not fit even with two spots in every window / windows that would stay empty.
    unplaced: Math.max(spots - windows.length * 2, 0),
    emptyHours: Math.max(windows.length - spots, 0),
  }
}

// The volunteer page's line above the door shifts, built from the shifts that actually exist:
// how many people, how long each works, and how the second spots are spread over the evening.
export const doorShiftSummary = (
  slots: Pick<DoorSlot, 'slot_start' | 'slot_end'>[],
  people: number,
  language: 'sv' | 'eng'
): string | null => {
  const windows: { start: string; end: string; seats: number }[] = []
  for (const s of slots) {
    const last = windows[windows.length - 1]
    if (last && last.start === s.slot_start) last.seats += 1
    else windows.push({ start: s.slot_start, end: s.slot_end, seats: 1 })
  }
  if (windows.length === 0) return null
  const sv = language === 'sv'
  const minutes = Math.round(
    (new Date(windows[0].end).getTime() - new Date(windows[0].start).getTime()) / 60_000
  )
  const doubled = windows.filter((w) => w.seats >= 2).length
  const doublesFirst =
    windows.slice(0, doubled).every((w) => w.seats >= 2) &&
    windows.slice(doubled).every((w) => w.seats === 1)
  const from = formatClock(windows[0].start)
  const split = formatClock(windows[Math.max(doubled - 1, 0)].end)

  const each =
    minutes === 30 && slots.length === people * 2
      ? sv
        ? `${people} volontärer – två pass på 30 minuter var (en timme totalt).`
        : `${people} volunteers – two 30-minute shifts each (one hour in total).`
      : slots.length !== people
        ? sv
          ? `${people} volontärer – ${slots.length} platser.`
          : `${people} volunteers – ${slots.length} spots.`
        : minutes === 60
          ? sv
            ? `${people} volontärer – en timme var.`
            : `${people} volunteers – one hour each.`
          : sv
            ? `${people} volontärer – ett pass var.`
            : `${people} volunteers – one shift each.`

  let spread: string
  if (doubled === 0) spread = sv ? 'En person per pass.' : 'One person per shift.'
  else if (doubled === windows.length)
    spread = sv ? 'Två personer per pass.' : 'Two people per shift.'
  else if (doublesFirst)
    spread = sv
      ? `Två personer per timme ${from}–${split}, sedan en person (ni får såklart sitta fler om ni vill).`
      : `Two people per hour ${from}–${split}, then one (or more if you want).`
  else
    spread = sv
      ? `${doubled} av passen har plats för två personer.`
      : `${doubled} of the shifts have room for two people.`

  return `${each} ${spread}`
}

type Seed = Omit<EventInfoItemInput, 'sort_order'>
const none = { doc_key: null, body_sv: null, body_eng: null, time_text: null }

// Starting point for a new show — the stable parts of what the board has sent before (payment,
// receipts, photo/video terms, brunch, the door instructions) plus the schedule. Times are the
// current format (doors 19:00, show 21:00); set-up/soundcheck are placeholders from the
// previous show at the same venue and MUST be checked per event. Everything stays editable.
const RAW_DEFAULT_INFO_ITEMS: Seed[] = [
  {
    ...none,
    kind: 'schedule',
    audiences: ['artist', 'technician', 'stage_kitten'],
    time_text: '13:00',
    title_sv: 'Uppsättning',
    title_eng: 'Set up',
  },
  {
    ...none,
    kind: 'schedule',
    audiences: ['artist', 'technician', 'stage_kitten'],
    time_text: '15:00',
    title_sv: 'Soundcheck – artister på plats senast 14:45',
    title_eng: 'Soundcheck – artists on site by 14:45',
  },
  {
    ...none,
    kind: 'schedule',
    audiences: ['volunteer'],
    time_text: '18:00–18:30',
    title_sv: 'Dörrpersonal anländer för genomgång',
    title_eng: 'Door staff arrive for a rundown',
  },
  {
    ...none,
    kind: 'schedule',
    audiences: ['artist', 'volunteer'],
    time_text: '17:30',
    title_sv: 'Mat för artister och uppsättningsvolontärer',
    title_eng: 'Food for artists and set-up volunteers',
  },
  {
    ...none,
    kind: 'schedule',
    audiences: [],
    time_text: '19:00',
    title_sv: 'Dörrarna öppnas',
    title_eng: 'Doors open',
  },
  {
    ...none,
    kind: 'schedule',
    audiences: ['photographer', 'volunteer'],
    time_text: '19:00–20:30',
    title_sv: 'Fotohörna',
    title_eng: 'Photo booth',
  },
  {
    ...none,
    kind: 'schedule',
    audiences: [],
    time_text: '21:00',
    title_sv: 'Showen börjar – akt 1',
    title_eng: 'Show starts – act 1',
  },
  {
    ...none,
    kind: 'schedule',
    audiences: [],
    time_text: 'ca 22:00',
    title_sv: 'Paus',
    title_eng: 'Intermission',
  },
  {
    ...none,
    kind: 'schedule',
    audiences: [],
    time_text: 'ca 22:30',
    title_sv: 'Akt 2',
    title_eng: 'Act 2',
  },
  {
    ...none,
    kind: 'schedule',
    audiences: [],
    time_text: '01:20',
    title_sv: 'Sista beställning i baren',
    title_eng: 'Last drinks',
  },
  {
    ...none,
    kind: 'schedule',
    audiences: ['volunteer'],
    time_text: 'ca 01:45–02:15',
    title_sv: 'Nedmontering börjar',
    title_eng: 'Takedown starts',
  },
  {
    ...none,
    kind: 'schedule',
    audiences: [],
    time_text: '02:00',
    title_sv: 'Alla gäster ute',
    title_eng: 'Closing time',
  },
  {
    ...none,
    kind: 'text',
    audiences: ['artist'],
    title_sv: 'Betalning',
    title_eng: 'Payment',
    body_sv:
      'Du kan bli betald på två sätt:\n• Ersättning mot kvitto (upp till överenskommen ersättning). Spara dina kvitton! Det ska finnas svensk moms på kvittot, och varan/tjänsten ska kunna antas vara relevant för showen – t.ex. kläder, tyger, smink eller tågbiljetter. Ta med fysiska kvitton till showen eller maila digitala till oss.\n• Faktura från ditt eget företag eller via ett faktureringsföretag som Frilansfinans (frilansfinans.se). Artistframträdanden är momsfria. Fakturan ska skickas senast en månad efter showen.\n\nFakturaadress: Tip the Velvet ekonomisk förening, org.nr 769633-3777.',
    body_eng:
      'There are two ways to get paid:\n• Reimbursement for expenses (up to the agreed compensation). Save your receipts! They need Swedish VAT, and the item/service should be likely relevant to the show – e.g. clothes, fabric, make-up or train tickets. Bring physical receipts to the show or email us digital ones.\n• An invoice from your own company or through an invoicing company such as Frilansfinans (frilansfinans.se). Live performances are VAT-free. The invoice must reach us within one month after the show.\n\nInvoice address: Tip the Velvet ekonomisk förening, org. no. 769633-3777.',
  },
  {
    ...none,
    kind: 'text',
    audiences: ['artist'],
    title_sv: 'Foto & film',
    title_eng: 'Photo & video',
    body_sv:
      'Alla akter filmas och fotograferas professionellt. Fotografen är på plats tidigt för att ta bilder under soundcheck och backstage-mys – vi anpassar hans närvaro backstage efter vad ni alla är bekväma med.\n\nNi får bilder och film inom en månad efter showen (troligen tidigare). Fotografen ska krediteras när det är möjligt.\n\nNi får använda bilderna ganska fritt, MEN INTE:\n1. Sälja dem utan att först förhandla med fotografen.\n2. Media/press måste betala för användning – kontakta fotografen om en tidning vill använda en bild.\n3. Ändra/redigera bilderna med filter osv. Att beskära är okej.',
    body_eng:
      'All acts are filmed and photographed professionally. Our photographer is on site early to shoot soundcheck and backstage fun – we will adapt his presence backstage to what you are all comfortable with.\n\nYou will receive photos and film within a month after the show (probably sooner). The photographer must be credited whenever possible.\n\nYou can use the images pretty freely, BUT NOT:\n1. Sell them without negotiating with the photographer.\n2. Media/press must pay for use – contact the photographer if a newspaper wants an image.\n3. Edit the images with filters etc. Cropping is fine.',
  },
  {
    ...none,
    kind: 'text',
    audiences: ['artist', 'stage_kitten'],
    title_sv: 'Brunch på söndagen',
    title_eng: 'Sunday brunch',
    body_sv:
      'Burlesque-brunch för artister och arrangörer, inklusive lokala artister och +1 för hitresande artister. Maten är vegetarisk med många veganska alternativ.\n\nTid: 12:00\nPlats: [fyll i adress]\nKostnad: 50 kr/person',
    body_eng:
      'A burlesque brunch for artists and organisers, including local artists and a +1 for travelling artists. The food is vegetarian with plenty of vegan options.\n\nTime: 12:00\nPlace: [fill in address]\nCost: 50 SEK/person',
  },
  {
    ...none,
    kind: 'text',
    audiences: ['volunteer'],
    title_sv: 'Dörrpass',
    title_eng: 'Door shifts',
    body_sv:
      'Dörrvolontärer kommer till lokalen mellan 18:00 och 18:30 för en genomgång innan dörrarna öppnar.\n\nI dörren checkar du in gästerna: bocka av dem på den vanliga gästlistan eller på VIP-listan (länkarna finns under Länkar). Ladda om gästlistan i telefonen så ser du vilka som redan har checkats in av andra volontärer. Är du osäker på något – fråga en av generalerna.\n\nNär showen pågår står du vid dörren till showsalen i stället för vid lokalens entré – så kan du både jobba och se showen. Vi försöker göra det rättvist så att alla får se en del av showen.',
    body_eng:
      'Door volunteers arrive at the venue between 18:00 and 18:30 for a rundown before doors open.\n\nAt the door you check the guests in: tick them off on the regular guest list or on the VIP list (the links are under Links). Reload the guest list on your phone to see who has already been checked in by other volunteers. If you are unsure about anything, ask one of the generals.\n\nWhile the show is on, you stand at the door to the show room instead of the venue entrance – so you can work and watch the show at the same time. We try to make it fair, so everyone gets to see part of the show.',
  },
]

const slug = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

// Items created before templates existed carry no key; match them to a default by title.
export const templateKeyFor = (item: Pick<EventInfoItem, 'kind' | 'title_eng' | 'template_key'>) =>
  item.template_key ?? `${item.kind}:${slug(item.title_eng ?? '')}`

export const DEFAULT_INFO_ITEMS: Seed[] = RAW_DEFAULT_INFO_ITEMS.map((item) => ({
  ...item,
  template_key: templateKeyFor(item),
}))

// A template row = what gets copied into a new event. The built-in defaults above are the
// starting point; the board can overwrite single rows ("set as new template") or add its own.
export type InfoTemplateItem = Omit<EventInfoItemInput, 'template_key'> & { key: string }

// Anything in [square brackets] is a blank the board still has to fill in for this event.
export const hasPlaceholder = (
  item: Pick<EventInfoItem, 'time_text' | 'title_sv' | 'title_eng' | 'body_sv' | 'body_eng'>
): boolean =>
  [item.time_text, item.title_sv, item.title_eng, item.body_sv, item.body_eng].some(
    (v) => v && /\[[^\]]+\]/.test(v)
  )

const norm = (v: string | null | undefined): string => (v ?? '').trim()

// Does an item still match the template row it came from? (Text content and audience only —
// sort order and times are per event.)
export const sameAsTemplate = (
  item: Pick<EventInfoItem, 'audiences' | 'title_sv' | 'title_eng' | 'body_sv' | 'body_eng'>,
  template: Pick<InfoTemplateItem, 'audiences' | 'title_sv' | 'title_eng' | 'body_sv' | 'body_eng'>
): boolean =>
  [...item.audiences].sort().join(',') === [...template.audiences].sort().join(',') &&
  norm(item.title_sv) === norm(template.title_sv) &&
  norm(item.title_eng) === norm(template.title_eng) &&
  norm(item.body_sv) === norm(template.body_sv) &&
  norm(item.body_eng) === norm(template.body_eng)
