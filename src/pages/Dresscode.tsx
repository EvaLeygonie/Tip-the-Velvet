import { useLanguage } from '@/contexts/LanguageContext'

const Dresscode = () => {
  const { t } = useLanguage()
  return (
    <>
      <div className="page-standard">
        <h1>Dresscode</h1>
        <p>
          {t(
            'Här kommer vi snart att presentera information om vår dresscode. Håll utkik!',
            'Here we will soon present information about our dresscode. Keep an eye out!'
          )}
        </p>
      </div>
    </>
  )
}

export default Dresscode
