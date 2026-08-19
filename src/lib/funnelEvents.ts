/**
 * Funnel telemetry — dependency-free, never throws, never blocks.
 *
 * Three sinks, all optional:
 *  1. `window.dataLayer` (GTM) when a container is present.
 *  2. A beacon to `${VITE_API_URL}/analytics/events` — gated behind
 *     `VITE_ANALYTICS_EVENTS==='1'` so nothing is sent until that endpoint
 *     actually exists on the backend.
 *  3. `console.debug` in DEV only.
 *
 * The anonymous visitor id persists across sessions so a free-workshop
 * registration and a later purchase can be tied to the same person — the
 * organisation's first KPI.
 */

export type FunnelEventName =
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

export type FunnelEventProps = Record<string, string | number | boolean | undefined>

const VISITOR_KEY = 'emc_visitor_id'

/** Stable anonymous id — the join between a free registration and a later purchase. */
function visitorId(): string {
  try {
    const existing = localStorage.getItem(VISITOR_KEY)
    if (existing) return existing
    const fresh =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `v-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
    localStorage.setItem(VISITOR_KEY, fresh)
    return fresh
  } catch {
    return 'anonymous'
  }
}

type DataLayerWindow = Window & { dataLayer?: Array<Record<string, unknown>> }

export function trackFunnelEvent(name: FunnelEventName, props: FunnelEventProps = {}): void {
  try {
    if (typeof window === 'undefined') return
    const payload = { event: name, ...props, visitor_id: visitorId(), path: window.location.pathname }

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
