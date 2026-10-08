import { useLanguage } from '@/contexts/LanguageContext'
import type { Language } from '@/types/types'

interface LanguageToggleProps {
  value: Language
  onChange: (language: Language) => void
}

// Which language this contact gets emails in — picks the Swedish or English draft in
// ContactMailModal. Swedish is the default; flip it for anyone who turns out not to speak it.
// Sits in each row's edit form and is saved with the rest of it.
export const LanguageToggle = ({ value, onChange }: LanguageToggleProps) => {
  const { t } = useLanguage()
  return (
    <div className="flex items-center gap-2 text-xs text-foreground/40">
      <span>{t('Mailspråk', 'Email language')}</span>
      <div
        role="group"
        aria-label={t('Mailspråk', 'Email language')}
        className="flex overflow-hidden rounded border border-accent/20 font-mono text-[10px]"
      >
        {(['sv', 'eng'] as const).map((lang) => (
          <button
            key={lang}
            type="button"
            aria-pressed={value === lang}
            onClick={() => onChange(lang)}
            className={`px-2 py-0.5 transition-colors ${
              value === lang ? 'bg-accent/80 text-black' : 'text-accent/70 hover:bg-accent/10'
            }`}
          >
            {lang === 'sv' ? 'SV' : 'EN'}
          </button>
        ))}
      </div>
    </div>
  )
}

// Thin gold tag for the closed row, next to the email button — shows the saved language.
export const LanguageMarker = ({ language }: { language: Language }) => {
  const { t } = useLanguage()
  return (
    <span
      title={t('Mailspråk', 'Email language')}
      className="shrink-0 rounded border border-accent/30 px-1 text-[10px] font-mono leading-4 text-accent/70"
    >
      {language === 'eng' ? 'EN' : 'SV'}
    </span>
  )
}
