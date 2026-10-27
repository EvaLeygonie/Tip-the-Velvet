import { Calendar, Sparkles, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import CloudinaryImage from '@/components/CloudinaryImage'
import type { Event, OldEvent } from '@/types/types'
import { formatDate } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'

export const ArchivedEventCard = ({
  event,
  rating,
}: {
  event: Event | OldEvent
  // Public average and number of ratings (only for events with enough ratings)
  rating?: { average: number; count: number }
}) => {
  const { language } = useLanguage()
  const isOldEvent = 'date' in event
  const dateValue = isOldEvent ? event.date : event.event_start
  const type = isOldEvent ? 'old' : 'event'

  return (
    <Link
      to={`/events/${type}/${event.slug}`}
      className="group event-showcase-card hover:-translate-y-2"
    >
      <div className="relative aspect-video overflow-hidden">
        {event.image_id ? (
          <>
            <div className="w-full h-full transform group-hover:scale-105 transition-transform duration-700 ease-out">
              <CloudinaryImage
                publicId={event.image_id}
                width={800}
                height={600}
                alt={event.title}
                className="object-cover w-full h-full"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-accent/60 to-transparent shadow-[0_0_8px_theme(colors.accent.DEFAULT)]" />
          </>
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
      </div>

      <div className="p-5 space-y-2.5 bg-gradient-to-b from-transparent to-black/30 flex-1 flex flex-col justify-between items-center text-center md:items-start md:text-left">
        <div className="flex w-full items-start justify-between gap-3">
          <h3 className="text-2xl font-decorative text-accent group-hover:text-white transition-colors">
            {event.title}
          </h3>
          {rating && (
            <span
              className="flex shrink-0 items-center gap-1 pt-1.5 text-sm text-foreground/80"
              title={`${rating.average.toFixed(1)} / 5 (${rating.count})`}
            >
              <Star className="h-4 w-4 text-accent fill-accent" strokeWidth={1.5} />
              {rating.average.toFixed(1)}
            </span>
          )}
        </div>
        <div className="event-card-meta text-xs tracking-wider uppercase">
          <Calendar className="w-3.5 h-3.5 text-accent shrink-0" />
          <span>{formatDate(language, dateValue)}</span>
        </div>
      </div>
    </Link>
  )
}
