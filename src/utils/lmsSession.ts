import type { LmsSession, LmsSessionStatus } from '@/types/lms'
import { formatDate, formatDateTime, formatRelativeDate } from '@/utils/dateTime'
import { unwrapData } from '@/api/unwrap'

export function normalizeSessionStatus(raw: unknown): LmsSessionStatus {
  const s = String(raw ?? '').toLowerCase()
  if (s.includes('complete') || s.includes('ended') || s.includes('past')) return 'completed'
  if (s.includes('cancel')) return 'cancelled'
  if (s.includes('live') || s.includes('ongoing') || s.includes('in_progress')) return 'live'
  return 'scheduled'
}

/** Infer live/completed from timestamps when API status is stale. */
export function enrichSessionTiming(session: LmsSession, now = Date.now()): LmsSession {
  if (session.status === 'cancelled') return session

  const startRaw = session.starts_at ?? (session.date ? `${String(session.date).slice(0, 10)}T${session.time ?? '00:00'}` : null)
  if (!startRaw) return session

  const startMs = Date.parse(startRaw)
  if (Number.isNaN(startMs)) return session

  const endRaw = session.ends_at
  const endMs = endRaw ? Date.parse(endRaw) : NaN
  const effectiveEnd = Number.isFinite(endMs) ? endMs : startMs + 90 * 60_000

  if (now >= effectiveEnd) return { ...session, status: 'completed' }
  if (now >= startMs && now < effectiveEnd) return { ...session, status: 'live' }
  return session.status === 'completed' ? session : { ...session, status: 'scheduled' }
}

export function normalizeLmsSessionRow(raw: unknown): LmsSession | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const nested =
    o.course && typeof o.course === 'object' && !Array.isArray(o.course) ? (o.course as Record<string, unknown>) : null
  const id = Number(o.id ?? o.session_id ?? o.lms_session_id ?? o.course_session_id)
  if (!Number.isFinite(id) || id <= 0) return null

  const cidRaw = o.course_id ?? nested?.id
  const course_id = cidRaw != null && cidRaw !== '' && Number.isFinite(Number(cidRaw)) ? Number(cidRaw) : null
  const course_name = String(o.course_name ?? nested?.title ?? o.title ?? 'دورة')
  const course_slug =
    o.course_slug != null && String(o.course_slug).trim() !== '' ?
      String(o.course_slug)
    : nested?.slug != null && String(nested.slug).trim() !== '' ?
      String(nested.slug)
    : null

  const typeRaw = String(o.type ?? o.location_type ?? '').toLowerCase()
  const type = typeRaw.includes('offline') || typeRaw.includes('حضور') ? 'offline' : typeRaw.includes('online') || typeRaw.includes('أون') ? 'online' : undefined

  const starts_at =
    o.starts_at != null ? String(o.starts_at)
    : o.start_at != null ? String(o.start_at)
    : o.scheduled_at != null ? String(o.scheduled_at)
    : null

  const session: LmsSession = {
    id,
    course_id,
    title: o.title != null ? String(o.title) : o.session_title != null ? String(o.session_title) : null,
    course_name,
    course_slug,
    starts_at,
    ends_at:
      o.ends_at != null ? String(o.ends_at)
      : o.end_at != null ? String(o.end_at)
      : null,
    date: o.date != null ? String(o.date) : null,
    time: o.time != null ? String(o.time) : null,
    status: normalizeSessionStatus(o.status),
    type,
    instructor_name:
      o.instructor_name != null ? String(o.instructor_name)
      : nested?.instructor_name != null ? String(nested.instructor_name)
      : null,
    location: o.location != null ? String(o.location) : null,
    meeting_link:
      o.meeting_link != null ? String(o.meeting_link)
      : o.meeting_url != null ? String(o.meeting_url)
      : o.zoom_link != null ? String(o.zoom_link)
      : null,
    recording_link:
      o.recording_link != null ? String(o.recording_link)
      : o.recording_url != null ? String(o.recording_url)
      : null,
    platform: o.platform != null ? String(o.platform) : null,
  }

  return enrichSessionTiming(session)
}

function normalizeList(arr: unknown[]): LmsSession[] {
  return arr.map(normalizeLmsSessionRow).filter((x): x is LmsSession => x != null)
}

function dedupeSessions(sessions: LmsSession[]): LmsSession[] {
  const seen = new Set<number>()
  return sessions.filter((s) => {
    if (seen.has(s.id)) return false
    seen.add(s.id)
    return true
  })
}

function collectArrays(obj: Record<string, unknown>, keys: string[]): unknown[] {
  const out: unknown[] = []
  for (const k of keys) {
    const v = obj[k]
    if (Array.isArray(v)) out.push(...v)
  }
  return out
}

/**
 * Parse instructor/student sessions API payloads.
 * Merges `sessions`, `lms_sessions`, and `course_sessions` when present.
 */
