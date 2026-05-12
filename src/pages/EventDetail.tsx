import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { Link, useParams } from 'react-router-dom'

const EventDetail = () => {
  const { user, loading } = useAuth()
  const { t } = useLanguage()
  const { slug } = useParams()

  if (loading) return <p>{t('Laddar...', 'Loading...')}</p>

  return (
    <div className="page-standard">
      <h1>EventTitle</h1>

      {user && (
        <Link to={`admin/event-editor/${slug}`}>
          <button className="bg-yellow-600 p-2 rounded">{t('Redigera event', 'Edit Event')}</button>
        </Link>
      )}
    </div>
  )
}

export default EventDetail
