import { Calendar, MapPin, Ticket, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import CloudinaryImage from '@/components/CloudinaryImage'
import type { Event } from '@/types'
import { formatDate } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'

export const FeaturedEventCard = ({ event }: { event: Event }) => {
  const { t } = useLanguage()

  return (
    <div className="relative w-full min-h-[450px] flex flex-col md:flex-row bg-black/40 border border-accent/20 rounded-xl overflow-hidden group hover:border-accent/40 transition-all duration-500">
      {/* Bild-sektion (Vänster) */}
      <div className="w-full md:w-1/2 relative overflow-hidden">
        {event.image_id ? (
          <div className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-700">
            <CloudinaryImage publicId={event.image_id} width={800} height={600} />
          </div>
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center space-y-4 border-r border-accent/10">
            <div className="relative">
              <Sparkles className="w-16 h-16 text-accent/20 animate-pulse" />
              <Sparkles className="w-8 h-8 text-accent/40 absolute -top-2 -right-2" />
            </div>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black/60 md:to-transparent" />
      </div>

      {/* Innehåll (Höger) */}
      <div className="w-full md:w-1/2 p-8 flex flex-col justify-center space-y-6">
        <div className="space-y-2">
          <h2 className="text-4xl font-decorative text-accent drop-shadow-sm">{event.title}</h2>
          {event.subtitle && (
            <p className="text-xl font-playfair italic text-foreground/80">{event.subtitle}</p>
          )}
        </div>

        {(() => {
          const langKey = `description_${t('sv', 'eng')}` as keyof typeof event
          const description = event[langKey] as string

          return (
            description && (
              <p className="text-sm leading-relaxed text-foreground/70 line-clamp-3 font-sans">
                {description}
              </p>
            )
          )
        })()}

        <div className="flex flex-wrap gap-6 text-sm text-foreground/60">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-accent" />
            <span>{event.event_start ? formatDate(event.event_start) : 'TBA'}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-accent" />
            <span>{event.location || 'TBA'}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 pt-6">
          {event.title !== 'TBA' && event.slug && (
            <Link
              to={`/events/${event.slug}`}
              className="relative z-10 bg-red-950 hover:bg-red-900 text-red-100 border border-red-500/40 px-6 py-2 flex items-center justify-center gap-2 hover:scale-105 transition-all shadow-[0_0_15px_rgba(153,27,27,0.4)] min-w-[140px] min-h-[44px] rounded-md"
            >
              <Sparkles className="w-4 h-4 text-red-400 shrink-0" />
              <span className="font-decorative tracking-wider uppercase text-xs whitespace-nowrap">
                {t('Se detaljer', 'See Details')}
              </span>
            </Link>
          )}

          {event.ticket_url && (
            <a
              href={event.ticket_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-save-active !static px-6 py-2 flex items-center justify-center gap-2 hover:scale-105 transition-all min-w-[140px] min-h-[44px] rounded-md"
            >
              <Ticket className="w-4 h-4 shrink-0" />
              <span className="font-decorative tracking-wider text-sm whitespace-nowrap">
                {t('Biljetter', 'Tickets')}
              </span>
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
