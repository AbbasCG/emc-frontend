import apiClient from './axios'
import { extractCoursesList } from '@/api/coursesApi.public'
import { unwrapData } from './unwrap'
import type {
  LmsMaterial,
  LmsSession,
  StudentAssignment,
  StudentLmsDashboard,
  StudentProgressPayload,
} from '../types/lms'
import type { Course } from '@/types'

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

/** Raw `{ data }` / bare body plus normalized LMS dashboard (one HTTP call). */
export async function fetchStudentLmsDashboardWithEnvelope(): Promise<{
  dashboard: StudentLmsDashboard
  envelope: unknown
}> {
  try {
    const res = await apiClient.get<unknown>('/student/dashboard', { skipErrorToast: true })
    return { dashboard: normalizeStudentLmsDashboard(res.data), envelope: res.data }
  } catch {
    return { dashboard: normalizeStudentLmsDashboard(null), envelope: null }
  }
}

export async function fetchStudentLmsDashboard(): Promise<StudentLmsDashboard> {
  const { dashboard } = await fetchStudentLmsDashboardWithEnvelope()
  return dashboard
}

/** Fired after course registration succeeds so student dashboards refetch registrations. */
export const STUDENT_SCOPE_REFRESH_EVENT = 'emc-student-scope-refresh' as const

export function notifyStudentScopeRefresh(): void {
  try {
    window.dispatchEvent(new CustomEvent(STUDENT_SCOPE_REFRESH_EVENT))
  } catch {
    /* ignore */
  }
}

export function coerceFlexibleList(payload: unknown, keys: string[]): unknown[] {
  const inner = unwrapData<unknown>(payload)
  if (Array.isArray(inner)) return inner
  if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
    const row = inner as Record<string, unknown>
    for (const k of keys) {
      const v = row[k]
      if (Array.isArray(v)) return v
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        const nested = (v as Record<string, unknown>).data
        if (Array.isArray(nested)) return nested
      }
    }
  }
  return []
}

export type StudentListedCourse = {
  id: number
  title: string
  slug?: string | null
  instructor_name?: string | null
  progress_percent?: number
  status?: string
  start_date?: string | null
  start_time?: string | null
  meeting_link?: string | null
}

function slugifyFallback(id: number): string {
  return `course-${id}`
}

function normalizeListedCourse(raw: unknown): StudentListedCourse | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const nested =
    o.course && typeof o.course === 'object' && !Array.isArray(o.course) ? (o.course as Record<string, unknown>) : null
  const id = Number(o.id ?? o.course_id ?? nested?.id)
  if (!Number.isFinite(id)) return null
  const title = String(o.title ?? o.course_title ?? nested?.title ?? slugifyFallback(id))
  const slugRaw = o.slug ?? o.course_slug ?? nested?.slug
  const startRaw = o.start_date ?? nested?.start_date ?? o.course_start_date
  const timeRaw = o.start_time ?? nested?.start_time ?? o.study_time
  const meetRaw = o.meeting_link ?? nested?.meeting_link ?? o.join_url
  return {
    id,
    title,
    slug: slugRaw != null && String(slugRaw).trim() !== '' ? String(slugRaw) : undefined,
    instructor_name:
      nested?.instructor_name != null ?
        String(nested.instructor_name)
      : o.instructor_name != null ?
        String(o.instructor_name)
      : undefined,
    progress_percent: toFiniteNumber(o.progress_percent ?? o.progress),
    status: o.status != null ? String(o.status) : undefined,
    start_date: startRaw != null && String(startRaw).trim() !== '' ? String(startRaw) : null,
    start_time: timeRaw != null && String(timeRaw).trim() !== '' ? String(timeRaw) : null,
    meeting_link: meetRaw != null && String(meetRaw).trim() !== '' ? String(meetRaw) : null,
  }
}

