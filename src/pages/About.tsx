import { useLanguage } from '@/contexts/LanguageContext'
import { Quote, Camera } from 'lucide-react'

import alla from '@/assets/omOss/Alla.jpg'
// import pontus from '@/assets/omOss/Pontus.jpg'
// import eva from '@/assets/omOss/Eva.jpg'
// import drea from '@/assets/omOss/Drea.jpg'
// import krister from '@/assets/omOss/Krister.jpg'
import omOss1 from '@/assets/omOss/OmOss-1.jpg'
import omOss2 from '@/assets/omOss/OmOss-2.jpg'

export const About = () => {
  const { t } = useLanguage()
  // const boardMembers = [
  //   { role: t('Show Producent', 'Show Producer'), name: 'Pontus', src: pontus },
  //   { role: t('Marknadsföring', 'Marketing'), name: 'Eva', src: eva },
  //   { role: t('Konstnärlig Ledare', 'Artistic Director'), name: 'Drea', src: drea },
  //   { role: t('Ekonomi', 'Finance'), name: 'Krister', src: krister },
  // ]

  return (
    <div className="page-shell">
      <div className="bg-glow-spot" />

      <header className="header">
        <h1>{t('Om oss', 'About Us')}</h1>
        <div className="gold-divider" />

        <div className="text-center pt-4">
          <span className="label-kicker">{t('Ett nytt kapitel', 'A New Chapter')}</span>
          <h2 className="font-heading text-foreground">{t('Styrelsen', 'The Board')}</h2>
        </div>

        <div className="max-w-4xl mx-auto text-center space-y-6">
          <p className="subtitle">
            {t(
              'Sedan 2024 har en ny styrelse tagit över rodret för att bevara Tip the Velvets magiska arv, samtidigt som vi tillför ny energi, glitter och vision.',
              "Since 2024, a new board has taken the helm to preserve Tip the Velvet's magical legacy while infusing it with new energy, glitter, and vision."
            )}
          </p>
          <p className="text-info">
            {t(
              'Vi är en grupp passionerade burleskälskare som delar en gemensam vision om att fortsätta driva klubben framåt, samtidigt som vi hedrar det fantastiska arbete som gjorts av tidigare styrelser. Vi är fast beslutna att bevara den unika atmosfären och det kreativa utrymmet som Tip the Velvet har blivit känt för, samtidigt som vi strävar efter att utveckla och expandera vår verksamhet på nya och spännande sätt.',
              'We are a group of passionate burlesque lovers who share a common vision of continuing to drive the club forward while honoring the fantastic work done by previous boards. We are committed to preserving the unique atmosphere and creative space that Tip the Velvet has become known for, while striving to develop and expand our operations in new and exciting ways.'
            )}
          </p>
          <p className="text-accent font-heading font-medium tracking-wide text-base md:text-xl">
            {t(
              'Vårt mål är att fortsätta skapa en trygg, glamorös och politisk plattform där den queera, kroppspositiva och konstnärliga burlesken får frodas i Göteborgs kulturliv.',
              "Our goal is to continue creating a safe, glamorous and politically engaged platform where queer, body-positive and artistic burlesque can flourish in Gothenburg's cultural scene."
            )}
          </p>
        </div>
      </header>

      <main className="container-wide space-y-12">
        {/* NEW BOARD */}
        <section className="space-y-6">
          {/* Separate cards */}
          {/* <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {boardMembers.map((member, index) => (
              <div
                key={index}
                className="velvet-card group flex flex-col items-center justify-between p-6 text-center min-h-[340px]"
              >
                <div className="promo-frame-story w-full aspect-[3/4] min-h-0 bg-black/40 border border-accent/20 rounded-xl flex-center relative overflow-hidden group-hover:border-accent/50 transition-all">
                  <img src={member.src} />
                </div>

                <div className="mt-4 space-y-1 w-full">
                  <span className="label-kicker text-[10px]">{member.role}</span>
                  <h3 className="font-heading text-lg text-foreground font-semibold tracking-wide">
                    {member.name}
                  </h3>
                </div>
              </div>
            ))}
          </div> */}

          {/* All together */}
          <div className="promo-frame-story aspect-[16/10] sm:aspect-[16/9] lg:aspect-[21/9] rounded-2xl glow-border overflow-hidden relative group">
            <img
              src={alla}
              alt="Tip the Velvet styrelse"
              className="w-full h-full object-cover object-[center_30%] group-hover:scale-105"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />

            <div className="absolute bottom-4 left-6 right-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 pointer-events-none">
              <div>
                <h3 className="font-heading text-lg md:text-xl text-white tracking-wide">
                  Pontus, Eva, Krister & Drea
                </h3>
                <span className="label-kicker text-accent/90 text-[10px] tracking-[0.2em] mb-1 block">
                  {t('Fotohörna: Creatures of the Night', 'Photo Booth: Creatures of the Night')}
                </span>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-white/50 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded border border-white/5 sm:mb-0.5 self-start sm:self-auto">
                {t('Vårt andra event!', 'Our second event!')}
              </span>
            </div>
          </div>

          <p className="text-foreground font-heading font-medium tracking-wide text-base md:text-lg text-center pt-2">
            {t(
              'Här är vi, föredetta gäster, nu styrelsemedlemmar, kom gärna och hälsa på oss under våra event! ✦ ',
              'Here we are, former guests, now board members - come say hello at our events! ✦ '
            )}
          </p>
          <div className="meta-row justify-center text-xs md:text-sm text-foreground/85 italic pb-4">
            <Camera size={14} className="icon-accent-sm" />
            <span className="text-accent not-italic font-medium">Tobias Walka @hardisphoto</span>
          </div>
        </section>

        <div className="gold-divider opacity-50" />

        {/* HISTORY */}
        <section className="space-y-8 mt-0 max-w-5xl mx-auto">
          <div className="text-center">
            <span className="label-kicker">{t('Rötterna & Arvet', 'Roots & Legacy')}</span>
            <h2 className="font-heading text-2xl md:text-3xl text-foreground mb-16">
              {t('Hur gick det till?', 'How did it all begin?')}
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center w-full">
            <div className="flex justify-center lg:justify-start">
              <div className="promo-frame-story aspect-[3/4] w-full max-w-[400px]">
                <img src={omOss1} alt="Jenny & Candy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none mix-blend-multiply" />
              </div>
            </div>

            <div className="space-y-4 text-left">
              <p className="text-body leading-relaxed">
                {t(
                  'Tip the Velvet Burlesque Club föddes den 28e november 2008, en fullsatt premiärafton på dåvarande klubben Belle i Vasastan, Göteborg. På premiären uppträdde bland annat burleska världsstjärnor som Gravity plays Favorites och Sveriges burleskedrottning Lily DeLuxe.',
                  "Tip the Velvet Burlesque Club was born on November 28, 2008, with a sold-out premiere night at the then club Belle in Vasastan, Gothenburg. The premiere featured burlesque world stars like Gravity plays Favorites and Sweden's burlesque queen Lily DeLuxe."
                )}
              </p>
              <p className="text-body leading-relaxed">
                {t(
                  'Idén till klubben föddes ett år tidigare när Stockholmsbaserade Hootchy Kootchy Club gästspelade i Göteborg under bokmässan. Tip the Velvets grundare Jenny och Candy var där den kvällen och de båda föll pladask för burlesquens magiska värld. Strax efter det föddes deras burleska scenpersonligheter - Kandi von Kane och Swedish Siren.',
                  "The idea for the club was conceived a year earlier when the Stockholm-based Hootchy Kootchy Club performed in Gothenburg during the book fair. Tip the Velvet's founders Jenny and Candy were there that evening and both fell in love with the magical world of burlesque. Soon after was their burlesque scene personas born: Kandi von Kane and Swedish Siren."
                )}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center w-full pt-4">
            <div className="order-2 lg:order-1 space-y-4 text-left">
              <p className="text-body leading-relaxed">
                {t(
                  'För Jenny/Swedish Siren handlar burlesque om feminism och politik.',
                  'For Jenny/Swedish Siren, burlesque is about feminism and politics.'
                )}
              </p>
              <p className="text-body leading-relaxed">
                {t(
                  '✦ Mitt driv att frottera mig i denna konstform har alltid varit som sexualpolitisk aktion, och jag inspireras såväl av Hootchy Kootchys queera koncept och samhällskritiska burleskstjärnor som Julie Atlas Muz... ✦ ',
                  "✦ My drive to engage in this art form has always been a sexual political action, and I am inspired by Hootchy Kootchy's queer concepts and socially critical burlesque stars like Julie Atlas Muz... ✦"
                )}
              </p>
              <p className="text-body leading-relaxed">
                {t(
                  'Klubben har sedan starten 2008 haft sin hemmaplan på Belle, Stora Teatern, Villa Belparc och Götahof/Bellmans Salonger. Vi har gästats av såväl lokala, nationella och internationella artister som Vicky Butterfly, Anna fur Laxis och Bent van der Blue.',
                  'Since its inception in 2008, the club has been based at venues like Belle, Stora Teatern, Villa Belparc, and Götahof/Bellmans Salonger. We have hosted local, national, and international artists such as Vicky Butterfly, Anna fur Laxis, and Bent van der Blue.'
                )}
              </p>
            </div>

            <div className="order-1 lg:order-2 flex justify-center lg:justify-end">
              <div className="promo-frame-story aspect-square w-full max-w-[400px]">
                <img src={omOss2} alt="Jenny & Candy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none mix-blend-multiply" />
              </div>
            </div>
          </div>
        </section>

        {/* MANIFEST */}
        <section className="pt-4">
          <div className="panel-callout w-full text-center relative overflow-hidden group">
            <div className="middle-glow opacity-30" />
            <Quote className="w-12 h-12 text-accent/80 mx-auto mb-4 transform -scale-x-100" />

            <blockquote className="max-w-5xl mx-auto space-y-6 relative z-10">
              <p className="font-heading italic text-xl md:text-2xl text-foreground/90 leading-relaxed tracking-wide">
                {t(
                  '"Tillsammans suddar vi ut gränsen mellan madonnan och horan, vi tar bort offerstämpeln från kvinnans sexualitet och det feminina och vi suddar ut könsrollerna. Vi njuter av våra kroppar och vår sexualitet, vi njuter av naturlig skönhet och hyllar de olika uttryck detta tar på scen."',
                  '"Together we blur the line between the madonna and the whore, we remove the label of victimhood from female sexuality and the feminine, and we erase gender roles. We enjoy our bodies and our sexuality, we enjoy natural beauty and celebrate the different expressions this takes on stage."'
                )}
              </p>
              <footer className="label-kicker text-accent tracking-[0.25em] pt-4 block">
                ✦ Tip the Velvet Manifest ✦
              </footer>
            </blockquote>
          </div>
        </section>
      </main>
    </div>
  )
}
