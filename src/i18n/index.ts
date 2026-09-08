/**
 * M3 — i18n foundation.
 *
 * Arabic is the SOURCE language and the default: the `ar` catalog holds the
 * exact strings that were previously hardcoded in the components (no
 * rewording), so the app renders 100% identically in Arabic. `en` was approved
 * by the founder on 2026-08-07 (see `__meta` in en.json); `nl` does not exist
 * yet and no decision has been taken on it.
 *
 * Import this module once for its side effect (done in src/main.tsx) BEFORE
 * the React tree renders. Resources are bundled inline, so init is
 * synchronous and no Suspense boundary is required.
 */
import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import ar from './locales/ar.json'

/** localStorage key holding the user's explicit language choice. */
export const LANG_STORAGE_KEY = 'emc_lang'

export type LangCode = 'ar' | 'en'
export type LangDir = 'rtl' | 'ltr'

export type LangDefinition = {
  code: LangCode
  dir: LangDir
  /** Native-script name — intentionally NOT translated (each language names itself). */
  label: string
}

/** Supported languages. NL is deferred until the Dutch catalog is approved. */
export const LANGS: readonly LangDefinition[] = [
  { code: 'ar', dir: 'rtl', label: 'العربية' },
]

export const DEFAULT_LANG: LangDefinition = LANGS[0]

/** Map any i18next language tag (e.g. "en-US") to a supported LangDefinition. */
export function resolveLang(code: string | undefined | null): LangDefinition {
  if (!code) return DEFAULT_LANG
  const base = code.toLowerCase().split('-')[0]
  return LANGS.find((l) => l.code === base) ?? DEFAULT_LANG
}

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ar: { translation: ar },
    },
    fallbackLng: 'ar',
    supportedLngs: LANGS.map((l) => l.code),
    // "en-US" → "en"; unsupported navigator languages (e.g. "nl") fall back to "ar".
    nonExplicitSupportedLngs: true,
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LANG_STORAGE_KEY,
      caches: ['localStorage'],
    },
    interpolation: {
      // React already escapes rendered output.
      escapeValue: false,
    },
    // Resources are inline — initialize synchronously so the first render
    // already has the final language (no flash, no Suspense needed).
    initAsync: false,
    react: {
      useSuspense: false,
    },
  })

export default i18n
