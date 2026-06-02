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
  const glowVars: React.CSSProperties & { [key: `--${string}`]: string } = {
    '--glow-color': glowColor,
  }

  const upcomingEvent = event.event_end ? new Date(event.event_end) > new Date() : true

  return (
    <div className="w-full space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16 items-center">
        {/* PROMO IMAGE */}
        <div className="flex justify-center w-full">
          <div className="promo-frame-event" style={glowVars}>
            {event.image_id ? (
              <CloudinaryImage
                publicId={event.image_id}
                width={800}
                height={800}
                className="media-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-black/40">
                <Sparkles className="w-12 h-12 text-accent/20" />
              </div>
            )}
          </div>
        </div>

        {/* INFO */}
        <div className="space-y-6 w-full max-w-[450px] mx-auto md:mx-0 text-center md:text-left">
          <div className="info-panel">
            <div className="info-field-row-divided">
              <Calendar className="icon-accent-md" strokeWidth={1.5} />
              <div>
                <span className="label-kicker">{t('Start:', 'Starts:')}</span>
                <span className="text-foreground/90">
                  {formatDateTime(language, event.event_start)}
                </span>
              </div>
            </div>

            {event.event_end && (
              <div className="info-field-row-divided">
                <Calendar className="icon-accent-md" strokeWidth={1.5} />
                <div>
                  <span className="label-kicker">{t('Slut:', 'Ends:')}</span>
                  <span className="text-foreground/80">
                    {formatDateTime(language, event.event_end)}
                  </span>
                </div>
              </div>
            )}

            <div className="info-field-row-divided">
              <MapPin className="icon-accent-md" strokeWidth={1.5} />
              <div>
                <span className="label-kicker">{t('Plats:', 'Venue:')}</span>
                <span className="text-foreground/90">{event.location || 'TBA'}</span>
              </div>
            </div>
          </div>

          {/* LINKS */}
          {upcomingEvent &&
            (() => {
              const isCastingExpired = event.casting_call_deadline
                ? new Date().getTime() > new Date(event.casting_call_deadline).getTime()
                : false

              return (
                <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                  {/* BILJETTER */}
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

                  {/* CASTING CALL */}
                  {event.has_casting_call &&
                    (!isCastingExpired ? (
                      <Link
                        to="/casting-call"
                        className="btn-red shadow-lg transition-all duration-300"
                      >
                        <UserPlus className="w-4 h-4 text-red-400" />
                        {t('Casting Call', 'Casting Call')}
                      </Link>
                    ) : (
                      <span className="btn-red opacity-25 cursor-not-allowed">
                        <UserPlus className="w-4 h-4 text-red-400/50 opacity-50" />
                        {t('Casting Stängd', 'Casting Closed')}
                      </span>
                    ))}
                </div>
              )
            })()}
        </div>
      </div>

      {/* DRESSCODE */}
      <div className="pt-4">
        <div className="gold-divider" />
      </div>
      <div className="callout-panel">
        <p className="text-info">
          {t(
            'Osäker på vad du ska ha på dig? Kolla in vår ',
            "Don't know what to wear? Check out our "
          )}
          <Link to="/dresscode" className="gold-link">
            {t('klädkod', 'dresscode')}
          </Link>
          {event.pinterest_link && (
            <>
              {t(' eller denna ', ' or this ')}
              <a
                href={event.pinterest_link}
                target="_blank"
                rel="noopener noreferrer"
                className="gold-link"
              >
                {t('Pinterest-anslagstavla', 'Pinterest board')}
                <ExternalLink size={13} className="opacity-80 inline-block ml-1" />
              </a>
              {t(' för inspiration', ' for inspiration')}
            </>
          )}
          !
        </p>

        <p className="text-info">
          {t(
            'Du är alltid välkommen att kontakta oss via e-post eller sociala medier om du har frågor eller funderingar!',
            "You're always welcome to contact us via email or social media if you have questions or doubts!"
          )}
        </p>
      </div>
    </div>
  )
}
