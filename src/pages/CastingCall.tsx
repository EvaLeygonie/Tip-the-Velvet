import { useLanguage } from '@/contexts/LanguageContext'

export const CastingCall = () => {
  const { t } = useLanguage()
  return (
    <>
      <div className="page-standard">
        <h1>Casting Call</h1>
        <p>{t('Casting call kommer snart!', 'Casting call coming soon!')}</p>
      </div>
    </>
  )
}
