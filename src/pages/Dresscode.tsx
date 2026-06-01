import { useLanguage } from '@/contexts/LanguageContext'
import { Camera } from 'lucide-react'

import img1 from '@/assets/dresscode/img1.jpg'
import img2 from '@/assets/dresscode/img2.jpg'
import img3 from '@/assets/dresscode/img3.jpg'
import img4 from '@/assets/dresscode/img4.jpg'
import img5 from '@/assets/dresscode/img5.jpg'
import img6 from '@/assets/dresscode/img6.jpg'
import img7 from '@/assets/dresscode/img7.jpg'
import img8 from '@/assets/dresscode/img8.jpg'

export const Dresscode = () => {
  const { t } = useLanguage()

  const moodboardImages = [
    { src: img1, className: 'md:col-span-2 md:row-span-2' },
    { src: img2, className: 'md:col-span-1 md:row-span-1' },
    { src: img4, className: 'md:col-span-1 md:row-span-2' },
    { src: img3, className: 'md:col-span-1 md:row-span-1' },

    { src: img5, className: 'md:col-span-1 md:row-span-2' },
    { src: img7, className: 'md:col-span-1 md:row-span-2' },
    { src: img6, className: 'md:col-span-1 md:row-span-2' },
    { src: img8, className: 'md:col-span-1 md:row-span-2' },
  ]

  return (
    <div className="page-standard">
      <div className="bg-glow-spot" />

      {/* Header Section */}
      <header className="header">
        <h1>Dresscode</h1>

        <div className="gold-divider" />

        <p className="subtitle">
          {t(
            'Lämna vardagen bakom dig och kliv in i en glittrigare, mer dekadent värld.',
            'Leave the everyday life behind and step into a more glittering, decadent world.'
          )}
        </p>
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <p className="text-info">
            {t(
              'Tip the Velvet är en plats där vi firar mångfald, kreativitet och konstnärligt uttryck. Här får vi klä upp oss och klä ut oss tillsammans! Dresscoden är mångsidig och existerar för att alla ska känna sig uppklädda, vackra och hemmastadda i den dekadenta bubbla vi skapar på våra klubbar.',
              'Tip the Velvet is a space where we celebrate diversity, creativity, and artistic expression. This is our playground to dress up and express our theatrical selves! Our dresscode is versatile, ensuring everyone feels glamorous, beautiful, and at home in the decadent bubble we create.'
            )}
          </p>
          <p className="text-accent font-heading font-medium tracking-wide text-base md:text-lg">
            {t(
              'Avstå från att ha på er jeans, t-shirts och allmänna vardagskläder!',
              'Please refrain from wearing jeans, t-shirts, and casual everyday clothes!'
            )}
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container-wide relative z-10 space-y-12">
        <div className="card-grid">
          {/* Card 1: Teman */}
          <div className="velvet-card">
            <div>
              <h4 className="border-b border-accent/20 pb-3 mb-5 flex items-center gap-2 text-accent">
                <span aria-hidden="true">✦</span> {t('Godkända Teman', 'Accepted Themes')}
              </h4>
              <ul className="velvet-card-list">
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1.5 text-xs" aria-hidden="true">
                    •
                  </span>
                  <div>
                    <strong className="text-accent font-semibold">"Minimum black"</strong> –{' '}
                    {t(
                      'En snygg klänning, finare blus/skjorta till tilltalande byxor eller kjol.',
                      'A nice dress, finer blouse/shirt with appealing trousers or skirt.'
                    )}
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1.5 text-xs" aria-hidden="true">
                    •
                  </span>
                  <span>
                    {t(
                      'Frack, smoking, kostym, bal- & aftonklänning',
                      'Tailcoat, tuxedo, suit, ball- & evening gown'
                    )}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1.5 text-xs" aria-hidden="true">
                    •
                  </span>
                  <span>
                    <strong className="text-accent font-semibold">Vintage</strong> (
                    {t(
                      'allt från slutet av 1800-talet till 1960-talet',
                      'everything from the late 1800s to the 1960s'
                    )}
                    )
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1.5 text-xs" aria-hidden="true">
                    •
                  </span>
                  <span>{t('Historiskt (1600-1800-tal)', 'Historical (1600-1800s)')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1.5 text-xs" aria-hidden="true">
                    •
                  </span>
                  <span>
                    {t(
                      'Pinup, burlesque, eller annan högtidsdräkt',
                      'Pinup, burlesque, or other formal attire'
                    )}
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Card 2: Nyckelord & Tips */}
          <div className="velvet-card">
            <div className="flex flex-col h-full justify-between space-y-6">
              <div>
                <h4 className="border-b border-accent/20 pb-3 mb-4 flex items-center gap-2 text-accent">
                  <span aria-hidden="true">✦</span> {t('Nyckelord & Tips', 'Keywords & Tips')}
                </h4>
                <p className="text-sm md:text-base text-foreground leading-relaxed text-left not-italic font-body font-normal">
                  <strong className="text-accent font-semibold">
                    {t('Nyckelord: ', 'Keywords: ')}
                  </strong>
                  {t(
                    'korsetter, hattar, kravatt, glamour, glitter, paljetter, plymer, Moulin Rouge, Cabaret och kostymdramer.',
                    'corsets, hats, cravat, glamour, glitter, sequins, plumes, Moulin Rouge, Cabaret and costume dramas.'
                  )}
                </p>
              </div>

              <div className="velvet-tips-box">
                <span className="text-[11px] uppercase tracking-widest text-accent font-bold block">
                  {t('Tips: More is more!', 'Tip: More is more!')}
                </span>
                <p className="text-left not-italic text-sm md:text-base text-foreground font-normal leading-relaxed">
                  {t(
                    'Använd smink, glitter, accessoarer, smycken, handskar, blommor och masker för att piffa till din outfit! Huvudpoängen är att det ska kännas genomtänkt.',
                    'Use makeup, glitter, accessories, jewelry, gloves, flowers and masks to spice up your outfit! The main point is that it feels well thought out.'
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Card 3: Regler */}
          <div className="velvet-card">
            <div>
              <h4 className="border-b border-accent/20 pb-3 mb-5 flex items-center gap-2 text-accent">
                <span aria-hidden="true">✦</span> {t('Viktiga Regler', 'Important Rules')}
              </h4>
              <ul className="velvet-card-list">
                <li className="velvet-warning-box">
                  <span className="text-red-400 font-bold mt-0.5" aria-label="Förbjudet">
                    ✕
                  </span>
                  <div>
                    <strong className="text-red-300 font-semibold">
                      {t('Historiska uniformer:', 'Historical uniforms:')}
                    </strong>{' '}
                    {t(
                      'Absolut INGA SS-symboler eller hakkors är tillåtna på klubben.',
                      'Absolutely NO SS symbols or swastikas are allowed at the venue.'
                    )}
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1.5 text-xs" aria-hidden="true">
                    •
                  </span>
                  <span>
                    {t(
                      'Alla kroppar och könsuttryck välkomnas och hyllas hos oss.',
                      'All bodies and gender expressions are welcomed and celebrated.'
                    )}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1.5 text-xs" aria-hidden="true">
                    •
                  </span>
                  <span>
                    {t(
                      'Hellre uppklätt än avklätt – men lingerie är absolut acceptabelt om det följer kvällens tema.',
                      'Better dressed up than undressed – but lingerie is absolutely acceptable if it follows the theme.'
                    )}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="gold-divider" />

        {/* Gallery Section */}
        <div className="mt-16 relative z-10">
          <div className="text-center space-y-3 mb-8">
            <h2>{t('Stämning & Inspiration', 'Atmosphere & Inspiration')}</h2>

            {/* Textfärg ändrad från text-foreground/60 till text-foreground/85 för WCAG AA krav */}
            <div className="flex items-center justify-center gap-2 text-xs md:text-sm text-foreground/85 italic font-body">
              <Camera size={14} className="text-accent" />
              <span>
                {t(
                  'Bilder från våra tidigare magiska kvällar av:',
                  'Glimpses from our previous magical nights, captured by:'
                )}{' '}
                <span className="text-accent not-italic font-medium">
                  Tobias Walka @hardisphoto
                </span>
              </span>
            </div>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 auto-rows-[220px] gap-4">
            {moodboardImages.map((image, index) => (
              <div
                key={index}
                className={`overflow-hidden rounded-lg border border-accent/20 shadow-md group relative ${image.className}`}
              >
                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-300 z-10" />
                <img
                  src={image.src}
                  alt={`Style inspiration ${index + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
