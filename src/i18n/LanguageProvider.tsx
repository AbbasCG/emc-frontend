/**
 * M3 — Language provider.
 *
 * Keeps <html lang> / <html dir> and localStorage ('emc_lang') in sync with
 * the active i18next language, and exposes `useLanguage()` for UI such as the
 * Navbar language switcher. Arabic (RTL) stays the default — index.html
 * already ships `lang="ar" dir="rtl"`, and this provider simply re-asserts it
 * on mount, so the Arabic experience is unchanged.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { LANG_STORAGE_KEY, resolveLang, type LangCode, type LangDir, type LangDefinition } from './index'

type LanguageContextValue = {
  lang: LangCode
  dir: LangDir
  setLang: (code: LangCode) => void
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation()
  const [langDef, setLangDef] = useState<LangDefinition>(() => resolveLang(i18n.resolvedLanguage ?? i18n.language))

  useEffect(() => {
    const sync = (code: string) => {
      const def = resolveLang(code)
      setLangDef(def)
      document.documentElement.lang = def.code
      document.documentElement.dir = def.dir
      try {
        window.localStorage.setItem(LANG_STORAGE_KEY, def.code)
      } catch {
        // Storage unavailable (e.g. private mode) — language still applies for this session.
      }
    }
    // Initial sync, then react to every language change (including external
    // i18n.changeLanguage calls).
    sync(i18n.resolvedLanguage ?? i18n.language)
    i18n.on('languageChanged', sync)
    return () => {
      i18n.off('languageChanged', sync)
    }
  }, [i18n])

  const setLang = useCallback(
    (code: LangCode) => {
      void i18n.changeLanguage(code)
    },
    [i18n],
  )

  const value = useMemo<LanguageContextValue>(
    () => ({ lang: langDef.code, dir: langDef.dir, setLang }),
    [langDef, setLang],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    throw new Error('useLanguage must be used within <LanguageProvider>')
  }
  return ctx
}
