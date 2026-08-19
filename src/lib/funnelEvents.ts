/**
 * Funnel telemetry — EMC-WEB-001 §17. Dependency-free, never throws, never blocks.
 *
 * ── CONSENT GATE ────────────────────────────────────────────────────────────
 * Nothing leaves the browser before the visitor has chosen. The decision is the
 * one the cookie banner writes (`src/lib/cookieConsent.ts` →
 * `localStorage['emc_cookie_consent_v1']`, `{ analytics, marketing }`); the key is
 * MIRRORED as a literal below instead of imported so this module keeps zero
 * imports and can never drag a dependency into a page bundle.
 *
 *   · no record yet            → suppressed (refusal is the pre-decision default)
 *   · «رفض غير الضروري»        → suppressed
 *   · analytics accepted       → dataLayer push + beacon
 *
 * While suppressed the module is a no-op: no anonymous id is minted, no
 * `dataLayer` push, no beacon, no fetch. Only a DEV-only `console.debug` remains,
 * and that never crosses the network.
 *
 * ── THE JOIN (the organisation's first KPI) ─────────────────────────────────
 * Two identifiers persist in `localStorage`:
 *
 *   · `emc_visitor_id`   — anonymous per-browser id, minted only after consent.
 *   · `emc_contact_hash` — a stable, non-reversible hash of the LAST KNOWN
 *     contact (email or WhatsApp, lowercased + trimmed; a phone is reduced to its
 *     digits so `+31 6 1234` and `0031 61234` land on one value). The raw contact
 *     is never stored and never sent — only the hash travels, and only after
 *     consent. Because the hash survives sessions, a free `workshop_register` and
 *     a later `purchase` resolve to the SAME person: that join is what §17 is for.
 *
 * ── SINKS (all optional) ────────────────────────────────────────────────────
 *   1. `window.dataLayer` (GTM) when a container is present.
 *   2. A beacon to `${VITE_API_URL}/analytics/events` — additionally gated behind
 *      `VITE_ANALYTICS_EVENTS==='1'` so nothing is sent until that endpoint
 *      actually exists on the backend.
 *   3. `console.debug` in DEV only.
 */

export type FunnelEventName =
  // ── existing names — every one kept ──
  | 'enroll_click'
  | 'quickjoin_open'
  | 'quickjoin_submit'
  | 'quickjoin_fields_expanded'
  | 'quickjoin_success'
  | 'quickjoin_login_switch'
  | 'signup_started'
  | 'signup_completed'
  | 'upsell_view'
  | 'upsell_click'
  | 'path_enroll_click'
  | 'welcome_dismissed'
  // ── §17 measurement layer ──
  | 'workshop_register'
  | 'placement_test_start'
  | 'placement_test_complete'
  | 'product_view'
  | 'checkout_start'
  | 'checkout_step'
  | 'purchase'
  | 'bank_transfer_pending'
  | 'fellowship_apply'
  | 'business_inquiry'
  | 'upgrade_coupon_applied'

export type FunnelEventProps = Record<string, string | number | boolean | undefined>

const VISITOR_KEY = 'emc_visitor_id'
const CONTACT_KEY = 'emc_contact_hash'
/** Mirrors `STORAGE_KEY` in `src/lib/cookieConsent.ts` — literal, so this module imports nothing. */
const CONSENT_KEY = 'emc_cookie_consent_v1'

function readLocal(key: string): string | null {
  try {
    if (typeof localStorage === 'undefined') return null
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeLocal(key: string, value: string): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(key, value)
  } catch {
    // Private mode / blocked storage — telemetry degrades, the visitor does not.
  }
}

/**
 * Has the visitor accepted analytics cookies?
 *
 * A missing or unreadable record means NO DECISION HAS BEEN MADE, and the answer
 * is `false` — refusal is the default until the banner is answered.
 */
export function funnelTrackingAllowed(): boolean {
  const raw = readLocal(CONSENT_KEY)
  if (!raw) return false
  try {
    const parsed = JSON.parse(raw) as { analytics?: unknown } | null
    return parsed?.analytics === true
  } catch {
    return false
  }
}

