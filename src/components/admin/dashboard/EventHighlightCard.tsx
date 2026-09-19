import type { ReactNode } from 'react'
import { Mail } from 'lucide-react'

interface EventHighlightCardProps {
  label: string
  value: string
  icon: ReactNode
  onClick: () => void
  // Omitted entirely for cards with no one specific to email (Music, Key roles, Sponsors,
  // casting-stage cards — none of these has a single person on the other end to nag).
  onEmailAll?: () => void
  emailTitle?: string
}

// Deliberately NOT the same status-strip card used on the Event Plan page — this is a quick
// "something needs attention" signal only (a count + a color), not the full breakdown; the
// admin clicks through to Event Plan (or Casting) for the details. Only ever rendered for
// something that IS missing — the caller filters out anything already fine, so every card
// shown is inherently a "needs attention" card and doesn't need its own icon saying so.
// Compact/content-width by design (not `w-full`) so the dashboard can center any number of
// these in a wrapping row. Direct feedback 2026-09-21.
export const EventHighlightCard = ({
  label,
  value,
  icon,
  onClick,
  onEmailAll,
  emailTitle,
}: EventHighlightCardProps) => (
  <div className="relative admin-panel velvet-surface p-2.5 flex flex-col gap-1 border border-amber-500/30 transition-colors hover:border-amber-500/50 w-fit min-w-[9rem] max-w-[11rem]">
    <button type="button" onClick={onClick} className="flex flex-col gap-1 text-left w-full">
      <div className={`flex items-center gap-1.5 text-xs font-heading text-foreground/60 ${onEmailAll ? 'pr-5' : ''}`}>
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="text-sm text-foreground truncate">{value}</div>
    </button>
    {onEmailAll && (
      <button
        type="button"
        onClick={onEmailAll}
        title={emailTitle}
        className="absolute top-1.5 right-1.5 text-accent/50 hover:text-accent transition-colors"
      >
        <Mail className="h-3.5 w-3.5" />
      </button>
    )}
  </div>
)
