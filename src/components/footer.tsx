import { Mail, Heart, Shield } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLanguage } from '@/contexts/LanguageContext'

export const Footer = () => {
  const { t } = useLanguage()

  const handleNewsletterSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    alert(
      t(
        'Välkommen till showen! Du är nu tillagd i vårt nyhetsbrev.',
        "Welcome to the show! You've been added to our newsletter."
      )
    )
  }

  return (
    <footer className="py-16 bg-black/40 border-t border-accent/20 relative overflow-hidden mt-24">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />

      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-12">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h4 className="font-decorative text-lg text-accent uppercase tracking-wider">
                Tip the Velvet
              </h4>
            </div>
            <p className="text-foreground/70 font-sans text-sm leading-relaxed max-w-xs">
              {t(
                'Göteborgs främsta burleskkollektiv som hyllat mångfald och konstnärligt uttryck sedan 2008.',
                "Gothenburg's premier burlesque collective, celebrating diversity and artistic expression since 2008."
              )}
            </p>
            <Link
              to="/admin/login"
              className="inline-flex items-center gap-2 text-xs text-foreground/40 hover:text-accent transition-colors mt-4 uppercase tracking-widest"
            >
              <Shield className="w-3 h-3" />
              <span>Admin</span>
            </Link>
          </div>
          <div className="space-y-4">
            <h4 className="font-decorative text-lg text-accent uppercase tracking-wider">
              {t('Följ Oss', 'Connect With Us')}
            </h4>
            <div className="flex flex-col gap-3">
              <a
                href="https://instagram.com/tipthevelvetburlesque"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-foreground/60 hover:text-accent transition-colors text-sm"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
                <span>@tipthevelvetburlesque</span>
              </a>
              <a
                href="https://www.facebook.com/tipthevelvet"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-foreground/60 hover:text-accent transition-colors text-sm"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                </svg>
                <span>Tip the Velvet Burlesque Club</span>
              </a>
              <a
                href="mailto:hello@tipthevelvet.se"
                className="flex items-center gap-3 text-foreground/60 hover:text-accent transition-colors text-sm"
              >
                <Mail className="w-4 h-4" />
                <span>velvet.gbg@gmail.com</span>
              </a>
            </div>
          </div>
          {/* //! Fix Newletter link! */}
          <div className="space-y-4">
            <h4 className="font-decorative text-lg text-accent uppercase tracking-wider">
              {t('Håll Dig Uppdaterad', 'Stay Updated')}
            </h4>
            <p className="text-xs text-foreground/60 font-sans">
              {t(
                'Få senaste nyheter om oss och våra events.',
                'Get the latest news about us and our events.'
              )}
            </p>
            <form onSubmit={handleNewsletterSubmit} className="space-y-3 pt-2">
              <input
                type="email"
                placeholder={t('Din e-post', 'Your email')}
                required
                className="w-full bg-black/40 border border-accent/20 rounded-md px-4 py-2 text-sm text-foreground outline-none focus:border-accent/50 transition-colors"
              />
              <button
                type="submit"
                className="btn-save-active !static w-full py-2 rounded-md text-xs uppercase tracking-widest font-bold"
              >
                {t('Prenumerera', 'Subscribe')}
              </button>
            </form>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-accent/10 text-center">
          <div className="flex justify-center mb-6 opacity-50"></div>
          <p className="text-[10px] text-foreground/40 font-sans uppercase tracking-[0.2em]">
            &copy; {new Date().getFullYear()} Tip the Velvet. {t('Gjord med', 'Made with')}{' '}
            <Heart className="inline w-3 h-3 text-accent mx-1" /> {t('i Göteborg', 'in Gothenburg')}
            .
          </p>
        </div>
      </div>
    </footer>
  )
}
