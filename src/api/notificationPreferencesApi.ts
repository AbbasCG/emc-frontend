import apiClient from './axios'

type BackendPrefRow = {
  id?: number
  user_id?: number
  channel: string
  type: string
  enabled: boolean
}

const silent = { skipErrorToast: true as const }

export async function fetchNotificationPreferences(): Promise<BackendPrefRow[]> {
  try {
    const res = await apiClient.get<unknown>('/notifications/preferences', silent)
    const d = res.data as { data?: BackendPrefRow[] | { data?: BackendPrefRow[] } }
    const inner = d?.data
    if (Array.isArray(inner)) return inner
    if (inner && typeof inner === 'object' && Array.isArray((inner as { data?: unknown[] }).data)) {
      return (inner as { data: BackendPrefRow[] }).data
    }
    return []
  } catch {
    return []
  }
}

export async function updateNotificationPreferences(
  preferences: BackendPrefRow[],
): Promise<void> {
  await apiClient.patch('/notifications/preferences', { preferences }, silent)
}

/* ── Quiet hours (Ticket 8 completion pass) ─────────────────────────────── */

export type QuietHoursSettings = {
  enabled: boolean
  start_time: string | null
  end_time: string | null
  timezone: string
}

export async function fetchQuietHours(): Promise<QuietHoursSettings> {
  const res = await apiClient.get<{ success: boolean; data: QuietHoursSettings }>('/notifications/quiet-hours', silent)
  return res.data.data
}

export async function updateQuietHours(settings: QuietHoursSettings): Promise<void> {
  await apiClient.put('/notifications/quiet-hours', settings)
}

/* ── Push subscription (Ticket 8 completion pass) ───────────────────────── */

export async function fetchPushSubscriptionState(): Promise<boolean> {
  try {
    const res = await apiClient.get<{ success: boolean; subscribed: boolean }>('/push-subscriptions', silent)
    return res.data.subscribed
  } catch {
    return false
  }
}

export async function registerPushSubscription(subscription: PushSubscriptionJSON): Promise<void> {
  await apiClient.post('/push-subscriptions', {
    endpoint: subscription.endpoint,
    keys: { p256dh: subscription.keys?.p256dh, auth: subscription.keys?.auth },
  })
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  await apiClient.delete('/push-subscriptions', { data: { endpoint } })
}
