import { toSmallCaps, formatSocialDateLine } from '@/lib/utils'
import { PostActionCluster } from './PostTemplateCard'
import type { EventMarketingData } from '@/services/eventService'

interface SaveTheDateCardProps {
  event: EventMarketingData
}

// Matches the org's real "Save the Date" post structure. The one part that can't be
// reproduced exactly is the short thematic teaser line ("Medan cirkusen rullar vidare...")
// — no field holds that bespoke wording, so this falls back to description_sv/eng
// (approximate, not an exact match — worth a manual pass before posting).
export const SaveTheDateCard = ({ event }: SaveTheDateCardProps) => {
  const buildText = () => {
    const dateVenueSv = event.eventStart
      ? `🎪 ${formatSocialDateLine(event.eventStart, 'sv')}\n📍 ${event.location ?? ''}`
      : ''
    const dateVenueEng = event.eventStart
      ? `🎪 ${formatSocialDateLine(event.eventStart, 'eng')}\n📍 ${event.location ?? ''}`
      : ''

    return [
      `🇸🇪 🔥 SAVE THE DATE 🔥\n\n—-\n${toSmallCaps(event.title)}\n${event.descriptionSv ?? ''}\n${dateVenueSv}`,
      `🇬🇧 🔥 SAVE THE DATE 🔥\n\n—-\n${toSmallCaps(event.title)}\n${event.descriptionEng ?? ''}\n${dateVenueEng}`,
    ].join('\n\n')
  }

  return <PostActionCluster buildText={buildText} />
}
