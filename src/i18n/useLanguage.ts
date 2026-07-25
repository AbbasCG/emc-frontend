import { createContext, useContext } from 'react'
import type { LangCode, LangDir } from './index'

export type LanguageContextValue = {
  lang: LangCode
  dir: LangDir
  setLang: (code: LangCode) => void
}

export const LanguageContext = createContext<LanguageContextValue | null>(null)

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    throw new Error('useLanguage must be used within <LanguageProvider>')
  }
  return ctx
}
