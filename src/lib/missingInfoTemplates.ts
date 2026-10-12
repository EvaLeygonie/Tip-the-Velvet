import { dietaryCategoryLabel, type Translate } from '@/lib/contactLabels'
import type { Language } from '@/types/types'
import { doorPlanSentence, type DoorPlan } from '@/lib/eventInfo'
import type { MissingInfoPerson, MissingItem } from '@/lib/missingInfo'

// The editable building blocks of the "missing info" emails. Artists get one email
// assembled from whichever item lines they're actually missing; volunteers/staff owe food info
// and/or a door shift, assembled the same way. `{name}`, `{link}` and `{plan}` are filled in
// per recipient when rendering.
export interface ArtistBlocks {
  subject: string
  greeting: string
  intro: string
  food: string
  music: string
  notes: string
  receipt: string
  outro: string
}

export interface StaffBlocks {
  subject: string
  greeting: string
  intro: string
  food: string
  // {link} = the volunteer info page, {plan} = "about 1 hour each…" (empty if no plan yet).
  doorshift: string
  outro: string
}

type ArtistItem = Exclude<MissingItem, 'doorshift'>

export interface MissingInfoTemplates {
  artist: Record<Language, ArtistBlocks>
  staff: Record<Language, StaffBlocks>
}

const svT: Translate = (sv) => sv
const engT: Translate = (_sv, en) => en

const foodOptions = (tr: Translate): string =>
  (['all_eater', 'vegetarian', 'vegan'] as const).map((c) => dietaryCategoryLabel(tr, c)).join(', ')

export const buildDefaultTemplates = (eventTitle: string): MissingInfoTemplates => ({
  artist: {
    sv: {
      subject: `Det här saknas inför ${eventTitle}`,
      greeting: 'Hej {name}!',
      intro: `Inför ${eventTitle} saknar vi fortfarande lite information från dig:`,
      food: `• Din matpreferens (${foodOptions(svT)}) samt eventuella allergier`,
      music:
        '• Musik till din akt ({acts}) — skriv låttitel och artist så vi kan hitta låten online, eller ladda upp din egen ljudfil',
      notes:
        '• Dina scenanteckningar (scenförberedelser, plock/städ, ljud & ljus). Har du inget att lägga till, bocka i rutan "Jag har inget att lägga till" så räknas det som klart.',
      receipt: '• Ditt reskvitto för resan till showen',
      outro: 'Allt fyller du i via din bokningslänk:\n{link}\n\nVarma hälsningar,\nTip the Velvet',
    },
    eng: {
      subject: `What we're still missing for ${eventTitle}`,
      greeting: 'Hi {name}!',
      intro: `For ${eventTitle} we're still missing a little information from you:`,
      food: `• Your food preference (${foodOptions(engT)}) and any allergies`,
      music:
        '• Music for your act ({acts}) — write the song title and artist so we can find it online, or upload your own sound file',
      notes:
        '• Your stage notes (stage preparations, pick up/cleaning, sound & lighting). If you have nothing to add, tick "I have nothing to add" and it counts as done.',
      receipt: '• Your travel receipt for the trip to the show',
      outro: 'You can fill everything in via your booking link:\n{link}\n\nWarmly,\nTip the Velvet',
    },
  },
  staff: {
    sv: {
      subject: `Det här behöver vi från dig inför ${eventTitle}`,
      greeting: 'Hej {name}!',
      intro: `Inför ${eventTitle} behöver vi lite information från dig:`,
      food: `• Vad du vill äta: ${foodOptions(svT)} – och om du har några allergier. Svara på det här mailet så noterar vi det.`,
      doorshift: '• Skriv upp dig på ett dörrpass här: {link}\n  {plan}',
      outro: 'Varma hälsningar,\nTip the Velvet',
    },
    eng: {
      subject: `What we still need from you for ${eventTitle}`,
      greeting: 'Hi {name}!',
      intro: `For ${eventTitle} we need a little information from you:`,
      food: `• What you would like to eat: ${foodOptions(engT)} – and whether you have any allergies. Just reply to this email and we will note it down.`,
      doorshift: '• Please put your name on a door shift here: {link}\n  {plan}',
      outro: 'Warmly,\nTip the Velvet',
    },
  },
})

export interface RenderedEmail {
  subject: string
  greeting: string
  body: string
}

// `{acts}` in the music line becomes the artist's act names. Both `name` (for the greeting) and `items` are already resolved by the caller — a shared
// inbox passes the joined names and the union of its members' missing items.
export const renderMissingInfoEmail = (
  templates: MissingInfoTemplates,
  kind: MissingInfoPerson['kind'],
  language: Language,
  names: string,
  items: MissingItem[],
  bookingLink: string | null,
  musicActs: string[] = [],
  door: { infoLink: string | null; plan: DoorPlan | null } = { infoLink: null, plan: null }
): RenderedEmail => {
  if (kind === 'staff') {
    const blocks = templates.staff[language]
    const lines = (['food', 'doorshift'] as const)
      .filter((i) => items.includes(i))
      .map((i) =>
        blocks[i]
          .replaceAll('{link}', door.infoLink ?? '')
          .replaceAll('{plan}', door.plan ? doorPlanSentence(door.plan, language) : '')
          .replace(/\n {2}$/, '')
      )
    return {
      subject: blocks.subject,
      greeting: blocks.greeting.replaceAll('{name}', names),
      body: [blocks.intro, lines.join('\n'), blocks.outro].join('\n\n'),
    }
  }
  const blocks = templates.artist[language]
  const itemOrder: ArtistItem[] = ['food', 'music', 'notes', 'receipt']
  const lines = itemOrder
    .filter((i) => items.includes(i))
    .map((i) => blocks[i].replaceAll('{acts}', musicActs.join(', ')))
  // No link on file → end the sentence there rather than send a dangling "{link}".
  const outro = bookingLink
    ? blocks.outro.replaceAll('{link}', bookingLink)
    : blocks.outro.replace(/:?\n?\{link\}/g, '.')
  return {
    subject: blocks.subject,
    greeting: blocks.greeting.replaceAll('{name}', names),
    body: [blocks.intro, lines.join('\n'), outro].join('\n\n'),
  }
}
