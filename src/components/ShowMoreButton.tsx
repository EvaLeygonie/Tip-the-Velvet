import { useLanguage } from '@/contexts/LanguageContext'

export const ShowMoreButton = ({
  remaining,
  onClick,
}: {
  remaining: number
  onClick: () => void
}) => {
  const { t } = useLanguage()
  if (remaining <= 0) return null

  return (
    <div className="flex justify-center mt-6">
      <button type="button" onClick={onClick} className="btn-gold-outline">
        {t('Visa fler', 'Show more')} ({remaining})
      </button>
    </div>
  )
}
