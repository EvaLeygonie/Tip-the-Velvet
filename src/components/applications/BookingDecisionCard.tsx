import React from 'react'
import type { CastingApplication } from '@/types/types'
import { confirmAndMigrateArtist } from '@/services/applicationService'
import { Check, Mail, Car, CreditCard, HeartHandshake } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'

interface BookingDecisionCardProps {
  application: CastingApplication
  onStatusChange: () => void
}

export const BookingDecisionCard: React.FC<BookingDecisionCardProps> = ({
  application,
  onStatusChange,
}) => {
  const { t } = useLanguage()
  const [loading, setLoading] = React.useState(false)

  const offeredFee = application.proposed_fee || application.requested_fee || 0
  const hasTravelCosts = application.needs_travel_costs || (application.travel_cost_amount ?? 0) > 0

  const handleAcceptOffer = async () => {
    setLoading(true)
    try {
      await confirmAndMigrateArtist(application, offeredFee)
      toast.success('Underbart! Din bokning är nu bekräftad.')
      onStatusChange()
    } catch (err) {
      console.error(err)
      toast.error(
        t(
          'Kunde inte bekräfta bokningen. Försök igen eller kontakta oss.',
          'Could not confirm booking. Try again or contact us.'
        )
      )
    } finally {
      setLoading(false)
    }
  }

  // Förberedd maillänk för att hålla dialogen personlig
  const mailSubject = encodeURIComponent(`Fråga angående bokning - ${application.performer_name}`)
  const mailBody = encodeURIComponent(
    `Hej!\n\nJag har kollat på bokningsförslaget för ${application.act_title} men skulle vilja stämma av lite angående [gage / resa / boende].\n\nAllt gott,\n${application.performer_name}`
  )
  const mailtoUrl = `mailto:booking@tipthevelvet.se?subject=${mailSubject}&body=${mailBody}`

  return (
    <div className="login-card space-y-6 border border-accent/40 bg-card/60 backdrop-blur-sm p-6 rounded-xl shadow-lg">
      {/* Varmt välkomnande */}
      <div className="space-y-2 text-center sm:text-left">
        <div className="flex items-center justify-center sm:justify-center gap-2 text-accent font-medium text-sm">
          <HeartHandshake size={18} />
          <span>Bokningsförslag</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Vi vill ha dig med i showen!</h2>
        <p className="text-sm text-foreground/80 leading-relaxed">
          Här är detaljerna kring ditt gage och eventuell reseersättning. Om allt ser bra ut kan du
          bekräfta direkt nedan. Om inte får du gärna kontakta oss så försöker vi komma fram till
          något tillsammans!
        </p>
      </div>

      {/* Summering av erbjudandet */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-lg bg-background/50 border border-border/60">
        <div className="flex items-start gap-3">
          <CreditCard className="w-5 h-5 text-accent shrink-0 mt-0.5" />
          <div>
            <span className="text-xs text-foreground/60 block uppercase font-semibold">
              Erbjudet Gage
            </span>
            <span className="text-xl font-bold text-accent">{offeredFee} SEK</span>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Car className="w-5 h-5 text-accent shrink-0 mt-0.5" />
          <div>
            <span className="text-xs text-foreground/60 block uppercase font-semibold">
              Reseersättning
            </span>
            <span className="text-sm font-medium">
              {hasTravelCosts
                ? `${application.travel_cost_amount || 0} SEK ingår`
                : 'Ej specifierad / Ingår ej'}
            </span>
          </div>
        </div>
      </div>

      {/* Handlingsknappar */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          onClick={handleAcceptOffer}
          disabled={loading}
          className="btn-gold flex-1 justify-center py-3 text-sm font-semibold tracking-wide"
        >
          <Check size={18} />
          {loading ? 'Bekräftar...' : 'Acceptera & Bekräfta Booking'}
        </button>

        <a
          href={mailtoUrl}
          className="btn-gold-outline flex-1 justify-center py-3 text-sm font-medium flex items-center gap-2 text-center"
        >
          <Mail size={16} />
          Kontakta oss för frågor
        </a>
      </div>

      <p className="text-xs text-center text-foreground/50 pt-1">
        Har du frågor om gaget, boende eller resa? Klicka på "Kontakta oss" så stämmer vi av direkt
        via mail!
      </p>
    </div>
  )
}
