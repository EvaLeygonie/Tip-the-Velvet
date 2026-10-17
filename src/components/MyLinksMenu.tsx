import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Link2, X } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { infoAudienceLabel } from '@/lib/eventInfo'
import {
  clearMyLinks,
  getMyLinks,
  removeMyLink,
  subscribeMyLinks,
  type MyLink,
} from '@/lib/myLinks'

// Icon button next to the login icon, and only on a browser that has opened a private link.
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
        aria-label={t('Mina länkar', 'My links')}
        title={t('Mina länkar', 'My links')}
        className="text-accent/80 hover:text-accent transition-all p-2"
      >
        <Link2 size={22} strokeWidth={1.8} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-accent/30 bg-background shadow-2xl shadow-black/60 p-2 text-left">
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
