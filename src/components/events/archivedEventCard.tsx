import { Calendar, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import CloudinaryImage from '@/components/CloudinaryImage'
import type { Event, OldEvent } from '@/types'
import { formatDate } from '@/lib/utils'

export const ArchivedEventCard = ({ event }: { event: Event | OldEvent }) => {
  const isOldEvent = 'date' in event
  const dateValue = isOldEvent ? event.date : event.event_start
  const type = isOldEvent ? 'old' : 'event'

  return (
    <Link
      to={`/events/${type}/${event.slug}`}
      className="group relative flex flex-col bg-card-bg border border-accent/10 rounded-lg overflow-hidden hover:-translate-y-2 transition-all duration-500 shadow-xl"
    >
      <div className="relative aspect-video overflow-hidden">
        {event.image_id ? (
          <CloudinaryImage publicId={event.image_id} width={800} height={600} />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-gradient-to-b from-accent/5 to-transparent">
            <div className="text-center space-y-2">
              <Sparkles className="w-10 h-10 text-accent/20 mx-auto" />
              <span className="block font-decorative text-[9px] tracking-widest text-accent/30 uppercase">
                TBA
              </span>
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent to-transparent shadow-[0_0_10px_theme(colors.accent.DEFAULT)]" />
      </div>

      <div className="p-5 space-y-3 bg-gradient-to-b from-black/20 to-transparent">
        <h3 className="text-xl font-decorative text-accent group-hover:text-white transition-colors">
          {event.title}
        </h3>
        <div className="flex items-center gap-2 text-xs opacity-60 font-sans tracking-widest uppercase">
          <Calendar className="w-3 h-3 text-accent" />
          <span>{formatDate(dateValue)}</span>
        </div>
      </div>
    </Link>
  )
}
