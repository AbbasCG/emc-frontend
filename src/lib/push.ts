import { registerPushSubscription, removePushSubscription } from '@/api/notificationPreferencesApi'

// Ticket 8 completion pass — Web Push (VAPID) client helpers (Step 6).

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window
}

export function isPushConfigured(): boolean {
  return Boolean(import.meta.env.VITE_VAPID_PUBLIC_KEY)
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  return (await navigator.serviceWorker.getRegistration('/sw.js')) ?? navigator.serviceWorker.register('/sw.js')
}

export async function subscribeToPush(): Promise<boolean> {
  if (!isPushSupported() || !isPushConfigured()) return false

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false

  const registration = await getRegistration()
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY as string) as BufferSource,
  })

  await registerPushSubscription(subscription.toJSON())
  return true
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return

  const registration = await navigator.serviceWorker.getRegistration('/sw.js')
  const subscription = await registration?.pushManager.getSubscription()
  if (!subscription) return

  await removePushSubscription(subscription.endpoint)
  await subscription.unsubscribe()
}
