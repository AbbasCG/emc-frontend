// Ticket 8 completion pass — minimal Web Push service worker.
// Only handles push display + notification click; no offline caching
// (out of this ticket's scope — a full PWA strategy is a separate decision).

self.addEventListener('push', (event) => {
  let payload = { title: 'EMC', body: '', data: {} }
  try {
    payload = event.data ? event.data.json() : payload
  } catch {
    payload.body = event.data ? event.data.text() : ''
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'EMC', {
      body: payload.body || '',
      icon: '/favicon.svg',
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
        if (client.url.includes(self.location.origin) && 'focus' in client) return client.focus()
      }
      return self.clients.openWindow(url)
    }),
  )
})
