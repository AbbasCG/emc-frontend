import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_PRICE_ZONE,
  funnelContactHash,
  funnelTrackingAllowed,
  rememberFunnelContact,
  resolvePriceZone,
  trackFunnelEvent,
} from '@/lib/funnelEvents'

const CONSENT = 'emc_cookie_consent_v1'

type Layer = Array<Record<string, unknown>>
const win = window as Window & { dataLayer?: Layer }

function consent(value: unknown) {
  localStorage.setItem(CONSENT, typeof value === 'string' ? value : JSON.stringify(value))
}

beforeEach(() => {
  localStorage.clear()
  win.dataLayer = []
  vi.spyOn(console, 'debug').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  delete win.dataLayer
})

describe('funnel consent gate', () => {
  it('treats a missing, refused, malformed or analytics-less record as NO consent', () => {
    expect(funnelTrackingAllowed()).toBe(false)

    consent({ analytics: false, marketing: true })
    expect(funnelTrackingAllowed()).toBe(false)

    consent({ marketing: true })
    expect(funnelTrackingAllowed()).toBe(false)

    consent('{not json')
    expect(funnelTrackingAllowed()).toBe(false)

    consent('null')
    expect(funnelTrackingAllowed()).toBe(false)

    consent({ analytics: 'true' }) // only the boolean true counts
    expect(funnelTrackingAllowed()).toBe(false)
  })

  it('accepts only an explicit analytics: true', () => {
    consent({ analytics: true, marketing: false })
    expect(funnelTrackingAllowed()).toBe(true)
  })

  it('sends nothing and mints no visitor id before the visitor has chosen', () => {
    trackFunnelEvent('enroll_click', { course: 'c1' })
    expect(win.dataLayer).toHaveLength(0)
    expect(localStorage.getItem('emc_visitor_id')).toBeNull()

    consent({ analytics: false, marketing: false })
    trackFunnelEvent('enroll_click')
    expect(win.dataLayer).toHaveLength(0)
    expect(localStorage.getItem('emc_visitor_id')).toBeNull()
  })

  it('pushes the event with an anonymous visitor id and the path once analytics is accepted', () => {
    consent({ analytics: true, marketing: false })
    trackFunnelEvent('quickjoin_open', { course: 'c1', paid: false })

    expect(win.dataLayer).toHaveLength(1)
    const pushed = win.dataLayer![0]
    expect(pushed).toMatchObject({ event: 'quickjoin_open', course: 'c1', paid: false, path: window.location.pathname })
    expect(typeof pushed.visitor_id).toBe('string')
    expect(pushed).not.toHaveProperty('contact_hash')
  })

  it('keeps one visitor id across events', () => {
    consent({ analytics: true })
    trackFunnelEvent('product_view')
    trackFunnelEvent('checkout_start')

    const [a, b] = win.dataLayer!
    expect(a.visitor_id).toBe(b.visitor_id)
    expect(localStorage.getItem('emc_visitor_id')).toBe(a.visitor_id)
  })

  it('reuses a visitor id that already exists', () => {
    localStorage.setItem('emc_visitor_id', 'existing-visitor')
    consent({ analytics: true })
    trackFunnelEvent('upsell_view')
    expect(win.dataLayer![0].visitor_id).toBe('existing-visitor')
  })

  it('does nothing when there is no dataLayer and never throws', () => {
    delete win.dataLayer
    consent({ analytics: true })
    expect(() => trackFunnelEvent('purchase', { value: 10 })).not.toThrow()
  })

  it('never lets a storage failure reach the caller', () => {
    consent({ analytics: true })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(() => trackFunnelEvent('purchase')).not.toThrow()
    expect(funnelTrackingAllowed()).toBe(false)
  })
})

