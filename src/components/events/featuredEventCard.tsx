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
  const imageGlowStyle = {
    boxShadow: `0 0 15px 2px ${glowColor}, 0 15px 35px rgba(0, 0, 0, 0.6)`,
    borderColor: glowColor,
  }

  const cardContainerStyle = {
    background: `linear-gradient(135deg, rgba(17, 8, 5, 0.75) 0%, rgba(17, 8, 5, 0.9) 60%, ${glowColor}08 100%)`,
    borderColor: `${glowColor}25`,
    boxShadow: `0 20px 50px rgba(0, 0, 0, 0.5), inset 0 0 30px ${glowColor}03`,
  }

  if (isTBA) {
    return (
      <div
        className="border rounded-2xl p-12 md:p-20 w-full max-w-7xl mx-auto flex flex-col items-center justify-center text-center space-y-8 backdrop-blur-md transition-all duration-500"
        style={cardContainerStyle}
      >
        <div
          className="relative w-32 h-32 md:w-40 md:h-40 rounded-3xl border-2 flex items-center justify-center bg-black/30 transition-all duration-700"
          style={imageGlowStyle}
        >
          <Sparkles className="w-16 h-16 md:w-20 md:h-20 text-accent animate-pulse opacity-90" />
          <Sparkles className="w-6 h-6 text-accent/50 absolute -top-2 -right-2 animate-bounce" />
          <div className="absolute inset-0 bg-accent/5 blur-3xl rounded-full -z-10 pointer-events-none" />
        </div>

        <div className="space-y-4 max-w-md">
          <h2 className="text-4xl md:text-5xl font-decorative text-accent tracking-[0.2em] uppercase leading-tight">
            {t('TBA', 'TBA')}
          </h2>
          <p className="text-xl font-playfair italic text-foreground/80 leading-relaxed">
            {t('Annonseras snart...', 'To be announced soon...')}
          </p>
        </div>

        <div className="w-24 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
      </div>
    )
  }

  return (
    <div
      className="border rounded-2xl overflow-hidden p-6 md:p-10 w-full max-w-7xl mx-auto backdrop-blur-md transition-all duration-500 group"
      style={cardContainerStyle}
    >
      <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16">
        {/* Image Container */}
        <div className="w-full md:w-1/2 shrink-0 flex justify-center md:justify-start">
          <div
            className="relative aspect-square w-auto h-full rounded-xl overflow-hidden border-2 transition-all duration-700 group-hover:scale-[1.015]"
            style={imageGlowStyle}
          >
            {event.image_id ? (
              <div className="w-full h-full overflow-hidden">
                <CloudinaryImage
                  publicId={event.image_id}
                  width={800}
                  height={800}
                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-1000 ease-out"
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
        <div className="min-w-0 flex-1 space-y-6 flex flex-col justify-center">
          <div
            className="absolute -right-20 top-1/2 -translate-y-1/2 w-72 h-72 rounded-full blur-[100px] opacity-20 pointer-events-none -z-10 transition-all duration-500 group-hover:opacity-30"
            style={{ backgroundColor: glowColor }}
          />

          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-decorative text-accent drop-shadow-[0_0_20px_currentColor] mb-3 leading-tight !text-left">
              {event.title}
            </h1>
            {event.subtitle && <p className="event-card-subtitle">{event.subtitle}</p>}
          </div>

          {(() => {
            const langKey = `description_${t('sv', 'eng')}` as keyof typeof event
            const description = event[langKey] as string
            return (
              description && (
                <p className="event-card-description text-foreground/80 font-body leading-relaxed text-sm md:text-base whitespace-pre-line">
                  {description}
                </p>
              )
            )
          })()}

          <div className="space-y-6">
            <div className="flex flex-wrap gap-6 text-foreground/90 justify-start">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-accent" />
                <span>{formatDate(language, event.event_start)}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-accent" />
                <span>{event.location || 'TBA'}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 justify-start pt-2">
              <Link to={`/events/event/${event.slug}`} className="btn-red">
                <Sparkles className="w-4 h-4 text-red-400 shrink-0" />
                <span className="font-decorative tracking-wider uppercase text-xs whitespace-nowrap">
                  {t('Se detaljer', 'See Details')}
                </span>
              </Link>

              {event.ticket_url && (
                <a
                  href={event.ticket_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-gold"
                >
                  <Ticket className="w-4 h-4 shrink-0" />
                  <span className="font-decorative tracking-wider uppercase text-xs whitespace-nowrap">
                    {t('Biljetter', 'Tickets')}
                  </span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
