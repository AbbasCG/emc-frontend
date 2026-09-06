import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  acceptAllConsent,
  applyConsentScripts,
  hasConsentRecord,
  readStoredConsent,
  rejectNonEssentialConsent,
  withdrawConsent,
  writeStoredConsent,
  type CookiePreferences,
  type StoredConsent,
} from '@/lib/cookieConsent'
import {
  CookieConsentContext,
  type CookieConsentContextValue,
} from './useCookieConsent'

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<StoredConsent | null>(() => readStoredConsent())
  const [bannerVisible, setBannerVisible] = useState(() => !hasConsentRecord())
  const [preferencesOpen, setPreferencesOpen] = useState(false)

  useEffect(() => {
    if (consent) applyConsentScripts(consent)
  }, [consent])

  const persist = useCallback((next: StoredConsent) => {
    setConsent(next)
    setBannerVisible(false)
    applyConsentScripts(next)
  }, [])

  const acceptAll = useCallback(() => {
    persist(acceptAllConsent())
    setPreferencesOpen(false)
  }, [persist])

  const rejectNonEssential = useCallback(() => {
    persist(rejectNonEssentialConsent())
    setPreferencesOpen(false)
  }, [persist])

  const savePreferences = useCallback(
    (prefs: Pick<CookiePreferences, 'analytics' | 'marketing'>) => {
      persist(writeStoredConsent(prefs))
      setPreferencesOpen(false)
    },
    [persist],
  )

  const withdrawAll = useCallback(() => {
    persist(withdrawConsent())
  }, [persist])

  const value = useMemo<CookieConsentContextValue>(
    () => ({
      consent,
      bannerVisible,
      preferencesOpen,
      openPreferences: () => setPreferencesOpen(true),
      closePreferences: () => setPreferencesOpen(false),
      acceptAll,
      rejectNonEssential,
      savePreferences,
      withdrawAll,
    }),
    [
      consent,
      bannerVisible,
      preferencesOpen,
      acceptAll,
      rejectNonEssential,
      savePreferences,
      withdrawAll,
    ],
  )

  return <CookieConsentContext.Provider value={value}>{children}</CookieConsentContext.Provider>
}
