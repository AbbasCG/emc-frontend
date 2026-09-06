const STORAGE_KEY = 'emc_cookie_consent_v1'

export const CONSENT_VERSION = 1

export type CookiePreferences = {
  necessary: true
  analytics: boolean
  marketing: boolean
}

export type StoredConsent = CookiePreferences & {
  version: number
  updatedAt: string
}

const DEFAULT_PREFS: CookiePreferences = {
  necessary: true,
  analytics: false,
  marketing: false,
}

export function readStoredConsent(): StoredConsent | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredConsent
    if (parsed.version !== CONSENT_VERSION) return null
    if (parsed.necessary !== true) return null
    return {
      version: CONSENT_VERSION,
      necessary: true,
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    }
  } catch {
    return null
  }
}

export function writeStoredConsent(prefs: Pick<CookiePreferences, 'analytics' | 'marketing'>): StoredConsent {
  const stored: StoredConsent = {
    version: CONSENT_VERSION,
    necessary: true,
    analytics: prefs.analytics,
    marketing: prefs.marketing,
    updatedAt: new Date().toISOString(),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
  return stored
}

export function hasConsentRecord(): boolean {
  return readStoredConsent() !== null
}

export function acceptAllConsent(): StoredConsent {
  return writeStoredConsent({ analytics: true, marketing: true })
}

export function rejectNonEssentialConsent(): StoredConsent {
  return writeStoredConsent({ analytics: false, marketing: false })
}

export function withdrawConsent(): StoredConsent {
  return rejectNonEssentialConsent()
}

/** Remove injected third-party scripts when consent is withdrawn. */
export function teardownTrackingScripts(): void {
  if (typeof document === 'undefined') return
  document.getElementById('emc-ga-script')?.remove()
  document.getElementById('emc-marketing-script')?.remove()
  delete (window as Window & { dataLayer?: unknown[] }).dataLayer
  delete (window as Window & { gtag?: (...args: unknown[]) => void }).gtag
}

/** Load analytics/marketing only after explicit consent — never on first paint. */
export function applyConsentScripts(prefs: CookiePreferences): void {
  teardownTrackingScripts()
  if (prefs.analytics) loadAnalyticsScript()
  if (prefs.marketing) loadMarketingScript()
}

function loadAnalyticsScript(): void {
  const id = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined
  if (!id?.trim() || typeof document === 'undefined') return
  if (document.getElementById('emc-ga-script')) return

  const w = window as Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void }
  w.dataLayer = w.dataLayer ?? []
  w.gtag = function gtag(...args: unknown[]) {
    w.dataLayer?.push(args)
  }
  w.gtag('js', new Date())
  w.gtag('config', id, { anonymize_ip: true })

  const script = document.createElement('script')
  script.id = 'emc-ga-script'
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`
  document.head.appendChild(script)
}

function loadMarketingScript(): void {
  const pixelId = import.meta.env.VITE_META_PIXEL_ID as string | undefined
  if (!pixelId?.trim() || typeof document === 'undefined') return
  if (document.getElementById('emc-marketing-script')) return

  const script = document.createElement('script')
  script.id = 'emc-marketing-script'
  script.async = true
  script.textContent = `
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');fbq('track','PageView');
  `
  document.head.appendChild(script)
}

export { DEFAULT_PREFS }
