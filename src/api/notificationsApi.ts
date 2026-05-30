import axios from 'axios'
import apiClient from './axios'
import { unwrapData } from './unwrap'
import type { NotificationType, PlatformNotification } from '@/types/platform'
import { normalizeNotificationInternalPath } from '@/utils/notificationRoutes'

const silent = { skipErrorToast: true }

/** Layout + pages listen — refetch unread list after registration or read actions */
export const NOTIFICATIONS_REFRESH_EVENT = 'emc-notifications-refresh' as const

export function notifyNotificationsRefresh(): void {
  try {
    window.dispatchEvent(new CustomEvent(NOTIFICATIONS_REFRESH_EVENT))
  } catch {
    /* ignore */
  }
}

function trimStr(v: unknown): string | null {
  if (v == null || v === false) return null
  const s = String(v).trim()
  return s === '' ? null : s
}

function coalesceType(raw: unknown): NotificationType {
  const s = String(raw ?? 'registration').toLowerCase()
  const allowed: NotificationType[] = [
    'registration',
    'course_registration',
    'payment',
    'session_reminder',
    'assignment_due',
    'certificate_issued',
    'task_assigned',
    'meeting_invite',
    'support_reply',
    'partner_update',
  ]
  return (allowed.includes(s as NotificationType) ? s : 'registration') as NotificationType
}

function parsePayloadObject(raw: unknown): Record<string, unknown> | null {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>
  if (typeof raw === 'string') {
    try {
      const j = JSON.parse(raw) as unknown
      return j && typeof j === 'object' && !Array.isArray(j) ? (j as Record<string, unknown>) : null
    } catch {
      return null
    }
  }
  return null
}

function slugFromNotificationPayload(raw: Record<string, unknown>): string | null {
  const flat =
    trimStr(raw.course_slug) ??
    trimStr(raw.slug) ??
    trimStr(raw.courseSlug)
  if (flat) return flat
  const courseObj =
    raw.course && typeof raw.course === 'object' && !Array.isArray(raw.course) ?
      (raw.course as Record<string, unknown>)
    : null
  const fromCourse = courseObj ? trimStr(courseObj.slug) : null
  if (fromCourse) return fromCourse
  const dataObj = parsePayloadObject(raw.data ?? raw.payload ?? raw.meta)
  if (!dataObj) return null
  return (
    trimStr(dataObj.course_slug) ??
    trimStr(dataObj.slug) ??
    (dataObj.course && typeof dataObj.course === 'object' && !Array.isArray(dataObj.course) ?
      trimStr((dataObj.course as Record<string, unknown>).slug)
    : null)
  )
}

function wantsCoursePublicPage(typeRaw: unknown): boolean {
  const s = String(typeRaw ?? '').toLowerCase().replace(/-/g, '_')
  return (
    s.includes('course_registration') ||
    s.includes('registration_created') ||
    s.includes('course_register')
  )
}

/** Turn action_url / entity_* into an in-app path when possible */
function resolveHref(raw: Record<string, unknown>): string | null {
  const typeRaw = raw.type ?? raw.category ?? raw.kind

  const slugEarly = slugFromNotificationPayload(raw)
  const preferCoursePage = wantsCoursePublicPage(typeRaw)
  const actionStr = trimStr(raw.href ?? raw.action_url ?? raw.url ?? raw.link)
  const actionLooksLikeRegDetail =
    actionStr != null && /\/student\/registrations\/\d+/iu.test(actionStr)

  if (preferCoursePage || actionLooksLikeRegDetail) {
    const slug = slugEarly
    if (slug) return normalizeNotificationInternalPath(`/courses/${encodeURIComponent(slug)}`)
  }

  const direct = trimStr(raw.href ?? raw.action_url ?? raw.url ?? raw.link)
  if (direct?.startsWith('/')) {
    return normalizeNotificationInternalPath(direct)
  }
  if (direct && /^https?:\/\//iu.test(direct)) {
    try {
      const u = new URL(direct)
      return normalizeNotificationInternalPath(`${u.pathname}${u.search}`)
    } catch {
      return null
    }
  }
  const slug = slugEarly
  if (slug) {
    return normalizeNotificationInternalPath(`/courses/${encodeURIComponent(slug)}`)
  }

  const entity = String(raw.entity_type ?? raw.resource_type ?? '').toLowerCase()
  const eid = Number(raw.entity_id ?? raw.resource_id ?? raw.course_id)
  if (entity.includes('course') && Number.isFinite(eid)) {
    return normalizeNotificationInternalPath('/dashboard/student/courses')
  }
  if (entity.includes('certificate') && Number.isFinite(eid)) {
    return normalizeNotificationInternalPath('/dashboard/certificates')
  }
  return null
}

