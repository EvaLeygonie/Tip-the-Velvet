import { useLanguage } from '@/contexts/LanguageContext'

const About = () => {
  const { t } = useLanguage()
  return (
    <>
      <div className="page-standard">
        <h1>About</h1>
        <p>
          {t(
            'Här kommer vi snart att presentera information om Tip the Velvet. Håll utkik!',
            'Here we will soon present information about Tip the Velvet. Keep an eye out!'
          )}
        </p>
      </div>
    </>
  )
}

export default About
