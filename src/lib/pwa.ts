/**
 * PWA Service Worker Registration & Installation Utilities
 */

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

let deferredPrompt: BeforeInstallPromptEvent | null = null
const promptListeners = new Set<(canInstall: boolean) => void>()

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator && Boolean((window.navigator as unknown as { standalone: boolean }).standalone))
  )
}

export function isIos(): boolean {
  if (typeof window === 'undefined') return false
  const userAgent = window.navigator.userAgent.toLowerCase()
  return /iphone|ipad|ipod/.test(userAgent)
}

/** Registers the service worker with automatic update checks */
export function registerPwaServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        // Periodically check for service worker updates (every 30 mins)
        setInterval(() => {
          registration.update().catch(() => {})
        }, 1000 * 60 * 30)

        // When a new SW is waiting to activate
        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing
          if (installingWorker) {
            installingWorker.addEventListener('statechange', () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWA] New update available, auto-activating...')
              }
            })
          }
        })
      })
      .catch((err) => {
        console.warn('[PWA] SW registration failed:', err)
      })

    // Listen for controlling service worker change to reload page smoothly
    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true
        window.location.reload()
      }
    })
  })

  // Capture install prompt event for Android & Desktop Chrome/Edge
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e as BeforeInstallPromptEvent
    promptListeners.forEach((listener) => listener(true))
  })

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    promptListeners.forEach((listener) => listener(false))
    console.log('[PWA] EMC Platform installed successfully!')
  })
}

export function onInstallAvailabilityChange(callback: (canInstall: boolean) => void): () => void {
  promptListeners.add(callback)
  callback(deferredPrompt !== null)
  return () => {
    promptListeners.delete(callback)
  }
}

export async function promptInstallApp(): Promise<'accepted' | 'dismissed' | 'unsupported'> {
  if (!deferredPrompt) {
    return 'unsupported'
  }
  try {
    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    deferredPrompt = null
    promptListeners.forEach((listener) => listener(false))
    return choice.outcome
  } catch (err) {
    console.warn('[PWA] prompt error:', err)
    return 'unsupported'
  }
}