function resolveReadAt(raw: Record<string, unknown>): string | null {
  const explicit = trimStr(raw.read_at ?? raw.readAt)
  if (explicit) return explicit
  const ir = raw.is_read ?? raw.read
  if (ir === true || ir === 1 || ir === '1' || String(ir).toLowerCase() === 'true') {
    return trimStr(raw.updated_at) ?? new Date().toISOString()
  }
  if (ir === false || ir === 0 || ir === '0' || String(ir).toLowerCase() === 'false') return null
  return null
}

export function normalizePlatformNotification(raw: unknown): PlatformNotification | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const id = Number(o.id)
  if (!Number.isFinite(id)) return null
  const title = trimStr(o.title) ?? 'إشعار'
  const body = trimStr(o.body ?? o.message ?? o.content)
  const created_at = trimStr(o.created_at ?? o.createdAt) ?? new Date().toISOString()
  const read_at = resolveReadAt(o)
  const type = coalesceType(o.type ?? o.category ?? o.kind)
  const href = resolveHref(o)

  return {
    id,
    type,
    title,
    body,
    message: body,
    is_read: read_at != null && String(read_at).trim() !== '',
    read_at,
    created_at,
    href,
    action_url: trimStr(o.action_url),
    entity_type: trimStr(o.entity_type ?? o.resource_type),
    entity_id:
      o.entity_id != null && Number.isFinite(Number(o.entity_id)) ?
        Number(o.entity_id)
      : o.course_id != null && Number.isFinite(Number(o.course_id)) ?
        Number(o.course_id)
      : null,
  }
}

function dedupeNotifications(list: PlatformNotification[]): PlatformNotification[] {
  const map = new Map<number, PlatformNotification>()
  for (const n of list) {
    if (!map.has(n.id)) map.set(n.id, n)
  }
  return [...map.values()].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
}

export function isNotificationUnread(n: PlatformNotification): boolean {
  return n.read_at == null || String(n.read_at).trim() === ''
}

export async function fetchNotifications(): Promise<PlatformNotification[]> {
  try {
    const res = await apiClient.get<unknown>('/notifications', silent)
    const inner = unwrapData<unknown>(res.data)
    const rawList: unknown[] =
      Array.isArray(inner) ? inner
      : Array.isArray((inner as { data?: unknown })?.data) ? (inner as { data: unknown[] }).data
      : []
    const normalized = rawList
      .map(normalizePlatformNotification)
      .filter((x): x is PlatformNotification => x != null)
    return dedupeNotifications(normalized)
  } catch {
    return []
  }
}

export async function markNotificationRead(id: number): Promise<void> {
  try {
    await apiClient.post(`/notifications/${id}/read`, undefined, silent)
    return
  } catch (first) {
    if (!axios.isAxiosError(first)) return
    if (first.response?.status !== 404 && first.response?.status !== 405) return
    try {
      await apiClient.patch(`/notifications/${id}/read`, undefined, silent)
    } catch {
      /* ignore */
    }
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  try {
    await apiClient.post('/notifications/read-all', undefined, silent)
  } catch {
    /* ignore */
  }
}

export async function deleteNotification(id: number): Promise<void> {
  try {
    await apiClient.delete(`/notifications/${id}`, silent)
  } catch {
    /* optional */
  }
}
