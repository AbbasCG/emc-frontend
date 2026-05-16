import apiClient from './axios'
import { unwrapData } from './unwrap'
import type { NotificationPreferenceRow } from '@/types/phase7'
import { seedNotificationPreferences } from '@/data/phase7Seed'

function normalizePreferences(payload: unknown): NotificationPreferenceRow[] | null {
  const inner = unwrapData<{ preferences?: NotificationPreferenceRow[] } | NotificationPreferenceRow[]>(
    payload,
  )
  if (Array.isArray(inner)) return inner as NotificationPreferenceRow[]
  if (inner && typeof inner === 'object' && Array.isArray((inner as { preferences: NotificationPreferenceRow[] }).preferences)) {
    return (inner as { preferences: NotificationPreferenceRow[] }).preferences
  }
  return null
}

const silent = { skipErrorToast: true }

export async function fetchNotificationPreferences(): Promise<NotificationPreferenceRow[]> {
  try {
    const res = await apiClient.get<unknown>('/notifications/preferences', silent)
    return normalizePreferences(res.data) ?? seedNotificationPreferences()
  } catch {
    return seedNotificationPreferences()
  }
}

export async function updateNotificationPreferences(
  preferences: NotificationPreferenceRow[],
): Promise<NotificationPreferenceRow[]> {
  try {
    const res = await apiClient.patch<unknown>('/notifications/preferences', { preferences }, silent)
    return normalizePreferences(res.data) ?? preferences
  } catch {
    return preferences
  }
}
