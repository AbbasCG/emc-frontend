import apiClient from './axios'
import { unwrapData } from './unwrap'
import type {
  LmsMaterial,
  LmsSession,
  StudentAssignment,
  StudentLmsDashboard,
  StudentProgressPayload,
} from '../types/lms'
import { asList } from './lmsApi'

function toFiniteNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

/** First keyed property on `record` that is an array (supports alternate API names). */
function firstArray(record: Record<string, unknown>, keys: readonly string[]): unknown[] {
  for (const k of keys) {
    const v = record[k]
    if (Array.isArray(v)) return v
  }
  return []
}

function pickCoursesForProgress(root: Record<string, unknown>): unknown[] {
  let from = firstArray(root, ['course_progress', 'courses'])
  if (from.length) return from

  const progress = root.progress
  if (progress && typeof progress === 'object' && !Array.isArray(progress)) {
    from = firstArray(progress as Record<string, unknown>, ['course_progress', 'courses', 'items'])
    if (from.length) return from
  }

  const inner = root.data
  if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
    from = firstArray(inner as Record<string, unknown>, ['course_progress', 'courses'])
    if (from.length) return from
  }

  return []
}

function pickTracksForProgress(root: Record<string, unknown>): unknown[] {
  let from = firstArray(root, ['track_progress', 'tracks'])
  if (from.length) return from

  const progress = root.progress
  if (progress && typeof progress === 'object' && !Array.isArray(progress)) {
    from = firstArray(progress as Record<string, unknown>, ['track_progress', 'tracks'])
    if (from.length) return from
  }

  return []
}

function pickNestedProgress(row: Record<string, unknown>): Record<string, unknown> | null {
  const progress = row.progress
  return progress && typeof progress === 'object' && !Array.isArray(progress) ? (progress as Record<string, unknown>) : null
}

function pickScalarWithNested(
  row: Record<string, unknown>,
  keys: readonly string[],
  nested: Record<string, unknown> | null,
): number {
  for (const k of keys) {
    if (row[k] != null && row[k] !== '') return toFiniteNumber(row[k])
  }
  if (nested) {
    for (const k of keys) {
      if (nested[k] != null && nested[k] !== '') return toFiniteNumber(nested[k])
    }
  }
  return 0
}

function normalizeCourseProgressRow(x: unknown): StudentProgressPayload['course_progress'][number] | null {
  if (!x || typeof x !== 'object') return null
  const o = x as Record<string, unknown>
  const course_id = Number(o.course_id ?? o.id)
  if (!Number.isFinite(course_id)) return null
  return {
    course_id,
    course_title: String(o.course_title ?? o.title ?? 'دورة'),
    slug: o.slug != null && String(o.slug).trim() !== '' ? String(o.slug) : undefined,
    progress_percent: toFiniteNumber(o.progress_percent ?? o.progress ?? o.percent),
    sessions_completed: Math.max(0, Math.floor(toFiniteNumber(o.sessions_completed ?? o.completed_sessions))),
    sessions_total: Math.max(0, Math.floor(toFiniteNumber(o.sessions_total ?? o.total_sessions))),
    assignments_done: Math.max(0, Math.floor(toFiniteNumber(o.assignments_done ?? o.completed_assignments))),
    assignments_total: Math.max(0, Math.floor(toFiniteNumber(o.assignments_total ?? o.total_assignments))),
  }
}

function normalizeTrackProgressRow(
  x: unknown,
): NonNullable<StudentProgressPayload['track_progress']>[number] | null {
  if (!x || typeof x !== 'object') return null
  const o = x as Record<string, unknown>
  const track_id = Number(o.track_id ?? o.id)
  if (!Number.isFinite(track_id)) return null
  return {
    track_id,
    title: String(o.title ?? ''),
    progress_percent: toFiniteNumber(o.progress_percent ?? o.percent),
  }
}

/**
 * Normalizes GET /student/progress — missing `course_progress`, nested `progress`, or alternate keys never yield undefined arrays.
 */
export function normalizeStudentProgressPayload(payload: unknown): StudentProgressPayload {
  const unwrapped = unwrapData<unknown>(payload)
  if (unwrapped == null || typeof unwrapped !== 'object') {
    return {
      course_progress: [],
      attendance_percent: 0,
      overall_assignment_completion: 0,
    }
  }

  const row = unwrapped as Record<string, unknown>
  const nested = pickNestedProgress(row)

  const course_progress = pickCoursesForProgress(row)
    .map(normalizeCourseProgressRow)
    .filter((c): c is NonNullable<typeof c> => c != null)

  const tracks = pickTracksForProgress(row)
    .map(normalizeTrackProgressRow)
    .filter((t): t is NonNullable<typeof t> => t != null)

  const attendance_percent = pickScalarWithNested(row, ['attendance_percent', 'attendance'], nested)
  const overall_assignment_completion = pickScalarWithNested(
    row,
    ['overall_assignment_completion', 'assignment_completion', 'assignments_completion_percent'],
    nested,
  )

  return {
    course_progress,
    track_progress: tracks.length > 0 ? tracks : undefined,
    attendance_percent,
    overall_assignment_completion,
  }
}

