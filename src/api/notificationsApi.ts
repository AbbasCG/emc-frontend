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
  const s = String(raw ?? 'registration').toLowerCase().replace(/-/g, '_')
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
    'volunteer_request',
    'course_update',
    'instructor_assigned',
    'schedule_update',
    'placement_result',
    'placement_test_completed',
    'oral_assessment_booked',
    'assignment_graded',
    'assignment_submitted',
    'assignment_created',
    'session_scheduled',
    'attendance_marked',
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

  const type = String(typeRaw ?? '').toLowerCase().replace(/-/g, '_')
  const entity = String(raw.entity_type ?? raw.resource_type ?? '').toLowerCase()
  const eid = Number(raw.entity_id ?? raw.resource_id ?? raw.course_id)

  if (type === 'assignment_graded' && Number.isFinite(eid)) {
    return normalizeNotificationInternalPath(`/dashboard/student/assignments/${eid}`)
  }
  if (type === 'assignment_submitted' && Number.isFinite(eid)) {
    return normalizeNotificationInternalPath(`/dashboard/instructor/submissions/${eid}`)
  }
  if (type === 'certificate_issued') {
    return normalizeNotificationInternalPath('/dashboard/certificates')
  }
  if (type === 'session_scheduled' || type === 'session_reminder') {
    return normalizeNotificationInternalPath('/dashboard/student/sessions')
  }
  if (type === 'attendance_marked') {
    return normalizeNotificationInternalPath('/dashboard/student/attendance')
  }
  if (type === 'assignment_created') {
    return normalizeNotificationInternalPath('/dashboard/student/assignments')
  }

  const slug = slugEarly
  if (slug) {
    return normalizeNotificationInternalPath(`/courses/${encodeURIComponent(slug)}`)
  }

  if (entity.includes('assignment_submission') && Number.isFinite(eid)) {
    if (type.includes('submit')) {
      return normalizeNotificationInternalPath(`/dashboard/instructor/submissions/${eid}`)
    }
    return normalizeNotificationInternalPath(`/dashboard/student/assignments/${eid}`)
  }
  if (entity.includes('certificate') && Number.isFinite(eid)) {
    return normalizeNotificationInternalPath('/dashboard/certificates')
  }
  if (entity.includes('course') && Number.isFinite(eid)) {
    return normalizeNotificationInternalPath('/dashboard/student/courses')
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

/**
 * Reformat raw ISO datetime strings embedded in notification body text.
 * Old notifications may contain "— الموعد: 2026-06-18T21:00:00+00:00" or garbled
 * variants. Replace valid ISO patterns with Arabic Amsterdam-local time; remove
 * unrecoverable garbled patterns rather than show broken text.
 */
/**
 * Only reformat raw ISO datetime strings embedded in old notification bodies.
 * The regex specifically targets ISO 8601 patterns (YYYY-MM-DDTHH:…) so that
 * already-formatted Arabic dates like "10 يوليو 2026، 09:00" pass through
 * completely untouched. Without this guard the old \S+ pattern would capture
 * only the leading digit ("10"), fail to parse it, and strip it — leaving
 * "يوليو 2026، 09:00" as orphaned text with the wrong day gone.
 */
function sanitizeNotificationBody(body: string): string {
 return body.replace(/\s*الموعد:\s*(\d{4}-\d{2}-\d{2}T[^\s،"]+)/g, (_match, raw: string) => {
    const d = new Date(raw)
    if (!Number.isNaN(d.getTime())) {
      try {
        const formatted = new Intl.DateTimeFormat('ar', {
          timeZone: 'Europe/Amsterdam',
          numberingSystem: 'latn',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(d)
        return ` الموعد: ${formatted}`
      } catch {
        return ''
      }
    }
    return ''
  })
}

/** Defense-in-depth: only ever treat http(s) URLs as clickable — the
 *  backend already validates this, but never trust a link at render time. */
function safeExternalUrl(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? url : null
  } catch {
    return null
  }
}

export function normalizePlatformNotification(raw: unknown): PlatformNotification | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const id = Number(o.id)
  if (!Number.isFinite(id)) return null
  const title = trimStr(o.title) ?? 'إشعار'
  const rawBody = trimStr(o.body ?? o.message ?? o.content)
  const body = rawBody ? sanitizeNotificationBody(rawBody) : rawBody
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
    meta_url: safeExternalUrl(trimStr(o.meta_url)),
    entity_type: trimStr(o.entity_type ?? o.resource_type),
    entity_id:
      o.entity_id != null && Number.isFinite(Number(o.entity_id)) ?
        Number(o.entity_id)
      : o.course_id != null && Number.isFinite(Number(o.course_id)) ?
        Number(o.course_id)
      : null,
    // Backend booleans/nulls preserved as-is — never truthy-coerced (false and null are valid states, not "missing").
    pinned: o.pinned === true,
    archived_at: trimStr(o.archived_at),
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
    await apiClient.put(`/notifications/${id}/read`, undefined, silent)
  } catch {
    /* ignore — fire and forget */
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

/* ══════════════════════════════════════════════════════════════════
   Notification Center filtered/paginated fetch + pin/archive/bulk.
   Additive to the functions above (which remain used as-is by the
   notification bell/drawer/dashboard hook unchanged signatures).
══════════════════════════════════════════════════════════════════ */

export type NotificationArchivedFilter = '0' | '1' | 'all'

export type NotificationFilters = {
  search?: string
  archived?: NotificationArchivedFilter
  unread_only?: boolean
  pinned_only?: boolean
  page?: number
}

export type NotificationsPageMeta = {
  total: number
  current_page: number
  last_page: number
  per_page: number
}

export type NotificationsPageResult = {
  data: PlatformNotification[]
  unread_count: number
  meta: NotificationsPageMeta
}

export type BulkNotificationAction = 'read' | 'unread' | 'archive' | 'unarchive' | 'pin' | 'unpin' | 'delete'

/**
 * Filtered/paginated fetch — filters are sent to the backend (never
 * reproduced client-side); the backend controls ordering (pinned-first)
 * and pagination metadata, both used as-is here.
 */
export async function fetchNotificationsPage(filters: NotificationFilters = {}): Promise<NotificationsPageResult> {
  const params: Record<string, string | number> = {}
  if (filters.search) params.search = filters.search
  if (filters.archived) params.archived = filters.archived
  if (filters.unread_only) params.unread_only = 1
  if (filters.pinned_only) params.pinned_only = 1
  if (filters.page) params.page = filters.page

  const res = await apiClient.get<{ success: boolean; unread_count: number; data: unknown[]; meta: NotificationsPageMeta }>(
    '/notifications',
    { params, ...silent },
  )
  const normalized = (res.data.data ?? [])
    .map(normalizePlatformNotification)
    .filter((x): x is PlatformNotification => x != null)

  return {
    data: normalized,
    unread_count: res.data.unread_count ?? 0,
    meta: res.data.meta ?? { total: normalized.length, current_page: 1, last_page: 1, per_page: normalized.length },
  }
}

export async function pinNotification(id: number): Promise<void> {
  await apiClient.put(`/notifications/${id}/pin`, undefined, silent)
}

export async function unpinNotification(id: number): Promise<void> {
  await apiClient.put(`/notifications/${id}/unpin`, undefined, silent)
}

export async function archiveNotification(id: number): Promise<void> {
  await apiClient.put(`/notifications/${id}/archive`, undefined, silent)
}

export async function unarchiveNotification(id: number): Promise<void> {
  await apiClient.put(`/notifications/${id}/unarchive`, undefined, silent)
}

/** No dedicated single-item "mark unread" route exists — reuses the bulk endpoint with one ID. */
export async function markNotificationUnread(id: number): Promise<void> {
  await bulkUpdateNotifications([id], 'unread')
}

export async function bulkUpdateNotifications(ids: number[], action: BulkNotificationAction): Promise<number> {
  const res = await apiClient.post<{ success: boolean; affected: number }>('/notifications/bulk', { ids, action })
  return res.data.affected ?? 0
}
