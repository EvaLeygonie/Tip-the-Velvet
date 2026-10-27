import { Wallet } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

// Placeholder: the economy page is still to be designed (ticket sales, payouts, expenses and
// per-show results, see docs/ticket-sales.md and the "To Do Next" plan). It exists now so the admin
// menu and page balance can be worked out around it.
export const AdminEconomy = () => {
  const { t } = useLanguage()

  return (
    <div className="page-shell">
      <div className="bg-glow-spot" />
      <h1>{t('Ekonomi', 'Economy')}</h1>
      <div className="gold-divider" />

      <div className="max-w-2xl mx-auto mt-8 px-4">
        <div className="callout-panel space-y-3 py-10">
          <Wallet className="mx-auto h-8 w-8 text-accent/60" strokeWidth={1.3} />
          <p className="text-info">
            {t(
              'Ekonomisidan är på väg. Den är tom just nu.',
              'The economy page is on its way. It is empty for now.'
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
