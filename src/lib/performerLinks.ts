import { createContext, useContext } from 'react'

// performer_id → the artist's own booking page (/casting/confirm/…?token=…). Provided by pages
// that know the event's performers, so a deeply nested row can link its artist's name without
// every parent passing the map down.
const PerformerLinksContext = createContext<Record<string, string>>({})
export const PerformerLinksProvider = PerformerLinksContext.Provider

export const usePerformerLink = (performerId: string | null | undefined): string | null => {
  const links = useContext(PerformerLinksContext)
  return (performerId ? links[performerId] : undefined) ?? null
}

export const bookingPortalPath = (applicationId: string, token: string): string =>
  `/casting/confirm/${applicationId}?token=${token}`
