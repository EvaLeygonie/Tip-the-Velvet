import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { OldEvent, Event } from '@/types'
import CloudinaryImage from '@/components/CloudinaryImage'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'

const Events = () => {
  const [oldEvents, setOldEvents] = useState<OldEvent[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const { t } = useLanguage()

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true)
      const { data, error } = await supabase.from('events').select('*')
      if (data) setEvents(data)
      if (error) console.error(error)
      setLoading(false)
    }
    const fetchOldEvents = async () => {
      setLoading(true)
      const { data, error } = await supabase.from('old_events').select('*')
      if (data) setOldEvents(data)
      if (error) console.error(error)
      setLoading(false)
    }
    fetchEvents()
    fetchOldEvents()
  }, [])

  if (loading) return <p>{t('Laddar...', 'Loading...')}</p>

  return (
    <>
      <div>
        {user && (
          <Link to="/admin/event-editor">
            <button className="bg-yellow-600 p-2 rounded">
              {t('Lägg till event', 'Add Event')}
            </button>
          </Link>
        )}

        {events.map((event) => (
          <div key={event.id}>
            <h1>{event.title}</h1>
            {event.description_sv && (
              <p>{t(event.description_sv, event.description_eng || event.description_sv)}</p>
            )}
            <CloudinaryImage publicId={event.image_id || ''} width={400} height={300} />
          </div>
        ))}

        {oldEvents.map((event) => (
          <div key={event.id}>
            <h1>{event.title}</h1>
            <p>{event.description_eng}</p>
            <CloudinaryImage publicId={event.image_id || ''} width={400} height={300} />
          </div>
        ))}
      </div>
    </>
  )
}

export default Events
