import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

// Ticket 8 completion pass — realtime notification delivery (Step 7).
// Lazily created only when a caller actually subscribes (subscribeToUserNotifications),
// and only when VITE_REVERB_APP_KEY is configured — otherwise realtime is simply
// unavailable and callers fall back to the pre-existing polling refresh, exactly
// as required ("graceful fallback to REST polling when realtime is unavailable").

declare global {
  interface Window {
    Pusher: typeof Pusher
  }
}

let echoInstance: Echo<'reverb'> | null | undefined

function tokenKey() {
  return 'emc_token'
}

export function isRealtimeConfigured(): boolean {
  return Boolean(import.meta.env.VITE_REVERB_APP_KEY)
}

export function getEcho(): Echo<'reverb'> | null {
  if (echoInstance !== undefined) return echoInstance
  if (!isRealtimeConfigured()) {
    echoInstance = null
    return null
  }

  window.Pusher = Pusher

  const apiBaseUrl = (import.meta.env.VITE_API_URL ?? import.meta.env.VITE_API_BASE_URL ?? '') as string
  const authEndpoint = `${apiBaseUrl.replace(/\/$/, '')}/broadcasting/auth`

  echoInstance = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY as string,
    wsHost: import.meta.env.VITE_REVERB_HOST as string,
    wsPort: Number(import.meta.env.VITE_REVERB_PORT ?? 80),
    wssPort: Number(import.meta.env.VITE_REVERB_PORT ?? 443),
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME as string) === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint,
    auth: {
      headers: {
        Authorization: `Bearer ${localStorage.getItem(tokenKey()) ?? ''}`,
        Accept: 'application/json',
      },
    },
  })

  return echoInstance
}

export type RealtimeNotificationPayload = {
  id: number
  type: string
  title: string
  message: string
  action_url: string | null
  meta_url: string | null
  icon: string | null
  color: string | null
  pinned: boolean
  created_at: string | null
}

/**
 * Subscribes to the authenticated user's private notification channel.
 * Returns an unsubscribe function — always call it on unmount/logout to
 * avoid leaking a socket subscription across users on the same tab.
 * Returns a no-op unsubscribe (and never connects) when realtime isn't
 * configured, so callers don't need to branch on isRealtimeConfigured()
 * themselves.
 */
export function subscribeToUserNotifications(
  userId: number,
  onCreated: (notification: RealtimeNotificationPayload) => void,
): () => void {
  const echo = getEcho()
  if (!echo) return () => {}

  const channel = echo.private(`notifications.${userId}`)
  channel.listen('.notification.created', onCreated)

  return () => {
    echo.leave(`notifications.${userId}`)
  }
}

export function disconnectEcho(): void {
  echoInstance?.disconnect()
  echoInstance = undefined
}
