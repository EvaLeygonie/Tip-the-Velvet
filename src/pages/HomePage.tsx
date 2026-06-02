import { useLanguage } from '@/contexts/LanguageContext'
import { Link } from 'react-router-dom'
import heroImage from '@/assets/hero-burlesque.jpg'
import mainLogo from '@/assets/homepage-logo.png'
import { Sparkles, UserPlus } from 'lucide-react'

export const HomePage = () => {
  const { t } = useLanguage()
  const heroVars: React.CSSProperties & { [key: `--${string}`]: string } = {
    '--hero-image-url': `url(${heroImage})`,
  }

  return (
    <section
      className="relative min-h-screen flex items-center justify-center overflow-hidden py-16 sm:py-20 bg-hero"
      style={heroVars}
    >
      {/* Gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,0,0,0.3)_0%,hsla(0,_0%,_0%,_0.6)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_40%,hsl(0_75%_42%/0.15),transparent)]" />

      <div className="container mx-auto px-4 text-center z-10 relative">
        <div className="max-w-4xl mx-auto space-y-8 lg:space-y-10 animate-fade-in">
          {/* LOGO CONTAINER */}
          <div className="flex justify-center max-w-2xl lg:max-w-3xl mx-auto">
            <img
              src={mainLogo}
              alt="Tip the Velvet Burlesque Club"
              className="w-full h-auto object-contain px-4 md:px-0 drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)] img-render-auto"
            />
          </div>

          {/* TEXT */}
          <p className="text-lg md:text-xl lg:text-2xl text-foreground/90 max-w-2xl mx-auto font-body leading-relaxed tracking-wide">
            {t(
              'Sveriges äldsta burlesqueklubb, i Göteborg. Där kreativitet möter egenmakt, och varje kropp berättar en historia.',
              "Sweden's oldest burlesque club, located in Gothenburg. Where creativity meets empowerment, and every body tells a story."
            )}
          </p>

          {/* BUTTONS */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-4 justify-center items-stretch sm:items-center pt-2 w-full max-w-md sm:max-w-none mx-auto">
            <Link to="/events" className="btn-gold w-full sm:w-auto">
              <Sparkles className="w-4 h-4" />
              {t('Våra Event', 'See Events')}
            </Link>

            <Link to="/dresscode" className="btn-red w-full sm:w-auto">
              <UserPlus className="w-4 h-4 text-red-400" />
              {t('Dresscode', 'Dresscode')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
