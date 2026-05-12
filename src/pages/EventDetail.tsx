import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Event, OldEvent } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const EventDetail = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const { t } = useLanguage()
  const { slug, type } = useParams()
  const isOldEvent = type === 'old'
  const [event, setEvent] = useState<Event | OldEvent | null>(null)

  useEffect(() => {
    const fetchEvent = async () => {
      setLoading(true)

      const table = isOldEvent ? 'old_events' : 'events'

      const { data, error } = await supabase.from(table).select('*').eq('slug', slug).single()

      if (data) setEvent(data)
      if (error) console.error('Error fetching event:', error)
      console.log('table:', table, 'slug:', slug, 'data:', data, 'error:', error)
      setLoading(false)
    }
    fetchEvent()
  }, [slug, isOldEvent])

  if (loading) return <p>{t('Laddar...', 'Loading...')}</p>

  return (
    <div className="page-standard">
      <div className="editor-container">
        <div className="section-header-triad">
          <Link to="/events">
            <ArrowLeft className="text-accent hover:scale-105" />
          </Link>
          <h1>{event?.title || t('Event title not found', 'Event title not found')}</h1>

          {user && !isOldEvent && (
            <Link to={`/admin/event-editor/${slug}`}>
              <button className="btn-admin">
                <span className="text-lg">+</span>
                {t('Redigera Event', 'Edit Event')}
              </button>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

export default EventDetail
