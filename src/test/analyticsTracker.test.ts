import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Tracker = typeof import('@/lib/analyticsTracker')

const CONSENT = 'emc_cookie_consent_v1'
const API = 'https://api.example.test/api'

let beacon: ReturnType<typeof vi.fn>

/** A fresh module per test: the tracker keeps its queue and timer at module level. */
async function load(): Promise<Tracker> {
  vi.resetModules()
  return import('@/lib/analyticsTracker')
}

function accept() {
  localStorage.setItem(CONSENT, JSON.stringify({ analytics: true, marketing: false }))
}

function sentEvents(callIndex = 0): Array<Record<string, unknown>> {
  const [, blob] = beacon.mock.calls[callIndex] as [string, Blob]
  expect(blob).toBeInstanceOf(Blob)
  return JSON.parse(blobText(blob)).events
}

// jsdom's Blob has no sync reader; the tracker always sends `new Blob([json])`, so read it back through the spy.
const blobTexts = new WeakMap<Blob, string>()
function blobText(blob: Blob): string {
  return blobTexts.get(blob) ?? ''
}

beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear()
  sessionStorage.clear()
  vi.stubEnv('VITE_API_URL', API)
  const RealBlob = globalThis.Blob
  vi.stubGlobal(
    'Blob',
    class extends RealBlob {
      constructor(parts?: BlobPart[], options?: BlobPropertyBag) {
        super(parts, options)
        blobTexts.set(this, (parts ?? []).join(''))
      }
    },
  )
  beacon = vi.fn(() => true)
  Object.defineProperty(navigator, 'sendBeacon', { value: beacon, configurable: true })
  window.history.replaceState({}, '', '/')
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('analytics tracker consent gate', () => {
  it('queues and sends nothing, and mints no ids, before analytics is accepted', async () => {
    const t = await load()
    t.trackPageview('/courses')
    t.trackClientError('boom')
    await vi.advanceTimersByTimeAsync(10_000)

    expect(beacon).not.toHaveBeenCalled()
    expect(localStorage.getItem('emc_visitor_id')).toBeNull()
    expect(sessionStorage.getItem('emc_session_id')).toBeNull()
  })

  it('stays silent when the visitor refused analytics', async () => {
    localStorage.setItem(CONSENT, JSON.stringify({ analytics: false, marketing: true }))
    const t = await load()
    t.trackPageview('/x')
    await vi.advanceTimersByTimeAsync(10_000)
    expect(beacon).not.toHaveBeenCalled()
  })
})

