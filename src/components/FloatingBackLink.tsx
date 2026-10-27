import { useEffect, useState, type RefObject } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

interface FloatingBackLinkProps {
  to: string
  label: string
  // On desktop, line the arrow up with this element (the page title) as it sits at the top of the
  // page. The arrow itself stays fixed on screen, so it keeps that height while the page scrolls.
  alignTo?: RefObject<HTMLElement | null>
}

const ARROW_SIZE = 44

// Fixed-position back arrow, used on pages long enough that scrolling back up to reach
// an inline header link would be annoying.
export const FloatingBackLink = ({ to, label, alignTo }: FloatingBackLinkProps) => {
  const [top, setTop] = useState<number | null>(null)

  useEffect(() => {
    if (!alignTo) return
    // Position in the page, not the window, so scrolling at the time of measuring doesn't matter
    const measure = () => {
      const el = alignTo.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      setTop(Math.round(rect.top + window.scrollY + rect.height / 2 - ARROW_SIZE / 2))
    }
    measure()
    // The menu bar above can change height as the page settles (login state, fonts)
    const settle = window.setTimeout(measure, 600)
    window.addEventListener('resize', measure)
    return () => {
      window.clearTimeout(settle)
      window.removeEventListener('resize', measure)
    }
  }, [alignTo])

  return (
    <Link
      to={to}
      title={label}
      aria-label={label}
      className="floating-back-link md:top-[var(--back-top)]"
      style={top === null ? undefined : ({ '--back-top': `${top}px` } as React.CSSProperties)}
    >
      <ArrowLeft size={18} />
    </Link>
  )
}
