import { useEffect, useState } from 'react'
import { getFeedbackSummary, type FeedbackSummary } from '@/services/feedbackService'

// The public rating summary for one event (null until loaded, or if it can't be read). Shared by
// the small rating by the title and the full rating box so an event page only asks once.
export const useFeedbackSummary = (eventId: string | undefined): FeedbackSummary | null => {
  const [state, setState] = useState<{ eventId: string; summary: FeedbackSummary } | null>(null)

  useEffect(() => {
    if (!eventId) return
    let cancelled = false
    getFeedbackSummary(eventId)
      .then((summary) => !cancelled && setState({ eventId, summary }))
      .catch((err) => console.error(err))
    return () => {
      cancelled = true
    }
  }, [eventId])

  return state && state.eventId === eventId ? state.summary : null
}
