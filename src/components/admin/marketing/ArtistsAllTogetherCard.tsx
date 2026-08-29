import { toHashtag } from '@/lib/utils'
import type { EventMarketingData, AdminEventPerformerRow } from '@/services/eventService'

// The "everyone's confirmed" post — text only, no image slot (no group graphic exists to
// source one from). Hashtags list every confirmed artist by name, not just one.
export const buildArtistsAllTogetherText = (
  event: EventMarketingData,
  performers: AdminEventPerformerRow[]
): string => {
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
