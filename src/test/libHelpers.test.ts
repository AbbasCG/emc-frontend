import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
import { LEGACY_HIDDEN, isHidden, type LegacyHiddenKey } from '@/lib/featureFlags'
import {
  CONSENT_VERSION,
  DEFAULT_PREFS,
  acceptAllConsent,
  applyConsentScripts,
  hasConsentRecord,
  readStoredConsent,
  rejectNonEssentialConsent,
  teardownTrackingScripts,
  withdrawConsent,
  writeStoredConsent,
} from '@/lib/cookieConsent'
import { countryFromPhone } from '@/lib/countryFromPhone'

// ---------------------------------------------------------------------------
// featureFlags — the hide-before-delete switchboard
// ---------------------------------------------------------------------------

describe('featureFlags', () => {
  it('reports the stored value for every declared legacy surface', () => {
    const keys = Object.keys(LEGACY_HIDDEN) as LegacyHiddenKey[]
    expect(keys.length).toBeGreaterThan(0)
    for (const key of keys) {
      expect(isHidden(key)).toBe(LEGACY_HIDDEN[key])
    }
  })

  it('only ever exposes booleans, so callers can use the result directly in JSX', () => {
    for (const value of Object.values(LEGACY_HIDDEN)) {
      expect(typeof value).toBe('boolean')
    }
  })

  it('still declares the admin coming-soon links the sidebar reads', () => {
    expect(LEGACY_HIDDEN).toHaveProperty('comingSoonAdminLinks')
    expect(isHidden('comingSoonAdminLinks')).toBe(true)
  })

  it('is a pure read — querying a flag never mutates the table', () => {
    const before = { ...LEGACY_HIDDEN }
    isHidden('comingSoonAdminLinks')
    isHidden('comingSoonAdminLinks')
    expect({ ...LEGACY_HIDDEN }).toEqual(before)
  })
})

// ---------------------------------------------------------------------------
// cookieConsent — localStorage round-trip and script gating
// ---------------------------------------------------------------------------

/** Discovered from the module itself, so the malformed-payload tests can never pass vacuously. */
let STORAGE_KEY = ''

beforeAll(() => {
  localStorage.clear()
  writeStoredConsent({ analytics: false, marketing: false })
  STORAGE_KEY = localStorage.key(0) ?? ''
  localStorage.clear()
})

describe('cookieConsent — storage round-trip', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-25T10:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    localStorage.clear()
  })

  it('discovers a real storage key (guards the tampering tests below)', () => {
    expect(STORAGE_KEY).not.toBe('')
  })

  it('returns null when the visitor has never answered the banner', () => {
    expect(readStoredConsent()).toBeNull()
    expect(hasConsentRecord()).toBe(false)
  })

  it('round-trips the preferences, stamping the current version and timestamp', () => {
    const written = writeStoredConsent({ analytics: true, marketing: false })

    expect(written).toEqual({
      version: CONSENT_VERSION,
      necessary: true,
      analytics: true,
      marketing: false,
      updatedAt: '2026-07-25T10:00:00.000Z',
    })
    expect(readStoredConsent()).toEqual(written)
    expect(hasConsentRecord()).toBe(true)
  })

  it('persists JSON that survives a fresh page load', () => {
    writeStoredConsent({ analytics: false, marketing: true })

    const raw = localStorage.getItem(STORAGE_KEY)
    expect(raw).toBeTruthy()
    expect(JSON.parse(raw!)).toMatchObject({ analytics: false, marketing: true, necessary: true })
  })

  it('acceptAllConsent opts into everything', () => {
    const stored = acceptAllConsent()
    expect(stored.analytics).toBe(true)
    expect(stored.marketing).toBe(true)
    expect(readStoredConsent()?.analytics).toBe(true)
  })

  it('rejectNonEssentialConsent keeps only the necessary category', () => {
    acceptAllConsent()
    const stored = rejectNonEssentialConsent()

    expect(stored.necessary).toBe(true)
    expect(stored.analytics).toBe(false)
    expect(stored.marketing).toBe(false)
    expect(readStoredConsent()?.marketing).toBe(false)
  })

  it('withdrawConsent downgrades an earlier accept-all and still leaves a record', () => {
    acceptAllConsent()
    expect(readStoredConsent()?.analytics).toBe(true)

    withdrawConsent()

    expect(hasConsentRecord()).toBe(true)
    expect(readStoredConsent()).toMatchObject({ analytics: false, marketing: false })
  })

  it('defaults to no tracking before any choice is made', () => {
    expect(DEFAULT_PREFS).toEqual({ necessary: true, analytics: false, marketing: false })
  })
})

