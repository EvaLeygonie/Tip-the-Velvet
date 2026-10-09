/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { fetchEventsForAdmin } from '@/services/eventService'
import { useAuth } from '@/contexts/AuthContext'
import type { Event } from '@/types/types'

export interface CurrentEventContextType {
  events: Event[]
  upcomingEvents: Event[]
  archivedEvents: Event[]
  selectedEventId: string
  setSelectedEventId: (id: string) => void
  selectedEvent: Event | undefined
  loading: boolean
  error: string | null
}

export const CurrentEventContext = createContext<CurrentEventContextType | undefined>(undefined)

export const CurrentEventProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth()
  // Keyed on the id, not the user object: Supabase re-emits the session (new object, same
  // person) whenever the browser tab regains focus, which used to re-run the load below and
  // reset the selected event to the first one — losing whatever the board was working on.
  const userId = user?.id ?? null
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadEvents = async () => {
      if (!userId) {
        setEvents([])
        setSelectedEventId('')
        return
      }

      setLoading(true)
      setError(null)
      try {
        const data = await fetchEventsForAdmin()
        setEvents(data)
        // Keep the current selection if it's still there; only default on first load.
        setSelectedEventId((current) =>
          data.some((e) => e.id === current) ? current : (data[0]?.id ?? '')
        )
      } catch (err) {
        console.error('Kunde inte hämta event:', err)
        setError('Kunde inte läsa in eventlistan.')
      } finally {
        setLoading(false)
      }
    }
    loadEvents()
  }, [userId])

  const todayStr = new Date().toISOString().split('T')[0]
  const upcomingEvents = events.filter((e) => e.event_start && e.event_start >= todayStr)
  const archivedEvents = events.filter((e) => !e.event_start || e.event_start < todayStr)
  const selectedEvent = events.find((e) => e.id === selectedEventId)

  return (
    <CurrentEventContext.Provider
      value={{
        events,
        upcomingEvents,
        archivedEvents,
        selectedEventId,
        setSelectedEventId,
        selectedEvent,
        loading,
        error,
      }}
    >
      {children}
    </CurrentEventContext.Provider>
  )
}

export const useCurrentEvent = () => {
  const context = useContext(CurrentEventContext)
  if (context === undefined) {
    throw new Error('useCurrentEvent måste användas inom en CurrentEventProvider')
  }
  return context
}
