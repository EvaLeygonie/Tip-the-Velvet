import React, { useState } from 'react'
import { confirmAndMigrateArtist, submitArtistCounterOffer } from '@/services/applicationService'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'
import { Send, Sparkles } from 'lucide-react'
import type { CastingApplication } from '@/types/types'

interface BookingDecisionCardProps {
  application: CastingApplication
  onStatusChange: () => void
}

export const BookingDecisionCard: React.FC<BookingDecisionCardProps> = ({
  application,
  onStatusChange,
}) => {
  const { t } = useLanguage()

  const initialFee = application.proposed_fee ?? application.requested_fee ?? 0

  const [fee, setFee] = useState<number>(initialFee)
  const [needsTravel, setNeedsTravel] = useState(application.needs_travel_costs || false)
  const [travelAmount, setTravelAmount] = useState<number>(application.travel_cost_amount || 0)
  const [needsAccom, setNeedsAccom] = useState(application.needs_accommodation || false)
  const [accomNotes, setAccomNotes] = useState(application.accommodation_notes || '')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const isCounterOffer =
    fee !== initialFee ||
    needsTravel !== (application.needs_travel_costs || false) ||
    travelAmount !== (application.travel_cost_amount || 0) ||
    needsAccom !== (application.needs_accommodation || false) ||
    (accomNotes || '') !== (application.accommodation_notes || '')

  const handleConfirmDirect = async () => {
    setIsSubmitting(true)

    try {
      await confirmAndMigrateArtist(application, fee)

      toast.success(t('Kontraktet har bekräftats!', 'Contract confirmed!'))
      setShowModal(false)
      onStatusChange()
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte bekräfta erbjudandet', 'Could not confirm offer'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSendCounterOffer = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isCounterOffer) {
      setShowModal(true)
      return
    }

    setIsSubmitting(true)
    try {
      await submitArtistCounterOffer(application.id, {
        requested_fee: fee,
        needs_travel_costs: needsTravel,
        travel_cost_amount: needsTravel ? travelAmount : null,
        needs_accommodation: needsAccom,
        accommodation_notes: needsAccom ? accomNotes : null,
      })

      toast.success(t('Ditt motbud/ändringar har skickats!', 'Counter-offer submitted!'))
      onStatusChange()
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte skicka ändringarna', 'Could not send changes'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="login-card">
      <form onSubmit={handleSendCounterOffer} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="fee" className="form-label-gold block">
            {t('Erbjudet gage (SEK)', 'Offered Fee (SEK)')}
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
              className="accent-accent"
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
              className="accent-accent"
            />
            <span className="text-sm font-medium text-foreground/90">
              {t('Jag behöver boende', 'I need accommodation')}
            </span>
          </label>

          {needsAccom && (
            <div className="pl-7">
              <label htmlFor="accomNotes" className="form-label-gold block text-[11px] mb-2">
                {t('Anteckningar: ', 'Notes: ')}
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

      {/* Modal vid direkt bekräftelse */}
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
                type="button"
                onClick={() => setShowModal(false)}
                className="btn-gold-outline"
                disabled={isSubmitting}
              >
                {t('Avbryt', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmDirect}
                className="btn-gold"
                disabled={isSubmitting}
              >
                {isSubmitting ? t('Sparar...', 'Saving...') : t('Jag godkänner', 'I Confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
