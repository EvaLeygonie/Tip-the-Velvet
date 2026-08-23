import { useState, useEffect, Fragment } from 'react'
import { useSearchParams, useParams } from 'react-router-dom'
import type { CastingApplicationPortalData } from '@/types/types'
import { getCastingApplicationByToken } from '@/services/applicationService'
import { BookingDecisionCard } from '@/components/applications/BookingDecisionCard'
import { BookedArtistForm } from '@/components/applications/BookedArtistForm'
import { FloatingBackLink } from '@/components/FloatingBackLink'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'

export const ArtistBookingPortal = () => {
  const { t, setLanguage } = useLanguage()
  const { user } = useAuth()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [application, setApplication] = useState<CastingApplicationPortalData | null>(null)
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

          if (app?.language) {
            setLanguage(app.language as 'sv' | 'eng')
          }
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
  }, [id, token, reloadKey, setLanguage])

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

  // Acts actually being offered/booked — falls back to every submitted act if none has
  // been marked selected yet (a blank header would be worse). Prefers the confirmed
  // performer_acts name (the artist may have renamed the act in BookedArtistForm) once
  // one exists.
  const allActs = application.acts ?? []
  const selectedActs = allActs.filter((act) => act.is_selected)
  const headerActTitles = (selectedActs.length > 0 ? selectedActs : allActs).map(
    (act) => act.performer_acts?.act_name || act.act_title
  )

  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4">
      <div className="bg-glow-spot" />
      {/* Only shown to a logged-in admin (e.g. previewing/testing a link) — the artist
          themselves reaches this page via token, never logged in, and has nowhere
          meaningful to "go back" to. */}
      {user && (
        <FloatingBackLink
          to="/admin/casting"
          label={t('Tillbaka till Casting', 'Back to Casting')}
        />
      )}
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight mt-4">{application.performer_name}</h1>
          <p className="text-md text-foreground/68">
            {headerActTitles.map((title, idx) => (
              <Fragment key={idx}>
                {idx > 0 && <span className="text-accent mx-2">✦</span>}
                {title}
              </Fragment>
            ))}
          </p>
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
