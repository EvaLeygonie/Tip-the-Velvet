import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { getVipCheckins, setVipCheckin } from '@/services/eventInfoService'
import type { VipSection } from '@/lib/eventDocuments'

const POLL_MS = 5000

const storageKey = (token: string) => `ttv_vip_checked_${token}`

const readLocal = (token: string): Set<string> => {
  try {
    return new Set(JSON.parse(localStorage.getItem(storageKey(token)) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}

const writeLocal = (token: string, checked: Set<string>) => {
  try {
    localStorage.setItem(storageKey(token), JSON.stringify([...checked]))
  } catch {
    // storage unavailable — the list still works, it just won't survive a refresh offline
  }
}

// Same name twice in a section (manual entries) gets a #2, so the two rows tick independently.
const withKeys = (sections: VipSection[]) =>
  sections.map((section, sectionIndex) => {
    const seen = new Map<string, number>()
    return {
      title: section.title,
      items: section.items.map((item) => {
        const n = (seen.get(item.name) ?? 0) + 1
        seen.set(item.name, n)
        return { ...item, key: `${sectionIndex}|${item.name}${n > 1 ? `#${n}` : ''}` }
      }),
    }
  })

// The door staff's VIP list: a normal page (no pop-up tab, so it opens on any phone) whose
// tick-offs are shared between everyone with the volunteer link, via get/set_vip_checkin.
export const VipList = () => {
  const { t } = useLanguage()
  const { token } = useParams()
  const [list, setList] = useState<{ eventTitle: string; sections: VipSection[] } | null>(null)
  const [failed, setFailed] = useState(false)
  const [checked, setChecked] = useState<Set<string>>(() => (token ? readLocal(token) : new Set()))
  const [synced, setSynced] = useState(true)
  const [query, setQuery] = useState('')
  // Ticks that are sent but not yet confirmed — a poll must not undo them.
  const pending = useRef(new Map<string, boolean>())

  useEffect(() => {
    if (!token) return
    let cancelled = false
    import('@/lib/hubDocuments')
      .then(({ loadHubVipList }) => loadHubVipList(token, t))
      .then((data) => !cancelled && setList(data))
      .catch((err) => {
        console.error(err)
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
    // t changes with the language toggle; the list itself only needs loading once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // Arriving from the hub, mobile browsers can keep the old scroll position once the list has
  // rendered, so go back to the top when it first appears (ScrollToTop only runs on navigation).
  const hasList = list !== null
  useEffect(() => {
    if (hasList) window.scrollTo(0, 0)
  }, [hasList])

  const refresh = useCallback(async () => {
    if (!token) return
    try {
      const keys = new Set(await getVipCheckins(token))
      for (const [key, value] of pending.current) {
        if (value) keys.add(key)
        else keys.delete(key)
      }
      setChecked(keys)
      writeLocal(token, keys)
      setSynced(true)
    } catch {
      setSynced(false)
    }
  }, [token])

  useEffect(() => {
    if (!token) return
    const tick = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    tick()
    const id = window.setInterval(tick, POLL_MS)
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [token, refresh])

  const toggle = async (key: string) => {
    if (!token) return
    const next = !checked.has(key)
    pending.current.set(key, next)
    setChecked((prev) => {
      const copy = new Set(prev)
      if (next) copy.add(key)
      else copy.delete(key)
      writeLocal(token, copy)
      return copy
    })
    try {
      await setVipCheckin(token, key, next)
      setSynced(true)
    } catch {
      setSynced(false)
    } finally {
      if (pending.current.get(key) === next) pending.current.delete(key)
    }
  }

  const sections = useMemo(() => (list ? withKeys(list.sections) : []), [list])
  const total = sections.reduce((sum, s) => sum + s.items.length, 0)
  const done = sections.reduce(
    (sum, s) => sum + s.items.filter((i) => checked.has(i.key)).length,
    0
  )
  const needle = query.trim().toLowerCase()

  if (failed || !token) {
    return (
      <div className="page-shell text-center">
        <h1>{t('Länken fungerar inte', 'This link does not work')}</h1>
        <div className="gold-divider" />
        <p className="text-foreground/70 max-w-md mx-auto">
          {t(
            'Vi kunde inte öppna VIP-listan. Kontrollera länken, eller hör av dig till oss.',
            'We could not open the VIP list. Check the link, or get in touch with us.'
          )}
        </p>
      </div>
    )
  }

  if (!list) {
    return (
      <div className="page-shell">
        <div className="loading-container">
          <div className="loading-text">{t('Öppnar ridån...', 'Opening the curtain...')}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-shell">
      <div className="bg-glow-spot" />
      <div className="max-w-lg mx-auto">
        <Link
          to={`/info/${token}`}
          className="inline-flex items-center gap-1 text-sm text-accent hover:underline mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('Tillbaka', 'Back')}
        </Link>
        <h1>{t('VIP-lista', 'VIP list')}</h1>
        <p className="text-center text-accent italic font-heading -mt-3 mb-0">{list.eventTitle}</p>
        <div className="gold-divider" />

        <p className="text-center text-sm text-foreground/70 mt-2">
          {t(`${done} av ${total} incheckade`, `${done} of ${total} checked in`)}
        </p>
        {!synced && (
          <p className="text-center text-xs text-amber-400 mt-1">
            {t(
              'Ingen kontakt – dina bockar sparas på den här telefonen men delas inte just nu.',
              'No connection – your ticks are saved on this phone but not shared right now.'
            )}
          </p>
        )}

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('Sök namn…', 'Search name…')}
          className="velvet-input mt-6 mb-8"
        />

        <div className="space-y-8 text-left">
          {sections.map((section) => {
            const items = section.items.filter(
              (i) => !needle || i.name.toLowerCase().includes(needle)
            )
            if (items.length === 0) return null
            return (
              <section key={section.title}>
                <h2 className="font-decorative text-lg text-accent border-b border-accent/20 pb-1 mb-1">
                  {section.title}
                </h2>
                <ul>
                  {items.map((item) => {
                    const isChecked = checked.has(item.key)
                    return (
                      <li key={item.key} className="border-b border-accent/10">
                        <button
                          type="button"
                          onClick={() => toggle(item.key)}
                          aria-pressed={isChecked}
                          className="flex w-full items-center gap-3 py-3 text-left"
                        >
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded border-2 ${
                              isChecked ? 'bg-accent border-accent text-black' : 'border-accent/50'
                            }`}
                          >
                            {isChecked && <Check className="h-5 w-5" />}
                          </span>
                          <span className={isChecked ? 'opacity-50 line-through' : ''}>
                            <span className="font-semibold">{item.name}</span>
                            {item.sub && (
                              <span className="block text-xs italic text-accent/80">
                                {item.sub}
                              </span>
                            )}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
