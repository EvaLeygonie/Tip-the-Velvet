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
//
// The whole card (minus the mail button) is clickable via onClick on the outer div rather
// than a nested <button>, so the mail button can sit as a true flex sibling next to the
// label — vertically centered against it for free via `items-center`, instead of an
// absolutely-positioned icon guessing its own offset (which looked misaligned once the
// label row's own height changed). Same pattern as EventSponsorRow's expand-on-click row.
export const EventHighlightCard = ({
  label,
  value,
  icon,
  onClick,
  onEmailAll,
  emailTitle,
}: EventHighlightCardProps) => (
  <div
    className="admin-panel velvet-surface p-4 flex flex-col gap-2 border border-amber-500/30 transition-colors hover:border-amber-500/50 cursor-pointer w-fit min-w-[12rem] max-w-[15rem]"
    onClick={onClick}
  >
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-sm font-heading text-foreground/60 min-w-0">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      {onEmailAll && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onEmailAll()
          }}
          title={emailTitle}
          className="text-accent/50 hover:text-accent transition-colors shrink-0"
        >
          <Mail className="h-4 w-4" />
        </button>
      )}
    </div>
    <div className="text-lg text-foreground truncate">{value}</div>
  </div>
)
