import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import type { Event } from '@/types/types'
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react'

export const CastingInfoAccordion = ({ event }: { event: Event }) => {
  const { t } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)

  const infoText = t(event.casting_info_sv, event.casting_info_eng)

  if (!infoText) return null

  return (
    <div className="w-full overflow-hidden mt-1 mb-6 transition-all duration-300">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-2 flex items-center justify-between text-left hover:text-white transition-colors group"
      >
        <div className="flex items-center space-x-2 mx-auto">
          <Sparkles className="w-3.5 h-3.5 text-accent/80 group-hover:scale-110 transition-transform" />
          <span className="font-decorative text-s tracking-widest text-accent uppercase group-hover:text-accent-light transition-colors">
            {isOpen
              ? t(
                  'Dölj konstnärlig brief & tema (SPOILERS FÖR GÄSTER!)',
                  'Hide artistic brief & theme (SPOILERS FOR GUESTS!)'
                )
              : t(
                  'Visa konstnärlig brief & tema (SPOILERS FÖR GÄSTER!)',
                  'Show artistic brief & theme (SPOILERS FOR GUESTS!)'
                )}
          </span>

          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-accent/60" />
          ) : (
            <ChevronDown className="w-4 h-4 text-accent/60 group-hover:translate-y-0.5 transition-transform" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="mt-2 p-5 border-t border-accent/50 bg-black/40 rounded-lg text-xs md:text-sm leading-relaxed text-foreground/90 animate-fadeIn shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]">
          <div className="whitespace-pre-line font-normal tracking-wide">{infoText}</div>
        </div>
      )}
    </div>
  )
}
