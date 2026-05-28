import { Mail, Heart } from 'lucide-react'
import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'

export const Footer = () => {
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) throw new Error('Subscription failed')

      setStatus('success')
      setEmail('')
    } catch (error) {
      console.error(error)
      setStatus('error')
    }
  }

  return (
    <footer className="p-14 bg-black/40 border-t border-accent/20 relative">
      <div className="gold-divider absolute top-0 left-0 right-0" />

      {/* LEFT: information */}
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-12 text-left">
          <div className="space-y-4">
            <h4>Tip the Velvet</h4>
            <p className="text-footer">
              {t(
                'Sveriges äldsta burlesqueklubb, med hem i Göteborg, som hyllat mångfald och konstnärligt uttryck sedan 2008.',
                "Sweden's oldest burlesque club, located in Gothenburg, celebrating diversity and artistic expression since 2008."
              )}
            </p>
          </div>

          {/* MIDDLE: Contact */}
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
              <a href="mailto:velvet.gbg@gmail.com" className="link-footer">
                <Mail className="w-4 h-4" />
                <span>velvet.gbg@gmail.com</span>
              </a>
            </div>
          </div>

          {/* RIGHT: Newsletter */}
          <div className="space-y-4">
            <h4>{t('Nyhetsbrev', 'Newsletter')}</h4>

            {status === 'success' ? (
              <p className="text-sm text-gold animate-fade-in font-medium max-w-[250px] leading-relaxed">
                {t(
                  'Tack! Håll utkik i din inkorg efter en bekräftelse.',
                  'Thank you! Please check your inbox for a confirmation.'
                )}
              </p>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-3 max-w-xs">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full !py-2.5 !min-h-0 text-xs text-white focus:outline-none"
                  placeholder={t('Din e-post', 'Your email')}
                  required
                />
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="btn-gold w-full !py-2 !min-h-0"
                >
                  {status === 'loading' ? '...' : t('Prenumerera', 'Subscribe')}
                </button>

                {status === 'error' && (
                  <p className="text-[11px] text-red-400 font-medium mt-1">
                    {t('Något gick fel, försök igen.', 'Something went wrong, please try again.')}
                  </p>
                )}

                <p className="text-[10px] text-gray-500 leading-tight opacity-80 mt-1">
                  {t(
                    'Dina uppgifter hanteras säkert av Tip the Velvet.',
                    'Your details are securely managed by Tip the Velvet.'
                  )}
                </p>
              </form>
            )}
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
