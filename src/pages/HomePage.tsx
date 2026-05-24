import { useLanguage } from '@/contexts/LanguageContext';
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-burlesque.jpg";
import mainLogo from "@/assets/homepage-logo.png";
import { Sparkles, UserPlus } from "lucide-react";

export const HomePage = () => {
  const { t } = useLanguage()
  return (
     <section className="relative min-h-screen flex items-center justify-center overflow-hidden py-20" style={{
        backgroundImage: `linear-gradient(to bottom, rgba(120, 10, 10, 0.75), rgba(80, 5, 5, 0.9)), url(${heroImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center"
      }}>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,0,0,0.3)_0%,hsla(0, 0%, 0%, 0.6)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_40%,hsl(0_75%_42%/0.15),transparent)]" />

        <div className="container mx-auto px-4 text-center z-10 relative">
          <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
            <div className="py-16 flex justify-center">
              <img src={mainLogo} alt="Tip the Velvet Burlesque Club" className="w-full max-w-3xl h-auto object-contain px-8 md:px-0" style={{
                objectFit: 'contain',
                imageRendering: 'crisp-edges'
              }} />
            </div>
              </div>

            <p className="text-xl md:text-2xl text-foreground/90 max-w-2xl mx-auto font-robotto pb-8">
              {t(
                "Göteborgs främsta burleskollektiv. Där elegans möter egenmakt, och varje kropp berättar en historia.",
                "Gothenburg's premier burlesque collective. Where elegance meets empowerment, and every body tells a story."
              )}
            </p>

              <div className="flex flex-wrap gap-4 justify-center">

              <Link
                to="/events"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-gold"
              >
                <Sparkles className="w-4 h-4" />
                {t('Se Events', 'See Events')}
              </Link>

              <Link
                to="/join"
                className="btn-red"
              >
                <UserPlus className="w-4 h-4 text-red-400" />
                {t('Joina oss!', 'Join us!')}
              </Link>
          </div>
          </div>
        </section>
  )
}
