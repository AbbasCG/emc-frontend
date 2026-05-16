import apiClient from './axios'
import { asList } from './lmsApi'
import { seedNotifications } from '@/data/platformSeed'
import type { PlatformNotification } from '@/types/platform'

const silent = { skipErrorToast: true }

export async function fetchNotifications(): Promise<PlatformNotification[]> {
  try {
    const res = await apiClient.get<unknown>('/notifications', silent)
    return asList<PlatformNotification>(res.data)
  } catch {
    return seedNotifications()
  }
}

export async function markNotificationRead(id: number): Promise<void> {
  try {
    await apiClient.patch(`/notifications/${id}/read`, undefined, silent)
  } catch {
    /* offline — UI still updates locally */
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  try {
    await apiClient.post('/notifications/read-all', undefined, silent)
  } catch {
    /* offline */
  }
}
