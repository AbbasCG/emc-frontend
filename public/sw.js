/**
 * EMC Progressive Web App Service Worker
 * Supports:
 * 1. Network-First dynamic updates (always gets freshest code and data)
 * 2. Instant activation (skipWaiting + clients.claim)
 * 3. Offline capability for installed PWA
 * 4. Web Push notifications & notification click routing
 */

const CACHE_VERSION = 'emc-v1.0.2'
const STATIC_CACHE = `emc-static-${CACHE_VERSION}`
const DYNAMIC_CACHE = `emc-dynamic-${CACHE_VERSION}`

// Core static assets to cache for offline splash/launch
const PRECACHE_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/brand/logos/pwa-icon-192.png',
  '/brand/logos/pwa-icon-512.png',
  '/brand/logos/pwa-icon-maskable-512.png',
  '/brand/logos/logo_icon_color.png',
  '/brand/logos/logo_full_white.png',
  '/favicon.svg',
]

// ── Lifecycle: Install & Activate ────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Pre-caching non-fatal warning:', err)
      })
    }),
  )
  // Force active immediately without waiting for existing clients to close
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== DYNAMIC_CACHE)
          .map((k) => {
            console.log('[SW] Purging old cache:', k)
            return caches.delete(k)
          }),
      )
    }),
  )
  // Take control of all open client tabs/windows immediately
  self.clients.claim()
})

// ── Fetch Strategy: Network-First for Navigation & Fresh Content ─────

self.addEventListener('fetch', (event) => {
  const req = event.request

  // Only handle GET requests
  if (req.method !== 'GET') return

  const url = new URL(req.url)

  // Ignore cross-origin non-app fetches and browser extensions
  if (url.origin !== self.location.origin) {
    // Only cache external Google fonts via Stale-While-Revalidate
    if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
      event.respondWith(
        caches.match(req).then((cached) => {
          const fetched = fetch(req).then((res) => {
            if (res.ok) {
              const clone = res.clone()
              caches.open(STATIC_CACHE).then((c) => c.put(req, clone))
            }
            return res
          }).catch(() => cached)
          return cached || fetched
        }),
      )
    }
    return
  }

  // 1. Navigation requests (HTML pages) → NETWORK-FIRST
  // Guarantees user always sees the newest build/updates immediately
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(DYNAMIC_CACHE).then((c) => c.put(req, clone))
          }
          return res
        })
        .catch(async () => {
          // If offline, serve cached page or offline fallback
          const cached = await caches.match(req)
          if (cached) return cached
          return (await caches.match('/')) || Response.error()
        }),
    )
    return
  }

  // 2. API requests → NETWORK-FIRST (never stale)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(req).catch(() => caches.match(req)),
    )
    return
  }

  // 3. Static assets (JS/CSS chunks, images, fonts) → Stale-While-Revalidate
  // Quick launch + silent background update
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetched = fetch(req)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(STATIC_CACHE).then((c) => c.put(req, clone))
          }
          return res
        })
        .catch(() => cached)

      return cached || fetched
    }),
  )
})

// ── Web Push & Notification Click Handlers (Ticket 8 compatibility) ──

self.addEventListener('push', (event) => {
  let payload = { title: 'مركز ماستر التعليمي — EMC', body: '', data: {} }
  try {
    payload = event.data ? event.data.json() : payload
  } catch {
    payload.body = event.data ? event.data.text() : ''
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'EMC', {
      body: payload.body || '',
      icon: '/brand/logos/logo_icon_color.png',
      badge: '/favicon.svg',
      data: payload.data || {},
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/dashboard'
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus()
        }
      }
      return self.clients.openWindow(url)
    }),
  )
})
