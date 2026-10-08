import { dietaryCategoryLabel, type Translate } from '@/lib/contactLabels'
import type { Language } from '@/types/types'
import type { MissingInfoPerson, MissingItem } from '@/lib/missingInfo'

// The editable building blocks of the "missing info" emails. Artists get one email
// assembled from whichever item lines they're actually missing; volunteers/staff only ever
// owe food info, so theirs is a single plain body. `{name}` and `{link}` are filled in per
// recipient when rendering.
export interface ArtistBlocks {
  subject: string
  greeting: string
  intro: string
  food: string
  notes: string
  receipt: string
  outro: string
}

export interface StaffBlocks {
  subject: string
  greeting: string
  body: string
}

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
      notes:
        '• Your stage notes (stage preparations, pick up/cleaning, sound & lighting). If you have nothing to add, tick "I have nothing to add" and it counts as done.',
      receipt: '• Your travel receipt for the trip to the show',
      outro: 'You can fill everything in via your booking link:\n{link}\n\nWarmly,\nTip the Velvet',
    },
  },
  staff: {
    sv: {
      subject: `Matpreferens — ${eventTitle}`,
      greeting: 'Hej {name}!',
      body: `Inför ${eventTitle} behöver vi veta vad du vill äta. Svara på det här mailet och berätta:\n\n• Vilket alternativ som passar dig: ${foodOptions(svT)}\n• Om du har några allergier\n\nVarma hälsningar,\nTip the Velvet`,
    },
    eng: {
      subject: `Food preference — ${eventTitle}`,
      greeting: 'Hi {name}!',
      body: `For ${eventTitle} we need to know what you'd like to eat. Just reply to this email and tell us:\n\n• Which option suits you: ${foodOptions(engT)}\n• Whether you have any allergies\n\nWarmly,\nTip the Velvet`,
    },
  },
})

export interface RenderedEmail {
  subject: string
  greeting: string
  body: string
}

// Both `name` (for the greeting) and `items` are already resolved by the caller — a shared
// inbox passes the joined names and the union of its members' missing items.
export const renderMissingInfoEmail = (
  templates: MissingInfoTemplates,
  kind: MissingInfoPerson['kind'],
  language: Language,
  names: string,
  items: MissingItem[],
  bookingLink: string | null
): RenderedEmail => {
  if (kind === 'staff') {
    const blocks = templates.staff[language]
    return {
      subject: blocks.subject,
      greeting: blocks.greeting.replaceAll('{name}', names),
      body: blocks.body,
    }
  }
  const blocks = templates.artist[language]
  const itemOrder: MissingItem[] = ['food', 'notes', 'receipt']
  const lines = itemOrder.filter((i) => items.includes(i)).map((i) => blocks[i])
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