describe('cookieConsent — malformed or tampered storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('ignores a value that is not valid JSON instead of throwing', () => {
    localStorage.setItem(STORAGE_KEY, '{not json')
    expect(() => readStoredConsent()).not.toThrow()
    expect(readStoredConsent()).toBeNull()
    expect(hasConsentRecord()).toBe(false)
  })

  it('ignores an empty stored string', () => {
    localStorage.setItem(STORAGE_KEY, '')
    expect(readStoredConsent()).toBeNull()
  })

  it('ignores a record written by an older consent version', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: CONSENT_VERSION - 1,
        necessary: true,
        analytics: true,
        marketing: true,
        updatedAt: '2020-01-01T00:00:00.000Z',
      }),
    )

    expect(readStoredConsent()).toBeNull()
    expect(hasConsentRecord()).toBe(false)
  })

  it('rejects a record whose necessary flag was tampered with', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: CONSENT_VERSION,
        necessary: false,
        analytics: true,
        marketing: true,
        updatedAt: '2026-01-01T00:00:00.000Z',
      }),
    )

    expect(readStoredConsent()).toBeNull()
  })

  it('coerces non-boolean category values rather than leaking them to callers', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: CONSENT_VERSION,
        necessary: true,
        analytics: 'yes',
        marketing: 0,
        updatedAt: '2026-01-01T00:00:00.000Z',
      }),
    )

    const stored = readStoredConsent()
    expect(stored?.analytics).toBe(true)
    expect(stored?.marketing).toBe(false)
  })

  it('treats missing categories as opt-out', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: CONSENT_VERSION, necessary: true, updatedAt: '2026-01-01T00:00:00.000Z' }),
    )

    const stored = readStoredConsent()
    expect(stored?.analytics).toBe(false)
    expect(stored?.marketing).toBe(false)
  })

  it('backfills a missing timestamp with the current time', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-25T10:00:00.000Z'))
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: CONSENT_VERSION, necessary: true, analytics: true, marketing: false }),
    )

    expect(readStoredConsent()?.updatedAt).toBe('2026-07-25T10:00:00.000Z')
    vi.useRealTimers()
  })
})

