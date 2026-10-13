import { useEffect, useRef, useState } from 'react'
import { Save, Loader2 } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

interface FormSaveBarProps {
  isDirty: boolean
  submitting: boolean
}

// SPARA-FÄLT — fast position längst ner i skärmen medan man scrollar genom
// formuläret; landar i sitt normala flödesläge så fort formulärets sanna slut
// (markerat av formEndRef) syns, så den aldrig hamnar ovanpå sidfoten.
export const FormSaveBar = ({ isDirty, submitting }: FormSaveBarProps) => {
  const { t } = useLanguage()
  const [reachedFormEnd, setReachedFormEnd] = useState(false)
  const [saveBarHeight, setSaveBarHeight] = useState(80)
  const saveBarRef = useRef<HTMLDivElement | null>(null)
  const formEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = saveBarRef.current
    if (!el) return
    const resizeObserver = new ResizeObserver((entries) => {
      const height = entries[0]?.contentRect.height
      if (height) setSaveBarHeight(height)
    })
    resizeObserver.observe(el)
    return () => resizeObserver.disconnect()
  }, [])

  useEffect(() => {
    const el = formEndRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setReachedFormEnd(entry.isIntersecting),
      { rootMargin: `0px 0px -${saveBarHeight}px 0px` }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [saveBarHeight])

  return (
    <div ref={formEndRef}>
      {!reachedFormEnd && <div style={{ height: saveBarHeight }} />}
      <div
        ref={saveBarRef}
        className={
          reachedFormEnd
            ? 'z-40 border-t border-accent/30 bg-background/95 backdrop-blur-sm px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.35)]'
            : 'fixed bottom-0 left-0 right-0 z-40 border-t border-accent/30 bg-background/95 backdrop-blur-sm px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.35)]'
        }
      >
        <div className="max-w-4xl mx-auto flex items-center justify-end gap-3">
          {isDirty && !submitting && (
            <span className="text-xs text-accent/90 italic mr-auto">
              {t('Osparade ändringar', 'Unsaved changes')}
            </span>
          )}
          <button
            type="submit"
            disabled={submitting || !isDirty}
            className={`flex items-center gap-2 py-3 px-6 text-sm font-semibold rounded-lg ${
              isDirty ? 'btn-gold btn-gold-glow-active' : 'btn-gold-inactive'
            }`}
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={16} />}
            {t('Spara information', 'Save Information')}
          </button>
        </div>
      </div>
    </div>
  )
}
