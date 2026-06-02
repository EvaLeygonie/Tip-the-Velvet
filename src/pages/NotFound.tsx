import { Link } from 'react-router-dom'
import { useLanguage } from '@/contexts/LanguageContext'

export const NotFound = () => {
  const { t } = useLanguage()
  return (
    <main className="flex-center min-h-screen text-center px-4 sm:px-6">
      <div className="middle-glow" />
      <div>
        <h1>404</h1>

        <div>
          <p className="subtitle">
            {t(
              'Hoppsan! Den här sidan har försvunnit i kulisserna.',
              'Oops! This page has vanished into the wings.'
            )}
          </p>
          <p className="text-info opacity-70">
            {t('Sidan du letar efter finns inte här.', 'The page you are looking for is not here.')}
          </p>
        </div>

        <Link
          to="/"
          className="relative inline-block text-l mt-8 text-accent/80 hover:text-accent transition-colors"
        >
          {t('← Tillbaka till scenen', '← Back to the stage')}
        </Link>
      </div>
    </main>
  )
}
