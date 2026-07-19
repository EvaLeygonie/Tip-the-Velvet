import { useState } from 'react'
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
  const hasAccommodationNeed = application.needs_accommodation

  const isRejectedAndSent = application.review_status === 'no' && application.initial_reply_sent
  const isNegotiating =
    application.review_status === 'yes' && application.booking_status === 'negotiating'
  const isWaitingForArtist =
    application.review_status === 'yes' && application.booking_status === 'pending_confirmation'
  const isFullyConfirmed =
    application.review_status === 'yes' && application.booking_status === 'confirmed'

  // Kantlinje och bakgrund baserat på processens status
  let statusRowClass = 'hover:border-accent/30'
  if (isRejectedAndSent) {
    statusRowClass = 'border-red-900/65 bg-red-950/5 hover:border-red-800'
  } else if (isNegotiating) {
    statusRowClass = 'border-amber-600/50 bg-amber-950/10 hover:border-amber-500'
  } else if (isWaitingForArtist) {
    statusRowClass = 'border-purple-800/40 bg-purple-950/10 hover:border-purple-700/60'
  } else if (isFullyConfirmed) {
    statusRowClass =
      'border-emerald-500 bg-emerald-950/20 shadow-[0_0_15px_rgba(16,185,129,0.05)] cursor-default'
  }

  const contractLink = `https://tipthevelvet.nu/casting/confirm/${application.id}`

  const logisticsText = isSv
    ? `• Gage: ${offerFee} SEK\n• Resekostnader: ${hasTravelNeed ? 'Diskuteras (förhandling pågår)' : 'Behövs ej'}\n• Boende: ${hasAccommodationNeed ? 'Community hosting löses av oss' : 'Behövs ej'}`
    : `• Fee: ${offerFee} SEK\n• Travel costs: ${hasTravelNeed ? 'To be discussed (negotiation ongoing)' : 'Not needed'}\n• Accommodation: ${hasAccommodationNeed ? 'Provided free of charge by us' : 'Not needed'}`

  const defaultYesBody =
    hasTravelNeed && !application.initial_reply_sent
      ? isSv
        ? `Vi älskade din ansökan för "${application.act_title}" och vill jättegärna erbjuda dig en plats i showen!\n\nEftersom du angett att du har behov av reseersättning vill vi stämma av detta med dig innan vi spikar det formella kontraktet. Hur ser dina resplaner ut, och vad tror du att resekostnaden landar på ungefär?\n\nVårt preliminära förslag på gage är:\n• Gage: ${offerFee} SEK\n\nBoende löser vi utan problem här på plats. Svara direkt på detta mail med dina tankar kring resan så tar vi detaljerna därifrån!`
        : `We loved your application for "${application.act_title}" and would love to offer you a spot in the show!\n\nSince you mentioned needing travel support, we'd like to check the details with you before finalizing the contract. What are your travel plans, and what is the estimated cost?\n\nOur preliminary fee offer is:\n• Fee: ${offerFee} SEK\n\nAccommodation is not an issue, we will arrange that here on site. Please reply directly to this email so we can align on the travel logistics!`
      : isSv
        ? `Vi älskade din ansökan för "${application.act_title}" och vill jättegärna erbjuda dig en plats i showen!\n\nHär är det villkor och upplägg vi har tagit fram:\n${logisticsText}\n\nFör att titta närmare på detaljerna, bekräfta din plats eller skicka ett meddelande till oss, klicka på länken här:\n${contractLink}\n\nVi ser verkligen fram emot att jobba med dig!`
        : `We loved your application for "${application.act_title}" and would look forward to offering you a spot in the show!\n\nHere are the terms and details for the offer:\n${logisticsText}\n\nTo review the details, confirm your spot, or send us a message, please use the following link:\n${contractLink}\n\nWe are thrilled about the prospect of working together!`

  const defaultNoBody = isSv
    ? `Stort tack för att du sökte till vår show med din akt "${application.act_title}"!\n\nVi har nu gått igenom alla ansökningar, och tyvärr har vi inte möjlighet att ta med din akt i just den här produktionen. Urvalet har varit otroligt svårt då vi fått in väldigt många fantastiska bidrag.\n\nVi sparar gärna dina kontaktuppgifter för framtida shower, och hoppas att vi ses eller hörs framöver!`
    : `Thank you so much for applying to our show with your act "${application.act_title}"!\n\nWe have reviewed all applications, and unfortunately, we are unable to include your act in this specific production. The selection process was highly competitive due to the volume of amazing submissions we received.\n\nWe would love to keep your details on file for future shows, and hope to cross paths in the future!`

  const defaultMaybeBody = isSv
    ? `Hejsan ${application.performer_name}!\n\nVi har kikat på din ansökan för "${application.act_title}" och blivit väldigt nyfikna. Vi håller på att pussla ihop programmet och återkommer så snart vi har ett definitivt besked...`
    : `Hello ${application.performer_name}!\n\nWe have reviewed your application for "${application.act_title}" and are very intrigued. We are currently putting the program together and will get back to you as soon as we have a final decision...`

  const activeDefaultBody =
    application.review_status === 'yes'
      ? defaultYesBody
      : application.review_status === 'no'
        ? defaultNoBody
        : defaultMaybeBody
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
      await onStatusChange(application.id, e.target.value as CastingApplication['review_status'])
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
      subject =
        hasTravelNeed && !application.initial_reply_sent
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
        ? `Tip the Velvet - Angående din castingansökan`
        : `Tip the Velvet - Regarding your casting application`
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

      let nextBookingStatus: CastingApplication['booking_status'] = 'pending_confirmation'

      if (application.review_status === 'no') {
        nextBookingStatus = 'declined'
      } else if (
        application.review_status === 'yes' &&
        hasTravelNeed &&
        !application.initial_reply_sent
      ) {
        // Om de har resebehov och det är första mailet, sätter vi den till förhandling
        nextBookingStatus = 'negotiating'
      }

      await onUpdateLogistics(
        application.id,
        true,
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
      {/* STÄNGD RAD */}
      <div className="p-4 grid grid-cols-12 items-center gap-4 text-left">
        {/* Bild, Artistnamn & Akt (4 kolumner) */}
        <div className="col-span-12 lg:col-span-4 flex items-center gap-3 min-w-0">
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

        {/* Språk (2 kolumner) */}
        <div className="col-span-3 lg:col-span-2 text-sm text-foreground/60 font-body truncate">
          <span className="block uppercase tracking-wider text-[10px] text-accent/50 font-semibold mb-0.5">
            {t('Språk', 'Language')}
          </span>
          <span className="truncate block">
            {application.language === 'sv' ? t('Svenska', 'Swedish') : t('Engelska', 'English')}
          </span>
        </div>

        {/* Plats (2 kolumner) */}
        <div className="col-span-4 lg:col-span-2 text-sm text-foreground/60 font-body truncate">
          <span className="block uppercase tracking-wider text-[10px] text-accent/50 font-semibold mb-0.5">
            {t('Plats', 'Location')}
          </span>
          <span className="truncate block">{application.city || '—'}</span>
        </div>

        {/* Önskat Gage + Ikoner (2 kolumner) */}
        <div className="col-span-5 lg:col-span-2 text-sm text-foreground/60 font-body">
          <span className="block uppercase tracking-wider text-[10px] text-accent/50 font-semibold mb-0.5">
            {t('Gage', 'Fee')}
          </span>
          <div className="flex items-center gap-1.5 Freelancer-badge-container">
            <span className="font-medium text-foreground/90 flex items-center gap-0.5 whitespace-nowrap">
              {application.requested_fee ?? '—'}{' '}
              {application.requested_fee && <span className="text-[10px] text-accent">SEK</span>}
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
        </div>

        {/* Sortering och Mailknapp (2 kolumner - Låsta bredvid varandra) */}
        <div
          className="col-span-12 lg:col-span-2 flex items-center justify-end gap-2 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <select
            value={application.review_status}
            onChange={handleStatusSelect}
            className="admin-select !w-24 text-xs py-1.5 px-2"
          >
            <option value="pending">{t('Osorterad', 'Unsorted')}</option>
            <option value="yes">{t('Ja', 'Yes')}</option>
            <option value="maybe">{t('Kanske', 'Maybe')}</option>
            <option value="no">{t('Nej', 'No')}</option>
          </select>

          <button
            onClick={handleOpenMailModal}
            disabled={isFullyConfirmed}
            className={`p-2 border rounded-md transition-colors shrink-0 ${
              isFullyConfirmed
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 cursor-not-allowed'
                : isWaitingForArtist
                  ? 'bg-purple-500/10 border-purple-500/40 text-purple-400 hover:bg-purple-500 hover:text-black'
                  : isNegotiating
                    ? 'bg-amber-500/10 border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-black'
                    : isRejectedAndSent
                      ? 'bg-red-500/10 border-red-500 text-red-500 hover:bg-red-500 hover:text-black'
                      : 'bg-accent/10 border-accent/20 text-accent hover:bg-accent hover:text-black'
            }`}
            title={
              isFullyConfirmed
                ? t('Bokning klar', 'Booking confirmed')
                : t('Kontakta artist', 'Contact artist')
            }
          >
            <Mail className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* EXPANDERAD SEKTION */}
      {isExpanded && (
        <div
          className="border-t border-accent/10 bg-black/20 p-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-left cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Vänsterkolumn (Bild & Medielänkar) */}
          <div className="space-y-4">
            {application.promo_image_id && (
              <div className="border border-accent/20 rounded-md overflow-hidden bg-black/40">
                <img
                  src={getImageSrc(application.promo_image_id)}
                  alt="Promo stor"
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

            {/* Inflyttat ansökningsdatum */}
            <div className="pt-4 border-t border-accent/5 font-body text-xs text-foreground/40">
              <span className="block uppercase tracking-wider text-[9px] text-accent/40 font-semibold mb-0.5 font-sans">
                {t('Ansökan inskickad', 'Application submitted')}
              </span>
              <span>{formatDate(language, application.created_at)}</span>
            </div>
          </div>

          {/* Högerkolumn (Texter & Administrativ Status) */}
          <div className="md:col-span-2 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              {/* STATUS-BANNERS */}
              {application.initial_reply_sent && (
                <>
                  {isNegotiating && (
                    <div className="p-3 rounded border text-xs font-mono flex items-center gap-2 bg-amber-500/10 border-amber-500/30 text-amber-400">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      <div>
                        <span className="font-bold uppercase tracking-wider block">
                          {t('Förhandling pågår', 'Negotiation in progress')}
                        </span>
                        <span className="text-foreground/60 font-sans block mt-0.5">
                          {t(
                            'Logistik, gage eller resa diskuteras med artisten innan avtal skickas.',
                            'Logistics, fee or travel is being discussed before contract is issued.'
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                  {isWaitingForArtist && (
                    <div className="p-3 rounded border text-xs font-mono flex items-center gap-2 bg-purple-950/40 border-purple-800/40 text-purple-300">
                      <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                      <div>
                        <span className="font-bold uppercase tracking-wider block text-purple-400">
                          {t('Väntar på bekräftelse', 'Awaiting confirmation')}
                        </span>
                        <span className="text-foreground/60 font-sans block mt-0.5">
                          {t(
                            'Erbjudande och kontraktslänk har skickats. Väntar på att artisten ska bekräfta.',
                            'Offer and contract link sent. Waiting for performer to confirm.'
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
                            'Artisten har godkänt avtalet och kommer nu synas för Admin på Eventplanering sidan!',
                            'The artist accepted, they will now appear for Admin on the Event Planning page!'
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
                            'Svarsmail om avslag har skickats ut till artisten.',
                            'Rejection email has been sent to the performer.'
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}

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

      {/* PORTAL MODAL */}
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
                <h4 className="font-decorative text-lg text-accent">
                  {application.review_status === 'yes'
                    ? hasTravelNeed && !application.initial_reply_sent
                      ? t('Förbered förhandlingsmail', 'Prepare negotiation email')
                      : t('Förbered skarpt erbjudande', 'Prepare official offer')
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
                      {t('Erbjudet Gage (SEK) — proposed_fee', 'Offered Fee (SEK)')}
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
                          {t('Kräver reseersättning', 'Requires travel')}
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
