import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Pwa = typeof import('@/lib/pwa')

/** The module keeps the captured install prompt and its listeners at module level, so every test loads a fresh copy. */
async function load(): Promise<Pwa> {
  vi.resetModules()
  return import('@/lib/pwa')
}

type SwListener = () => void

function fakeServiceWorker(controller: object | null) {
  const listeners = new Map<string, SwListener[]>()
  const registration = { update: vi.fn().mockResolvedValue(undefined) }
  const container = {
    controller,
    register: vi.fn().mockResolvedValue(registration),
    addEventListener: (type: string, fn: SwListener) => listeners.set(type, [...(listeners.get(type) ?? []), fn]),
    emit: (type: string) => (listeners.get(type) ?? []).forEach((fn) => fn()),
  }
  Object.defineProperty(navigator, 'serviceWorker', { value: container, configurable: true })
  return { container, registration }
}

let reload: ReturnType<typeof vi.fn>
const realLocation = window.location
const addedListeners: Array<[string, EventListenerOrEventListenerObject]> = []

beforeEach(() => {
  reload = vi.fn()
  Object.defineProperty(window, 'location', { value: { ...realLocation, reload }, configurable: true })
  // jsdom has no matchMedia
  Object.defineProperty(window, 'matchMedia', { value: vi.fn(() => ({ matches: false }) as MediaQueryList), configurable: true, writable: true })
  // Every register call attaches window listeners; remember them so one test never inherits another's.
  const original = window.addEventListener.bind(window)
  vi.spyOn(window, 'addEventListener').mockImplementation((type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
    addedListeners.push([type, listener])
    original(type, listener, options)
  })
})

afterEach(() => {
  for (const [type, listener] of addedListeners.splice(0)) window.removeEventListener(type, listener)
  Object.defineProperty(window, 'location', { value: realLocation, configurable: true })
  Reflect.deleteProperty(navigator, 'serviceWorker')
  vi.unstubAllEnvs()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('environment checks', () => {
  it('knows when it runs as an installed app', async () => {
    const pwa = await load()
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList)
    expect(pwa.isStandalone()).toBe(true)

    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList)
    expect(pwa.isStandalone()).toBe(false)

    Object.defineProperty(navigator, 'standalone', { value: true, configurable: true })
    expect(pwa.isStandalone()).toBe(true)
    Reflect.deleteProperty(navigator, 'standalone')
  })

  it('recognises iPhone, iPad and iPod, and nothing else', async () => {
    const pwa = await load()
    const ua = vi.spyOn(navigator, 'userAgent', 'get')

    for (const agent of ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)', 'Mozilla/5.0 (iPad; CPU OS 17_0)', 'Mozilla/5.0 (iPod touch)']) {
      ua.mockReturnValue(agent)
      expect(pwa.isIos()).toBe(true)
    }
    ua.mockReturnValue('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130')
    expect(pwa.isIos()).toBe(false)
  })
})

