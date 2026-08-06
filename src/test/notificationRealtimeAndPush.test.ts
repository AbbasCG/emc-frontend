import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * Ticket 8 completion pass — realtime + push client helpers.
 * VITE_REVERB_APP_KEY / VITE_VAPID_PUBLIC_KEY are empty in the test env
 * (no .env override), so both modules exercise their "disabled by default,
 * safe fallback" branches here — exactly the behavior a deployment without
 * a configured Reverb server / VAPID keypair must have.
 */
describe('echo.ts — realtime configuration and graceful fallback', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('isRealtimeConfigured is false when VITE_REVERB_APP_KEY is unset', async () => {
    const { isRealtimeConfigured } = await import('@/lib/echo')
    expect(isRealtimeConfigured()).toBe(false)
  })

  it('subscribeToUserNotifications returns a no-op unsubscribe and never throws when unconfigured', async () => {
    const { subscribeToUserNotifications } = await import('@/lib/echo')
    const onCreated = vi.fn()

    const unsubscribe = subscribeToUserNotifications(42, onCreated)

    expect(typeof unsubscribe).toBe('function')
    expect(() => unsubscribe()).not.toThrow()
    expect(onCreated).not.toHaveBeenCalled()
  })

  it('getEcho returns null when realtime is not configured, without connecting a socket', async () => {
    const { getEcho } = await import('@/lib/echo')
    expect(getEcho()).toBeNull()
  })
})

describe('push.ts — Web Push configuration and support detection', () => {
  const originalServiceWorker = 'serviceWorker' in navigator ? navigator.serviceWorker : undefined

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('isPushConfigured is false when VITE_VAPID_PUBLIC_KEY is unset', async () => {
    const { isPushConfigured } = await import('@/lib/push')
    expect(isPushConfigured()).toBe(false)
  })

  it('subscribeToPush resolves false (safe no-op) when push is not configured, without touching the browser API', async () => {
    const { subscribeToPush } = await import('@/lib/push')
    const result = await subscribeToPush()
    expect(result).toBe(false)
  })

  it('unsubscribeFromPush resolves without throwing when unsupported', async () => {
    vi.stubGlobal('navigator', { ...navigator, serviceWorker: undefined })
    const { unsubscribeFromPush } = await import('@/lib/push')
    await expect(unsubscribeFromPush()).resolves.toBeUndefined()
    void originalServiceWorker
  })
})
