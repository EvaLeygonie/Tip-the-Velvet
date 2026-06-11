import { useLanguage } from '@/contexts/LanguageContext'
import { JoinUsCard } from '@/components/applications/JoinUsForm'
import { SponsorCard } from '@/components/applications/SponsorForm'
import { Heart, Briefcase, Star } from 'lucide-react'

export const JoinUs = () => {
  const { t } = useLanguage()

  return (
    <div className="page-shell">
      <div className="bg-glow-spot" />

      {/* GEMENSAM ANPASSAD INTRO */}
      <header className="header max-w-3xl mx-auto text-center mb-16">
        <h1>{t('Joina oss', 'Join us')}</h1>
        <div className="gold-divider mx-auto" />
        <p className="subtitle text-lg text-foreground/80 mt-6">
          {t(
            'Vill du kliva bakom kulisserna, dekorera lokalen inför festen, sponsra oss eller stötta vår vision som partner? Det finns många sätt att engagera sig i Tip the Velvet.',
            'Do you want to step behind the scenes, decorate the venue before the event, sponsor us or support our vision as a partner? There are many ways to get involved with Tip the Velvet.'
          )}
        </p>
        <p className="text-accent font-heading font-medium tracking-wide text-base md:text-xl">
          {t(
            'Scrolla ner för sponsorer & kreativa samarbeten! ✦',
            'Scroll down for sponsors and creative collaborations! ✦'
          )}
        </p>
      </header>

      <div className="space-y-32 max-w-6xl mx-auto px-4 pb-20">
        {/* SEKTION 1: JOIN OUR COLLECTIVE*/}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-16 xl:gap-24 items-center">
          {/* VÄNSTER */}
          <div className="lg:col-span-5 space-y-8 lg:sticky lg:top-24 flex flex-col my-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-3 text-gold">
                <Heart className="h-5 w-5 text-accent" />
                <span className="uppercase tracking-widest text-xs font-semibold">
                  {t('Kollektivet', 'The Collective')}
                </span>
              </div>
              <h2 className="font-serif text-3xl text-gold">
                {t('Varför joina oss?', 'Why Join us?')}
              </h2>
              <p className="text-foreground/80 leading-relaxed">
                {t(
                  'Tip the Velvet är mer än bara en show – det är en levande community av passionerade kreatörer dedikerade till att fira mångfald, kreativitet och egenmakt genom burlesk. Vi välkomnar alla som delar vår vision, oavsett erfarenhetsnivå.',
                  'Tip the Velvet is more than just a show—it’s a vibrant community of passionate creators dedicated to celebrating diversity, creativity, and empowerment through burlesque. We welcome everyone who shares our vision, regardless of experience level.'
                )}
              </p>
            </div>

            {/* Vad vi söker */}
            <div className="p-6 bg-gold/5 border border-gold/10 rounded-xl space-y-4">
              <h3 className="font-serif text-xl text-gold/90 flex items-center gap-2">
                <Star className="h-4 w-4" /> {t('Vi söker ständigt:', "We're Looking For:")}
              </h3>
              <ul className="space-y-2 text-sm text-foreground/90">
                <li className="flex items-start gap-2">
                  <span className="text-accent">✦</span>
                  <span>
                    <strong>{t('Setup:', 'Setup:')}</strong>{' '}
                    {t(
                      'Volontärer som kan hjälpa innan eventet.',
                      'Volunteers to help us set up before the event.'
                    )}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent">✦</span>
                  <span>
                    <strong>{t('Dörr & Gästlista:', 'Door & Guestlist:')}</strong>{' '}
                    {t(
                      'Volontärer som kan turas om i entrén med att välkomna våra gäster och boka av namn från gästlistan',
                      'Volunteers taking turn in the entrance to welcome our guests and check their names off the guest list.'
                    )}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent">✦</span>
                  <span>
                    <strong>{t('Backstage & Scen:', 'Backstage & Stage:')}</strong>{' '}
                    {t(
                      'Ljus, ljud, stage hands och annan scenkonst.',
                      'Light, sound, stage hands, and other show-related logistics.'
                    )}
                  </span>
                </li>
              </ul>
            </div>
            <p className="text-accent text-center italic text-sm font-medium pt-2 border-t border-accent">
              {t(
                '✦ Volontärer får gratis inträde och behöver inte jobba mer än ett par timmar så de kan njuta av eventet!',
                '✦ Volunteers get free entrance and are not required to work more than a couple of hours so they can enjoy the event!'
              )}
            </p>
          </div>

          {/* HÖGER: Själva formulärkortet */}
          <div className="lg:col-span-7">
            <JoinUsCard />
          </div>
        </section>

        <div className="gold-divider" />

        {/* SEKTION 2: PARTNERS & SPONSORER */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-16 xl:gap-24 items-center">
          {/* VÄNSTER */}
          <div className="lg:col-span-7 order-2 lg:order-1">
            <SponsorCard />
          </div>

          {/* HÖGER */}
          <div className="lg:col-span-5 order-1 lg:order-2 space-y-8 lg:sticky lg:top-24 my-auto">
            <div className="space-y-4">
              <div className="flex items-center space-x-3 text-gold justify-center">
                <Briefcase className="h-5 w-5 text-accent" />
                <span className="uppercase tracking-widest text-xs font-semibold">
                  {t('Samarbeten', 'Collaborations')}
                </span>
              </div>
              <h2 className="font-serif text-3xl text-gold">
                {t('Samarbeten & Sponsorer', ' Collaborations & Sponsors')}
              </h2>
              <p className="text-foreground/80 leading-relaxed">
                {t(
                  'Vi tror på att växa tillsammans. Oavsett om du representerar ett företag som vill sponsra vår vision, eller om du driver ett alternativt initiativ eller event som behöver vår stöttning, vill vi gärna hitta ett sätt att kroka arm.',
                  "We believe in growing together. Whether you're a business looking to sponsor our vision, or run an alternative initiative or event that needs our support, we would love to find a way to join forces."
                )}
              </p>
            </div>

            {/* Vad vi kan göra tillsammans */}
            <div className="p-6 bg-gold/5 border border-gold/10 rounded-xl space-y-4">
              <h3 className="font-serif text-xl text-gold/90 flex items-center gap-2">
                <Star className="h-4 w-4" />{' '}
                {t('Vad vi kan göra tillsammans:', 'What We Can Do Together:')}
              </h3>
              <ul className="space-y-4 text-sm text-foreground/90">
                <li className="flex items-start gap-2">
                  <span className="text-accent">✦</span>
                  <span>
                    <strong>{t('Synas hos oss:', 'Visibility With Us:')}</strong>{' '}
                    {t(
                      'Syns på våra event, i printat form, via säljbord eller genom att sponsra oss med priser!',
                      'Showcase your brand at our event, through a sales table och by sponsoring us with prizes!'
                    )}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent">✦</span>
                  <span>
                    <strong>{t('Ömsesidig stöttning:', 'Mutual Support & Sponsorship:')}</strong>{' '}
                    {t(
                      'Drivs du av samma värderingar? Vi sponsrar, lyfter och marknadsför mer än gärna andra alternativa företag, subkulturer och queer-events.',
                      'Driven by the same values? We are more than happy to sponsor, elevate, and promote other alternative businesses, subcultures, and queer events.'
                    )}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent">✦</span>
                  <span>
                    <strong>{t('Värdebaserat kulturstöd:', 'Value-driven Partnership:')}</strong>{' '}
                    {t(
                      'Associera er verksamhet med inkludering, kroppspositivitet och normbrytande scenkonst i världsklass.',
                      'Associate your organization with inclusivity, body positivity, and world-class, boundary-pushing performing arts.'
                    )}
                  </span>
                </li>
              </ul>
            </div>

            <p className="text-accent text-center italic text-sm font-medium pt-2 border-t border-accent">
              {t(
                '✦ Berätta om dina idéer & önskemål i formuläret bredvid!',
                '✦ Tell us about your ideas & wishes in the form context!'
              )}
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
