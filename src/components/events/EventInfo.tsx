import { Calendar, MapPin, Ticket, Sparkles, UserPlus, Camera } from 'lucide-react'
import CloudinaryImage from '@/components/CloudinaryImage'
import { formatDateTime } from '@/lib/utils'
import type { Event } from '@/types'
import { useLanguage } from '@/contexts/LanguageContext'
import { Link } from 'react-router-dom'

export const EventInfo = ({ event }: { event: Event }) => {
  const { language, t } = useLanguage()

  if (!event) return null

  const glowColor = event.glow_color || '#D4AF37'
  const glowStyle = {
    boxShadow: `0 0 10px 1px ${glowColor}, 0 0 25px 5px rgba(0, 0, 0, 0.5)`,
    borderColor: glowColor,
    outlineColor: `${glowColor}50`,
  }

  const isCastingOpen = event.casting_call_deadline
    ? new Date(event.casting_call_deadline) > new Date()
    : true

  return (
    <div className="w-full max-w-5xl mx-auto my-6 text-left">
      <div className="flex flex-col md:flex-row items-center md:items-start gap-12 md:gap-16">
        {/* VÄNSTER: Den eleganta, mindre promobilden */}
        <div className="w-full sm:w-2/3 md:w-[350px] shrink-0">
          <div
            className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden border transition-all duration-500 hover:scale-[1.02]"
            style={glowStyle}
          >
            {event.image_id ? (
              <CloudinaryImage
                publicId={event.image_id}
                width={700}
                height={933}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center bg-black/40">
                <Sparkles className="w-12 h-12 text-accent/20 animate-pulse" />
              </div>
            )}
            {/* Subtilt inre guldsken */}
            <div className="absolute inset-0 border border-white/5 rounded-2xl pointer-events-none" />
          </div>
        </div>

        {/* HÖGER: Text, Subtitle & Dynamiska handlingsknappar */}
        <div className="flex-1 space-y-8 py-2 w-full text-center md:text-left">
          {/* Titlar sammanlänkade */}
          <div className="space-y-3">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-decorative text-accent tracking-wide leading-tight drop-shadow-[0_0_15px_rgba(212,175,55,0.2)] !text-center md:!text-left">
              {event.title}
            </h1>
            {event.subtitle && (
              <p className="text-xl md:text-2xl font-heading italic text-foreground/70 tracking-wide font-light !text-center md:!text-left">
                {event.subtitle}
              </p>
            )}
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent md:from-accent/20 md:to-transparent" />

          {/* Metadata Grid */}
          <div className="flex flex-col sm:flex-row justify-center md:justify-start gap-6 text-sm md:text-base font-body text-foreground/80">
            <div className="flex items-center justify-center md:justify-start gap-3">
              <Calendar className="w-5 h-5 text-accent shrink-0" strokeWidth={1.5} />
              <span>{formatDateTime(language, event?.event_start)}</span>
            </div>

            <div className="flex items-center justify-center md:justify-start gap-3">
              <MapPin className="w-5 h-5 text-accent shrink-0" strokeWidth={1.5} />
              <span>{event.location || 'TBA'}</span>
            </div>

            {event.photographer && (
              <div className="flex items-center justify-center md:justify-start gap-3">
                <Camera className="w-5 h-5 text-accent shrink-0" strokeWidth={1.5} />
                <span className="italic">
                  {t('Foto:', 'Photo:')} {event.photographer}
                </span>
              </div>
            )}
          </div>

          {/* LINKS */}
          <div className="flex flex-wrap gap-4 justify-center md:justify-start pt-4">
            {/* TICKETS */}
            {event.ticket_url && (
              <a
                href={event.ticket_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 bg-accent text-background font-bold px-6 py-3 text-xs uppercase tracking-widest rounded-xl transition-all duration-300 hover:scale-105 hover:bg-accent/90 shadow-[0_0_25px_rgba(212,175,55,0.25)]"
              >
                <Ticket className="w-4 h-4" />
                {t('Köp Biljetter', 'Get Tickets')}
              </a>
            )}

            {/* CASTING CALL */}
            {event.has_casting_call && isCastingOpen && (
              <Link
                to="/casting-call"
                className="inline-flex items-center gap-2.5 text-accent border border-accent/40 bg-accent/5 font-semibold px-6 py-3 text-xs uppercase tracking-widest rounded-xl transition-all duration-300 hover:scale-105 hover:bg-accent hover:text-black"
              >
                <UserPlus className="w-4 h-4" />
                {t('Sök Casting', 'Apply for Casting')}
              </Link>
            )}

            {/* DRESSCODE */}
            {event.dresscode_link && (
              <Link
                to="/dresscode"
                className="inline-flex items-center gap-2.5 bg-white/5 text-foreground/70 border border-white/10 font-medium px-5 py-3 text-xs uppercase tracking-widest rounded-xl transition-all duration-300 hover:border-white/30 hover:text-foreground"
              >
                {t('Klädkod', 'Dresscode')}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
