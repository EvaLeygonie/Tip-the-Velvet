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

  const bookingStatus = application.booking_status
  const showDecisionCard =
    bookingStatus === 'negotiating' || bookingStatus === 'pending_confirmation'
  const showBookedForm = bookingStatus === 'confirmed'

  // Failsafe — only these two states have a real page to show. Anything else (an old link
  // to an application that was declined, or cancelled after having been confirmed, or
  // never contacted at all) must not silently fall through to the decision card, since
  // that would let a declined or removed artist "accept" a spot that no longer exists.
  if (!showDecisionCard && !showBookedForm) {
    const isCancelled = bookingStatus === 'cancelled'
    const isDeclined = bookingStatus === 'declined'

    return (
      <div className="min-h-screen flex items-center justify-center text-center px-4">
        <div className="max-w-md space-y-2">
          <p className="text-lg font-semibold text-red-400">
            {isCancelled
              ? t('Din bokning har avbokats', 'Your booking has been cancelled')
              : isDeclined
                ? t('Din ansökan gick tyvärr inte vidare', 'Your application was not selected')
                : t('Länken är inte giltig just nu', 'This link is not valid right now')}
          </p>
          <p className="text-sm text-foreground/60">
            {isCancelled
              ? t(
                  'Om du har frågor, hör gärna av dig till oss.',
                  'If you have any questions, please reach out to us.'
                )
              : t(
                  'Kontakta oss om du tror att detta är ett misstag.',
                  'Contact us if you believe this is a mistake.'
                )}
          </p>
        </div>
      </div>
    )
  }

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

        {showBookedForm ? (
          <BookedArtistForm application={application} />
        ) : (
          <BookingDecisionCard
            key={application.id}
            application={application}
            onStatusChange={refetchData}
          />
        )}
      </div>
    </div>
  )
}
