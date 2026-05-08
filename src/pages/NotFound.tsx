import { Link } from 'react-router-dom'
import { useLanguage } from '@/contexts/LanguageContext'

const NotFound = () => {
  const { t } = useLanguage()
  return (
    <main className="flex-center min-h-screen bg-background text-center p-4">
      <div className="space-y-6">
        <h1>404</h1>

        <div className="space-y-2">
          <p className="event-subtitle">
            {t(
              'Hoppsan! Den här sidan har försvunnit i kulisserna.',
              'Oops! This page has vanished into the wings.'
            )}
          </p>
          <p className="text-body opacity-70">
            {t('Sidan du letar efter finns inte här.', 'The page you are looking for is not here.')}
          </p>
        </div>

        <Link to="/" className="inline-block mt-8 text-accent hover:underline font-heading">
          {t('← Tillbaka till scenen', '← Back to the stage')}
        </Link>
      </div>
    </main>
  )
}

export default NotFound
