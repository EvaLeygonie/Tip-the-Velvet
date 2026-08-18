import { Ticket } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

interface TicketButtonProps {
  ticket_release_date: string | null
  ticket_url: string | null
}

export const TicketButton = ({ ticket_release_date, ticket_url }: TicketButtonProps) => {
  const { language, t } = useLanguage()

  const now = new Date()
  const releaseDate = ticket_release_date ? new Date(ticket_release_date) : null
  const isPendingRelease = releaseDate ? releaseDate > now : false

  // 1. Släppdatumet har inte passerat ännu
  if (isPendingRelease && releaseDate) {
    const formattedReleaseDate = releaseDate.toLocaleDateString(
      language === 'sv' ? 'sv-SE' : 'en-US',
      {
        month: 'short',
        day: 'numeric',
      }
    )

    return (
      <span className="btn-gold opacity-70 cursor-not-allowed">
        <Ticket className="w-4 h-4 opacity-50" />
        {t(`Släpps ${formattedReleaseDate}`, `Releases ${formattedReleaseDate}`)}
      </span>
    )
  }

  // 2. Släppet har skett (eller inget släppdatum satt) och det finns en biljettlänk
  if (ticket_url) {
    return (
      <a
        href={ticket_url}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-gold shadow-lg transition-all duration-300"
      >
        <Ticket className="w-4 h-4" />
        {t('Biljetter', 'Tickets')}
      </a>
    )
  }

  // 3. Ingen länk och inget släppdatum
  return (
    <span className="btn-gold opacity-70 cursor-not-allowed">
      <Ticket className="w-4 h-4 opacity-50" />
      {t('Biljetter TBA', 'Tickets TBA')}
    </span>
  )
}
