import { toBoldSerif, formatSocialDateLine } from '@/lib/utils'
import type { EventMarketingData } from '@/services/eventService'

export const buildCastingCallOpenText = (event: EventMarketingData): string => {
  const deadlineSv = event.castingCallDeadline
    ? `deadline är den ${formatSocialDateLine(event.castingCallDeadline, 'sv')}!`
    : 'deadline meddelas snart!'
  const deadlineEng = event.castingCallDeadline
    ? `deadline is on ${formatSocialDateLine(event.castingCallDeadline, 'eng')}!`
    : 'deadline to be announced!'

  return [
    `🇸🇪 ${toBoldSerif('Casting call!')}🌟\n\nVill ni uppträda på vårt nästa event kan ni skicka er ansökning via formuläret i länken nedan, ${deadlineSv}`,
    `🇬🇧 ${toBoldSerif('Casting call!')} 🌟\n\nIf you want to perform at our next event, send us your application via the form in the link below, ${deadlineEng}`,
    `🔗 http://tipthevelvet.nu\n🔥 ${toBoldSerif('Casting:')} http://tipthevelvet.nu/casting-call`,
  ].join('\n\n')
}