/** GET /student/courses — empty array on failure. */
export async function fetchStudentCoursesList(): Promise<StudentListedCourse[]> {
  try {
    const res = await apiClient.get<unknown>('/student/courses', { skipErrorToast: true })
    return coerceFlexibleList(res.data, ['courses', 'data', 'items', 'enrollments'])
      .map(normalizeListedCourse)
      .filter((x): x is StudentListedCourse => x != null)
  } catch {
    return []
  }
}

export type StudentRegistrationRow = {
  id: number
  course_id: number
  course_title?: string
  slug?: string | null
  status?: string
  enrolled_at?: string | null
  start_date?: string | null
  start_time?: string | null
  meeting_link?: string | null
  instructor_name?: string | null
  /** Resolved from nested course media keys when backend sends them */
  course_cover_url?: string | null
  /** Payment / checkout flags when backend exposes them */
  payment_status?: string | null
}

function pickCourseCover(nested: Record<string, unknown> | null): string | undefined {
  if (!nested) return undefined
  const keys = ['course_image', 'image_url', 'cover_image', 'thumbnail', 'image', 'cover']
  for (const k of keys) {
    const v = nested[k]
    if (v != null && String(v).trim() !== '') return String(v).trim()
  }
  return undefined
}

export function normalizeRegistrationRow(raw: unknown): StudentRegistrationRow | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const nested =
    o.course && typeof o.course === 'object' && !Array.isArray(o.course) ? (o.course as Record<string, unknown>) : null
  const nestedInstr =
    nested?.instructor && typeof nested.instructor === 'object' && !Array.isArray(nested.instructor) ?
      (nested.instructor as Record<string, unknown>)
    : null
  const id = Number(o.id ?? o.registration_id ?? o.enrollment_id)
  const course_id = Number(o.course_id ?? nested?.id ?? o.courseId)
  if (!Number.isFinite(id) || !Number.isFinite(course_id)) return null
  const slugRaw = o.slug ?? o.course_slug ?? nested?.slug
  const title = nested?.title ?? o.course_title ?? o.program_title ?? o.course_name
  const enrolled =
    o.enrolled_at ?? o.registered_at ?? o.created_at
  const startD = o.start_date ?? nested?.start_date ?? o.course_start_at
  const startT = o.start_time ?? nested?.start_time ?? o.study_time
  const link = o.meeting_link ?? nested?.meeting_link
  let inst: string | undefined
  if (nestedInstr?.name != null) inst = String(nestedInstr.name)
  else if (nested?.instructor_name != null) inst = String(nested.instructor_name)
  else if (o.instructor_name != null) inst = String(o.instructor_name)

  const cover = pickCourseCover(nested)

  const pay =
    o.payment_status ??
    o.paymentStatus ??
    o.payment_state ??
    (o.payment && typeof o.payment === 'object' && !Array.isArray(o.payment) ?
      (o.payment as Record<string, unknown>).status
    : null)

  return {
    id,
    course_id,
    course_title: title != null ? String(title) : slugifyFallback(course_id),
    slug: slugRaw != null && String(slugRaw).trim() !== '' ? String(slugRaw) : undefined,
    status: o.status != null ? String(o.status) : undefined,
    payment_status:
      pay != null && String(pay).trim() !== '' ? String(pay).trim() : null,
    enrolled_at: enrolled != null && String(enrolled).trim() !== '' ? String(enrolled) : null,
    start_date: startD != null && String(startD).trim() !== '' ? String(startD) : null,
    start_time: startT != null && String(startT).trim() !== '' ? String(startT) : null,
    meeting_link: link != null && String(link).trim() !== '' ? String(link) : null,
    instructor_name: inst,
    course_cover_url: cover ?? null,
  }
}

function debugStudentRegs(label: string, payload: Record<string, unknown>) {
  if (!import.meta.env.DEV) return
  console.log(`[EMC student/registrations] ${label}`, payload)
}