describe('contact hash (the join between a free registration and a later purchase)', () => {
  it('stores only a hash, never the raw contact', () => {
    const hash = rememberFunnelContact('  Student@Example.COM ')

    expect(hash).toMatch(/^c[0-9a-z]+$/)
    expect(funnelContactHash()).toBe(hash)
    expect(JSON.stringify(Object.entries(localStorage))).not.toMatch(/student@example/i)
  })

  it('joins the same email typed differently', () => {
    const a = rememberFunnelContact('student@example.com')
    const b = rememberFunnelContact(' STUDENT@EXAMPLE.COM ')
    expect(a).toBe(b)
  })

  it('joins the same phone written with different spacing and punctuation', () => {
    const a = rememberFunnelContact('+31 6 1234 5678')
    const b = rememberFunnelContact('+31-6-12345678')
    expect(a).not.toBeNull()
    expect(a).toBe(b)
  })

  it('keeps different people apart', () => {
    expect(rememberFunnelContact('a@example.com')).not.toBe(rememberFunnelContact('b@example.com'))
  })

  it('refuses values that are not a usable contact and leaves the stored hash alone', () => {
    const kept = rememberFunnelContact('kept@example.com')

    expect(rememberFunnelContact('')).toBeNull()
    expect(rememberFunnelContact('   ')).toBeNull()
    expect(rememberFunnelContact(null)).toBeNull()
    expect(rememberFunnelContact(undefined)).toBeNull()
    expect(rememberFunnelContact('12345')).toBeNull() // a phone needs at least 7 digits
    expect(rememberFunnelContact('no contact here')).toBeNull()
    expect(funnelContactHash()).toBe(kept)
  })

  it('is remembered before consent but only travels after consent', () => {
    const hash = rememberFunnelContact('person@example.com')

    trackFunnelEvent('workshop_register')
    expect(win.dataLayer).toHaveLength(0)

    consent({ analytics: true })
    trackFunnelEvent('purchase')
    expect(win.dataLayer![0]).toMatchObject({ event: 'purchase', contact_hash: hash })
  })

  it('has no hash for a browser that never submitted a contact', () => {
    expect(funnelContactHash()).toBeNull()
  })
})

describe('regional pricing seam', () => {
  it('maps every country to the single global zone for now', () => {
    expect(DEFAULT_PRICE_ZONE).toBe('global')
    expect(resolvePriceZone()).toBe('global')
    expect(resolvePriceZone('NL')).toBe('global')
    expect(resolvePriceZone(null)).toBe('global')
  })
})

describe('events endpoint beacon', () => {
  beforeEach(() => consent({ analytics: true }))

  it('stays off unless the endpoint is explicitly enabled', () => {
    const beacon = vi.fn(() => true)
    Object.defineProperty(navigator, 'sendBeacon', { value: beacon, configurable: true })
    vi.stubEnv('VITE_API_URL', 'https://api.example.test/api')

    trackFunnelEvent('purchase')
    expect(beacon).not.toHaveBeenCalled()
  })

  it('uses sendBeacon when enabled and available', () => {
    const beacon = vi.fn(() => true)
    Object.defineProperty(navigator, 'sendBeacon', { value: beacon, configurable: true })
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null))
    vi.stubEnv('VITE_ANALYTICS_EVENTS', '1')
    vi.stubEnv('VITE_API_URL', 'https://api.example.test/api/')

    trackFunnelEvent('purchase', { value: 25 })

    expect(beacon).toHaveBeenCalledTimes(1)
    expect((beacon.mock.calls as unknown[][])[0][0]).toBe('https://api.example.test/api/analytics/events')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('falls back to a keepalive POST when the beacon is refused', () => {
    Object.defineProperty(navigator, 'sendBeacon', { value: vi.fn(() => false), configurable: true })
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null))
    vi.stubEnv('VITE_ANALYTICS_EVENTS', '1')
    vi.stubEnv('VITE_API_URL', 'https://api.example.test/api')

    trackFunnelEvent('purchase')

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toBe('https://api.example.test/api/analytics/events')
    expect(init).toMatchObject({ method: 'POST', keepalive: true })
    expect(JSON.parse(String((init as RequestInit).body))).toMatchObject({ event: 'purchase' })
  })

  it('sends nothing without a configured API base', () => {
    const beacon = vi.fn(() => true)
    Object.defineProperty(navigator, 'sendBeacon', { value: beacon, configurable: true })
    vi.stubEnv('VITE_ANALYTICS_EVENTS', '1')
    vi.stubEnv('VITE_API_URL', '')
    vi.stubEnv('VITE_API_BASE_URL', '')

    trackFunnelEvent('purchase')
    expect(beacon).not.toHaveBeenCalled()
  })
})
