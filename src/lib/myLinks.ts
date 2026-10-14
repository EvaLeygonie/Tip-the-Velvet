import type { InfoAudience } from '@/lib/eventInfo'

// "My links": the private links (an event's info hub, an artist's booking page) this browser has
// opened, so they can be found again from the navbar. Kept only in this browser — it is a
// shortcut for people who already have their emailed link, not a login.

export interface MyLink {
  path: string
  kind: 'hub' | 'booking'
  eventTitle: string
  audience?: InfoAudience
  expiresAt: number
}

const STORAGE_KEY = 'ttv_my_links'
const CHANGE_EVENT = 'ttv-my-links-changed'
const DAY_MS = 24 * 60 * 60 * 1000

const readAll = (): MyLink[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as MyLink[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const writeAll = (links: MyLink[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(links))
  } catch {
    // storage unavailable — the pages work the same without the shortcut
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

// Expired entries (a few days after the event) are left out when reading.
export const getMyLinks = (): MyLink[] => readAll().filter((l) => l.expiresAt > Date.now())

export const saveMyLink = (link: Omit<MyLink, 'expiresAt'>, expiresAt?: number) => {
  const entry: MyLink = { ...link, expiresAt: expiresAt ?? Date.now() + 90 * DAY_MS }
  writeAll([entry, ...readAll().filter((l) => l.path !== entry.path)])
}

export const removeMyLink = (path: string) => writeAll(readAll().filter((l) => l.path !== path))

export const clearMyLinks = () => writeAll([])

export const subscribeMyLinks = (callback: () => void) => {
  window.addEventListener(CHANGE_EVENT, callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback)
    window.removeEventListener('storage', callback)
  }
}

// Info hub links stop showing three days after the event.
export const hubLinkExpiry = (eventStart: string) => new Date(eventStart).getTime() + 3 * DAY_MS