/** GET /student/registrations — empty array on failure. */
export async function fetchStudentRegistrations(): Promise<StudentRegistrationRow[]> {
  try {
    debugStudentRegs('request', {
      method: 'GET',
      path: '/student/registrations',
      baseURL: apiClient.defaults.baseURL,
    })
    const res = await apiClient.get<unknown>('/student/registrations', { skipErrorToast: true })
    const rawList = coerceFlexibleList(res.data, ['registrations', 'data', 'items', 'enrollments'])
    const rows = rawList.map(normalizeRegistrationRow).filter((x): x is StudentRegistrationRow => x != null)
    debugStudentRegs('response', {
      httpStatus: res.status,
      rowCount: rows.length,
      shapeSample:
        rawList[0] && typeof rawList[0] === 'object' ? Object.keys(rawList[0] as object).slice(0, 28) : [],
    })
    return rows
  } catch (e) {
    debugStudentRegs('error', {
      message: e instanceof Error ? e.message : String(e),
    })
    return []
  }
}

function normalizeSessionStatus(raw: unknown): import('@/types/lms').LmsSessionStatus {
  const s = String(raw ?? '').toLowerCase()
  if (s.includes('complete')) return 'completed'
  if (s.includes('cancel')) return 'cancelled'
  if (s.includes('live')) return 'live'
  return 'scheduled'
}

function normalizeLmsSessionRow(raw: unknown): LmsSession | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const nested =
    o.course && typeof o.course === 'object' && !Array.isArray(o.course) ? (o.course as Record<string, unknown>) : null
  const id = Number(o.id)
  if (!Number.isFinite(id)) return null
  const cidRaw = o.course_id ?? nested?.id
  const course_id = cidRaw != null && cidRaw !== '' && Number.isFinite(Number(cidRaw)) ? Number(cidRaw) : null
  const course_name = String(o.course_name ?? nested?.title ?? o.title ?? 'دورة')
  const course_slug =
    o.course_slug != null && String(o.course_slug).trim() !== '' ?
      String(o.course_slug)
    : nested?.slug != null && String(nested.slug).trim() !== '' ?
      String(nested.slug)
    : null
  const typeRaw = String(o.type ?? '').toLowerCase()
  const type = typeRaw.includes('offline') ? 'offline' : typeRaw.includes('online') ? 'online' : undefined
  return {
    id,
    course_id,
    title: o.title != null ? String(o.title) : null,
    course_name,
    course_slug,
    starts_at: o.starts_at != null ? String(o.starts_at) : null,
    ends_at: o.ends_at != null ? String(o.ends_at) : null,
    date: o.date != null ? String(o.date) : null,
    time: o.time != null ? String(o.time) : null,
    status: normalizeSessionStatus(o.status),
    type,
    instructor_name:
      o.instructor_name != null ?
        String(o.instructor_name)
      : nested?.instructor_name != null ?
        String(nested.instructor_name)
      : null,
    location: o.location != null ? String(o.location) : null,
    meeting_link: o.meeting_link != null ? String(o.meeting_link) : null,
    recording_link: o.recording_link != null ? String(o.recording_link) : null,
    platform: o.platform != null ? String(o.platform) : null,
  }
}

