// import { useLanguage } from '@/contexts/LanguageContext'
import { Calendar } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { OldEvent } from '@/types'

export const OldEventInfo = ({ event }: { event: OldEvent }) => {
  return (
    <>
      <div className="p-5 space-y-3 bg-gradient-to-b from-black/20 to-transparent">
        <h3 className="text-xl font-decorative text-accent group-hover:text-white transition-colors">
          {event.title}
        </h3>
        <div className="flex items-center gap-2 text-xs opacity-60 font-sans tracking-widest uppercase">
          <Calendar className="w-3 h-3 text-accent" />
          <span>{formatDate(event.date)}</span>
        </div>
      </div>
    </>
  )
}
