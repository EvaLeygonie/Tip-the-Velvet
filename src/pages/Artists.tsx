import { useLanguage } from '@/contexts/LanguageContext'

const Artists = () => {
  const { t } = useLanguage()
  return (
    <>
      <div className="page-standard">
        <h1>Artists</h1>
        <p>
          {t(
            'Här kommer vi snart att presentera våra fantastiska artister som har uppträtt på Tip the Velvet. Håll utkik!',
            'Here we will soon present the fantastic artists who have performed at Tip the Velvet. Keep an eye out!'
          )}
        </p>
      </div>
    </>
  )
}

export default Artists