/**
 * Laravel may omit array fields or use different keys; never return undefined arrays — prevents `.filter`/`.length` crashes.
 */
export function normalizeStudentLmsDashboard(payload: unknown): StudentLmsDashboard {
  const unwrapped = unwrapData<unknown>(payload)
  if (unwrapped == null || typeof unwrapped !== 'object') {
    return {
      progress_percent: 0,
      attendance_percent: 0,
      pending_assignments: [],
      current_courses: [],
      upcoming_sessions: [],
      notifications: [],
    }
  }

  const row = unwrapped as Record<string, unknown>
  const certs = firstArray(row, ['certificates_placeholder', 'certificates'])

  const certificateObjects =
    certs.length > 0 ?
      (certs as { label: string; note?: string }[]).filter(
        (x) => x && typeof x === 'object' && typeof x.label === 'string',
      )
    : []

  const notifications = firstArray(row, ['notifications'])

  const upcomingRaw = firstArray(row, ['upcoming_sessions', 'sessions', 'upcoming'])

  return {
    progress_percent: toFiniteNumber(row.progress_percent),
    attendance_percent: toFiniteNumber(row.attendance_percent),
    pending_assignments: firstArray(row, ['pending_assignments', 'assignments']) as StudentAssignment[],
    current_courses: firstArray(row, ['current_courses', 'courses', 'active_courses']) as StudentLmsDashboard['current_courses'],
    upcoming_sessions: upcomingRaw as LmsSession[],
    completed_sessions: (() => {
      const completed = row.completed_sessions ?? row.completed
      return Array.isArray(completed) ? (completed as LmsSession[]) : undefined
    })(),
    certificates_placeholder:
      certificateObjects.length > 0 ? certificateObjects : undefined,
    notifications: notifications.length > 0 ? (notifications as StudentLmsDashboard['notifications']) : [],
  }
}

export async function fetchStudentLmsDashboard(): Promise<StudentLmsDashboard> {
  const res = await apiClient.get<unknown>('/student/dashboard')
  return normalizeStudentLmsDashboard(res.data)
}

export async function fetchStudentSessions(): Promise<{
  upcoming: LmsSession[]
  completed: LmsSession[]
}> {
  const res = await apiClient.get<unknown>('/student/sessions')
  const raw = unwrapData<unknown>(res.data)
  if (Array.isArray(raw)) {
    const upcoming = raw.filter((s) => s.status !== 'completed')
    const completed = raw.filter((s) => s.status === 'completed')
    return { upcoming, completed }
  }
  if (raw == null || typeof raw !== 'object') {
    return { upcoming: [], completed: [] }
  }
  const obj = raw as Record<string, unknown>
  const upcomingRaw = obj.upcoming ?? obj.upcoming_sessions ?? obj.scheduled_sessions
  const completedRaw = obj.completed ?? obj.completed_sessions
  const upcomingSessions = Array.isArray(upcomingRaw) ? (upcomingRaw as LmsSession[]) : []
  const completedSessions = Array.isArray(completedRaw) ? (completedRaw as LmsSession[]) : []
  const sessionsFlat = Array.isArray(obj.sessions) ? (obj.sessions as LmsSession[]) : []
  if (sessionsFlat.length > 0 && upcomingSessions.length === 0 && completedSessions.length === 0) {
    return {
      upcoming: sessionsFlat.filter((s) => s.status !== 'completed'),
      completed: sessionsFlat.filter((s) => s.status === 'completed'),
    }
  }
  return {
    upcoming: upcomingSessions,
    completed: completedSessions,
  }
}

export async function fetchStudentMaterials(): Promise<LmsMaterial[]> {
  const res = await apiClient.get<unknown>('/student/materials')
  return asList<LmsMaterial>(res.data)
}

export async function fetchStudentAssignments(): Promise<StudentAssignment[]> {
  const res = await apiClient.get<unknown>('/student/assignments')
  return asList<StudentAssignment>(res.data)
}

export async function submitStudentAssignment(
  assignmentId: number,
  payload: FormData | { answer_text?: string; file?: File | null },
): Promise<void> {
  if (payload instanceof FormData) {
    await apiClient.post(`/student/assignments/${assignmentId}/submit`, payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return
  }
  const fd = new FormData()
  if (payload.answer_text) fd.append('answer_text', payload.answer_text)
  if (payload.file) fd.append('file', payload.file)
  await apiClient.post(`/student/assignments/${assignmentId}/submit`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export async function fetchStudentProgress(): Promise<StudentProgressPayload> {
  const res = await apiClient.get<unknown>('/student/progress', { skipErrorToast: true })
  return normalizeStudentProgressPayload(res.data)
}

export type EvaluationPayload = {
  course_id?: number
  registration_id?: number
  overall_rating: number
  content_quality: number
  instructor_quality: number
  organization_quality: number
  comment?: string
}

export async function submitStudentEvaluation(body: EvaluationPayload): Promise<void> {
  await apiClient.post('/student/evaluations', body)
}
