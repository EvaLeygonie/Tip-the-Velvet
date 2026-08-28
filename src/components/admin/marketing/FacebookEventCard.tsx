import { toFraktur } from '@/lib/utils'
import { PostActionCluster } from './PostTemplateCard'
import { LEGAL_INFO_SV, LEGAL_INFO_ENG } from './postBoilerplate'
import type { EventMarketingData } from '@/services/eventService'

interface FacebookEventCardProps {
  event: EventMarketingData
}

// description_sv/eng is an exact wording match for this post specifically (confirmed
// against the org's real Facebook event text earlier this session) — not an approximation
// like Save the Date's teaser.
export const FacebookEventCard = ({ event }: FacebookEventCardProps) => {
  const buildText = () => {
    const dateLine = event.eventStart
      ? (() => {
          const d = new Date(event.eventStart!)
          return `🔞 18+ | ${d.getDate()}/${d.getMonth() + 1} - ${d.getFullYear()} | ${event.location ?? ''}`
        })()
      : ''

    return [
      `${toFraktur(event.title)}\n${dateLine}`,
      `🇸🇪 ${event.descriptionSv ?? ''}\n✨ Artister annonseras snart!\n${LEGAL_INFO_SV}`,
      `🇬🇧 ${event.descriptionEng ?? ''}\n✨ Lineup to be announced!\n${LEGAL_INFO_ENG}`,
    ].join('\n\n')
  }

  return <PostActionCluster imageId={event.imageId} imageAlt={event.title} buildText={buildText} />
}
