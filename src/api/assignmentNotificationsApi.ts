import axios from 'axios'
import apiClient from './axios'
import { unwrapData } from './unwrap'

/**
 * "A ticket was assigned to you" notifications — two independent types, each with
 * two independent channels. The backend (App\Support\TicketAssignmentNotifications)
 * decides delivery: a channel reaches the assignee only when the administrator has
 * it on AND the assignee has not turned it off.
 */

export const OPERATIONS_TICKET_ASSIGNED = 'operations_ticket_assigned'
export const SUPPORT_TICKET_ASSIGNED = 'ticket_assigned'

export type AssignmentNotificationType = typeof OPERATIONS_TICKET_ASSIGNED | typeof SUPPORT_TICKET_ASSIGNED
export type AssignmentChannel = 'email' | 'in_app'

export const ASSIGNMENT_CHANNELS: AssignmentChannel[] = ['email', 'in_app']
export const ASSIGNMENT_CHANNEL_LABELS: Record<AssignmentChannel, string> = {
  email: 'البريد الإلكتروني',
  in_app: 'داخل المنصة',
}
/** Email keys the assignment panel owns; the generic email list must not show them twice. */
export const ASSIGNMENT_EMAIL_KEYS: string[] = [OPERATIONS_TICKET_ASSIGNED, SUPPORT_TICKET_ASSIGNED]

export interface UserChannelState {
  /** The user's choice (the default, on, when nothing is saved). */
  enabled: boolean
  /** True once the user saved a choice for this channel. */
  customized: boolean
  /** False while the administrator has this channel off for everyone. */
  available: boolean
}

export interface UserAssignmentPreference {
  type: AssignmentNotificationType
  label: string
  description: string
  channels: Record<AssignmentChannel, UserChannelState>
}

export interface AdminAssignmentSetting {
  type: AssignmentNotificationType
  label: string
  description: string
  channels: Record<AssignmentChannel, { enabled: boolean }>
}

export type AssignmentChanges = Partial<Record<AssignmentNotificationType, Partial<Record<AssignmentChannel, boolean>>>>

const silent = { skipErrorToast: true as const }

function typesOf<T>(payload: unknown): T[] {
  const data = unwrapData<{ types?: T[] }>(payload)
  return Array.isArray(data?.types) ? data.types : []
}

/** The backend's Arabic message for a failed request, or a generic one. */
export function assignmentErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    if (!err.response) return 'تعذّر الاتصال بالخادم. تحقّق من الاتصال وحاول مرة أخرى.'
    if (err.response.status === 403) return 'ليست لديك صلاحية لتعديل هذه الإعدادات.'
    const msg = (err.response.data as { message?: unknown } | undefined)?.message
    if (typeof msg === 'string' && msg.trim()) return msg
  }
  return fallback
}

export async function fetchAssignmentPreferences(): Promise<UserAssignmentPreference[]> {
  const res = await apiClient.get<unknown>('/notifications/assignment-preferences', silent)
  return typesOf<UserAssignmentPreference>(res.data)
}

export async function saveAssignmentPreferences(changes: AssignmentChanges): Promise<UserAssignmentPreference[]> {
  const res = await apiClient.put<unknown>('/notifications/assignment-preferences', { preferences: changes }, silent)
  return typesOf<UserAssignmentPreference>(res.data)
}

export async function fetchAdminAssignmentSettings(): Promise<AdminAssignmentSetting[]> {
  const res = await apiClient.get<unknown>('/admin/assignment-notification-settings', silent)
  return typesOf<AdminAssignmentSetting>(res.data)
}

export async function saveAdminAssignmentSettings(changes: AssignmentChanges): Promise<AdminAssignmentSetting[]> {
  const res = await apiClient.put<unknown>('/admin/assignment-notification-settings', { settings: changes }, silent)
  return typesOf<AdminAssignmentSetting>(res.data)
}
