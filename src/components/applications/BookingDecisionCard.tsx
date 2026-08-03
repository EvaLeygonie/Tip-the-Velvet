import React, { useState } from 'react'
import { confirmAndMigrateArtist } from '@/services/applicationService'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'
import { Sparkles, Mail, CheckCircle2, Car, Home, DollarSign } from 'lucide-react'
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

  const currentFee = application.proposed_fee ?? application.requested_fee ?? 0
  const needsTravel = application.needs_travel_costs || false
  const travelAmount = application.travel_cost_amount || 0
  const needsAccom = application.needs_accommodation || false
  const accomNotes = application.accommodation_notes || ''

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const handleConfirmDirect = async () => {
    setIsSubmitting(true)
    try {
      const finalTravel = needsTravel ? travelAmount : 0

      await confirmAndMigrateArtist(application, currentFee, finalTravel)

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

  const mailSubject = encodeURIComponent(
    t(
      `Fråga / Förhandling angående bokning: ${application.act_title}`,
      `Question / Negotiation regarding booking: ${application.act_title}`
    )
  )

  const mailtoUrl = `mailto:velvet.gbg@gmail.com?subject=${mailSubject}`

  return (
    <div className="login-card space-y-6">
      <div className="text-center space-y-2">
        <h3 className="font-decorative text-xl text-accent">
          {t('Erbjudande om medverkan', 'Performance Offer')}
        </h3>
        <p className="text-sm text-foreground/90">
          {t(
            'Granska villkoren nedan. Om allt ser bra ut godkänner du för att gå vidare. Vill du förhandla gage reseersättning eller  boende, kontakta oss via mail (länk nedan).',
            'Review the terms below. If everything looks good, accept to proceed. If you want to negotiate fee, travel reimbursement or accommodation, contact us via email (link below).'
          )}
        </p>
      </div>

      <div className="gold-divider" />

      {/* VILLKORSSUMMERING */}
      <div className="space-y-4 bg-background/40 p-4 rounded-lg border border-accent/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-foreground/90">
            <DollarSign className="w-4 h-4 text-accent" />
            <span className="text-sm font-semibold">{t('Erbjudet gage:', 'Offered Fee:')}</span>
          </div>
          <span className="text-base font-bold font-mono text-gold">{currentFee} SEK</span>
        </div>

        <div className="flex items-center justify-between border-t border-border/40 pt-3">
          <div className="flex items-center gap-2 text-foreground/90">
            <Car className="w-4 h-4 text-accent" />
            <span className="text-sm">{t('Reseersättning:', 'Travel Reimbursement:')}</span>
          </div>
          <span className="text-sm font-medium">
            {needsTravel ? `${travelAmount} SEK` : t('Behövs ej', 'Not needed')}
          </span>
        </div>

        <div className="flex items-center justify-between border-t border-border/40 pt-3">
          <div className="flex items-center gap-2 text-foreground/90">
            <Home className="w-4 h-4 text-accent" />
            <span className="text-sm">{t('Boende:', 'Accommodation:')}</span>
          </div>
          <span className="text-sm font-medium">
            {needsAccom
              ? accomNotes
                ? `Ja (${accomNotes})`
                : t('Ja', 'Yes')
              : t('Behövs ej', 'Not needed')}
          </span>
        </div>
      </div>

      {/* KNAPPAR */}
      <div className="pt-2 space-y-3">
        <button
          type="button"
          onClick={() => setShowModal(true)}
          disabled={isSubmitting}
          className="btn-gold w-full justify-center !py-3 text-sm shadow-lg"
        >
          <Sparkles size={14} />
          {t('Godkänn & Bekräfta plats', 'Accept & Confirm Spot')}
        </button>

        <a
          href={mailtoUrl}
          className="flex items-center justify-center gap-2 text-xs text-foreground/70 hover:text-accent transition-colors pt-2"
        >
          <Mail size={14} />
          <span>
            {t(
              'Vill du diskutera gage, reseersättning eller boende? Kontakta oss',
              'Want to discuss fee, travel costs or accommodation? Contact us'
            )}
          </span>
        </a>
      </div>

      {/* MODAL VID CONFIRM */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="login-card w-full max-w-md text-center space-y-6 border-accent/40">
            <div className="flex justify-center text-accent">
              <CheckCircle2 size={48} />
            </div>
            <h2 className="text-2xl text-accent font-decorative">
              {t('Slutgiltig bekräftelse', 'Final Confirmation')}
            </h2>
            <p className="p-clean text-center opacity-90 leading-relaxed text-sm">
              {t(
                `Du godkänner därmed att medverka med "${application.act_title}" till ett gage på ${currentFee} SEK ${
                  needsTravel ? `+ ${travelAmount} SEK i reseersättning` : ''
                }.`,
                `You hereby confirm participating with "${application.act_title}" for a fee of ${currentFee} SEK ${
                  needsTravel ? `+ ${travelAmount} SEK travel allowance` : ''
                }.`
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