describe('analytics tracker batching', () => {
  it('sends a pageview after the 4s window with visitor, session and campaign fields', async () => {
    accept()
    window.history.replaceState({}, '', '/?utm_source=news&utm_medium=email&utm_campaign=oct')
    const t = await load()

    t.trackPageview('/courses')
    expect(beacon).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(4000)

    expect(beacon).toHaveBeenCalledTimes(1)
    expect(beacon.mock.calls[0][0]).toBe(`${API}/analytics/events`)
    const [event] = sentEvents()
    expect(event).toMatchObject({ type: 'pageview', path: '/courses', utm_source: 'news', utm_medium: 'email', utm_campaign: 'oct' })
    expect(typeof event.visitor_id).toBe('string')
    expect(typeof event.session_id).toBe('string')
    expect(event.visitor_id).toBe(localStorage.getItem('emc_visitor_id'))
    expect(event.session_id).toBe(sessionStorage.getItem('emc_session_id'))
  })

  it('batches several events into one request and keeps one visitor and one session', async () => {
    accept()
    const t = await load()
    t.trackPageview('/a')
    t.trackPageview('/b')
    t.trackPageview('/c')
    await vi.advanceTimersByTimeAsync(4000)

    expect(beacon).toHaveBeenCalledTimes(1)
    const events = sentEvents()
    expect(events.map((e) => e.path)).toEqual(['/a', '/b', '/c'])
    expect(new Set(events.map((e) => e.visitor_id)).size).toBe(1)
    expect(new Set(events.map((e) => e.session_id)).size).toBe(1)
  })

  it('flushes immediately at 10 queued events', async () => {
    accept()
    const t = await load()
    for (let i = 0; i < 10; i += 1) t.trackPageview(`/p${i}`)

    expect(beacon).toHaveBeenCalledTimes(1)
    expect(sentEvents()).toHaveLength(10)
  })

  it('reuses an existing visitor id so both telemetry systems see one visitor', async () => {
    accept()
    localStorage.setItem('emc_visitor_id', 'shared-visitor')
    const t = await load()
    t.trackPageview('/x')
    await vi.advanceTimersByTimeAsync(4000)
    expect(sentEvents()[0].visitor_id).toBe('shared-visitor')
  })

  it('drops the queue without sending when no API base is configured', async () => {
    accept()
    vi.stubEnv('VITE_API_URL', '')
    vi.stubEnv('VITE_API_BASE_URL', '')
    const t = await load()
    t.trackPageview('/x')
    await vi.advanceTimersByTimeAsync(4000)
    expect(beacon).not.toHaveBeenCalled()
  })

  it('falls back to a keepalive POST when the beacon is refused', async () => {
    accept()
    beacon.mockReturnValue(false)
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null))
    const t = await load()
    t.trackPageview('/x')
    await vi.advanceTimersByTimeAsync(4000)

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toBe(`${API}/analytics/events`)
    expect(init).toMatchObject({ method: 'POST', keepalive: true })
  })

  it('never lets a transport failure reach the page', async () => {
    accept()
    beacon.mockImplementation(() => {
      throw new Error('offline')
    })
    const t = await load()
    t.trackPageview('/x')
    await expect(vi.advanceTimersByTimeAsync(4000)).resolves.not.toThrow()
  })
})

describe('client error tracking', () => {
  it('truncates long messages and sources and records the current path', async () => {
    accept()
    window.history.replaceState({}, '', '/dashboard/x')
    const t = await load()
    t.trackClientError('m'.repeat(400), 's'.repeat(400))
    await vi.advanceTimersByTimeAsync(4000)

    const [event] = sentEvents()
    expect(event).toMatchObject({ type: 'error', path: '/dashboard/x' })
    expect(String(event.name)).toHaveLength(250)
    expect(String(event.source)).toHaveLength(250)
  })

  it('records window errors and unhandled rejections once installed', async () => {
    accept()
    const t = await load()
    t.installErrorTracking()

    window.dispatchEvent(new ErrorEvent('error', { message: 'script failed', filename: 'app.js' }))
    window.dispatchEvent(Object.assign(new Event('unhandledrejection'), { reason: new Error('promise failed') }))
    window.dispatchEvent(Object.assign(new Event('unhandledrejection'), { reason: 'plain string reason' }))
    window.dispatchEvent(Object.assign(new Event('unhandledrejection'), { reason: undefined }))
    await vi.advanceTimersByTimeAsync(4000)

    const events = sentEvents()
    expect(events.map((e) => e.name)).toEqual(['script failed', 'promise failed', 'plain string reason', 'unhandledrejection'])
    expect(events[0].source).toBe('app.js')
  })

  it('flushes right away when the page is hidden or closed', async () => {
    accept()
    const t = await load()
    t.installErrorTracking()

    t.trackPageview('/a')
    window.dispatchEvent(new Event('pagehide'))
    expect(beacon).toHaveBeenCalledTimes(1)

    t.trackPageview('/b')
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    expect(beacon).toHaveBeenCalledTimes(2)

    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    t.trackPageview('/c')
    document.dispatchEvent(new Event('visibilitychange'))
    expect(beacon).toHaveBeenCalledTimes(2)
  })

  it('does not report window errors before consent', async () => {
    const t = await load()
    t.installErrorTracking()
    window.dispatchEvent(new ErrorEvent('error', { message: 'secret path' }))
    await vi.advanceTimersByTimeAsync(10_000)
    expect(beacon).not.toHaveBeenCalled()
  })
})
