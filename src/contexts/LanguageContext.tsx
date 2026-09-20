/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, type ReactNode } from 'react'

type Language = 'sv' | 'eng'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (sv: string | null | undefined, eng: string | null | undefined) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const STORAGE_KEY = 'ttv-language'

// The context itself only ever lived in React state, so a full page reload (and a link
// opened straight from an email, like the casting/booking portal links, which is always a
// fresh load rather than client-side navigation) silently reset it back to Swedish every
// time — direct feedback 2026-09-20. Persisted to localStorage instead, read once on init.
const readStoredLanguage = (): Language => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'eng' ? 'eng' : 'sv'
  } catch {
    return 'sv'
  }
}

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(readStoredLanguage)

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    try {
      localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      // Private browsing / blocked storage — the toggle still works for the rest of this
      // session, it just won't survive a reload.
    }
  }

  const t = (sv: string | null | undefined, eng: string | null | undefined) => {
    const text = language === 'sv' ? sv : eng
    return text ?? ''
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useLanguage must be used within LanguageProvider')
  return context
}
