/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, type ReactNode } from 'react'

type Language = 'sv' | 'eng'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (sv: string | null | undefined, eng: string | null | undefined) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>('sv')

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
