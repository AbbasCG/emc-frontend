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

/**
 * Registers the service worker with automatic update checks.
 *
 * Production only: the worker serves cached same-origin modules while it refreshes them in the background, which would hand a
 * developer stale Vite modules (and break hot reload) on localhost. The install prompt below is captured either way.
 */
export function registerPwaServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

  if (import.meta.env.PROD) registerServiceWorker()

  // Capture install prompt event for Android & Desktop Chrome/Edge
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e as BeforeInstallPromptEvent
    promptListeners.forEach((listener) => listener(true))
  })

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    promptListeners.forEach((listener) => listener(false))
  })
}

function registerServiceWorker(): void {
  window.addEventListener('load', () => {
    // A page that already had a controller is being UPGRADED to a newer worker; a first visit has none. Only an upgrade
    // reloads: on a first visit the new worker claims the page, and reloading then would interrupt whatever the visitor is doing.
    const hadController = Boolean(navigator.serviceWorker.controller)

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        // Periodically check for service worker updates (every 30 mins)
        setInterval(() => {
          registration.update().catch(() => {})
        }, 1000 * 60 * 30)

      })
      .catch(() => {
        // Registration is best effort: without a worker the site simply works online as before.
      })

    // Reload onto the new worker once it takes control, but only when upgrading an existing one.
    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || refreshing) return
      refreshing = true
      window.location.reload()
    })
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
  } catch {
    return 'unsupported'
  }
}
