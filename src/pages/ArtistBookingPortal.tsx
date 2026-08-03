import { useState, useEffect } from 'react'
import { useSearchParams, useParams } from 'react-router-dom'
import type { CastingApplication } from '@/types/types'
import { getCastingApplicationByToken } from '@/services/applicationService'
import { BookingDecisionCard } from '@/components/applications/BookingDecisionCard'
import { BookedArtistForm } from '@/components/applications/BookedArtistForm'

export const ArtistBookingPortal = () => {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [application, setApplication] = useState<CastingApplication | null>(null)
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)

  const refetchData = () => setReloadKey((prev) => prev + 1)

  useEffect(() => {
    let isMounted = true

    const fetchApplication = async () => {
      if (!id || !token) {
        setLoading(false)
        return
      }

      try {
        const app = await getCastingApplicationByToken(id, token)
        if (isMounted) {
          setApplication(app)
        }
      } catch (err) {
        console.error('Fel vid hämtning av bokningsansökan:', err)
        if (isMounted) {
          setApplication(null)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchApplication()

    return () => {
      isMounted = false
    }
  }, [id, token, reloadKey])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-foreground/70">
        Laddar bokningsportal...
      </div>
    )
  }

  if (!application) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-red-400">
        Hittade ingen giltig bokningsansökan eller så saknas behörighet/länktoken.
      </div>
    )
  }

  const isConfirmed = application.booking_status === 'confirmed'

  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4">
      <div className="bg-glow-spot" />
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight mt-4">{application.performer_name}</h1>
          <p className="text-md text-foreground/68">Akt: {application.act_title}</p>
        </div>

        {!isConfirmed ? (
          <BookingDecisionCard
            key={application.id}
            application={application}
            onStatusChange={refetchData}
          />
        ) : (
          <BookedArtistForm application={application} />
        )}
      </div>
    </div>
  )
}
