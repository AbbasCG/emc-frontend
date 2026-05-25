import { useEffect } from 'react'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import ar from './locales/ar.json'
import en from './locales/en.json'
import nl from './locales/nl.json'
import { setLocale } from '../data/publicPages'

const SUPPORTED: Record<string, { dir: 'rtl' | 'ltr'; label: string }> = {
  ar: { dir: 'rtl', label: 'العربية' },
  en: { dir: 'ltr', label: 'English' },
  nl: { dir: 'ltr', label: 'Nederlands' },
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { ar: { translation: ar }, en: { translation: en }, nl: { translation: nl } },
    fallbackLng: 'ar',
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'emc_locale',
    },
    interpolation: { escapeValue: false },
  })

i18n.on('languageChanged', (lng: string) => {
  const code = lng.substring(0, 2) as 'ar' | 'en' | 'nl'
  setLocale(code)
})

export function getLocaleDir(lng?: string): 'rtl' | 'ltr' {
  return SUPPORTED[lng || i18n.language]?.dir ?? 'rtl'
}

export function isRTL(lng?: string): boolean {
  return getLocaleDir(lng) === 'rtl'
}

export function useSyncLocale() {
  useEffect(() => {
    const code = i18n.language.substring(0, 2) as 'ar' | 'en' | 'nl'
    setLocale(code)
  }, [])
}

export { SUPPORTED }
export default i18n
