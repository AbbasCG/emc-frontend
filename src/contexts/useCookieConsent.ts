import { createContext, useContext } from 'react'
import {
  DEFAULT_PREFS,
  type CookiePreferences,
  type StoredConsent,
} from '@/lib/cookieConsent'

export type CookieConsentContextValue = {
  consent: StoredConsent | null
  bannerVisible: boolean
  preferencesOpen: boolean
  openPreferences: () => void
  closePreferences: () => void
  acceptAll: () => void
  rejectNonEssential: () => void
  savePreferences: (prefs: Pick<CookiePreferences, 'analytics' | 'marketing'>) => void
  withdrawAll: () => void
}

export const CookieConsentContext = createContext<CookieConsentContextValue | null>(null)

export function useCookieConsent(): CookieConsentContextValue {
  const ctx = useContext(CookieConsentContext)
  if (!ctx) throw new Error('useCookieConsent must be used within CookieConsentProvider')
  return ctx
}

/** Safe hook for footer — returns null outside provider. */
export function useCookieConsentOptional(): CookieConsentContextValue | null {
  return useContext(CookieConsentContext)
}

export { DEFAULT_PREFS }
