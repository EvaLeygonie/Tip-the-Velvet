import { useLanguage } from '@/contexts/LanguageContext'

export const JoinUs = () => {
  const { t } = useLanguage()
  return (
    <>
      <div className="page-standard">
        <h1>Join Us</h1>
        <p>
          {t(
            'Här kommer vi snart att presentera information om hur du kan gå med i vår community. Håll utkik!',
            'Here we will soon present information about how you can join our community. Keep an eye out!'
          )}
        </p>
      </div>
    </>
  )
}
