import { useState } from 'react'
import { Link } from 'react-router-dom'
import { createPortal } from 'react-dom'
import type { CastingApplication } from '@/types/types'
import { getImageSrc, formatDate } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'
import {
  ChevronDown,
  ChevronUp,
  Mail,
  Link as LinkIcon,
  Video,
  Save,
  BusFront,
  Home,
  DollarSign,
  Check,
} from 'lucide-react'
import { toast } from 'sonner'

interface CastingApplicationRowProps {
  application: CastingApplication
  onStatusChange: (id: string, newStatus: CastingApplication['review_status']) => void
  onSaveNotes: (id: string, notes: string) => Promise<void>
  onUpdateLogistics: (
    id: string,
    initialReplySent: boolean,
    bookingStatus: CastingApplication['booking_status'],
    proposedFee?: number
  ) => Promise<void>
}

const Instagram = ({ size = 20 }: { size?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
)

export const CastingApplicationRow = ({
  application,
  onStatusChange,
  onSaveNotes,
  onUpdateLogistics,
}: CastingApplicationRowProps) => {
  const { language, t } = useLanguage()
  const [isExpanded, setIsExpanded] = useState(false)
  const [notes, setNotes] = useState(application.admin_notes || '')
  const [savingNotes, setSavingNotes] = useState(false)

  const [showMailModal, setShowMailModal] = useState(false)
  const [mailSubject, setMailSubject] = useState('')
  const [isSendingMail, setIsSendingMail] = useState(false)
  const [customMailBodyText, setCustomMailBodyText] = useState<string | null>(null)

  const [offerFee, setOfferFee] = useState<number>(
    Number(application.proposed_fee) || Number(application.requested_fee) || 1000
  )

  const isSv = application.language === 'sv'
  const hasTravelNeed = application.needs_travel_costs
  const travelCostAmount = Number(application.travel_cost_amount) || 0
  const hasAccommodationNeed = application.needs_accommodation

  const isRejectedAndSent = application.review_status === 'no' && application.initial_reply_sent
  const isAwaitingConfirmation =
    application.review_status === 'yes' &&
    application.initial_reply_sent &&
    application.booking_status !== 'confirmed'
  const isFullyConfirmed =
    application.review_status === 'yes' && application.booking_status === 'confirmed'

  let statusRowClass = 'hover:border-accent/30'
  if (isRejectedAndSent) {
    statusRowClass = 'border-red-900/65 bg-red-950/5 hover:border-red-800'
  } else if (isAwaitingConfirmation) {
    statusRowClass = 'border-amber-600/50 bg-amber-950/10 hover:border-amber-500'
  } else if (isFullyConfirmed) {
    statusRowClass =
      'border-emerald-500 bg-emerald-950/20 shadow-[0_0_15px_rgba(16,185,129,0.05)] cursor-default'
  }

  const contractLink = `https://tipthevelvet.nu/casting/confirm/${application.id}?token=${application.access_token}`

  // MAIL TEMPLATES
  const logisticsText = isSv
    ? `• Gage: ${offerFee} SEK\n• Resekostnader: ${hasTravelNeed ? (travelCostAmount > 0 ? `${travelCostAmount} SEK` : 'Förhandlas via länken nedan') : 'Inte angivet'}\n• Boende: ${hasAccommodationNeed ? 'Community hosting löses av oss' : 'Inte angivet'}`
    : `• Fee: ${offerFee} SEK\n• Travel costs: ${hasTravelNeed ? (travelCostAmount > 0 ? `${travelCostAmount} SEK` : 'To be discussed (click on the link below)') : 'Not decided'}\n• Accommodation: ${hasAccommodationNeed ? 'Community hosting will be arranged by us' : 'Not decided'}`

  const travelNotice = hasTravelNeed
    ? isSv
      ? `Eftersom du angett att du har behov av reseersättning behöver vi kolla om det får plats i vår budget eller ej innan vi bekräftar din plats.\n\n`
      : `Since you mentioned needing travel support, we need to check if this fits our budget before confirming your spot.\n\n`
    : ''

  const defaultYesBody = isSv
    ? `Vi älskade din ansökan för "${application.act_title}" och vill jättegärna erbjuda dig en plats i showen!\n\n${travelNotice}Här är det villkor och upplägg vi har tagit fram:\n${logisticsText}\n\nVia länken nedan kan vårt erbjudande granskas, förhandlas och/eller accepteras. Klicka här för att se detaljerna:\n${contractLink}\n\nVi ser verkligen fram emot att jobba med dig!`
    : `We loved your application for "${application.act_title}" and would love to offer you a spot in the show!\n\n${travelNotice}Here are the terms and details for the offer:\n${logisticsText}\n\nThrough the link below, our offer can be reviewed, negotiated, and/or accepted. Please use the following link to see the details:\n${contractLink}\n\nWe are thrilled about the prospect of working together!`

  const defaultNoBody = isSv
    ? `Stort tack för att du sökte till vår show med din akt "${application.act_title}"!\n\nWe har nu gått igenom alla ansökningar, och tyvärr har vi inte möjlighet att ta med din akt i just den här produktionen. Urvalet har varit otroligt svårt då vi fått in väldigt många fantastiska bidrag.\n\nVi sparar gärna dina kontaktuppgifter för framtida shower, och hoppas att vi ses eller hörs framöver!`
    : `Thank you so much for applying to our show with your act "${application.act_title}"!\n\nWe have reviewed all applications, and unfortunately, we are unable to include your act in this specific production. The selection process was highly competitive due to the volume of amazing submissions we received.\n\nWe would love to keep your details on file for future shows, and hope to cross paths in the future!`

  const defaultMaybeBody = isSv
    ? `Hej ${application.performer_name}!\n\nHoppas att allt är fint med dig. Vi har gått igenom din castingansökan gällande din akt "${application.act_title}" och tycker den är väldigt intressant.\n\n [...] \n\nVarma hälsningar,\nTip the Velvet`
    : `Hi ${application.performer_name}!\n\nHope you are doing well. We have reviewed your casting application regarding your act "${application.act_title}" and find it very interesting.\n\n [...] \n\nBest regards,\nTip the Velvet`

  const activeDefaultBody =
    application.review_status === 'yes'
      ? defaultYesBody
      : application.review_status === 'no'
        ? defaultNoBody
        : application.review_status === 'maybe'
          ? defaultMaybeBody
          : ''

  const currentMailBodyText = customMailBodyText !== null ? customMailBodyText : activeDefaultBody

  const handleSaveNotes = async () => {
    setSavingNotes(true)
    try {
      await onSaveNotes(application.id, notes)
      toast.success(t('Anteckningar sparade!', 'Notes saved!'))
    } catch (err) {
      toast.error(t('Kunde inte spara anteckningar.', 'Could not save notes.'))
      console.error(err)
    } finally {
      setSavingNotes(false)
    }
  }

  const handleStatusSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    try {
      onStatusChange(application.id, e.target.value as CastingApplication['review_status'])
      toast.success(t('Status uppdaterad!', 'Status updated!'))
    } catch (err) {
      toast.error(t('Kunde inte uppdatera status.', 'Could not update status.'))
      console.error(err)
    }
  }

  const handleOpenMailModal = (e: React.MouseEvent) => {
    e.stopPropagation()

    let subject = ''
    if (application.review_status === 'yes') {
      subject = hasTravelNeed
        ? isSv
          ? `Erbjudande & Resefråga: Casting för Tip the Velvet - ${application.act_title}`
          : `Offer & Travel Question: Casting for Tip the Velvet - ${application.act_title}`
        : isSv
          ? `Erbjudande: Casting för Tip the Velvet - ${application.act_title}`
          : `Offer: Casting for Tip the Velvet - ${application.act_title}`
    } else if (application.review_status === 'no') {
      subject = isSv
        ? `Tip the Velvet - Angående din castingansökan för ${application.act_title}`
        : `Tip the Velvet - Regarding your casting application for ${application.act_title}`
    } else {
      subject = isSv
        ? `Tip the Velvet - Gällande din akt ${application.act_title}`
        : `Tip the Velvet - Regarding your act ${application.act_title}`
    }

    setMailSubject(subject)
    setCustomMailBodyText(null)
    setShowMailModal(true)
  }

  const handleSendCastingMail = async () => {
    setIsSendingMail(true)
    try {
      const response = await fetch('/api/send-casting-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: application.email,
          name: application.performer_name,
          subject: mailSubject,
          bodyText: currentMailBodyText,
          language: application.language,
        }),
      })

      if (!response.ok) throw new Error('Kunde inte skicka mail via API:et.')

      let nextBookingStatus: CastingApplication['booking_status'] = 'not_contacted'

      if (application.review_status === 'no') {
        nextBookingStatus = 'declined'
      } else if (application.review_status === 'yes') {
        nextBookingStatus = 'pending_confirmation'
      }

      // HÄR SPARAS DET NYA GAGET (offerFee) TILL SUPABASE!
      await onUpdateLogistics(
        application.id,
        true, // initial_reply_sent = true
        nextBookingStatus,
        application.review_status === 'yes' ? offerFee : undefined
      )

      toast.success(t('Mailet har skickats framgångsrikt!', 'Email sent successfully!'))
      setShowMailModal(false)
    } catch (err) {
      console.error('Fel vid utskick:', err)
      toast.error(
        t('Kunde inte skicka mailet, försök igen.', 'Could not send email, please try again.')
      )
    } finally {
      setIsSendingMail(false)
    }
  }

  return (
    <div
      className={`admin-panel velvet-surface transition-all duration-300 overflow-hidden cursor-pointer ${statusRowClass}`}
      style={{ padding: 0 }}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {/* --- STÄNGD RAD --- */}
      <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        {/* Vänster */}
        <div className="grid grid-cols-12 gap-4 items-center flex-1 min-w-0">
          {/* Artistprofil, Namn & Akt */}
          <div className="col-span-12 md:col-span-5 flex items-center gap-3 min-w-0">
            <div className="text-accent/50 shrink-0">
              {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </div>
            <div className="w-12 h-12 rounded-md overflow-hidden border border-accent/20 shrink-0 bg-black/40">
              {application.promo_image_id ? (
                <img
                  src={getImageSrc(application.promo_image_id)}
                  alt={application.performer_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-accent/30 text-xs font-mono">
                  N/A
                </div>
              )}
            </div>
            <div className="truncate">
              <div className="font-decorative text-base text-foreground tracking-wide truncate">
                {application.performer_name}
              </div>
              <div className="text-accent italic text-xs font-heading truncate">
                {application.act_title}
              </div>
            </div>
          </div>

          {/* Språkkolumn */}
          <div className="col-span-4 md:col-span-2 text-sm text-foreground/60 font-body truncate">
            <span className="block uppercase tracking-wider text-[10px] text-accent/50 font-semibold mb-0.5">
              {t('Språk', 'Language')}
            </span>
            <span className="truncate block">
              {application.language === 'sv' ? t('Svenska', 'Swedish') : t('Engelska', 'English')}
            </span>
          </div>

          {/* Platskolumn */}
          <div className="col-span-4 md:col-span-3 text-sm text-foreground/60 font-body truncate">
            <span className="block uppercase tracking-wider text-[10px] text-accent/50 font-semibold mb-0.5">
              {t('Plats', 'Location')}
            </span>
            <span className="truncate block">{application.city || '—'}</span>
          </div>

          {/* Gage-kolumn (Uppdaterad med resekostnad om > 0) */}
          <div className="col-span-4 md:col-span-2 text-sm text-foreground/60 font-body">
            <span className="block uppercase tracking-wider text-[10px] text-accent/50 font-semibold mb-0.5">
              {t('Preliminärt gage', 'Preliminary fee')}
            </span>
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-foreground/90 flex items-center gap-0.5 whitespace-nowrap">
                  {application.requested_fee ?? '—'}{' '}
                  {application.requested_fee && (
                    <span className="text-[10px] text-accent">SEK</span>
                  )}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  {application.needs_travel_costs && (
                    <span title={t('Behöver resa', 'Needs travel')}>
                      <BusFront className="h-3.5 w-3.5 text-gold" />
                    </span>
                  )}
                  {application.needs_accommodation && (
                    <span title={t('Behöver boende', 'Needs accommodation')}>
                      <Home className="h-3.5 w-3.5 text-accent/50" />
                    </span>
                  )}
                </div>
              </div>

              {/* Visas om resekostnad finns angiven och är > 0 */}
              {hasTravelNeed && travelCostAmount > 0 && (
                <span className="text-[11px] text-amber-400 font-medium">
                  + {travelCostAmount} SEK {t('resa', 'travel')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Höger sida: Status-dropdown & Mailknapp */}
        <div
          className="flex items-center gap-2 shrink-0 self-end sm:self-center"
          onClick={(e) => e.stopPropagation()}
        >
          <select
            value={application.review_status}
            onChange={handleStatusSelect}
            className="admin-select !w-32 text-xs py-1.5 px-2.5 pr-8"
          >
            <option value="pending">{t('Osorterad', 'Unsorted')}</option>
            <option value="yes">{t('Ja', 'Yes')}</option>
            <option value="maybe">{t('Kanske', 'Maybe')}</option>
            <option value="no">{t('Nej', 'No')}</option>
          </select>

          {isFullyConfirmed ? (
            <Link to={`/casting/confirm/${application.id}`}>
              <button
                className="p-2 border rounded-md transition-colors shrink-0 bg-emerald-500/20 border-emerald-500 text-emerald-400 hover:bg-emerald-500 hover:text-black"
                title={t('Visa kontrakt', 'View contract')}
              >
                <Check className="h-4 w-4" />
              </button>
            </Link>
          ) : (
            <button
              onClick={handleOpenMailModal}
              disabled={isFullyConfirmed}
              className={`p-2 border rounded-md transition-colors shrink-0 ${
                isAwaitingConfirmation
                  ? 'bg-amber-500/10 border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-black'
                  : isRejectedAndSent
                    ? 'bg-red-500/10 border-red-500 text-red-500 hover:bg-red-500 hover:text-black'
                    : 'bg-accent/10 border-accent/20 text-accent hover:bg-accent hover:text-black'
              }`}
              title={t('Kontakta artist', 'Contact artist')}
            >
              <Mail className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* --- EXPANDERAD RAD (DETALJVY) --- */}
      {isExpanded && (
        <div
          className="border-t border-accent/10 bg-black/20 p-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-left cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Detaljvy: Vänsterkolumn (Medier & Promo-bild) */}
          <div className="space-y-4">
            {application.promo_image_id && (
              <div className="border border-accent/20 rounded-md overflow-hidden bg-black/40">
                <img
                  src={getImageSrc(application.promo_image_id)}
                  alt="Promo"
                  className="w-full h-auto max-h-80 object-contain block mx-auto bg-black/10"
                />
                {application.photographer && (
                  <div className="p-2 text-xs text-foreground/40 italic bg-black/60 border-t border-accent/10 text-center">
                    📸 {t('Fotograf', 'Photographer')}: {application.photographer}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2 pt-2">
              <span className="block uppercase tracking-wider text-[10px] text-accent/50 font-semibold">
                {t('Medier & Länkar', 'Media & Links')}
              </span>
              <div className="flex flex-col gap-2 text-sm">
                <a
                  href={`mailto:${application.email}`}
                  className="flex items-center gap-2 text-accent hover:underline"
                >
                  <Mail className="h-4 w-4 shrink-0" />{' '}
                  <span className="truncate">{application.email}</span>
                </a>
                {application.instagram_link && (
                  <a
                    href={application.instagram_link}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-accent hover:underline"
                  >
                    <Instagram /> <span>Instagram</span>
                  </a>
                )}
                {application.video_url && (
                  <a
                    href={application.video_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-accent hover:underline"
                  >
                    <Video className="h-4 w-4 shrink-0" />{' '}
                    <span>{t('Kolla video', 'Watch Video')}</span>
                  </a>
                )}
                {application.other_link && (
                  <a
                    href={application.other_link}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-accent hover:underline"
                  >
                    <LinkIcon className="h-4 w-4 shrink-0" />{' '}
                    <span className="truncate">{t('Hemsida / Annat', 'Website / Other')}</span>
                  </a>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-accent/5 font-body text-xs text-foreground/40">
              <span className="block uppercase tracking-wider text-[9px] text-accent/40 font-semibold mb-0.5 font-sans">
                {t('Ansökan inskickad', 'Application submitted')}
              </span>
              <span>{formatDate(language, application.created_at)}</span>
            </div>
          </div>

          {/* Detaljvy: Högerkolumn (Texter & Administrativa Fas-Banners) */}
          <div className="md:col-span-2 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              {/* --- DYNAMISKA FAS-BANNERS --- */}
              {application.initial_reply_sent && (
                <>
                  {isAwaitingConfirmation && (
                    <div className="p-3 rounded border text-xs font-mono flex items-center gap-2 bg-amber-500/10 border-amber-500/30 text-amber-400">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      <div>
                        <span className="font-bold uppercase tracking-wider block">
                          {t('Väntar på överenskommelse', 'Awaiting agreement')}
                        </span>
                        <span className="text-foreground/60 font-sans block mt-0.5">
                          {t(
                            'Länken till förhandlingssidan har skickats ut. Väntar på artistens bekräftelse eller motbud.',
                            'Negotiation link sent. Waiting for artist approval or changes.'
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                  {isFullyConfirmed && (
                    <div className="p-3 rounded border text-xs font-mono flex items-center gap-2 bg-emerald-500/10 border-emerald-500/40 text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <div>
                        <span className="font-bold uppercase tracking-wider block text-emerald-400">
                          {t('BOKNING FIXAD & KLAR!', 'BOOKING FINALIZED!')}
                        </span>
                        <span className="text-foreground/70 font-sans block mt-0.5">
                          {t(
                            'Båda parter har godkänt villkoren via länken. Handlingen är slutförd!',
                            'Both parties agreed to terms via link. Ready!'
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                  {isRejectedAndSent && (
                    <div className="p-3 rounded border text-xs font-mono flex items-center gap-2 bg-red-500/10 border-red-500/30 text-red-400">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      <div>
                        <span className="font-bold uppercase tracking-wider block">
                          {t('Nekad & Svarat', 'Declined & Notified')}
                        </span>
                        <span className="text-foreground/60 font-sans block mt-0.5">
                          {t(
                            'Svarsmail om avslag har skickats ut.',
                            'Rejection email has been sent.'
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Artisttexter */}
              <div>
                <span className="block uppercase tracking-wider text-[10px] text-accent/50 font-semibold mb-1">
                  {t('Promo Text', 'Promo Text')}
                </span>
                <p className="text-sm text-foreground/80 whitespace-pre-wrap font-body leading-relaxed bg-black/30 p-3 rounded border border-accent/5">
                  {application.promo_text || <i>{t('Ingen text angiven.', 'No text provided.')}</i>}
                </p>
              </div>

              <div>
                <span className="block uppercase tracking-wider text-[10px] text-accent/50 font-semibold mb-1">
                  {t('Aktbeskrivning', 'Act Description')}
                </span>
                <p className="text-sm text-foreground/80 whitespace-pre-wrap font-body leading-relaxed bg-black/30 p-3 rounded border border-accent/5">
                  {application.act_description || (
                    <i>{t('Ingen beskrivning angiven.', 'No description provided.')}</i>
                  )}
                </p>
              </div>

              {/* Visas enbart om artisten skrivit kommentarer */}
              {application.accommodation_notes && application.accommodation_notes.trim() !== '' && (
                <div>
                  <span className="block uppercase tracking-wider text-[10px] text-gold font-semibold mb-1">
                    {t('Logistiknoteringar från artisten', 'Logistics notes from artist')}
                  </span>
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap font-body leading-relaxed bg-amber-500/5 p-3 rounded border border-gold/10">
                    {application.accommodation_notes}
                  </p>
                </div>
              )}
            </div>

            {/* Interna Admin-kommentarer */}
            <div className="pt-4 border-t border-accent/10">
              <span className="block uppercase tracking-wider text-[10px] text-accent/50 font-semibold mb-1">
                {t('Admin-anteckningar (Visas ej för artist)', 'Admin Notes')}
              </span>
              <div className="flex items-center gap-2 w-full">
                <div className="flex-1">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t(
                      'Skriv interna kommentarer här...',
                      'Write internal notes here...'
                    )}
                    className="w-full h-14 text-sm bg-black/40 border border-accent/20 rounded p-2 text-foreground focus:border-accent resize-none block"
                  />
                </div>
                <button
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  className="btn-gold !w-14 h-14 aspect-square p-0 flex items-center justify-center shrink-0"
                  title={t('Spara anteckningar', 'Save notes')}
                >
                  <Save className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- PORTAL MODAL (MAIL UTKAST) --- */}
      {showMailModal &&
        typeof window !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 text-left"
            onClick={() => setShowMailModal(false)}
          >
            <div
              className="velvet-surface border border-accent/30 max-w-lg w-full p-6 space-y-4 rounded-lg shadow-2xl relative"
              style={{ backgroundColor: '#141111' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <h4 className="font-decorative text-lg text-accent text-center">
                  {application.review_status === 'yes'
                    ? t('Förbered förhandlingslänk', 'Prepare negotiation link')
                    : application.review_status === 'maybe'
                      ? t('Förbered intressemail', 'Prepare follow-up email')
                      : t('Förbered svarsmail', 'Prepare reply email')}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {t('Mottagare:', 'Recipient:')}{' '}
                  <span className="text-foreground font-mono">{application.email}</span> (
                  {application.performer_name})
                </p>
              </div>

              {application.review_status === 'yes' && (
                <div className="p-3 bg-black/30 border border-accent/10 rounded space-y-2">
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase tracking-wider text-gold flex items-center gap-1 font-mono">
                      <DollarSign className="h-3 w-3" />
                      {t('Erbjudet Gage (SEK) — Pris i länk', 'Offered Fee (SEK)')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={offerFee}
                      onChange={(e) => setOfferFee(Number(e.target.value))}
                      className="w-full text-sm bg-black/40 border border-accent/20 rounded p-1.5 focus:border-accent text-white"
                    />
                    <div className="flex justify-between items-center text-[10px] text-muted-foreground italic pt-0.5">
                      <span>
                        {t('Artistens önskemål:', 'Artist requested:')}{' '}
                        {application.requested_fee || '—'} SEK
                      </span>
                      {hasTravelNeed && (
                        <span className="text-amber-400 flex items-center gap-1 font-semibold">
                          <BusFront className="h-3 w-3" />{' '}
                          {travelCostAmount > 0
                            ? `${travelCostAmount} SEK`
                            : t('Önskat reseersättning', 'Requested travel')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-wider text-gold font-mono block">
                  {t('Ämnesrad', 'Subject')}
                </label>
                <input
                  type="text"
                  value={mailSubject}
                  onChange={(e) => setMailSubject(e.target.value)}
                  className="w-full text-sm bg-black/40 border border-accent/20 rounded p-2 focus:border-accent text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-wider text-gold font-mono block">
                  {t('Mailtext', 'Email Text')}
                </label>
                <textarea
                  value={currentMailBodyText}
                  onChange={(e) => setCustomMailBodyText(e.target.value)}
                  className="w-full h-44 text-sm bg-black/40 border border-accent/20 font-sans p-2 leading-relaxed rounded resize-none focus:border-accent text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-accent/10">
                <button
                  type="button"
                  onClick={() => setShowMailModal(false)}
                  className="px-4 py-2 text-xs border border-accent/20 rounded text-foreground/70 hover:bg-white/5 transition-colors"
                  disabled={isSendingMail}
                >
                  {t('Avbryt', 'Cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleSendCastingMail}
                  className="btn-gold text-xs py-2 px-4 flex items-center gap-1.5"
                  disabled={isSendingMail}
                >
                  <Mail className="h-3.5 w-3.5" />
                  {isSendingMail ? t('Skickar...', 'Sending...') : t('Skicka mail', 'Send email')}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
