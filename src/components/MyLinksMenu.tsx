import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, X } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { infoAudienceLabel } from '@/lib/eventInfo'
import {
  clearMyLinks,
  getMyLinks,
  removeMyLink,
  subscribeMyLinks,
  type MyLink,
} from '@/lib/myLinks'

// Shown under the logo, and only on a browser that has opened a private link.
export const MyLinksMenu = () => {
  const { t } = useLanguage()
  const [links, setLinks] = useState<MyLink[]>(getMyLinks)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => subscribeMyLinks(() => setLinks(getMyLinks())), [])

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  if (links.length === 0) return null

  const labelFor = (link: MyLink) =>
    `${link.eventTitle} – ${
      link.kind === 'booking'
        ? t('Bokning', 'Booking')
        : link.audience
          ? infoAudienceLabel(t, link.audience)
          : t('Info', 'Info')
    }`

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-1 mx-auto text-[11px] uppercase tracking-[0.2em] text-accent/80 hover:text-accent transition-colors"
      >
        {t('Mina länkar', 'My links')}
        <ChevronDown
          size={12}
          className={open ? 'rotate-180 transition-transform' : 'transition-transform'}
        />
      </button>

      {open && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 w-72 admin-panel velvet-surface p-2 text-left">
          <ul className="divide-y divide-accent/10">
            {links.map((link) => (
              <li key={link.path} className="flex items-center gap-2">
                <Link
                  to={link.path}
                  onClick={() => setOpen(false)}
                  className="flex-1 px-2 py-2 text-sm text-foreground hover:text-accent"
                >
                  {labelFor(link)}
                </Link>
                <button
                  type="button"
                  onClick={() => removeMyLink(link.path)}
                  aria-label={t('Ta bort länken', 'Remove link')}
                  className="p-1.5 text-foreground/40 hover:text-red-400"
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => {
              clearMyLinks()
              setOpen(false)
            }}
            className="w-full px-2 pt-2 text-xs text-foreground/50 hover:text-red-400 text-left"
          >
            {t('Rensa alla (t.ex. på en delad dator)', 'Clear all (e.g. on a shared computer)')}
          </button>
        </div>
      )}
    </div>
  )
}
