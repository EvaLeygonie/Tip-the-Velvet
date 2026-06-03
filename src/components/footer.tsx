import { Mail, Heart } from 'lucide-react'
import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'

export const Footer = () => {
  const { language, t } = useLanguage()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'success' | 'error' | 'already_subscribed'
  >('idle')

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, language }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.error === 'already_subscribed') {
          setStatus('already_subscribed')
          return
        }
        throw new Error(data.error || 'Subscription failed')
      }

      if (data.mailSent) {
        toast.success(
          t(
            'Nyhetsbrev prenumererat! Kolla din inkorg efter en bekräftelse.',
            'Newsletter subscribed! Please check your inbox for a confirmation.'
          )
        )
      } else {
        toast.success(
          t(
            'Du är registrerad! (Kunde dock inte skicka bekräftelsemailet just nu).',
            'You are subscribed! (However, confirmation email could not be sent right now).'
          )
        )
      }

      setStatus('success')
      setEmail('')
    } catch (error) {
      console.error(error)
      setStatus('error')
    }
  }

  return (
    <footer className="footer-shell">
      <div className="gold-divider absolute top-0 left-0 right-0" />

      <div className="footer-inner">
        <div className="footer-grid">
          {/* LEFT: information */}
          <div className="space-y-4">
            <h4>Tip the Velvet</h4>
            <div className="text-footer text-base md:max-w-xs">
              {t(
                'Sveriges äldsta burlesqueklubb, med hem i Göteborg, som hyllat mångfald och konstnärligt uttryck sedan 2008.',
                "Sweden's oldest burlesque club, located in Gothenburg, celebrating diversity and artistic expression since 2008."
              )}
            </div>
          </div>

          {/* MIDDLE: Contact */}
          <div className="space-y-4">
            <h4>{t('Följ Oss', 'Connect With Us')}</h4>
            <nav className="flex flex-col gap-3">
              <a
                href="https://instagram.com/tipthevelvetburlesque"
                target="_blank"
                rel="noopener noreferrer"
                className="link-footer text-sm hover:text-accent focus-visible:underline outline-none transition-colors"
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
                className="link-footer text-sm hover:text-accent focus-visible:underline outline-none transition-colors"
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
                href="mailto:velvet.gbg@gmail.com"
                className="link-footer text-sm hover:text-accent focus-visible:underline outline-none transition-colors"
              >
                <Mail className="w-4 h-4" />
                <span>velvet.gbg@gmail.com</span>
              </a>
            </nav>
          </div>

          {/* RIGHT: Newsletter */}
          <div className="space-y-4 flex flex-col items-center md:items-start text-center md:text-left">
            <h4>{t('Nyhetsbrev', 'Newsletter')}</h4>

            <form onSubmit={handleSubscribe} className="space-y-3 max-w-xs">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="!py-2 !min-h-0 text-sm text-foreground bg-background"
                placeholder={t('Din e-post', 'Your email')}
                required
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                className="!py-2 !min-h-0 btn-gold w-full"
              >
                {status === 'loading' ? '...' : t('Prenumerera', 'Subscribe')}
              </button>

              <div className="min-h-[20px] font-body text-sm text-foreground/70 leading-relaxed mt-2 text-center">
                {status === 'success' && (
                  <span className="text-accent block">
                    {t(
                      'Tack! Du är nu prenumerant på vårt nyhetsbrev! ✦',
                      'Thank you! You are now subscribed to our newsletter! ✦'
                    )}
                  </span>
                )}
                {status === 'already_subscribed' && (
                  <span className="text-accent block">
                    {t(
                      'Du prenumererar redan på vårt nyhetsbrev! ✦',
                      'You are already subscribed to our newsletter! ✦'
                    )}
                  </span>
                )}
                {status === 'error' && (
                  <span className="text-red-400 block">
                    {t('Något gick fel, försök igen.', 'Something went wrong, please try again.')}
                  </span>
                )}
                {status === 'idle' && (
                  <span className="block">
                    {t(
                      'Dina uppgifter hanteras säkert av Tip the Velvet.',
                      'Your info is securely managed by Tip the Velvet.'
                    )}
                  </span>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* BOTTOM: Copyright */}
        <div className="footer-bottom">
          <div className="copyright text-xs text-foreground/85 text-center not-italic font-body">
            &copy; {new Date().getFullYear()} Tip the Velvet. {t('Gjord med', 'Made with')}{' '}
            <Heart className="inline w-3 h-3 text-accent mx-1" /> {t('i Göteborg', 'in Gothenburg')}
            .
          </div>
        </div>
      </div>
    </footer>
  )
}
