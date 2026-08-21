import { funnelTrackingAllowed } from './funnelEvents'

/**
 * متتبع تحليلات الزوار الذاتي — مشاهدات الصفحات وأخطاء الواجهة.
 *
 * نفس عقد الخصوصية في funnelEvents: لا يغادر المتصفحَ بايتٌ واحد قبل قبول
 * «التحليلات» في لافتة الكوكيز، ولا يُسك معرف الزائر إلا بعد الموافقة.
 * الإرسال دفعات عبر sendBeacon فلا يؤخر التصفح ولا يضيع عند مغادرة الصفحة.
 */

const VISITOR_KEY = 'emc_visitor_id'          // نفس مفتاح funnelEvents — زائر واحد عبر النظامين
const SESSION_KEY = 'emc_session_id'

type TrackerEvent = Record<string, string | number | undefined>

let queue: TrackerEvent[] = []
let flushTimer: number | null = null

function endpoint(): string | null {
  const base = (import.meta.env.VITE_API_URL ?? import.meta.env.VITE_API_BASE_URL ?? '') as string
  return base ? `${base.replace(/\/$/, '')}/analytics/events` : null
}

function visitorId(): string {
  let id = localStorage.getItem(VISITOR_KEY)
  if (!id) {
    id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `v-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
    localStorage.setItem(VISITOR_KEY, id)
  }
  return id
}

function sessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY)
  if (!id) {
    id = `s-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
    sessionStorage.setItem(SESSION_KEY, id)
  }
  return id
}

function baseFields(): TrackerEvent {
  const params = new URLSearchParams(window.location.search)
  return {
    visitor_id: visitorId(),
    session_id: sessionId(),
    locale: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screen_w: window.screen?.width,
    screen_h: window.screen?.height,
    utm_source: params.get('utm_source') ?? undefined,
    utm_medium: params.get('utm_medium') ?? undefined,
    utm_campaign: params.get('utm_campaign') ?? undefined,
  }
}

function flush(): void {
  if (queue.length === 0) return
  const url = endpoint()
  if (!url) {
    queue = []
    return
  }
  const body = JSON.stringify({ events: queue.splice(0, 25) })
  try {
    if (!navigator.sendBeacon?.(url, new Blob([body], { type: 'application/json' }))) {
      void fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true })
    }
  } catch {
    /* التتبع لا يُفشل التصفح أبداً */
  }
}

function enqueue(event: TrackerEvent): void {
  try {
    if (typeof window === 'undefined' || !funnelTrackingAllowed()) return
    queue.push({ ...baseFields(), ...event })
    if (queue.length >= 10) {
      flush()
      return
    }
    if (flushTimer == null) {
      flushTimer = window.setTimeout(() => {
        flushTimer = null
        flush()
      }, 4000)
    }
  } catch {
    /* صمتاً */
  }
}

export function trackPageview(path: string): void {
  enqueue({ type: 'pageview', path, referrer: document.referrer || undefined })
}

export function trackClientError(message: string, source?: string): void {
  enqueue({
    type: 'error',
    name: message.slice(0, 250),
    path: window.location.pathname,
    source: source?.slice(0, 250),
  })
}

/** يُستدعى مرة واحدة عند الإقلاع: أخطاء window + الوعود المرفوضة + تفريغ عند المغادرة. */
export function installErrorTracking(): void {
  if (typeof window === 'undefined') return
  window.addEventListener('error', (e) => {
    trackClientError(e.message || 'window.onerror', e.filename)
  })
  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason as { message?: string } | string | undefined
    const msg = typeof reason === 'string' ? reason : (reason?.message ?? 'unhandledrejection')
    trackClientError(msg)
  })
  window.addEventListener('pagehide', flush)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush()
  })
}
