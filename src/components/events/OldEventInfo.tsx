import { useLanguage } from '@/contexts/LanguageContext'
import { Calendar, MapPin, Camera } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { OldEvent } from '@/types/types'

export const OldEventInfo = ({ event }: { event: OldEvent }) => {
  const { language } = useLanguage()
  if (!event) return null

  return (
    <div className="flex flex-wrap justify-center gap-x-12 gap-y-4">
      <div className="meta-row">
        <Calendar className="icon-accent-md animate-pulse" strokeWidth={1.5} />
        <span>{formatDate(language, event.date)}</span>
      </div>

      <div className="meta-row">
        <MapPin className="icon-accent-md" strokeWidth={1.5} />
        <span>{event.location}</span>
      </div>

      <div className="meta-row">
        <Camera className="icon-accent-md" strokeWidth={1.5} />
        <span>{event.photographer}</span>
      </div>
    </div>
  )
}
