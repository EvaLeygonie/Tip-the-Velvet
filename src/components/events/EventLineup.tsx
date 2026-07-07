import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import type { EventPerformerRow } from '@/services/eventService'
import { getImageSrc } from '@/lib/utils'
import { Link, useParams } from 'react-router-dom'

interface EventLineupProps {
  performers: EventPerformerRow[]
}

export const EventLineup = ({ performers }: EventLineupProps) => {
  const { t } = useLanguage()
  const { user } = useAuth()
  const { slug } = useParams()

  const visiblePerformers = performers.filter((row) => user || row.is_revealed)

  if (visiblePerformers.length === 0) return null

  return (
    <div className="mt-16 space-y-6">
      <div className="text-center">
        <h2 className="font-decorative uppercase tracking-widest text-2xl text-accent">
          {t('Medverkande Artister', 'Line-up')}
        </h2>
      </div>

      <div className="flex flex-wrap justify-center gap-4 max-w-7xl mx-auto pt-4">
        {visiblePerformers.map((row) => {
          const artist = row.performer
          const isHidden = !row.is_revealed

          return (
            <Link
              key={artist.id}
              to={`/performers/${artist.slug}`}
              state={{ fromEvent: slug }}
              className={`group bg-black/40 border rounded-xl overflow-hidden p-3 transition-all duration-300 hover:border-accent/60 flex flex-col items-center text-center relative w-full sm:w-[calc(20%-16px)] min-w-[160px] max-w-[220px] ${
                isHidden ? 'border-dashed border-red-500/40 opacity-75' : 'border-white/5'
              }`}
            >
              {isHidden && (
                <span className="absolute top-2 right-2 bg-red-900/80 text-red-200 text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded font-mono z-10">
                  Dold
                </span>
              )}

              <div className="w-full aspect-square rounded-lg overflow-hidden border border-accent/10 bg-black/60 mb-3 shrink-0">
                {artist.promo_image_id ? (
                  <img
                    src={getImageSrc(artist.promo_image_id)}
                    alt={artist.performer_name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-accent/20 text-xs font-mono">
                    N/A
                  </div>
                )}
              </div>

              <h3 className="font-decorative text-sm md:text-base text-foreground tracking-wide m-0 transition-colors group-hover:text-accent truncate w-full">
                {artist.performer_name}
              </h3>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
