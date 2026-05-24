import { useLanguage } from '@/contexts/LanguageContext'
import { Calendar, MapPin, Camera } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { OldEvent } from '@/types/types'

export const OldEventInfo = ({ event }: { event: OldEvent }) => {
  const { language } = useLanguage()
  if (!event) return null

  return (
    <div className="flex flex-wrap justify-center gap-x-12 gap-y-4 text-foreground/80 text-sm md:text-base font-body">
      <div className="flex items-center gap-2">
        <Calendar className="text-accent w-5 h-5 animate-pulse" strokeWidth={1.5} />
        <span>{formatDate(language, event.date)}</span>
      </div>

      <div className="flex items-center gap-2">
        <MapPin className="text-accent w-5 h-5" strokeWidth={1.5} />
        <span>{event.location}</span>
      </div>

      <div className="flex items-center gap-2">
        <Camera className="text-accent w-5 h-5" strokeWidth={1.5} />
        <span>{event.photographer}</span>
      </div>
    </div>
  )
}
