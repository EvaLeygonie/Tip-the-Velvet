import { Mail, Heart } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

export const Footer = () => {
  const { t } = useLanguage()

  const handleNewsletterSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    //! Implement actual newsletter subscription logic here (e.g., API call)
    alert(
      t(
        'Nyhetsbrevsfunktion är inte implementerat än.',
        'The newsletter feature is not implemented yet.'
      )
      // t(
      //   'Välkommen till showen! Du är nu tillagd i vårt nyhetsbrev.',
      //   "Welcome to the show! You've been added to our newsletter."
      // )
    )
  }

  return (
    <footer className="p-14 bg-black/40 border-t border-accent/20 relative mt-24">
      <div className="gold-divider absolute top-0 left-0 right-0" />

      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-12 text-left">
          <div className="space-y-4">
            <h4>Tip the Velvet</h4>
            <p className="text-footer">
              {t(
                'Göteborgs främsta burleskkollektiv som hyllat mångfald och konstnärligt uttryck sedan 2008.',
                "Gothenburg's premier burlesque collective, celebrating diversity and artistic expression since 2008."
              )}
            </p>
          </div>

          <div className="space-y-4">
            <h4>{t('Följ Oss', 'Connect With Us')}</h4>
            <div className="flex flex-col gap-3">
              <a
                href="https://instagram.com/tipthevelvetburlesque"
                target="_blank"
                rel="noopener noreferrer"
                className="link-footer"
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
                className="link-footer"
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
              <a href="mailto:hello@tipthevelvet.se" className="link-footer">
                <Mail className="w-4 h-4" />
                <span>velvet.gbg@gmail.com</span>
              </a>
            </div>
          </div>
          <div className="space-y-4">
            <h4>{t('Håll Dig Uppdaterad', 'Stay Updated')}</h4>
            <p className="text-footer">
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
                className="login-input  border-accent/20 px-4 py-2 text-sm focus:border-accent/50 transition-colors"
              />
              <button type="submit" className="btn-save-active w-full py-2.5">
                {t('Prenumerera', 'Subscribe')}
              </button>
            </form>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-accent/10">
          <p className="copyright">
            &copy; {new Date().getFullYear()} Tip the Velvet. {t('Gjord med', 'Made with')}{' '}
            <Heart className="inline w-3 h-3 text-accent mx-1" /> {t('i Göteborg', 'in Gothenburg')}
            .
          </p>
        </div>
      </div>
    </footer>
  )
}
