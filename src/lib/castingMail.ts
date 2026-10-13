import type { CastingApplicationWithActs, CastingApplication } from '@/types/types'
import { formatActList } from '@/lib/utils'

interface CastingMailInput {
  application: CastingApplicationWithActs
  isSv: boolean
  offerFee: number
  needsTravel: boolean
  travelAmount: number
  needsAccom: boolean
  lineupRole: CastingApplication['lineup_role']
}

// The draft email for an application's current review status (yes = the offer with its terms and
// the booking-portal link, no = decline, maybe = follow-up), plus the readable travel and
// accommodation lines shown next to the draft.
export const buildCastingMailDraft = ({
  application,
  isSv,
  offerFee,
  needsTravel,
  travelAmount,
  needsAccom,
  lineupRole,
}: CastingMailInput) => {
  const acts = application.casting_application_acts ?? []
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
  return {
    travelFormatted,
    accomFormatted,
    defaultBody: activeDefaultBody,
    submittedActTitles,
    chosenActTitles,
    submittedActsText,
    chosenActsText,
  }
}
