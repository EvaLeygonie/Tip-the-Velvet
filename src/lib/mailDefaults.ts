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
  bodySv: `All praktisk info inför ${eventTitle} finns samlad här:\n${link}\n\nSidan uppdateras löpande, så titta gärna in igen inför eventet. Portkoden lägger vi upp på sidan så fort vi har den, tidigast dagen före.\n\nTips: På hemsidan hittar du länken igen under "Mina länkar" (under loggan), men bara på den dator eller telefon där du har öppnat länken. Spara därför gärna det här mejlet.\n\nVarma hälsningar,\nTip the Velvet`,
  bodyEng: `All the practical info for ${eventTitle} is collected here:\n${link}\n\nThe page is updated as we go, so check back before the event. We will put the entry code on the page as soon as we have it, at the earliest the day before.\n\nTip: On the website you can find the link again under "My links" (below the logo), but only on the computer or phone where you opened it. So please keep this email.\n\nBest regards,\nTip the Velvet`,
})

// Sent by hand from the role's row when something on its page has changed — never automatic.
export const infoUpdateMailDefaults = (eventTitle: string, link: string): MailDefaults => ({
  subjectSv: `Uppdaterad info inför ${eventTitle}`,
  subjectEng: `Updated info for ${eventTitle}`,
  bodySv: `Vi har uppdaterat infosidan inför ${eventTitle} med ny information:\n${link}\n\nTitta gärna in och kolla vad som är nytt.\n\nTips: På hemsidan hittar du länken igen under "Mina länkar" (under loggan), men bara på den dator eller telefon där du har öppnat länken. Spara därför gärna det här mejlet.\n\nVarma hälsningar,\nTip the Velvet`,
  bodyEng: `We've updated the info page for ${eventTitle} with new information:\n${link}\n\nHave a look at what's new.\n\nTip: On the website you can find the link again under "My links" (below the logo), but only on the computer or phone where you opened it. So please keep this email.\n\nBest regards,\nTip the Velvet`,
})

// A plain starting point for a free-form message to everyone in a group.
export const blankMailDefaults = (eventTitle: string): MailDefaults => ({
  subjectSv: eventTitle,
  subjectEng: eventTitle,
  bodySv: `\n\nVarma hälsningar,\nTip the Velvet`,
  bodyEng: `\n\nBest regards,\nTip the Velvet`,
})
