import { useLanguage } from '@/contexts/LanguageContext'

const ArtistsDetail = () => {
  const { t } = useLanguage()
  return (
    <>
      <div className="page-standard">
        <h1>Artist Detail</h1>
        <p>
          {t(
            'Här kommer vi snart att presentera detaljerad information om våra fantastiska artister som har uppträtt på Tip the Velvet. Håll utkik!',
            'Here we will soon present detailed information about the fantastic artists who have performed at Tip the Velvet. Keep an eye out!'
          )}
        </p>
      </div>
    </>
  )
}

export default ArtistsDetail