export async function fetchStudentSessions(): Promise<{
  upcoming: LmsSession[]
  completed: LmsSession[]
}> {
  try {
    const res = await apiClient.get<unknown>('/student/sessions', { skipErrorToast: true })
    const raw = unwrapData<unknown>(res.data)

    const normalizeList = (arr: unknown[]): LmsSession[] =>
      arr.map(normalizeLmsSessionRow).filter((x): x is LmsSession => x != null)

    if (Array.isArray(raw)) {
      const mapped = normalizeList(raw)
      const upcoming = mapped.filter((s) => s.status !== 'completed')
      const completed = mapped.filter((s) => s.status === 'completed')
      return { upcoming, completed }
    }

    if (raw != null && typeof raw === 'object' && !Array.isArray(raw)) {
      const obj = raw as Record<string, unknown>
      const upcomingRaw = obj.upcoming ?? obj.upcoming_sessions ?? obj.scheduled_sessions
      const completedRaw = obj.completed ?? obj.completed_sessions
      let upcomingSessions = Array.isArray(upcomingRaw) ? normalizeList(upcomingRaw as unknown[]) : []
      let completedSessions = Array.isArray(completedRaw) ? normalizeList(completedRaw as unknown[]) : []
      const sessionsFlat = Array.isArray(obj.sessions) ? normalizeList(obj.sessions as unknown[]) : []
      if (sessionsFlat.length > 0 && upcomingSessions.length === 0 && completedSessions.length === 0) {
        upcomingSessions = sessionsFlat.filter((s) => s.status !== 'completed')
        completedSessions = sessionsFlat.filter((s) => s.status === 'completed')
      }
      return {
        upcoming: upcomingSessions,
        completed: completedSessions,
      }
    }

    const flat = coerceFlexibleList(res.data, ['sessions', 'data', 'items', 'upcoming_sessions'])
    if (flat.length > 0) {
      const mapped = normalizeList(flat)
      return {
        upcoming: mapped.filter((s) => s.status !== 'completed'),
        completed: mapped.filter((s) => s.status === 'completed'),
      }
    }
  } catch {
    /* ignore */
  }
  return { upcoming: [], completed: [] }
}

function normalizeMaterialKind(raw: unknown): import('@/types/lms').MaterialKind {
  const s = String(raw ?? 'other').toLowerCase()
  if (s.includes('pdf')) return 'pdf'
  if (s.includes('video') || s.includes('mp4')) return 'video'
  if (s.includes('slide')) return 'slides'
  if (s.includes('link') || s.includes('url')) return 'link'
  if (s.includes('doc')) return 'document'
  return 'other'
}

function normalizeMaterialRow(raw: unknown): LmsMaterial | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const nested =
    o.course && typeof o.course === 'object' && !Array.isArray(o.course) ? (o.course as Record<string, unknown>) : null
  const id = Number(o.id)
  if (!Number.isFinite(id)) return null
  const cidRaw = o.course_id ?? nested?.id
  const course_id = cidRaw != null && cidRaw !== '' && Number.isFinite(Number(cidRaw)) ? Number(cidRaw) : null
  const title = String(o.title ?? o.name ?? 'مادة')
  return {
    id,
    course_id,
    title,
    kind: normalizeMaterialKind(o.kind ?? o.type ?? 'other'),
    url: o.url != null ? String(o.url) : o.link != null ? String(o.link) : null,
    description: o.description != null ? String(o.description) : null,
    course_name:
      o.course_name != null ? String(o.course_name) : nested?.title != null ? String(nested.title) : null,
    size_label: o.size_label != null ? String(o.size_label) : null,
    updated_at: o.updated_at != null ? String(o.updated_at) : null,
  }
}

function normalizeStudentAssignmentRow(raw: unknown): StudentAssignment | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const nested =
    o.course && typeof o.course === 'object' && !Array.isArray(o.course) ? (o.course as Record<string, unknown>) : null
  const nestedAssignment =
    o.assignment && typeof o.assignment === 'object' && !Array.isArray(o.assignment) ?
      (o.assignment as Record<string, unknown>)
    : null
  const assignment_id = Number(o.assignment_id ?? nestedAssignment?.id ?? o.id)
  const id = Number(o.id ?? o.student_assignment_id ?? assignment_id)
  if (!Number.isFinite(id) || !Number.isFinite(assignment_id)) return null
  const cidRaw = o.course_id ?? nested?.id
  const course_id = cidRaw != null && cidRaw !== '' && Number.isFinite(Number(cidRaw)) ? Number(cidRaw) : null
  const statusRaw = String(o.status ?? 'pending').toLowerCase()
  let status: StudentAssignment['status'] = 'pending'
  if (statusRaw.includes('grade')) status = 'graded'
  else if (statusRaw.includes('submit')) status = 'submitted'
  else if (statusRaw.includes('revision')) status = 'revision'
  else if (statusRaw.includes('late')) status = 'late'

  return {
    id,
    course_id,
    assignment_id,
    title: String(o.title ?? o.assignment_title ?? 'واجب'),
    course_name:
      o.course_name != null ? String(o.course_name) : nested?.title != null ? String(nested.title) : null,
    due_at: o.due_at != null ? String(o.due_at) : o.deadline != null ? String(o.deadline) : null,
    status,
    score: o.score != null ? Number(o.score) : null,
    max_score: o.max_score != null ? Number(o.max_score) : null,
    feedback: o.feedback != null ? String(o.feedback) : null,
    submitted_at: o.submitted_at != null ? String(o.submitted_at) : null,
  }
}

