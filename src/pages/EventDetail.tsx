import { useAuth } from '@/contexts/AuthContext'

const EventDetail = () => {
  const { isAdmin, loading } = useAuth()

  if (loading) return <p>Laddar...</p>

  return (
    <div>
      <h1>Malice in Wonderland</h1>

      {/* Visas bara för Admins! */}
      {isAdmin && <button className="bg-yellow-600 p-2 rounded">Redigera Event</button>}
    </div>
  )
}

export default EventDetail
