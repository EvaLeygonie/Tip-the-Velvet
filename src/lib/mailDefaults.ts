export interface MailDefaults {
  subjectSv: string
  subjectEng: string
  bodySv: string
  bodyEng: string
}

// The standard email for a role's info page — the link does the work, so the text stays brief
// and never goes stale.
export const infoMailDefaults = (eventTitle: string, link: string): MailDefaults => ({
  subjectSv: `Praktisk info inför ${eventTitle}`,
  subjectEng: `Practical info for ${eventTitle}`,
  bodySv: `All praktisk info inför ${eventTitle} finns samlad här:\n${link}\n\nSidan uppdateras löpande, så titta gärna in igen inför eventet. Portkoden lägger vi upp på sidan så fort vi har den, tidigast dagen före.\n\nVarma hälsningar,\nTip the Velvet`,
  bodyEng: `All the practical info for ${eventTitle} is collected here:\n${link}\n\nThe page is updated as we go, so check back before the event. We will put the entry code on the page as soon as we have it, at the earliest the day before.\n\nBest regards,\nTip the Velvet`,
})

// A plain starting point for a free-form message to everyone in a group.
export const blankMailDefaults = (eventTitle: string): MailDefaults => ({
  subjectSv: eventTitle,
  subjectEng: eventTitle,
  bodySv: `\n\nVarma hälsningar,\nTip the Velvet`,
  bodyEng: `\n\nBest regards,\nTip the Velvet`,
})
