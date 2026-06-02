import { useLanguage } from '@/contexts/LanguageContext'

export const Artists = () => {
  const { t } = useLanguage()
  return (
    <>
      <div className="page-shell">
        <div className="bg-glow-spot" />

        <header className="header">
          <h1>{t('Artister', 'Performers')}</h1>

          <div className="gold-divider" />

          <p className="subtitle">
            {t(
              'Här kommer vi snart att presentera alla fantastiska artister som har uppträtt på Tip the Velvet. Håll utkik!',
              'Here we will soon present the fantastic artists who have performed at Tip the Velvet. Keep an eye out!'
            )}
          </p>
        </header>
      </div>
    </>
  )
}
