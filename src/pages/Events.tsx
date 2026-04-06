import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { OldEvent } from '@/types'
import CloudinaryImage from '@/components/CloudinaryImage'
import { useAuth } from '@/contexts/AuthContext'

const Events = () => {
  const [oldEvents, setOldEvents] = useState<OldEvent[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    const fetchOldEvents = async () => {
      setLoading(true)
      const { data, error } = await supabase.from('old_events').select('*')
      if (data) setOldEvents(data)
      if (error) console.error(error)
      setLoading(false)
    }
    fetchOldEvents()
  }, [])

  //! ADD language & Styling
  if (loading) return <p>Laddar...</p>

  return (
    <>
      <div>
        {user && <button>Redigera sida</button>}
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