describe('cookieConsent — third-party script gating', () => {
  const gaScript = () => document.getElementById('emc-ga-script')
  const marketingScript = () => document.getElementById('emc-marketing-script')

  beforeEach(() => {
    localStorage.clear()
    teardownTrackingScripts()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    teardownTrackingScripts()
  })

  it('injects nothing when the visitor only accepted the necessary category', () => {
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', 'G-TEST123')
    vi.stubEnv('VITE_META_PIXEL_ID', '99887766')

    applyConsentScripts({ necessary: true, analytics: false, marketing: false })

    expect(gaScript()).toBeNull()
    expect(marketingScript()).toBeNull()
  })

  it('loads analytics only after analytics consent, using the configured measurement id', () => {
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', 'G-TEST123')

    applyConsentScripts({ necessary: true, analytics: true, marketing: false })

    const script = gaScript()
    expect(script).not.toBeNull()
    expect(script?.getAttribute('src')).toContain('G-TEST123')
    expect(script?.getAttribute('src')).toContain('googletagmanager.com')
    expect((window as Window & { dataLayer?: unknown[] }).dataLayer).toBeInstanceOf(Array)
  })

  it('does not inject analytics when no measurement id is configured', () => {
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', '')

    applyConsentScripts({ necessary: true, analytics: true, marketing: false })

    expect(gaScript()).toBeNull()
  })

  it('treats a whitespace-only measurement id as unconfigured', () => {
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', '   ')

    applyConsentScripts({ necessary: true, analytics: true, marketing: false })

    expect(gaScript()).toBeNull()
  })

  it('never injects the same script twice when consent is re-applied', () => {
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', 'G-TEST123')

    applyConsentScripts({ necessary: true, analytics: true, marketing: false })
    applyConsentScripts({ necessary: true, analytics: true, marketing: false })

    expect(document.querySelectorAll('#emc-ga-script')).toHaveLength(1)
  })

  it('embeds the configured pixel id when marketing consent is given', () => {
    vi.stubEnv('VITE_META_PIXEL_ID', '99887766')

    applyConsentScripts({ necessary: true, analytics: false, marketing: true })

    expect(marketingScript()?.textContent).toContain('99887766')
  })

  it('removes previously injected trackers when consent is withdrawn', () => {
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', 'G-TEST123')
    vi.stubEnv('VITE_META_PIXEL_ID', '99887766')

    applyConsentScripts({ necessary: true, analytics: true, marketing: true })
    expect(gaScript()).not.toBeNull()
    expect(marketingScript()).not.toBeNull()

    applyConsentScripts({ necessary: true, analytics: false, marketing: false })

    expect(gaScript()).toBeNull()
    expect(marketingScript()).toBeNull()
    expect((window as Window & { dataLayer?: unknown[] }).dataLayer).toBeUndefined()
    expect((window as Window & { gtag?: unknown }).gtag).toBeUndefined()
  })

  it('teardown is safe to call when nothing was ever injected', () => {
    expect(() => teardownTrackingScripts()).not.toThrow()
    expect(gaScript()).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// countryFromPhone — ISO country derivation
// ---------------------------------------------------------------------------

describe('countryFromPhone', () => {
  it('derives the country from an international number', () => {
    expect(countryFromPhone('+31612345678')).toBe('NL')
    expect(countryFromPhone('+967771234567')).toBe('YE')
    expect(countryFromPhone('+966501234567')).toBe('SA')
    expect(countryFromPhone('+441134960000')).toBe('GB')
  })

  it('returns the uppercase alpha-2 shape CountrySelect expects', () => {
    const code = countryFromPhone('+967771234567')
    expect(code).toMatch(/^[A-Z]{2}$/)
  })

  it('disambiguates countries that share a dial code by the longer prefix', () => {
    // Both are +1; only the area code separates the US from Canada.
    expect(countryFromPhone('+12125551234')).toBe('US')
    expect(countryFromPhone('+12042345678')).toBe('CA')
  })

  it('tolerates the spacing users actually type', () => {
    expect(countryFromPhone('+20 100 123 4567')).toBe('EG')
    expect(countryFromPhone('  +31 6 12345678  ')).toBe('NL')
  })

  it('understands Arabic-Indic digits', () => {
    expect(countryFromPhone('+٩٦٧٧٧١٢٣٤٥٦٧')).toBe('YE')
  })

  it('returns null for empty-ish input', () => {
    expect(countryFromPhone('')).toBeNull()
    expect(countryFromPhone(null)).toBeNull()
    expect(countryFromPhone(undefined)).toBeNull()
  })

  it('returns null for a national number with no country context', () => {
    expect(countryFromPhone('0612345678')).toBeNull()
  })

  it('returns null for an unassigned dial code', () => {
    expect(countryFromPhone('+999999999999')).toBeNull()
  })

  it('returns null for a fragment that is too short to place', () => {
    expect(countryFromPhone('+49')).toBeNull()
    expect(countryFromPhone('+1')).toBeNull()
  })

  it('returns null for free text instead of throwing', () => {
    expect(() => countryFromPhone('غير معروف')).not.toThrow()
    expect(countryFromPhone('غير معروف')).toBeNull()
    expect(countryFromPhone('abc')).toBeNull()
    expect(countryFromPhone('++')).toBeNull()
  })
})
