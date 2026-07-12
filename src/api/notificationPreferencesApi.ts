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
