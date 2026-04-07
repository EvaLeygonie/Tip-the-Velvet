import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'

const EventDetail = () => {
  const { user, loading } = useAuth()
  const { t } = useLanguage()

  if (loading) return <p>{t('Laddar...', 'Loading...')}</p>

  return (
    <div>
      <h1>Malice in Wonderland</h1>

      {user && (
        <button className="bg-yellow-600 p-2 rounded">{t('Redogera event', 'Edit Event')}</button>
      )}
    </div>
  )
}

export default EventDetail
