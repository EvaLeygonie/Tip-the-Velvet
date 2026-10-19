import { useState } from 'react'
import { useLocation } from 'react-router-dom'

// A page's active tab that survives a refresh (kept in sessionStorage, per page). A tab a link
// asked for (navigate(path, { state: { tab } })) wins on arrival, but once the person has picked
// another tab on that same navigation entry, a refresh keeps their pick, not the old link's.
export const useRememberedTab = <T extends string>(
  page: string,
  allowed: readonly T[],
  fallback: T,
  linked?: T
): [T, (tab: T) => void] => {
  const { key } = useLocation()
  const storageKey = `ttv-tab:${page}`

  const read = (): { tab?: string; key?: string } => {
    try {
      return JSON.parse(sessionStorage.getItem(storageKey) ?? '{}')
    } catch {
      return {}
    }
  }

  const [tab, setTabState] = useState<T>(() => {
    const saved = read()
    const savedTab = allowed.find((a) => a === saved.tab)
    if (linked && !(savedTab && saved.key === key)) return linked
    return savedTab ?? linked ?? fallback
  })

  const setTab = (next: T) => {
    setTabState(next)
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({ tab: next, key }))
    } catch {
      // storage unavailable: the tab just won't survive a refresh
    }
  }

  return [tab, setTab]
}