export async function fetchStudentMaterials(): Promise<LmsMaterial[]> {
  try {
    const res = await apiClient.get<unknown>('/student/materials', { skipErrorToast: true })
    const rawList = coerceFlexibleList(res.data, ['materials', 'data', 'items'])
    return rawList.map(normalizeMaterialRow).filter((x): x is LmsMaterial => x != null)
  } catch {
    return []
  }
}

export async function fetchStudentAssignments(): Promise<StudentAssignment[]> {
  try {
    const res = await apiClient.get<unknown>('/student/assignments', { skipErrorToast: true })
    const rawList = coerceFlexibleList(res.data, ['assignments', 'data', 'items'])
    return rawList.map(normalizeStudentAssignmentRow).filter((x): x is StudentAssignment => x != null)
  } catch {
    return []
  }
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
  try {
    const res = await apiClient.get<unknown>('/student/progress', { skipErrorToast: true })
    return normalizeStudentProgressPayload(res.data)
  } catch {
    return normalizeStudentProgressPayload(null)
  }
}

/** GET /student/available-courses — normalized Course rows; empty when route missing. */
export async function fetchStudentAvailableCourses(): Promise<Course[]> {
  try {
    const res = await apiClient.get<unknown>('/student/available-courses', { skipErrorToast: true })
    const rawList = coerceFlexibleList(res.data, ['courses', 'data', 'items', 'available', 'results'])
    if (rawList.length === 0) return []
    return extractCoursesList(rawList) as Course[]
  } catch {
    return []
  }
}

export type StudentReviewRow = {
  id: number
  course_id: number
  registration_id?: number | null
  submitted_at?: string | null
}

function normalizeStudentReviewRow(raw: unknown): StudentReviewRow | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = Number(o.id)
  const course_id = Number(o.course_id ?? (o.course && typeof o.course === 'object' && !Array.isArray(o.course) ? (o.course as Record<string, unknown>).id : undefined))
  if (!Number.isFinite(id) || !Number.isFinite(course_id)) return null
  const rid = o.registration_id
  const registration_id =
    rid != null && rid !== '' && Number.isFinite(Number(rid)) ? Number(rid) : null
  const submitted =
    o.submitted_at ?? o.created_at ?? o.updated_at
  return {
    id,
    course_id,
    registration_id,
    submitted_at: submitted != null && String(submitted).trim() !== '' ? String(submitted) : null,
  }
}

/** GET /student/reviews — existing evaluations so UI can enforce one review per course */
export async function fetchStudentReviews(): Promise<StudentReviewRow[]> {
  try {
    const res = await apiClient.get<unknown>('/student/reviews', { skipErrorToast: true })
    const rawList = coerceFlexibleList(res.data, ['reviews', 'data', 'items'])
    return rawList.map(normalizeStudentReviewRow).filter((x): x is StudentReviewRow => x != null)
  } catch {
    return []
  }
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
  await apiClient.post('/student/evaluations', body, { skipErrorToast: true })
}
