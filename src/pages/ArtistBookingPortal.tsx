import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import type { CastingApplication } from '@/types/types'
import { getCastingApplicationById } from '@/services/applicationService'
import { BookingDecisionCard } from '@/components/applications/BookingDecisionCard'
import { BookedArtistForm } from '@/components/applications/BookedArtistForm'

export const ArtistBookingPortal = () => {
  const { id } = useParams<{ id: string }>()
  const [application, setApplication] = useState<CastingApplication | null>(null)
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)

  const refetchData = () => setReloadKey((prev) => prev + 1)

  useEffect(() => {
    let isMounted = true

    const fetchApplication = async () => {
      if (!id) {
        setLoading(false)
        return
      }

      try {
        const app = await getCastingApplicationById(id)
        if (isMounted) {
          setApplication(app)
        }
      } catch (err) {
        console.error(err)
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
  }, [id, reloadKey])

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
        Hittade ingen giltig bokningsansökan.
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

        {/* Conditional Rendering */}
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