/** Stable anonymous id — minted only once tracking is allowed. */
function visitorId(): string {
  const existing = readLocal(VISITOR_KEY)
  if (existing) return existing
  let fresh: string
  try {
    fresh =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `v-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
  } catch {
    fresh = `v-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
  }
  writeLocal(VISITOR_KEY, fresh)
  return fresh
}

/**
 * Lowercase + trim; a value without «@» is treated as a phone and reduced to its
 * digits, so the same person typing their WhatsApp two different ways still joins.
 */
function normalizeContact(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim().toLowerCase()
  if (!trimmed) return null
  if (trimmed.includes('@')) return trimmed
  const digits = trimmed.replace(/\D/g, '')
  return digits.length >= 7 ? digits : null
}

/** Non-reversible 32-bit hash (djb2), suffixed with the input length to spread collisions. */
function hashContact(value: string): string {
  let h = 5381
  for (let i = 0; i < value.length; i += 1) {
    h = ((h * 33) ^ value.charCodeAt(i)) >>> 0
  }
  return `c${h.toString(36)}${value.length.toString(36)}`
}

/**
 * Remember WHO this browser belongs to, as a hash only.
 *
 * Stored locally even before consent — it is a first-party value the visitor just
 * typed into a form they submitted, it is not reversible, and it is never sent
 * while tracking is suppressed. Persisting it here is what lets a free workshop
 * registration and a later purchase be joined once consent exists.
 *
 * Returns the stored hash, or `null` when the value is not a usable contact.
 */
export function rememberFunnelContact(value: string | null | undefined): string | null {
  const normalized = normalizeContact(value)
  if (!normalized) return null
  const hash = hashContact(normalized)
  writeLocal(CONTACT_KEY, hash)
  return hash
}

/** The last known contact hash for this browser, or `null` if none was ever seen. */
export function funnelContactHash(): string | null {
  return readLocal(CONTACT_KEY)
}

/**
 * REGIONAL PRICING SEAM.
 *
 * The public catalog exposes ONE price and no per-country table (see
 * `resolveDisplayPrice` in `src/pages/Checkout.tsx`), so every product sits in a
 * single zone today. When the backend publishes regional pricing, map the country
 * here and every §17 event carries the right zone without one call site changing.
 */
export const DEFAULT_PRICE_ZONE = 'global'

export function resolvePriceZone(_countryCode?: string | null): string {
  return DEFAULT_PRICE_ZONE
}

type DataLayerWindow = Window & { dataLayer?: Array<Record<string, unknown>> }

export function trackFunnelEvent(name: FunnelEventName, props: FunnelEventProps = {}): void {
  try {
    if (typeof window === 'undefined') return

    // ── Consent gate — before «قبول» this function is a no-op. ──
    if (!funnelTrackingAllowed()) {
      if (import.meta.env.DEV) console.debug('[funnel:suppressed]', name, props)
      return
    }

    const contact = funnelContactHash()
    const payload = {
      event: name,
      ...props,
      visitor_id: visitorId(),
      ...(contact ? { contact_hash: contact } : {}),
      path: window.location.pathname,
    }

    const dl = (window as DataLayerWindow).dataLayer
    if (Array.isArray(dl)) dl.push(payload)

    if (import.meta.env.VITE_ANALYTICS_EVENTS === '1') {
      const base = import.meta.env.VITE_API_URL ?? import.meta.env.VITE_API_BASE_URL
      if (base) {
        const url = `${String(base).replace(/\/$/, '')}/analytics/events`
        const body = JSON.stringify({ ...payload, ts: Date.now() })
        const sent = navigator.sendBeacon?.(url, new Blob([body], { type: 'application/json' }))
        if (!sent) {
          void fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
            keepalive: true,
          }).catch(() => undefined)
        }
      }
    }

    if (import.meta.env.DEV) console.debug('[funnel]', name, payload)
  } catch {
    // Telemetry must never affect the user's flow.
  }
}
