import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getCastingApplicationById,
  confirmAndMigrateArtist,
  submitArtistCounterOffer,
} from '@/services/applicationService'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'
import { CheckCircle2, ArrowLeft, Send, Sparkles } from 'lucide-react'
import type { CastingApplication } from '@/types/types'

export const ConfirmBooking = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useLanguage()

  const [loading, setLoading] = useState(true)
  const [application, setApplication] = useState<CastingApplication | null>(null)

  // Formulär-states
  const [fee, setFee] = useState<number>(0)
  const [originalFee, setOriginalFee] = useState<number>(0)
  const [needsTravel, setNeedsTravel] = useState(false)
  const [travelAmount, setTravelAmount] = useState<number>(0)
  const [needsAccom, setNeedsAccom] = useState(false)
  const [accomNotes, setAccomNotes] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [showModal, setShowModal] = useState(false)

  // Ladda ansökan
  useEffect(() => {
    if (!id) return

    let isMounted = true

    const fetchApplication = async () => {
      try {
        setLoading(true)
        const data = await getCastingApplicationById(id)

        if (data && isMounted) {
          setApplication(data)
          const initialFee = data.proposed_fee || 0
          setFee(initialFee)
          setOriginalFee(initialFee)
          setNeedsTravel(data.needs_travel_costs || false)
          setTravelAmount(data.travel_cost_amount || 0)
          setNeedsAccom(data.needs_accommodation || false)
          setAccomNotes(data.accommodation_notes || '')

          if (data.booking_status === 'confirmed') {
            setIsConfirmed(true)
          }
        }
      } catch (err) {
        console.error('Error fetching application:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchApplication()

    return () => {
      isMounted = false
    }
  }, [id])

  // Kolla om ändringar gjorts i erbjudandet
  const isCounterOffer =
    fee !== originalFee ||
    needsTravel !== (application?.needs_travel_costs || false) ||
    travelAmount !== (application?.travel_cost_amount || 0) ||
    needsAccom !== (application?.needs_accommodation || false) ||
    (accomNotes || '') !== (application?.accommodation_notes || '')

  const handleConfirmDirect = async () => {
    if (!id || !application) return
    setIsSubmitting(true)

    try {
      await confirmAndMigrateArtist(application, fee)

      toast.success(t('Kontraktet har bekräftats!', 'Contract confirmed!'))
      setIsConfirmed(true)
      setShowModal(false)
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte bekräfta erbjudandet', 'Could not confirm offer'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSendCounterOffer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return

    if (!isCounterOffer) {
      setShowModal(true)
      return
    }

    setIsSubmitting(true)
    try {
      await submitArtistCounterOffer(id, {
        requested_fee: fee,
        needs_travel_costs: needsTravel,
        travel_cost_amount: needsTravel ? travelAmount : null,
        needs_accommodation: needsAccom,
        accommodation_notes: needsAccom ? accomNotes : null,
      })

      toast.success(t('Ditt motbud/ändringar har skickats!', 'Counter-offer submitted!'))
      setIsConfirmed(true)
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte skicka ändringarna', 'Could not send changes'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="page-full">
        <div className="bg-glow-spot" />
        <div className="loading-container">
          <p className="loading-text">{t('Laddar erbjudande...', 'Loading offer...')}</p>
        </div>
      </div>
    )
  }

  if (!application || isConfirmed) {
    return (
      <div className="page-full">
        <div className="bg-glow-spot" />
        <div className="w-full max-w-md z-10">
          <div className="login-card text-center space-y-6">
            <CheckCircle2 className="w-12 h-12 text-accent mx-auto" />
            <div className="space-y-2">
              <h2 className="text-xl">
                {isConfirmed
                  ? t('Erbjudandet bekräftat', 'Offer Confirmed')
                  : t('Hittades inte', 'Not Found')}
              </h2>
              <p className="p-clean text-center opacity-80">
                {isConfirmed
                  ? t(
                      'Tack! Ditt kontrakt/motbud är registrerat. Vi återkommer så snart som möjligt.',
                      'Thank you! Your contract/counter-offer is registered. We will be in touch shortly.'
                    )
                  : t(
                      'Detta erbjudande finns inte längre eller har blivit flyttat.',
                      'This offer is no longer available or has been moved.'
                    )}
              </p>
            </div>

            <button
              onClick={() => navigate('/')}
              className="btn-gold-outline w-full justify-center"
            >
              <ArrowLeft size={14} />
              {t('Tillbaka till starten', 'Back to home')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-full">
      <div className="bg-glow-spot" />

      <div className="w-full max-w-lg z-10">
        <div className="text-center mb-4">
          <h1>{t('Kontraktserbjudande', 'Contract Offer')}</h1>
          <p className="text-[13px] uppercase tracking-[0.3em] text-accent/80 font-medium italic">
            • {application.performer_name} • {application.act_title} •
          </p>
        </div>

        <div className="login-card">
          <form onSubmit={handleSendCounterOffer} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="fee" className="form-label-gold block">
                {t(
                  'Erbjudet gage (SEK) - Ange ev. motbud',
                  'Offered Fee (SEK) - Write counter offer'
                )}
              </label>
              <input
                id="fee"
                type="number"
                value={fee}
                onChange={(e) => setFee(Number(e.target.value))}
                className="login-input text-lg font-bold"
                required
              />
            </div>

            <div className="gold-divider my-4" />

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={needsTravel}
                  onChange={(e) => setNeedsTravel(e.target.checked)}
                />
                <span className="text-sm font-medium text-foreground/90">
                  {t('Jag är i behov av reseersättning', 'I need travel reimbursement')}
                </span>
              </label>

              {needsTravel && (
                <div className="pl-7">
                  <label htmlFor="travelAmount" className="form-label-gold block text-[11px] mb-2">
                    {t('Ungefärligt belopp för resa (SEK)', 'Approximate travel amount (SEK)')}
                  </label>
                  <input
                    id="travelAmount"
                    type="number"
                    value={travelAmount}
                    onChange={(e) => setTravelAmount(Number(e.target.value))}
                    className="login-input mt-1"
                    placeholder="0"
                  />
                </div>
              )}
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={needsAccom}
                  onChange={(e) => setNeedsAccom(e.target.checked)}
                />
                <span className="text-sm font-medium text-foreground/90">
                  {t('Jag behöver boende', 'I need accommodation')}
                </span>
              </label>

              {needsAccom && (
                <div className="pl-7">
                  <label htmlFor="accomNotes" className="form-label-gold block text-[11px] mb-2">
                    {t('Detaljer kring boende', 'Accommodation details')}
                  </label>
                  <textarea
                    id="accomNotes"
                    rows={3}
                    value={accomNotes}
                    onChange={(e) => setAccomNotes(e.target.value)}
                    className="login-input mt-1"
                    placeholder={t(
                      'T.ex. Kör bil från Stockholm, behöver parkering...',
                      'E.g. Driving from Stockholm, need parking...'
                    )}
                  />
                </div>
              )}
            </div>

            <div className="pt-4 space-y-3">
              {isCounterOffer ? (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-gold-outline w-full justify-center !py-3"
                >
                  <Send size={16} />
                  {isSubmitting
                    ? t('Skickar...', 'Sending...')
                    : t('Skicka motbud / ändringar', 'Submit Counter-Offer')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowModal(true)}
                  disabled={isSubmitting}
                  className="btn-gold w-full justify-center"
                >
                  <Sparkles size={16} />
                  {t('Granska & Bekräfta plats', 'Review & Confirm Spot')}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="login-card w-full max-w-md text-center space-y-6">
            <h2 className="text-2xl text-accent font-decorative">
              {t('Slutgiltig bekräftelse', 'Final Confirmation')}
            </h2>
            <p className="p-clean text-center opacity-90 leading-relaxed">
              {t(
                `Du godkänner villkoren för att medverka med "${application.act_title}" till ett gage på ${fee} SEK.`,
                `You confirm participating with "${application.act_title}" for a fee of ${fee} SEK.`
              )}
            </p>

            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="btn-gold-outline"
                disabled={isSubmitting}
              >
                {t('Avbryt', 'Cancel')}
              </button>
              <button onClick={handleConfirmDirect} className="btn-gold" disabled={isSubmitting}>
                {isSubmitting ? t('Sparar...', 'Saving...') : t('Jag godkänner', 'I Confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
