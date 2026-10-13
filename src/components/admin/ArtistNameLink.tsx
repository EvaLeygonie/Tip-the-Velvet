import type { ReactNode } from 'react'

interface ArtistNameLinkProps {
  href: string | null | undefined
  children: ReactNode
  className?: string
}

// An artist's name that opens their booking page in a new tab (what they filled in, their
// logistics, acts and music in one place). Plain text when there is no page to open. Clicks
// don't bubble, so it works inside rows that expand when clicked.
export const ArtistNameLink = ({ href, children, className = '' }: ArtistNameLinkProps) =>
  href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      title="Öppna bokningssidan / Open the booking page"
      className={`hover:text-accent hover:underline ${className}`}
    >
      {children}
    </a>
  ) : (
    <span className={className}>{children}</span>
  )
