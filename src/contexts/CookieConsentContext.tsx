import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  acceptAllConsent,
  applyConsentScripts,
  DEFAULT_PREFS,
  hasConsentRecord,
  readStoredConsent,
  rejectNonEssentialConsent,
  withdrawConsent,
  writeStoredConsent,
  type CookiePreferences,
  type StoredConsent,
} from '@/lib/cookieConsent'

type CookieConsentContextValue = {
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

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null)

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
