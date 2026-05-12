import { Calendar, MapPin, Ticket, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import CloudinaryImage from '@/components/CloudinaryImage'
import type { Event } from '@/types'
import { formatDate } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'

export const FeaturedEventCard = ({ event }: { event: Event }) => {
  const { t } = useLanguage()
  const isTBA = event.title === 'TBA'
  const glowColor = event.glow_color || '#D4AF37'
  const glowStyle = {
    boxShadow: `0 0 10px 1px ${glowColor}, 0 0 25px 5px rgba(0, 0, 0, 0.5)`,
    borderColor: glowColor,
    outlineColor: `${glowColor}50`,
  }

  if (isTBA) {
    return (
      <div className="bg-[#110805]/80 border border-accent/10 rounded-2xl p-12 md:p-20 shadow-2xl w-full max-w-7xl mx-auto flex flex-col items-center justify-center text-center space-y-8">
        <div
          className="relative w-32 h-32 md:w-40 md:h-40 rounded-3xl border-2 flex items-center justify-center bg-black/20 transition-all duration-700"
          style={glowStyle}
        >
          <Sparkles className="w-16 h-16 md:w-20 md:h-20 text-accent animate-pulse opacity-80" />
          <Sparkles className="w-6 h-6 text-accent/40 absolute -top-2 -right-2 animate-bounce" />
          <div className="absolute inset-0 bg-accent/5 blur-3xl rounded-full" />
        </div>

        <div className="space-y-4 max-w-md">
          <h2 className="text-4xl md:text-5xl font-decorative text-accent tracking-[0.2em] uppercase leading-tight">
            {t('TBA', 'TBA')}
          </h2>
          <p className="text-xl font-playfair italic text-foreground/60 leading-relaxed">
            {t('Annonseras snart...', 'To be announced soon...')}
          </p>
        </div>

        <div className="w-24 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
      </div>
    )
  }

  return (
    <div className="bg-[#110805] border border-accent/10 rounded-2xl overflow-hidden shadow-2xl p-6 md:p-10 w-full max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16">
        {/* Image Container */}
        <div className="w-full md:w-1/2 shrink-0 flex justify-center md:justify-start">
          <div
            className="relative aspect-square w-auto h-full rounded-xl overflow-hidden border-2 transition-all duration-300 hover:scale-[1.01]
            max-h-[60vh] md:max-h-[70vh]"
            style={glowStyle}
          >
            {event.image_id ? (
              <CloudinaryImage
                publicId={event.image_id}
                width={800}
                height={800}
                className="w-full h-full object-cover"
              />
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
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-decorative text-accent drop-shadow-[0_0_20px_currentColor] mb-3 leading-tight !text-left">
              {event.title}
            </h1>
            {event.subtitle && (
              <p className="text-lg md:text-xl font-playfair italic text-foreground/80 leading-snug !text-left">
                {event.subtitle}
              </p>
            )}
          </div>

          {(() => {
            const langKey = `description_${t('sv', 'eng')}` as keyof typeof event
            const description = event[langKey] as string
            return (
              description && (
                <p className="text-lg leading-relaxed text-foreground/70 line-clamp-3 font-sans max-w-xl !text-left">
                  {description}
                </p>
              )
            )
          })()}

          <div className="space-y-6">
            <div className="flex flex-wrap gap-6 text-sm text-foreground/60 justify-start">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-accent" />
                <span>{event.event_start ? formatDate(event.event_start) : 'TBA'}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-accent" />
                <span>{event.location || 'TBA'}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 justify-start">
              <Link
                to={`/events/${event.slug}`}
                className="relative z-10 bg-red-950 hover:bg-red-900 text-red-100 border border-red-500/40 px-6 py-2 flex items-center justify-center gap-2 hover:scale-105 transition-all shadow-[0_0_15px_rgba(153,27,27,0.4)] min-w-[140px] min-h-[44px] rounded-md"
              >
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
                  className="relative z-10 bg-accent/80 hover:bg-accent text-background border border-accent/20 px-6 py-2 flex items-center justify-center gap-2 hover:scale-105 transition-all shadow-[0_0_20px_rgba(212,175,55,0.2)] min-w-[140px] min-h-[44px] rounded-md"
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
