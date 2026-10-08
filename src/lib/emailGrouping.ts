import type { Language } from '@/types/types'

// Several people can share one inbox (e.g. two volunteers on the same address) — they get a
// single email addressed to all of them instead of the same message twice. Grouped
// case-insensitively; the group takes the first member's language.
export interface EmailGroup<T> {
  members: T[]
  email: string
  language: Language
}

export const groupByEmail = <T extends { email: string; language?: Language }>(
  items: T[]
): EmailGroup<T>[] => {
  const groups = new Map<string, EmailGroup<T>>()
  for (const item of items) {
    const key = item.email.trim().toLowerCase()
    const existing = groups.get(key)
    if (existing) existing.members.push(item)
    else
      groups.set(key, {
        members: [item],
        email: item.email,
        language: item.language === 'eng' ? 'eng' : 'sv',
      })
  }
  return [...groups.values()]
}

// "Lee", "Lee and Verena", "Lee, Verena and Sam" — joined in the email's own language.
export const joinNames = (names: string[], language: Language): string => {
  if (names.length <= 1) return names[0] ?? ''
  const and = language === 'eng' ? 'and' : 'och'
  return `${names.slice(0, -1).join(', ')} ${and} ${names[names.length - 1]}`
}
