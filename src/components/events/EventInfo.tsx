import { Calendar, MapPin, Ticket, Sparkles, UserPlus, ExternalLink } from 'lucide-react'
import CloudinaryImage from '@/components/CloudinaryImage'
import { formatDateTime } from '@/lib/utils'
import type { Event } from '@/types/types'
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

  const upcomingEvent = event.event_end ? new Date(event.event_end) > new Date() : true

  return (
    <div className="w-full space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16 items-center">
        {/* PROMO IMAGE */}
        <div className="flex justify-center w-full">
          <div
            className="relative aspect-square w-full max-w-[380px] md:max-w-[420px] rounded-2xl overflow-hidden border transition-all duration-500 hover:scale-[1.01]"
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
              <div className="h-full w-full flex items-center justify-center bg-black/40">
                <Sparkles className="w-12 h-12 text-accent/20" />
              </div>
            )}
          </div>
        </div>

        {/* INFO */}
        <div className="space-y-6 w-full max-w-[450px] mx-auto md:mx-0 text-left">
          <div className="bg-black/20 border border-accent/5 rounded-2xl p-6 md:p-8 space-y-4 text-left text-sm md:text-base font-body shadow-xl backdrop-blur-sm">
            <div className="flex items-start gap-4 border-b border-white/5 pb-3">
              <Calendar className="w-5 h-5 text-accent shrink-0 mt-0.5" strokeWidth={1.5} />
              <div>
                <span className="block text-[11px] uppercase tracking-widest text-accent font-semibold mb-0.5">
                  {t('Start:', 'Starts:')}
                </span>
                <span className="text-foreground/90">
                  {formatDateTime(language, event.event_start)}
                </span>
              </div>
            </div>

            {event.event_end && (
              <div className="flex items-start gap-4 border-b border-white/5 pb-3">
                <Calendar className="w-5 h-5 text-accent shrink-0 mt-0.5" strokeWidth={1.5} />
                <div>
                  <span className="block text-[11px] uppercase tracking-widest text-accent font-semibold mb-0.5">
                    {t('Slut:', 'Ends:')}
                  </span>
                  <span className="text-foreground/80">
                    {formatDateTime(language, event.event_end)}
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-start gap-4">
              <MapPin className="w-5 h-5 text-accent shrink-0 mt-0.5" strokeWidth={1.5} />
              <div>
                <span className="block text-[11px] uppercase tracking-widest text-accent font-semibold mb-0.5">
                  {t('Plats:', 'Venue:')}
                </span>
                <span className="text-foreground/90">{event.location || 'TBA'}</span>
              </div>
            </div>
          </div>

          {/* LINKS */}
          <div className="flex flex-wrap gap-4 justify-center md:justify-start">
            {/* BILJETTER */}
            {event.ticket_url && upcomingEvent && (
              <a
                href={event.ticket_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-gold"
              >
                <Ticket className="w-4 h-4" />
                {t('Köp Biljetter', 'Get Tickets')}
              </a>
            )}

            {/* CASTING CALL */}
            {event.has_casting_call && (
              <Link
                to="/casting-call"
                className="btn-red"
              >
                <UserPlus className="w-4 h-4 text-red-400" />
                Casting Call
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* DRESSCODE */}
      <div className="pt-4">
        <div className="gold-divider" />
      </div>
      <div className="mx-auto bg-gradient-to-b from-black/40 to-black/20 border border-accent/10 rounded-2xl p-6 md:p-6 text-center backdrop-blur-sm shadow-xl space-y-3 mt-4 transition-all duration-300 hover:border-accent/20">
        <p className="text-sm md:text-base font-body text-foreground/90 leading-relaxed tracking-wide">
          {t(
            'Osäker på vad du ska ha på dig? Kolla in vår ',
            "Don't know what to wear? Check out our "
          )}
          <Link
            to="/dresscode"
            className="text-accent underline underline-offset-4 hover:text-accent/80 transition-colors font-medium"
          >
            {t('klädkod', 'dresscode')}
          </Link>
          {event.pinterest_link && (
            <>
              {t(' eller denna ', ' or this ')}
              <a
                href={event.pinterest_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline underline-offset-4 hover:text-accent/80 transition-colors font-medium inline-flex items-center gap-1"
              >
                {t('Pinterest-anslagstavla', 'Pinterest board')}
                <ExternalLink size={13} className="opacity-80" />
              </a>
              {t(' för inspiration', ' for inspiration')}
            </>
          )}
          !
        </p>

        <p className="text-xs md:text-sm text-foreground/40 font-body italic pt-1 tracking-wide">
          {t(
            'Du är alltid välkommen att kontakta oss via e-post eller sociala medier om du har frågor eller funderingar!',
            "You're always welcome to contact us via email or social media if you have questions or doubts!"
          )}
        </p>
      </div>
    </div>
  )
}
