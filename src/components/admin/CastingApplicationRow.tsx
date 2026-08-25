import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { createPortal } from 'react-dom'
import type { CastingApplication, CastingApplicationWithActs } from '@/types/types'
import { getImageSrc, formatDate, formatActList } from '@/lib/utils'
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
  Loader2,
  Crown,
  Mic2,
  TriangleAlert,
} from 'lucide-react'
import { toast } from 'sonner'

interface CastingApplicationRowProps {
  application: CastingApplicationWithActs
  eventTitle: string
  onStatusChange: (id: string, newStatus: CastingApplication['review_status']) => Promise<void>
  onSaveNotes: (id: string, notes: string) => Promise<void>
  onUpdateLogistics: (
    id: string,
    initialReplySent: boolean,
    bookingStatus: CastingApplication['booking_status'],
    proposedFee?: number,
    needsTravelCosts?: boolean,
    travelCostAmount?: number,
    needsAccommodation?: boolean,
    lineupRole?: CastingApplication['lineup_role']
  ) => Promise<void>
  onToggleActSelected: (applicationId: string, actId: string, isSelected: boolean) => Promise<void>
  onCancelConfirmedBooking: (
    applicationId: string,
    newReviewStatus: CastingApplication['review_status']
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
  eventTitle,
  onStatusChange,
  onSaveNotes,
  onUpdateLogistics,
  onToggleActSelected,
  onCancelConfirmedBooking,
}: CastingApplicationRowProps) => {
  const { language, t } = useLanguage()
  const [isExpanded, setIsExpanded] = useState(false)
  const [notes, setNotes] = useState(application.admin_notes || '')
  const [savingNotes, setSavingNotes] = useState(false)
  const [savingLogistics, setSavingLogistics] = useState(false)

  const [showMailModal, setShowMailModal] = useState(false)
  const [mailSubject, setMailSubject] = useState('')
  const [isSendingMail, setIsSendingMail] = useState(false)
  const [customMailBodyText, setCustomMailBodyText] = useState<string | null>(null)

  // Set instead of calling onStatusChange directly whenever the admin tries to move a
  // *confirmed* booking away from 'yes' — handleStatusSelect intercepts that specific case
  // and opens the cancel-booking modal below instead, holding the target status here until
  // the admin actually confirms (or the modal is dismissed and nothing happens at all).
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [pendingReviewStatus, setPendingReviewStatus] = useState<
    CastingApplication['review_status'] | null
  >(null)
  const [isCancellingBooking, setIsCancellingBooking] = useState(false)

  const acts = application.casting_application_acts ?? []
  // Selection is only a meaningful concept once there's a decision to make (yes/maybe) —
  // for pending/no rows just show how many acts were submitted, no "chosen/" framing.
  const chosenActsCount = acts.filter((act) => act.is_selected).length
  const showChosenFraction =
    application.review_status === 'yes' || application.review_status === 'maybe'
  // For the fee calculation specifically: treat "nothing selected yet" as 1 act, so a
  // fresh multi-act application defaults to showing one act's rate rather than a jarring
  // 0 kr — matches the single-act behavior of just showing the requested fee up front.
  const effectiveActsCountForFee = acts.length > 1 ? Math.max(chosenActsCount, 1) : 1

  // LOGISTIK STATE - Hålls helt fristående från propen efter mount
  //
  // Multi-act: always compute fresh from the currently-selected acts rather than trusting
  // a saved proposed_fee — that total could have been saved before the current selection
  // existed (e.g. saved as 1000 while 0 acts were checked, acts get checked later, then
  // review_status changes and this row remounts in a new section) and blindly trusting it
  // is exactly the bug a real test caught: a stale total that didn't reflect what was
  // actually selected. Single-act has no such ambiguity — proposed_fee there always means
  // exactly what it says, so it's still respected as-is.
  const computeFreshOfferFee = () =>
    (Number(application.requested_fee) || 0) * effectiveActsCountForFee
  const [offerFee, setOfferFee] = useState<number>(() => {
    if (acts.length <= 1 && application.proposed_fee) return Number(application.proposed_fee)
    return computeFreshOfferFee()
  })
  // Multi-act only: the per-act rate currently driving the live total. Starts as the
  // artist's own ask, but a manual edit to the total field derives a new rate from it
  // (total ÷ current act count, rounded) — so from then on, further act-count changes
  // multiply/divide around what the admin actually set, not the original ask. The
  // artist's original request stays available separately as a fixed reference (rendered
  // below), never overwritten by this.
  const [perActRate, setPerActRate] = useState<number>(() => Number(application.requested_fee) || 0)
  const [needsTravel, setNeedsTravel] = useState<boolean>(
    () => application.needs_travel_costs || false
  )
  const [travelAmount, setTravelAmount] = useState<number>(
    () => Number(application.travel_cost_amount) || 0
  )
  const [needsAccom, setNeedsAccom] = useState<boolean>(
    () => application.needs_accommodation || false
  )
  const [lineupRole, setLineupRole] = useState<CastingApplication['lineup_role']>(
    () => application.lineup_role || 'performer'
  )
  // Tracks whether the "Update Offer" button has anything to actually save — an explicit
  // flag rather than comparing current state back against `application` on every render,
  // since the initial offerFee is itself a computed value (proposed_fee, or requested_fee
  // × selected acts) that a naive comparison would mismatch on load and falsely show as
  // dirty. Set true by any local edit below (including the auto-recompute effect — that's
  // exactly the case this button exists for, see prior chat: recompute is local-only,
  // not a save) and cleared after a successful save. Also starts true if the saved
  // proposed_fee didn't actually match the fresh multi-act computation above (the exact
  // stale-total bug just fixed) — the admin should see a visible "this needs saving" cue
  // rather than the total silently self-correcting with no indication anything changed.
  const [isLogisticsDirty, setIsLogisticsDirty] = useState<boolean>(() => {
    if (acts.length <= 1) return false
    return Number(application.proposed_fee || 0) !== computeFreshOfferFee()
  })

  const handleOfferFeeChange = (value: number) => {
    setOfferFee(value)
    setIsLogisticsDirty(true)
    if (acts.length > 1) {
      setPerActRate(Math.round(value / effectiveActsCountForFee))
    }
  }

  const handleNeedsTravelChange = (checked: boolean) => {
    setNeedsTravel(checked)
    setIsLogisticsDirty(true)
  }

  const handleTravelAmountChange = (value: number) => {
    setTravelAmount(value)
    setIsLogisticsDirty(true)
  }

  const handleNeedsAccomChange = (checked: boolean) => {
    setNeedsAccom(checked)
    setIsLogisticsDirty(true)
  }

  const handleLineupRoleChange = (value: CastingApplication['lineup_role']) => {
    setLineupRole(value)
    setIsLogisticsDirty(true)
  }

  // Recompute the offer total whenever act selection actually changes (not on mount —
  // that would clobber an already-saved custom proposed_fee, see offerFee's initializer
  // above). Deliberately keyed only on the act count, not perActRate — this must NOT
  // re-fire just because handleOfferFeeChange updated perActRate a moment ago, or it'd
  // immediately re-derive the total from the rounded rate and visibly correct whatever
  // the admin just typed (e.g. 2500 ÷ 3 rounds to 833, which recomputes to 2499).
  const prevActsCountForFeeRef = useRef(effectiveActsCountForFee)
  useEffect(() => {
    if (acts.length <= 1) return
    if (effectiveActsCountForFee === prevActsCountForFeeRef.current) return
    prevActsCountForFeeRef.current = effectiveActsCountForFee
    setOfferFee(Math.round(perActRate * effectiveActsCountForFee))
    setIsLogisticsDirty(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveActsCountForFee, acts.length])

  const isSv = application.language === 'sv'

  // Collapsed-row title: with one act, just show it. With several, prefer the first
  // SELECTED act's title (a stable, meaningful signal once the admin's started deciding —
  // matches Phase 6's is_selected also doubling as a "waitlist interest" marker on maybe
  // rows, not just yes), falling back to the first submitted act if nothing's selected
  // yet. Deliberately not "whichever tab is currently open" — that would make a row's
  // title change based on incidental clicks, breaking the visual-scan stability a
  // collapsed list depends on.
  const primaryAct = acts.find((act) => act.is_selected) ?? acts[0]
  const displayActTitle = primaryAct?.act_title
  const extraActCount = acts.length > 1 ? acts.length - 1 : 0

  // Which act's description/video the expanded row currently shows. Starts on the same
  // act the collapsed row's title already pointed at, so opening the row doesn't jump to
  // a different act than what was just being looked at.
  const [activeActIndex, setActiveActIndex] = useState(() => {
    const primaryIndex = acts.findIndex((act) => act.id === primaryAct?.id)
    return primaryIndex >= 0 ? primaryIndex : 0
  })
  const activeAct = acts[activeActIndex] ?? acts[0]

  // Checked ahead of isRejectedAndSent below — an artist who was booked and then removed
  // is a meaningfully different, more severe case than a plain "no," even if the admin
  // picked 'no' as the fallback review_status once removing them (a very likely choice).
  const isCancelled = application.booking_status === 'cancelled'
  const isRejectedAndSent =
    application.review_status === 'no' && application.initial_reply_sent && !isCancelled
  const isAwaitingConfirmation =
    application.review_status === 'yes' &&
    application.initial_reply_sent &&
    application.booking_status !== 'confirmed' &&
    !isCancelled
  const isFullyConfirmed =
    application.review_status === 'yes' && application.booking_status === 'confirmed'

  // Shared everywhere the role needs showing — collapsed-row icon, status-section tag.
  // Default 'performer' is deliberately invisible everywhere, only Host/Headliner ever
  // render anything.
  const roleLabel =
    application.lineup_role === 'host'
      ? 'Host'
      : application.lineup_role === 'headliner'
        ? 'Headliner'
        : null
  const RoleIcon = application.lineup_role === 'host' ? Mic2 : Crown

  let statusRowClass = 'hover:border-accent/30'
  if (isCancelled) {
    statusRowClass = 'border-red-700/70 bg-red-950/10 hover:border-red-600'
  } else if (isRejectedAndSent) {
    statusRowClass = 'border-red-900/65 bg-red-950/5 hover:border-red-800'
  } else if (isAwaitingConfirmation) {
    statusRowClass = 'border-amber-600/50 bg-amber-950/10 hover:border-amber-500'
  } else if (isFullyConfirmed) {
    statusRowClass =
      'border-emerald-500 bg-emerald-950/20 shadow-[0_0_15px_rgba(16,185,129,0.05)] cursor-default'
  }

  const contractLink = `https://tipthevelvet.nu/casting/confirm/${application.id}?token=${application.access_token}`

  // DYNAMISK MALLTEXT
  const travelFormatted = needsTravel
    ? travelAmount > 0
      ? `${travelAmount} SEK`
      : isSv
        ? 'Erbjuds (diskuteras vidare)'
        : 'Offered (to be discussed)'
    : isSv
      ? 'Ingen reseersättning'
      : 'No travel compensation'

  const accomFormatted = needsAccom
    ? isSv
      ? 'Erbjuds (Community hosting / Boende)'
      : 'Offered (Community hosting / Accommodation)'
    : isSv
      ? 'Ej angivet / Ej aktuellt'
      : 'Not provided'

  // Only host/headliner get an explicit mention — the default performer role doesn't
  // need to clutter the normal case with a line saying "you'll be a regular performer."
  const roleLine =
    lineupRole === 'host'
      ? isSv
        ? '\n• Roll: Du bokas som showens Host'
        : "\n• Role: You're being booked as this show's Host"
      : lineupRole === 'headliner'
        ? isSv
          ? '\n• Roll: Du bokas som showens Headliner'
          : "\n• Role: You're being booked as this show's Headliner"
        : ''

  const logisticsText = isSv
    ? `• Gage: ${offerFee} SEK\n• Resekostnader: ${travelFormatted}\n• Boende: ${accomFormatted}${roleLine}`
    : `• Fee: ${offerFee} SEK\n• Travel costs: ${travelFormatted}\n• Accommodation: ${accomFormatted}${roleLine}`

  // A "no" is a full rejection of the application — mention everything the artist
  // submitted, regardless of what (if anything) was ever selected. Every application has
  // at least one casting_application_acts row (Phase 1 backfill + submit_casting_application
  // always inserting >=1), so no fallback to the now-dropped legacy act_title is needed.
  const submittedActTitles = acts.map((act) => act.act_title)
  // "Yes"/"maybe" only concern the acts actually chosen — falls back to everything
  // submitted if nothing's been selected yet (a mail naming zero acts would be worse).
  const selectedActTitlesRaw = acts.filter((act) => act.is_selected).map((act) => act.act_title)
  const chosenActTitles =
    selectedActTitlesRaw.length > 0 ? selectedActTitlesRaw : submittedActTitles

  const submittedActsText = formatActList(submittedActTitles, isSv)
  const chosenActsText = formatActList(chosenActTitles, isSv)

  const defaultYesBody = isSv
    ? `Vi älskade din ansökan för ${chosenActsText} och vill jättegärna erbjuda dig en plats i showen!\n\nHär är de villkor och det upplägg vi har tagit fram:\n${logisticsText}\n\nVia länken nedan kan vårt erbjudande granskas och bekräftas. Klicka här för att se detaljerna:\n${contractLink}\n\nVi ser verkligen fram emot att jobba med dig!`
    : `We loved your application for ${chosenActsText} and would love to offer you a spot in the show!\n\nHere are the terms and details for the offer:\n${logisticsText}\n\nThrough the link below, our offer can be reviewed and confirmed:\n${contractLink}\n\nWe are thrilled about the prospect of working together!`

  const defaultNoBody = isSv
    ? `Stort tack för att du sökte till vår show med ${submittedActTitles.length > 1 ? 'dina akter' : 'din akt'} ${submittedActsText}!\n\nVi har nu gått igenom alla ansökningar, och tyvärr har vi inte möjlighet att ta med ${submittedActTitles.length > 1 ? 'dessa akter' : 'din akt'} i just den här produktionen. Urvalet har varit otroligt svårt då vi fått in väldigt många fantastiska bidrag.\n\nVi sparar gärna dina kontaktuppgifter för framtida shower, och hoppas att vi ses eller hörs framöver!`
    : `Thank you so much for applying to our show with ${submittedActTitles.length > 1 ? 'your acts' : 'your act'} ${submittedActsText}!\n\nWe have reviewed all applications, and unfortunately, we are unable to include ${submittedActTitles.length > 1 ? 'these acts' : 'your act'} in this specific production. The selection process was highly competitive due to the volume of amazing submissions we received.\n\nWe would love to keep your details on file for future shows, and hope to cross paths in the future!`

  const defaultMaybeBody = isSv
    ? `Hej ${application.performer_name}!\n\nHoppas att allt är fint med dig. Vi har gått igenom din castingansökan gällande ${chosenActTitles.length > 1 ? 'dina akter' : 'din akt'} ${chosenActsText} och tycker den är väldigt intressant.\n\n [...] \n\nVarma hälsningar,\nTip the Velvet`
    : `Hi ${application.performer_name}!\n\nHope you are doing well. We have reviewed your casting application regarding ${chosenActTitles.length > 1 ? 'your acts' : 'your act'} ${chosenActsText} and find it very interesting.\n\n [...] \n\nBest regards,\nTip the Velvet`

  const activeDefaultBody =
    application.review_status === 'yes'
      ? defaultYesBody
      : application.review_status === 'no'
        ? defaultNoBody
        : application.review_status === 'maybe'
          ? defaultMaybeBody
          : ''

  const currentMailBodyText = customMailBodyText !== null ? customMailBodyText : activeDefaultBody

  // SPARA ENDAST ERBJUDANDEVILLKOR (TYST)
  const handleSaveLogisticsOnly = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setSavingLogistics(true)

    const finalFee = Number(offerFee)
    const finalTravelBool = Boolean(needsTravel)
    const finalTravelAmount = finalTravelBool ? Number(travelAmount) : 0
    const finalAccomBool = Boolean(needsAccom)

    try {
      await onUpdateLogistics(
        application.id,
        application.initial_reply_sent || false,
        application.booking_status || 'not_contacted',
        finalFee,
        finalTravelBool,
        finalTravelAmount,
        finalAccomBool,
        lineupRole
      )

      setIsLogisticsDirty(false)
      toast.success(t('Erbjudandets villkor sparades!', 'Offer terms saved!'))
    } catch (err) {
      console.error('Fel vid sparande av logistik:', err)
      toast.error(t('Kunde inte spara ändringarna.', 'Could not save changes.'))
    } finally {
      setSavingLogistics(false)
    }
  }

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

  const handleActCheckboxChange = async (actId: string, checked: boolean) => {
    try {
      await onToggleActSelected(application.id, actId, checked)
    } catch (err) {
      toast.error(t('Kunde inte uppdatera akt-val.', 'Could not update act selection.'))
      console.error(err)
    }
  }

  const handleStatusSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as CastingApplication['review_status']

    // Moving a *confirmed* booking away from 'yes' needs a deliberate extra step, not a
    // silent status flip — the artist actually confirmed a spot, so undoing that has to
    // also unwind event_performers/performer_acts, not just relabel the application. The
    // select stays controlled by application.review_status, so simply not updating state
    // here is enough to snap it back to 'yes' if the modal gets dismissed.
    if (application.booking_status === 'confirmed' && newStatus !== 'yes') {
      setPendingReviewStatus(newStatus)
      setShowCancelModal(true)
      return
    }

    // Re-adding a previously cancelled artist — not destructive like cancelling was (fee/
    // travel/role are still sitting untouched on this row, nothing to lose), so no modal:
    // just reset back to a clean starting point for the normal 'yes' flow to take over
    // from (admin re-sends the still-preserved terms, artist re-confirms as usual).
    if (application.booking_status === 'cancelled' && newStatus === 'yes') {
      try {
        await onStatusChange(application.id, newStatus)
        await onUpdateLogistics(application.id, false, 'not_contacted')
        toast.success(
          t(
            'Artisten är tillbaka i "Ja"-högen — redo att kontaktas på nytt.',
            'The artist is back in the "Yes" pile — ready to be contacted again.'
          )
        )
      } catch (err) {
        toast.error(t('Kunde inte återställa ansökan.', 'Could not restore the application.'))
        console.error(err)
      }
      return
    }

    try {
      await onStatusChange(application.id, newStatus)
      toast.success(t('Status uppdaterad!', 'Status updated!'))
    } catch (err) {
      toast.error(t('Kunde inte uppdatera status.', 'Could not update status.'))
      console.error(err)
    }
  }

  const handleConfirmCancelBooking = async () => {
    if (!pendingReviewStatus) return
    setIsCancellingBooking(true)
    try {
      await onCancelConfirmedBooking(application.id, pendingReviewStatus)
      toast.success(
        t('Artisten har tagits bort från showen.', 'The artist has been removed from the show.')
      )
      setShowCancelModal(false)
      setPendingReviewStatus(null)

      // Notify the artist — separate try/catch so a failed send doesn't read as the removal
      // itself having failed (it already succeeded above). Fixed template, not composed by
      // the admin — "so everyone is on board" means this should never be an easy-to-forget
      // manual step.
      try {
        const cancelSubject = isSv
          ? `Ändring gällande din bokning – ${eventTitle}`
          : `Update regarding your booking – ${eventTitle}`
        const cancelBody = isSv
          ? `Hej ${application.performer_name}!\n\nVi måste tyvärr meddela att din plats i showen ${eventTitle} (${chosenActsText}) har blivit avbokad.\n\nHör gärna av dig om du har några frågor.\n\nVarma hälsningar,\nTip the Velvet`
          : `Hi ${application.performer_name}!\n\nWe're sorry to let you know that your spot in the show ${eventTitle} (${chosenActsText}) has been cancelled.\n\nPlease don't hesitate to reach out if you have any questions.\n\nBest regards,\nTip the Velvet`

        const response = await fetch('/api/send-casting-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: application.email,
            name: application.performer_name,
            subject: cancelSubject,
            bodyText: cancelBody,
            language: application.language,
          }),
        })

        if (!response.ok) throw new Error('Kunde inte skicka avbokningsmail via API:et.')
      } catch (emailErr) {
        console.error('Fel vid avbokningsmail:', emailErr)
        toast.error(
          t(
            'Artisten togs bort, men avbokningsmailet kunde inte skickas — meddela dem manuellt.',
            'The artist was removed, but the cancellation email could not be sent — please notify them manually.'
          )
        )
      }
    } catch (err) {
      toast.error(t('Kunde inte ta bort artisten.', 'Could not remove the artist.'))
      console.error(err)
    } finally {
      setIsCancellingBooking(false)
    }
  }

  const handleOpenMailModal = async (e: React.MouseEvent) => {
    e.stopPropagation()

    // The draft preview below reads the offer live from local state, but the artist's
    // confirmation link reads proposed_fee straight from the database — if the admin never
    // pressed "Update Offer", those two can disagree (email promises one figure, the
    // artist's actual contract link still shows the old one). Sync as soon as the offer is
    // about to be shown/sent, not only when explicitly saved, so the two can never diverge.
    if (application.review_status === 'yes' && isLogisticsDirty) {
      await handleSaveLogisticsOnly()
    }

    // Subjects only name a specific act when there's exactly one — with several, listing
    // them all would make the subject line unwieldy, so it stays generic there and the
    // body (which always lists every relevant act, however many) carries the detail.
    const noSubjectActSuffix = submittedActTitles.length === 1 ? ` för ${submittedActsText}` : ''
    const noSubjectActSuffixEn = submittedActTitles.length === 1 ? ` for ${submittedActsText}` : ''
    const chosenSubjectActSuffix = chosenActTitles.length === 1 ? ` ${chosenActsText}` : ''

    let subject = ''
    if (application.review_status === 'yes') {
      subject = isSv
        ? `Erbjudande: Casting för Tip the Velvet${chosenSubjectActSuffix ? ` -${chosenSubjectActSuffix}` : ''}`
        : `Offer: Casting for Tip the Velvet${chosenSubjectActSuffix ? ` -${chosenSubjectActSuffix}` : ''}`
    } else if (application.review_status === 'no') {
      subject = isSv
        ? `Tip the Velvet - Angående din castingansökan${noSubjectActSuffix}`
        : `Tip the Velvet - Regarding your casting application${noSubjectActSuffixEn}`
    } else {
      subject = isSv
        ? `Tip the Velvet - Gällande din ansökan${chosenSubjectActSuffix ? ` -${chosenSubjectActSuffix}` : ''}`
        : `Tip the Velvet - Regarding your application${chosenSubjectActSuffix ? ` -${chosenSubjectActSuffix}` : ''}`
    }

    setMailSubject(subject)
    setCustomMailBodyText(null)
    setShowMailModal(true)
  }

  const handleSendCastingMail = async () => {
    setIsSendingMail(true)
    try {
      const finalFee = Number(offerFee)
      const finalTravelBool = Boolean(needsTravel)
      const finalTravelAmount = finalTravelBool ? Number(travelAmount) : 0
      const finalAccomBool = Boolean(needsAccom)

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
      } catch (err) {
        console.error('Fel vid mailutskick:', err)
        toast.error(
          t('Kunde inte skicka mailet, försök igen.', 'Could not send email, please try again.')
        )
        return
      }

      let nextBookingStatus: CastingApplication['booking_status'] = 'not_contacted'

      if (application.review_status === 'no') {
        nextBookingStatus = 'declined'
      } else if (application.review_status === 'yes') {
        nextBookingStatus = 'pending_confirmation'
      }

      try {
        await onUpdateLogistics(
          application.id,
          true,
          nextBookingStatus,
          application.review_status === 'yes' ? finalFee : undefined,
          finalTravelBool,
          finalTravelAmount,
          finalAccomBool,
          application.review_status === 'yes' ? lineupRole : undefined
        )

        setIsLogisticsDirty(false)
        toast.success(t('Mailet har skickats framgångsrikt!', 'Email sent successfully!'))
        setShowMailModal(false)
      } catch (err) {
        console.error('Fel vid statusuppdatering efter utskick:', err)
        toast.error(
          t(
            'Mailet skickades, men statusen kunde inte uppdateras. Uppdatera manuellt.',
            'Email was sent, but the status could not be updated. Please update it manually.'
          )
        )
      }
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
        <div className="grid grid-cols-12 gap-4 items-center flex-1 min-w-0">
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
              <div className="font-decorative text-base text-foreground tracking-wide truncate flex items-center gap-1.5">
                <span className="truncate">{application.performer_name}</span>
                {roleLabel && (
                  <RoleIcon
                    className="shrink-0 h-4 w-4 text-accent"
                    strokeWidth={2}
                    aria-label={roleLabel}
                  >
                    <title>{roleLabel}</title>
                  </RoleIcon>
                )}
              </div>
              <div className="text-accent italic text-xs font-heading flex items-center gap-1.5 min-w-0">
                <span className="truncate min-w-0">{displayActTitle}</span>
                {extraActCount > 0 && (
                  <span
                    className="shrink-0 not-italic font-body font-semibold text-[10px] bg-accent/15 text-accent px-1.5 py-0.5 rounded-full"
                    title={t(`+${extraActCount} till akt(er)`, `+${extraActCount} more act(s)`)}
                  >
                    +{extraActCount}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="col-span-4 md:col-span-3 text-sm text-foreground/60 font-body truncate">
            <span className="block uppercase tracking-wider text-[10px] text-accent/50 font-semibold mb-0.5">
              {t('Plats', 'Location')}
            </span>
            <span className="truncate block">
              {application.city || '—'}{' '}
              <span className="text-accent/50 text-xs">({isSv ? 'SV' : 'EN'})</span>
            </span>
          </div>

          <div className="col-span-4 md:col-span-2 text-sm text-foreground/60 font-body truncate">
            <span className="block uppercase tracking-wider text-[10px] text-accent/50 font-semibold mb-0.5">
              {t('Akter', 'Acts')}
            </span>
            <span className="truncate block">
              {showChosenFraction ? `${chosenActsCount}/${acts.length}` : acts.length}
            </span>
          </div>

          <div className="col-span-4 md:col-span-2 text-sm text-foreground/60 font-body">
            <span className="block uppercase tracking-wider text-[10px] text-accent/50 font-semibold mb-0.5">
              {t('Erbjudet Gage', 'Offered Fee')}
            </span>
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-foreground/90 flex items-center gap-0.5 whitespace-nowrap">
                  {offerFee} <span className="text-[10px] text-accent">SEK</span>
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  {needsTravel && (
                    <span title={t('Erbjuder resa', 'Offers travel')}>
                      <BusFront className="h-3.5 w-3.5 text-gold" />
                    </span>
                  )}
                  {needsAccom && (
                    <span title={t('Erbjuder boende', 'Offers accommodation')}>
                      <Home className="h-3.5 w-3.5 text-accent/50" />
                    </span>
                  )}
                </div>
              </div>

              {needsTravel && travelAmount > 0 && (
                <span className="text-[11px] text-amber-400 font-medium">
                  + {travelAmount} SEK {t('resa', 'travel')}
                </span>
              )}
            </div>
          </div>
        </div>

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
            <Link to={`/casting/confirm/${application.id}?token=${application.access_token}`}>
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
          {/* Vänsterkolumn */}
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
                {/* Only one act — video is unambiguous and can sit with the other static
                    links, same as before tabs existed. With several acts, the video is
                    act-specific and lives next to the active tab instead (below). */}
                {acts.length <= 1 && activeAct?.video_url && (
                  <a
                    href={activeAct.video_url}
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

          {/* Högerkolumn */}
          <div className="md:col-span-2 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              {application.initial_reply_sent && (
                <>
                  {isAwaitingConfirmation && (
                    <div className="p-3 rounded border text-xs font-mono flex items-center justify-between gap-2 bg-amber-500/10 border-amber-500/30 text-amber-400">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                        <div>
                          <span className="font-bold uppercase tracking-wider block">
                            {t('Väntar på överenskommelse', 'Awaiting agreement')}
                          </span>
                          <span className="text-foreground/60 font-sans block mt-0.5">
                            {t(
                              'Länken till förhandlingssidan har skickats ut. Väntar på artistens bekräftelse.',
                              'Negotiation link sent. Waiting for artist approval.'
                            )}
                          </span>
                        </div>
                      </div>
                      {roleLabel && (
                        <span className="shrink-0 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-accent/15 text-accent px-2 py-1 rounded-full">
                          <RoleIcon className="h-3 w-3" />
                          {roleLabel}
                        </span>
                      )}
                    </div>
                  )}
                  {isFullyConfirmed && (
                    <div className="p-3 rounded border text-xs font-mono flex items-center justify-between gap-2 bg-emerald-500/10 border-emerald-500/40 text-emerald-400">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        <span className="font-bold uppercase tracking-wider">
                          {t('Artist bokad och bekräftad', 'Artist booked and confirmed')}
                        </span>
                      </div>
                      {roleLabel && (
                        <span className="shrink-0 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-accent/15 text-accent px-2 py-1 rounded-full">
                          <RoleIcon className="h-3 w-3" />
                          {roleLabel}
                        </span>
                      )}
                    </div>
                  )}
                  {isCancelled && (
                    <div className="p-3 rounded border text-xs font-mono flex items-center justify-between gap-2 bg-red-500/10 border-red-600/40 text-red-400">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                        <div>
                          <span className="font-bold uppercase tracking-wider block">
                            {t('Artist borttagen från showen', 'Artist removed from the show')}
                          </span>
                          <span className="text-foreground/60 font-sans block mt-0.5">
                            {t(
                              'Bekräftad bokning avbokades av admin.',
                              'Confirmed booking was cancelled by admin.'
                            )}
                          </span>
                        </div>
                      </div>
                      {roleLabel && (
                        <span className="shrink-0 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-accent/15 text-accent px-2 py-1 rounded-full">
                          <RoleIcon className="h-3 w-3" />
                          {roleLabel}
                        </span>
                      )}
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

              {/* LOGISTIK-PANEL — fee/travel/accommodation editing and the send-offer flow
                  only make sense once the board has actually said yes; for maybe/no/pending
                  it's just the bare act-selection checkboxes below, no fee math attached. */}
              {application.review_status === 'yes' && (
                <div className="bg-black/50 border border-accent/20 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-accent/10 pb-2">
                    <span className="text-xs uppercase tracking-wider text-gold font-mono font-bold flex items-center gap-1.5">
                      <DollarSign className="h-4 w-4" />
                      {t('Erbjudandets Villkor & Logistik', 'Offer Terms & Logistics')}
                    </span>
                    <button
                      type="button"
                      onClick={handleSaveLogisticsOnly}
                      disabled={savingLogistics || !isLogisticsDirty}
                      className={`text-[11px] py-1 px-3 flex items-center gap-1 rounded-lg ${
                        isLogisticsDirty ? 'btn-gold btn-gold-glow-active' : 'btn-gold-inactive'
                      }`}
                    >
                      {savingLogistics ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Save className="w-3 h-3" />
                      )}
                      {t('Uppdatera erbjudandet', 'Update Offer')}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 items-start">
                    {/* Kolumn 1: ERBJUDET GAGE */}
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase text-muted-foreground font-mono block">
                        {acts.length > 1
                          ? t('Erbjudet Gage — Totalt (SEK)', 'Offered Fee — Total (SEK)')
                          : t('Erbjudet Gage (SEK)', 'Offered Fee (SEK)')}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={offerFee}
                        onChange={(e) => handleOfferFeeChange(Number(e.target.value))}
                        className="w-full text-xs bg-black/60 border border-accent/20 rounded p-2 focus:border-accent text-white font-bold"
                      />
                      {acts.length > 1 ? (
                        <span className="text-[10px] text-muted-foreground block pt-0.5">
                          {t('Önskat', 'Requested')}: {application.requested_fee ?? 0} SEK ×{' '}
                          {chosenActsCount} ={' '}
                          {(Number(application.requested_fee) || 0) * chosenActsCount} SEK
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground block pt-0.5">
                          {t('Önskat:', 'Requested:')} {application.requested_fee ?? '—'} SEK
                        </span>
                      )}
                    </div>

                    {/* Kolumn 2: KRYSSRUTOR */}
                    <div className="flex flex-col justify-center space-y-2.5 pt-4">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={needsTravel}
                          onChange={(e) => handleNeedsTravelChange(e.target.checked)}
                          className="accent-accent h-4 w-4 rounded"
                        />
                        <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                          <BusFront className="h-3.5 w-3.5 text-gold" />
                          {t('Erbjud reseersättning', 'Offer Travel Support')}
                        </span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={needsAccom}
                          onChange={(e) => handleNeedsAccomChange(e.target.checked)}
                          className="accent-accent h-4 w-4 rounded"
                        />
                        <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                          <Home className="h-3.5 w-3.5 text-accent" />
                          {t('Erbjud boende', 'Offer Accommodation')}
                        </span>
                      </label>

                      <label className="flex items-center gap-2 pt-0.5">
                        <span className="text-xs font-medium text-foreground flex items-center gap-1.5 shrink-0">
                          <Crown className="h-3.5 w-3.5 text-accent" />
                          {t('Roll i showen', 'Role in the show')}
                        </span>
                        <select
                          value={lineupRole ?? 'performer'}
                          onChange={(e) =>
                            handleLineupRoleChange(
                              e.target.value as CastingApplication['lineup_role']
                            )
                          }
                          className="text-xs bg-black/60 border border-accent/20 rounded p-1.5 focus:border-accent text-white"
                        >
                          <option value="performer">{t('Artist', 'Performer')}</option>
                          <option value="host">Host</option>
                          <option value="headliner">Headliner</option>
                        </select>
                      </label>
                    </div>

                    {/* Kolumn 3: ERBJUDEN RESEERSÄTTNING */}
                    <div>
                      {needsTravel ? (
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase text-gold font-mono block">
                            {t('Erbjuden reseersättning (SEK)', 'Offered Travel Support (SEK)')}
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={travelAmount}
                            onChange={(e) => handleTravelAmountChange(Number(e.target.value))}
                            className="w-full text-xs bg-black/60 border border-accent/20 rounded p-2 focus:border-accent text-white font-bold"
                            placeholder="0"
                          />
                          {application.needs_travel_costs && (
                            <span className="text-[10px] text-muted-foreground block pt-0.5">
                              {t('Artist önskade resa:', 'Artist requested travel:')}{' '}
                              {application.travel_cost_amount
                                ? `${application.travel_cost_amount} SEK`
                                : t('Ja', 'Yes')}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="h-full flex items-center text-[11px] text-muted-foreground/40 italic pt-5">
                          {t('Ingen reseersättning vald', 'No travel compensation selected')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
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
                {acts.length > 1 && (
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex flex-wrap gap-1.5">
                      {acts.map((act, index) => (
                        <div
                          key={act.id}
                          onClick={() => setActiveActIndex(index)}
                          className={`flex items-center gap-1.5 text-xs pl-1.5 pr-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
                            index === activeActIndex
                              ? 'bg-accent/20 border-accent text-accent font-semibold'
                              : 'bg-black/30 border-accent/20 text-foreground/70 hover:border-accent/50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={act.is_selected}
                            onChange={(e) => handleActCheckboxChange(act.id, e.target.checked)}
                            onClick={(e) => e.stopPropagation()}
                            title={t('Välj akt för erbjudande', 'Select act for the offer')}
                            className="accent-accent cursor-pointer"
                          />
                          <span>{act.act_title || t('Namnlös akt', 'Untitled act')}</span>
                        </div>
                      ))}
                    </div>

                    {activeAct?.video_url && (
                      <a
                        href={activeAct.video_url}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 flex items-center gap-1.5 text-accent hover:underline text-xs"
                        title={t('Kolla video', 'Watch Video')}
                      >
                        <Video className="h-4 w-4 shrink-0" />
                        <span className="hidden sm:inline">{t('Kolla video', 'Watch Video')}</span>
                      </a>
                    )}
                  </div>
                )}

                <span className="block uppercase tracking-wider text-[10px] text-accent/50 font-semibold mb-1">
                  {t('Aktbeskrivning', 'Act Description')}
                </span>
                <p className="text-sm text-foreground/80 whitespace-pre-wrap font-body leading-relaxed bg-black/30 p-3 rounded border border-accent/5">
                  {activeAct?.act_description || (
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

            {/* Admin-anteckningar */}
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
                    ? t('Förbered erbjudande-länk', 'Prepare offer link')
                    : application.review_status === 'maybe'
                      ? t('Förbered intressemail', 'Prepare follow-up email')
                      : t('Förbered svarsmail', 'Prepare reply email')}
                </h4>
                <p className="text-xs text-muted-foreground text-center">
                  {t('Mottagare:', 'Recipient:')}{' '}
                  <span className="text-foreground font-mono">{application.email}</span> (
                  {application.performer_name})
                </p>
              </div>

              {application.review_status === 'yes' && (
                <div className="p-3 bg-black/40 border border-accent/20 rounded text-xs space-y-1 text-foreground/80 font-mono">
                  <div className="text-gold font-bold uppercase">
                    {t('Villkor som medföljer i mailet:', 'Terms included in mail:')}
                  </div>
                  <div>
                    • {t('Gage:', 'Fee:')} {offerFee} SEK
                  </div>
                  <div>
                    • {t('Resersättning:', 'Travel:')} {travelFormatted}
                  </div>
                  <div>
                    • {t('Boende:', 'Accommodation:')} {accomFormatted}
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

      {/* --- PORTAL MODAL (AVBOKA BEKRÄFTAD ARTIST) --- */}
      {showCancelModal &&
        typeof window !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 text-left"
            onClick={() => !isCancellingBooking && setShowCancelModal(false)}
          >
            <div
              className="velvet-surface border border-red-600/40 max-w-md w-full p-6 space-y-4 rounded-lg shadow-2xl relative"
              style={{ backgroundColor: '#141111' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 justify-center text-red-400">
                <TriangleAlert className="h-5 w-5" />
                <h4 className="font-decorative text-lg text-center">
                  {t('Ta bort artist från showen?', 'Remove artist from the show?')}
                </h4>
              </div>
              <p className="text-sm text-foreground/80 text-center">
                {t(
                  `${application.performer_name} har redan bekräftat sin plats. Att fortsätta tar bort dem från bokningen permanent — deras plats i lineupen och akter för det här eventet raderas. Om det var en helt ny artistprofil (ingen historik vid andra event) raderas den också.`,
                  `${application.performer_name} has already confirmed their spot. Continuing will permanently remove them from the booking — their lineup slot and acts for this event will be deleted. If their profile was brand new (no history at other events), it will be deleted too.`
                )}
              </p>
              <p className="text-xs text-foreground/50 text-center italic">
                {t('Detta går inte att ångra.', 'This cannot be undone.')}
              </p>
              <div className="flex gap-3 justify-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCancelModal(false)
                    setPendingReviewStatus(null)
                  }}
                  className="px-4 py-2 text-xs border border-accent/20 rounded text-foreground/70 hover:bg-white/5 transition-colors"
                  disabled={isCancellingBooking}
                >
                  {t('Avbryt', 'Cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancelBooking}
                  className="text-xs py-2 px-4 flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors disabled:opacity-60"
                  disabled={isCancellingBooking}
                >
                  {isCancellingBooking ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <TriangleAlert className="h-3.5 w-3.5" />
                  )}
                  {isCancellingBooking
                    ? t('Tar bort...', 'Removing...')
                    : t('Ja, ta bort artisten', 'Yes, remove artist')}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
