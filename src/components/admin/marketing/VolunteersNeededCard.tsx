import { toBoldSerif } from '@/lib/utils'
import { PostActionCluster } from './PostTemplateCard'
import type { EventMarketingData } from '@/services/eventService'

const SITE_URL = 'https://tipthevelvet.nu'

interface VolunteersNeededCardProps {
  event: EventMarketingData
}

// Text-only — no image slot in the org's real example. The Swedish and English bodies
// intentionally differ slightly (SV lists a "Plock"/take-down shift ENG doesn't) — kept
// faithful to what was actually posted rather than forced into parity.
export const VolunteersNeededCard = ({ event }: VolunteersNeededCardProps) => {
  const buildText = () => {
    const sv = [
      `🇸🇪 ${toBoldSerif('Volontärer sökes!')} ✨🌈`,
      'Tip the Velvet är mer än bara en show – det är en levande community av passionerade kreatörer dedikerade till att fira mångfald, kreativitet och egenmakt genom burlesk. Vi välkomnar alla som delar vår vision, oavsett erfarenhetsnivå. Vi söker ständigt:',
      '✦ Setup: Volontärer som kan hjälpa dekorera lokalen innan eventet (från kl.13 på eventdagen).',
      '✦ Dörr & Gästlista: Volontärer som kan turas om i entrén med att välkomna våra gäster och boka av namn från gästlistan (från kl.18).',
      '✦ Backstage & Scen: Ljus, ljud, stage hands/kittens och annan scenkonst.',
      '✦ Plock: Volontärer som kan hjälpa ta ner dekorationer efter eventet (1.30 - 2.30).',
      '✦ Volontärer får gratis inträde och behöver inte jobba mer än ett par timmar så de kan njuta av eventet!',
    ].join('\n')

    const eng = [
      `🇬🇧 ${toBoldSerif('Volunteers wanted!')} ✨🌈`,
      "Tip the Velvet is more than just a show—it's a vibrant community of passionate creators dedicated to celebrating diversity, creativity, and empowerment through burlesque. We welcome everyone who shares our vision, regardless of experience level. We're Looking For:",
      '✦Setup: Volunteers to help us set up before the even and/or take down after.',
      '✦Door & Guestlist: Volunteers taking turn in the entrance to welcome our guests and check their names off the guest list.',
      '✦Backstage & Stage: Light, sound, stage hand/kittens, and other show-related logistics.',
      '✦ Volunteers get free entrance and are not required to work more than a couple of hours so they can enjoy the event!',
    ].join('\n')

    const links = [
      `🥰 ${toBoldSerif('Join:')} ${SITE_URL}/join`,
      event.ticketUrl ? `🎟️ ${toBoldSerif('Biljetter/Tickets:')} ${event.ticketUrl}` : null,
    ]
      .filter(Boolean)
      .join('\n')

    return [sv, eng, links].join('\n\n')
  }

  return <PostActionCluster buildText={buildText} />
}