describe('service worker registration', () => {
  it('does nothing where service workers are not supported', async () => {
    const pwa = await load()
    expect(() => pwa.registerPwaServiceWorker()).not.toThrow()
  })

  it('is never registered in development (it would serve stale modules and break hot reload)', async () => {
    vi.stubEnv('PROD', false)
    const { container } = fakeServiceWorker(null)
    const pwa = await load()
    pwa.registerPwaServiceWorker()
    window.dispatchEvent(new Event('load'))

    expect(container.register).not.toHaveBeenCalled()
  })

  it('registers /sw.js at the site root in production once the page has loaded', async () => {
    vi.stubEnv('PROD', true)
    const { container } = fakeServiceWorker(null)
    const pwa = await load()
    pwa.registerPwaServiceWorker()

    expect(container.register).not.toHaveBeenCalled() // waits for the load event
    window.dispatchEvent(new Event('load'))
    expect(container.register).toHaveBeenCalledWith('/sw.js', { scope: '/' })
  })

  it('does NOT reload on a first visit, when the new worker simply takes control', async () => {
    vi.stubEnv('PROD', true)
    const { container } = fakeServiceWorker(null) // no controller yet: a first visit
    const pwa = await load()
    pwa.registerPwaServiceWorker()
    window.dispatchEvent(new Event('load'))

    container.emit('controllerchange')
    expect(reload).not.toHaveBeenCalled()
  })

  it('reloads once onto the new worker when an existing one is upgraded', async () => {
    vi.stubEnv('PROD', true)
    const { container } = fakeServiceWorker({}) // the page already had a controller: an upgrade
    const pwa = await load()
    pwa.registerPwaServiceWorker()
    window.dispatchEvent(new Event('load'))

    container.emit('controllerchange')
    container.emit('controllerchange')
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('checks for a newer worker every 30 minutes', async () => {
    vi.useFakeTimers()
    vi.stubEnv('PROD', true)
    const { container, registration } = fakeServiceWorker(null)
    const pwa = await load()
    pwa.registerPwaServiceWorker()
    window.dispatchEvent(new Event('load'))
    await vi.advanceTimersByTimeAsync(0)
    expect(container.register).toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(30 * 60 * 1000)
    expect(registration.update).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(30 * 60 * 1000)
    expect(registration.update).toHaveBeenCalledTimes(2)
  })

  it('treats a failed registration as harmless', async () => {
    vi.stubEnv('PROD', true)
    const { container } = fakeServiceWorker(null)
    container.register.mockRejectedValue(new Error('blocked'))
    const pwa = await load()
    pwa.registerPwaServiceWorker()

    expect(() => window.dispatchEvent(new Event('load'))).not.toThrow()
    await Promise.resolve()
  })
})

describe('install prompt', () => {
  function installEvent(outcome: 'accepted' | 'dismissed' = 'accepted') {
    const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      platforms: ['web'],
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome, platform: 'web' }),
    })
    return event
  }

  it('reports "not installable" until the browser offers the prompt', async () => {
    const pwa = await load()
    const seen: boolean[] = []
    const off = pwa.onInstallAvailabilityChange((can) => seen.push(can))

    expect(seen).toEqual([false])
    off()
  })

  it('captures the browser prompt, tells listeners, and stops them once unsubscribed', async () => {
    fakeServiceWorker(null)
    const pwa = await load()
    pwa.registerPwaServiceWorker()
    const seen: boolean[] = []
    const off = pwa.onInstallAvailabilityChange((can) => seen.push(can))

    const event = installEvent()
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true) // the page decides when to show it
    expect(seen).toEqual([false, true])

    off()
    window.dispatchEvent(installEvent())
    expect(seen).toEqual([false, true])
  })

  it('answers "unsupported" when there is nothing to prompt', async () => {
    const pwa = await load()
    expect(await pwa.promptInstallApp()).toBe('unsupported')
  })

  it('shows the prompt, returns the visitor\'s choice, and clears it afterwards', async () => {
    fakeServiceWorker(null)
    const pwa = await load()
    pwa.registerPwaServiceWorker()
    const seen: boolean[] = []
    pwa.onInstallAvailabilityChange((can) => seen.push(can))
    const event = installEvent('accepted')
    window.dispatchEvent(event)

    expect(await pwa.promptInstallApp()).toBe('accepted')
    expect(event.prompt).toHaveBeenCalledTimes(1)
    expect(seen.at(-1)).toBe(false)
    expect(await pwa.promptInstallApp()).toBe('unsupported') // a prompt can be used only once
  })

  it('reports a dismissal as such', async () => {
    fakeServiceWorker(null)
    const pwa = await load()
    pwa.registerPwaServiceWorker()
    window.dispatchEvent(installEvent('dismissed'))

    expect(await pwa.promptInstallApp()).toBe('dismissed')
  })

  it('treats a prompt that throws as unsupported', async () => {
    fakeServiceWorker(null)
    const pwa = await load()
    pwa.registerPwaServiceWorker()
    const event = installEvent()
    event.prompt.mockRejectedValue(new Error('not allowed'))
    window.dispatchEvent(event)

    expect(await pwa.promptInstallApp()).toBe('unsupported')
  })

  it('clears the prompt when the app gets installed some other way', async () => {
    fakeServiceWorker(null)
    const pwa = await load()
    pwa.registerPwaServiceWorker()
    const seen: boolean[] = []
    pwa.onInstallAvailabilityChange((can) => seen.push(can))
    window.dispatchEvent(installEvent())

    window.dispatchEvent(new Event('appinstalled'))
    expect(seen.at(-1)).toBe(false)
    expect(await pwa.promptInstallApp()).toBe('unsupported')
  })
})
