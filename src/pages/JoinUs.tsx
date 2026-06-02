import { useLanguage } from '@/contexts/LanguageContext'

export const JoinUs = () => {
  const { t } = useLanguage()
  return (
    <>
      <div className="page-shell">
        <div className="bg-glow-spot" />

        <header className="header">
          <h1>{t('Joina oss', 'Join Us')}</h1>

          <div className="gold-divider" />

          <p className="subtitle">
            {t(
              'Här kommer vi snart att presentera information om hur du kan gå med i vår community. Håll utkik!',
              'Here we will soon present information about how you can join our community. Keep an eye out!'
            )}
          </p>
        </header>
      </div>
    </>
  )
}
