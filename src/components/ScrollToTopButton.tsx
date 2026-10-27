import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

// Fixed gold arrow in the bottom right corner on every page; appears once the page has been scrolled
// a little and takes you smoothly back to the top.
export const ScrollToTopButton = () => {
  const { t } = useLanguage()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      title={t('Till toppen', 'Back to top')}
      aria-label={t('Till toppen', 'Back to top')}
      tabIndex={visible ? 0 : -1}
      className={`fixed bottom-5 right-4 md:bottom-8 md:right-8 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-accent/30 bg-background/80 text-accent shadow-lg backdrop-blur-md transition-all duration-300 hover:scale-110 hover:border-accent/60 ${
        visible ? 'opacity-100' : 'pointer-events-none translate-y-2 opacity-0'
      }`}
    >
      <ArrowUp size={18} />
    </button>
  )
}
