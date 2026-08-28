import { toHashtag } from '@/lib/utils'
import { PostActionCluster } from './PostTemplateCard'
import type { EventMarketingData, AdminEventPerformerRow } from '@/services/eventService'

interface ArtistsAllTogetherCardProps {
  event: EventMarketingData
  performers: AdminEventPerformerRow[]
}

// The "everyone's confirmed" post — text only, no image slot (no group graphic exists to
// source one from). Hashtags list every confirmed artist by name, not just one.
export const ArtistsAllTogetherCard = ({ event, performers }: ArtistsAllTogetherCardProps) => {
  const buildText = () => {
    const names = performers.map((row) => row.performer.performer_name)
    const nameListSv = names.join(', ')
    const nameListEng = names.join(', ')

    const artistTags = names.map(toHashtag)
    const eventTags = event.hashtags?.trim() ? event.hashtags.trim().split(/\s+/) : []
    const hashtags = [...artistTags, ...eventTags].join(' ')

    return [
      `🇸🇪 Och här är alla fantastiska artister som kommer uppträda på ${event.title}: ${nameListSv}`,
      `🇬🇧 And here are all the fabulous artists who will perform at ${event.title}: ${nameListEng}`,
      hashtags,
    ].join('\n\n')
  }

  return <PostActionCluster buildText={buildText} />
}
