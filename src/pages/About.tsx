import { useLanguage } from '@/contexts/LanguageContext'

export const About = () => {
  const { t } = useLanguage()
  return (
    <>
      <div className="page-shell">
        <div className="bg-glow-spot" />

        <header className="header">
          <h1>{t('Om oss', 'About Us')}</h1>

          <div className="gold-divider" />

          <p className="subtitle">
            {t(
              'Här kommer vi snart att presentera information om Tip the Velvet. Håll utkik!',
              'Here we will soon present information about Tip the Velvet. Keep an eye out!'
            )}
          </p>
        </header>
      </div>
    </>
  )
}
