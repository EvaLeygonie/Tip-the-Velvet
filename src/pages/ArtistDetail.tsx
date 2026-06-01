import { useLanguage } from '@/contexts/LanguageContext'

export const ArtistDetail = () => {
  const { t } = useLanguage()
  return (
    <>
      <div className="page-standard">
        <div className="bg-glow-spot" />

        <header className="header">
          <h1>Artist Detail</h1>
          <div className="gold-divider" />

          <p className="subtitle">
            {t(
              'Här kommer vi snart att presentera detaljerad information om våra fantastiska artister som har uppträtt på Tip the Velvet. Håll utkik!',
              'Here we will soon present detailed information about the fantastic artists who have performed at Tip the Velvet. Keep an eye out!'
            )}
          </p>
        </header>
      </div>
    </>
  )
}