export function parseSessionsPayload(payload: unknown): LmsSession[] {
  const topLevel = payload != null && typeof payload === 'object' && !Array.isArray(payload)
    ? (payload as Record<string, unknown>)
    : {}
  const raw = unwrapData<unknown>(payload)

  const extraKeys = ['course_sessions', 'lms_sessions', 'planned_sessions', 'class_sessions']
  const extra = collectArrays(topLevel, extraKeys)
  if (raw != null && typeof raw === 'object' && !Array.isArray(raw)) {
    extra.push(...collectArrays(raw as Record<string, unknown>, extraKeys))
  }

  let sessions: LmsSession[] = []

  if (Array.isArray(raw)) {
    sessions = normalizeList(raw)
  } else if (raw != null && typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>
    const upcomingRaw = obj.upcoming ?? obj.upcoming_sessions ?? obj.scheduled_sessions
    const completedRaw = obj.completed ?? obj.completed_sessions ?? obj.past_sessions
    const flatRaw = obj.sessions ?? obj.data

    const parts: unknown[] = []
    if (Array.isArray(upcomingRaw)) parts.push(...upcomingRaw)
    if (Array.isArray(completedRaw)) parts.push(...completedRaw)
    if (Array.isArray(flatRaw)) parts.push(...flatRaw)
    if (parts.length === 0) {
      for (const k of ['sessions', 'data', 'items', 'upcoming_sessions']) {
        const v = obj[k]
        if (Array.isArray(v)) parts.push(...v)
      }
    }
    sessions = normalizeList(parts)
  }

  if (sessions.length === 0) {
    const flat = collectArrays(topLevel, ['sessions', 'data', 'items', 'upcoming_sessions'])
    sessions = normalizeList(flat)
  }

  const merged = dedupeSessions([...sessions, ...normalizeList(extra)])
  return merged.sort((a, b) => {
    const ta = Date.parse(a.starts_at ?? a.date ?? '') || 0
    const tb = Date.parse(b.starts_at ?? b.date ?? '') || 0
    return ta - tb
  })
}

/** Human-readable schedule line — never raw ISO. */
export function formatSessionSchedule(session: LmsSession): string {
  if (session.starts_at) {
    const rel = formatRelativeDate(session.starts_at)
    if (rel.startsWith('اليوم') || rel.startsWith('أمس') || rel.startsWith('منذ')) return rel
    return formatDateTime(session.starts_at)
  }
  if (session.date && session.time) {
    const d = formatDate(session.date)
    const t = session.time.includes('T') ? formatDateTime(session.time).split('، ')[1] ?? session.time : session.time
    return `${d}، ${t}`
  }
  if (session.date) return formatDate(session.date)
  return '—'
}

export function formatSessionPickerLabel(session: LmsSession): string {
  const title = session.title ?? session.course_name
  const when = formatSessionSchedule(session)
  return `${title} · ${when}`
}

export const SESSION_STATUS_AR: Record<LmsSessionStatus, string> = {
  scheduled: 'قادمة',
  live: 'مباشرة الآن',
  completed: 'انتهت',
  cancelled: 'ملغاة',
}

const JOIN_WINDOW_MS = 15 * 60_000

export type SessionJoinState =
  | { kind: 'cancelled'; label: string }
  | { kind: 'ended'; label: string }
  | { kind: 'waiting'; label: string }
  | { kind: 'offline'; label: string }
  | { kind: 'no_link'; label: string }
  | { kind: 'join'; label: string; href: string }

function sessionStartMs(session: LmsSession): number {
  const raw =
    session.starts_at ??
    (session.date && String(session.date).trim() !== '' ?
      `${String(session.date).slice(0, 10)}T${session.time ?? '00:00'}`
    : null)
  if (!raw) return NaN
  const ms = Date.parse(raw)
  return Number.isNaN(ms) ? NaN : ms
}

function sessionEndMs(session: LmsSession, startMs: number): number {
  if (session.ends_at) {
    const ms = Date.parse(session.ends_at)
    if (!Number.isNaN(ms)) return ms
  }
  return Number.isFinite(startMs) ? startMs + 90 * 60_000 : NaN
}

/** Meeting link CTA rules for student/instructor session cards. */
export function getSessionJoinState(
  session: LmsSession,
  now = Date.now(),
  joinLabel = 'انضم للجلسة',
): SessionJoinState {
  if (session.status === 'cancelled') {
    return { kind: 'cancelled', label: 'تم إلغاء الجلسة' }
  }

  const startMs = sessionStartMs(session)
  const endMs = sessionEndMs(session, startMs)

  if (session.status === 'completed' || (Number.isFinite(endMs) && now >= endMs)) {
    return { kind: 'ended', label: 'انتهت الجلسة' }
  }

  if (session.type === 'offline') {
    return { kind: 'offline', label: session.location?.trim() || 'جلسة حضورية' }
  }

  const link = session.meeting_link?.trim()
  const windowStart = Number.isFinite(startMs) ? startMs - JOIN_WINDOW_MS : NaN

  if (!link) {
    if (!Number.isFinite(startMs)) {
      return { kind: 'no_link', label: 'سيتم إشعارك عند تحديد الموعد' }
    }
    if (Number.isFinite(windowStart) && now < windowStart) {
      return { kind: 'waiting', label: 'الرابط سيتاح قبل الموعد' }
    }
    return { kind: 'no_link', label: 'سيتم إشعارك عند تحديد الموعد' }
  }

  if (Number.isFinite(windowStart) && now < windowStart) {
    return { kind: 'waiting', label: 'الرابط سيتاح قبل الموعد' }
  }

  return { kind: 'join', label: joinLabel, href: link }
}
