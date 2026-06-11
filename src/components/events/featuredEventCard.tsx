import { Calendar, MapPin, Ticket, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import CloudinaryImage from '@/components/CloudinaryImage'
import type { Event } from '@/types/types'
import { formatDate } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'

export const FeaturedEventCard = ({ event }: { event: Event }) => {
  const { language, t } = useLanguage()
  const isTBA = event.title === 'TBA'

  const glowColor = event.glow_color || '#D4AF37'
  const glowVars: React.CSSProperties & { [key: `--${string}`]: string } = {
    '--glow-color': glowColor,
  }

  if (isTBA) {
    return (
      <div
        className="featured-card-shell p-6 sm:p-12 md:p-20 flex flex-col items-center justify-center text-center space-y-8"
        style={glowVars}
      >
        <div
          className="relative w-32 h-32 md:w-40 md:h-40 rounded-3xl border-2 flex-center bg-black/30 transition-all duration-700 glow-border-strong"
          style={glowVars}
        >
          <Sparkles className="w-16 h-16 md:w-20 md:h-20 text-accent animate-pulse opacity-90" />
          <Sparkles className="w-6 h-6 text-accent/50 absolute -top-2 -right-2 animate-bounce" />
          <div className="absolute inset-0 bg-accent/5 blur-3xl rounded-full -z-10 pointer-events-none" />
        </div>

        <div className="space-y-4 max-w-md">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-decorative text-accent tracking-[0.15em] sm:tracking-[0.2em] uppercase leading-tight">
            {t('TBA', 'TBA')}
          </h2>
          <p className="text-lg sm:text-xl font-heading italic text-foreground/80 leading-relaxed">
            {t('Annonseras snart...', 'To be announced soon...')}
          </p>
        </div>

        <div className="w-24 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
      </div>
    )
  }

  return (
    <div className="featured-card-shell p-4 sm:p-6 md:p-10 group" style={glowVars}>
      <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
        {/* Image Container */}
        <div className="w-full md:w-1/2 shrink-0 flex justify-center md:justify-start">
          <div className="promo-frame-featured mx-auto md:mx-0" style={glowVars}>
            {event.image_id ? (
              <div className="w-full h-full overflow-hidden">
                <CloudinaryImage
                  publicId={event.image_id}
                  width={800}
                  height={800}
                  className="media-cover transform group-hover:scale-105 transition-transform duration-1000 ease-out"
                />
              </div>
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center space-y-4 border border-accent/10 bg-black/50">
                <Sparkles className="w-16 h-16 text-accent/20 animate-pulse" />
              </div>
            )}
            <div className="absolute inset-0 border border-white/5 rounded-xl scale-[1.03]" />
          </div>
        </div>

        {/* Event Details */}
        <div className="min-w-0 flex-1 space-y-6 flex flex-col items-center justify-center text-center md:items-start md:text-left">
          <div className="featured-card-glow" style={glowVars} />

          <div className="space-y-2 w-full min-w-0 text-center md:text-left">
            <h1 className="featured-card-title">{event.title}</h1>
            {event.subtitle && <p className="event-card-subtitle">{event.subtitle}</p>}
          </div>

          {(() => {
            const langKey = `description_${t('sv', 'eng')}` as keyof typeof event
            const description = event[langKey] as string
            return description && <p className="event-card-description">{description}</p>
          })()}

          <div className="space-y-6">
            <div className="flex flex-wrap gap-6 justify-center md:justify-start">
              <div className="meta-row text-foreground/90">
                <Calendar className="icon-accent-sm" />
                <span>{formatDate(language, event.event_start)}</span>
              </div>
              <div className="meta-row text-foreground/90">
                <MapPin className="icon-accent-sm" />
                <span>{event.location || 'TBA'}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 pt-2 items-center justify-center md:justify-start">
              <Link to={`/events/event/${event.slug}`} className="btn-red">
                <Sparkles className="w-4 h-4 text-red-400 shrink-0" />
                <span>{t('Se detaljer', 'See Details')}</span>
              </Link>

              {event.ticket_url ? (
                <a
                  href={event.ticket_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-gold shadow-lg transition-all duration-300"
                >
                  <Ticket className="w-4 h-4" />
                  {t('Biljetter', 'Tickets')}
                </a>
              ) : (
                <span className="btn-gold opacity-70 cursor-not-allowed">
                  <Ticket className="w-4 h-4 opacity-50" />
                  {t('Biljetter TBA', 'Tickets TBA')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
