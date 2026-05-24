import type { Event } from '@/types/types'

export const ApplicationCard = ({ event }: { event: Event }) => {
  return <>{event.title}</>
}
