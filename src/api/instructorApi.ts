import apiClient from './axios'
import type {
  AttendanceRow,
  AttendanceStatus,
  InstructorLmsDashboard,
  InstructorSubmission,
  LmsSession,
  SubmissionDetail,
  TeachingCourseLms,
} from '../types/lms'
import type { User } from '../types'
import { asList, unwrapLms } from './lmsApi'
import { normalizeLmsSessionRow, parseSessionsPayload } from '@/utils/lmsSession'
import { unwrapData } from './unwrap'
import type { ClassGroup } from './placementApi'
import {
  getCanonicalStudentIdentity,
  getCanonicalCourse,
  getCanonicalRegistration,
  getCanonicalPlacement,
  getCanonicalProgress,
} from './normalizers/instructorStudentSummary'

/* ── Instructor student row (enriched, across all courses) ───────────────── */

export type InstructorClassAssignmentSummary = {
  status: 'assigned' | 'waiting_class_assignment' | string
  class_group_id: number | null
  class_name: string | null
  level_code: string | null
  assigned_at: string | null
  instructor_name: string | null
}

export type InstructorStudentRow = {
  id: number
  name: string
  email: string
  course_id: number | null
  course_title: string | null
  enrollment_status: string | null
  placement_status: string | null
  written_score: number | null
  total_questions: number | null
  written_level: string | null
  oral_booking_at: string | null
  final_level: string | null
  oral_score: number | null
  instructor_notes: string | null
  enrolled_at: string | null
  avatar_url: string | null
  attempt_id: number | null
  class_assignment: InstructorClassAssignmentSummary | null
  /** From the canonical Resource's `progress.is_assigned` (Ticket 2). */
  is_assigned?: boolean
}

const EMPTY_CLASS_ASSIGNMENT: InstructorClassAssignmentSummary = {
  status: 'waiting_class_assignment', class_group_id: null, class_name: null,
  level_code: null, assigned_at: null, instructor_name: null,
}

function normalizeClassAssignment(raw: unknown): InstructorClassAssignmentSummary {
  if (!raw || typeof raw !== 'object') return EMPTY_CLASS_ASSIGNMENT
  const o = raw as Record<string, unknown>
  return {
    status:          o.status != null ? String(o.status) : 'waiting_class_assignment',
    class_group_id:  o.class_group_id != null ? Number(o.class_group_id) : null,
    class_name:      o.class_name != null ? String(o.class_name) : null,
    level_code:      o.level_code != null ? String(o.level_code) : null,
    assigned_at:     o.assigned_at != null ? String(o.assigned_at) : null,
    instructor_name: o.instructor_name != null ? String(o.instructor_name) : null,
  }
}

function normalizeInstructorStudentRow(r: unknown): InstructorStudentRow {
  if (!r || typeof r !== 'object') {
    return { id: 0, name: '', email: '', course_id: null, course_title: null, enrollment_status: null, placement_status: null, written_score: null, total_questions: null, written_level: null, oral_booking_at: null, final_level: null, oral_score: null, instructor_notes: null, enrolled_at: null, avatar_url: null, attempt_id: null, class_assignment: EMPTY_CLASS_ASSIGNMENT }
  }
  const o = r as Record<string, unknown>
  const att =
    o.placement_attempt != null && typeof o.placement_attempt === 'object' && !Array.isArray(o.placement_attempt)
      ? (o.placement_attempt as Record<string, unknown>)
      : null
  const oralObj =
    o.oral_booking != null && typeof o.oral_booking === 'object' && !Array.isArray(o.oral_booking)
      ? (o.oral_booking as Record<string, unknown>)
      : null

  // Canonical nested shape from InstructorStudentSummaryResource (Ticket 2),
  // read through the shared compatibility adapter. Checked first; legacy
  // flat/attempt-nested fallbacks below remain only as a defensive fallback
  // when the canonical fields are absent.
  const student = getCanonicalStudentIdentity(o)
  const course = getCanonicalCourse(o)
  const registration = getCanonicalRegistration(o)
  const placement = getCanonicalPlacement(o)
  const progress = getCanonicalProgress(o)

  const score = placement.written_score ??
    (o.written_score  != null ? Number(o.written_score)  :
    att?.written_score != null ? Number(att.written_score) :
    att?.score         != null ? Number(att.score)         : null)

  const total = placement.written_total ??
    (o.total_questions   != null ? Number(o.total_questions)   :
    att?.total_questions != null ? Number(att.total_questions) : null)

  const courseTitle =
    course.title ??
    (o.course_title != null ? String(o.course_title) :
    o.course != null && typeof o.course === 'object'
      ? String((o.course as Record<string, unknown>).title ?? '') || null
      : null)

  const oralBookingAt =
    oralObj != null
      ? (oralObj.starts_at != null ? String(oralObj.starts_at) : null)
      : o.oral_booking_at != null ? String(o.oral_booking_at) : null

  return {
    id:                student.id ?? Number(o.id ?? o.student_id ?? 0),
    name:              student.name ?? String(o.name ?? o.student_name ?? ''),
    email:             student.email ?? String(o.email ?? o.student_email ?? ''),
    course_id:         course.id ?? (o.course_id != null ? Number(o.course_id) : null),
    course_title:      courseTitle,
    enrollment_status: registration.status ??
                       (o.enrollment_status != null ? String(o.enrollment_status) :
                       o.status           != null ? String(o.status)            : null),
    placement_status:  placement.status ??
                       (o.placement_status != null ? String(o.placement_status) :
                       att?.status        != null ? String(att.status)         : null),
    written_score:     score,
    total_questions:   total,
    written_level:     placement.written_level ??
                       (String(att?.written_level ?? att?.estimated_level ?? o.written_level ?? '') || null),
    oral_booking_at:   oralBookingAt,
    final_level:       placement.final_level ?? placement.oral_level ??
                       (o.final_level  != null ? String(o.final_level)  :
                       att?.final_level != null ? String(att.final_level) : null),
    oral_score:        placement.oral_score ??
                       (o.oral_score   != null ? Number(o.oral_score)   :
                       att?.oral_score != null ? Number(att.oral_score) : null),
    instructor_notes:  o.instructor_notes != null ? String(o.instructor_notes) : null,
    enrolled_at:       o.enrolled_at  != null ? String(o.enrolled_at)  :
                       o.created_at   != null ? String(o.created_at)   : null,
    avatar_url:        student.avatar_url ??
                       (o.avatar_url  != null ? String(o.avatar_url)  :
                       o.profile_photo_url != null ? String(o.profile_photo_url) : null),
    attempt_id:        o.attempt_id  != null ? Number(o.attempt_id)  :
                       att?.id       != null ? Number(att.id)        : null,
    class_assignment:  normalizeClassAssignment(o.class_assignment),
    is_assigned:       progress.is_assigned ?? (o.is_assigned != null ? Boolean(o.is_assigned) : undefined),
  }
}

export async function fetchInstructorLmsDashboard(): Promise<InstructorLmsDashboard> {
  const res = await apiClient.get<unknown>('/instructor/dashboard', { skipErrorToast: true } as Record<string, unknown>)
  const inner = unwrapData<unknown>(res.data)
  if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
    const o = inner as Record<string, unknown>
    return {
      assigned_courses: asList<TeachingCourseLms>(o.assigned_courses ?? o.courses ?? []),
      upcoming_sessions: parseSessionsPayload(o.upcoming_sessions ?? o.sessions ?? []),
      class_groups: asList<{ id: number; name: string; course_id?: number | null; enrolled?: number | null }>(
        o.class_groups ?? o.classes ?? o.groups ?? [],
      ),
      student_count: Number(o.student_count ?? o.students_count ?? o.total_students ?? 0),
      class_groups_count: o.class_groups_count != null ? Number(o.class_groups_count) : null,
      attendance_pending_count: Number(o.attendance_pending_count ?? o.pending_attendance ?? 0),
      submissions_pending_count: Number(o.submissions_pending_count ?? o.pending_submissions ?? 0),
      oral_pending_count: o.oral_pending_count != null ? Number(o.oral_pending_count) : null,
      placement_pending_count: o.placement_pending_count != null ? Number(o.placement_pending_count) : null,
      admin_notes_placeholder: o.admin_notes_placeholder != null ? String(o.admin_notes_placeholder) : null,
    }
  }
  return unwrapLms<InstructorLmsDashboard>(res.data)
}

export type InstructorDashboardStats = {
  dashboard: InstructorLmsDashboard | null
  courses: TeachingCourseLms[]
  classes: ClassGroup[]
  sessions: LmsSession[]
  submissions: InstructorSubmission[]
  studentsCount: number
  submissionsPending: number
  attendancePending: number
  oralPending: number
  placementPending: number
}

/** Aggregate live counts for instructor home — falls back when dashboard fields are empty. */
export async function fetchInstructorDashboardStats(): Promise<InstructorDashboardStats> {
  const [dashboardRes, coursesRes, classesRes, sessionsRes, studentsRes, submissionsRes] = await Promise.allSettled([
    fetchInstructorLmsDashboard(),
    fetchInstructorCourses(),
    import('./placementApi').then((m) => m.fetchInstructorClasses()),
    fetchInstructorSessions(),
    fetchInstructorAllStudents(),
    fetchInstructorAssignmentsQueue(),
  ])

  const dashboard = dashboardRes.status === 'fulfilled' ? dashboardRes.value : null
  const courses = coursesRes.status === 'fulfilled' ? coursesRes.value : (dashboard?.assigned_courses ?? [])
  const classes = classesRes.status === 'fulfilled' ? classesRes.value : []
  const sessions = sessionsRes.status === 'fulfilled' ? sessionsRes.value : (dashboard?.upcoming_sessions ?? [])
  const students = studentsRes.status === 'fulfilled' ? studentsRes.value : []
  const submissions = submissionsRes.status === 'fulfilled' ? submissionsRes.value : []

  const submissionsPending =
    dashboard?.submissions_pending_count ??
    submissions.filter((s) => s.status === 'pending_review').length

  const oralPending =
    dashboard?.oral_pending_count ??
    courses.reduce((n, c) => n + Number(c.oral_pending_count ?? c.waiting_oral_count ?? 0), 0)

  const placementPending =
    dashboard?.placement_pending_count ??
    courses.reduce((n, c) => n + Number(c.written_tests_count ?? c.placement_completed_count ?? 0), 0)

  return {
    dashboard,
    courses,
    classes,
    sessions,
    submissions,
    studentsCount: dashboard?.student_count ?? students.length,
    submissionsPending,
    attendancePending: dashboard?.attendance_pending_count ?? 0,
    oralPending,
    placementPending,
  }
}

export async function fetchInstructorSessions(params?: { course_id?: number; status?: string }): Promise<LmsSession[]> {
  const res = await apiClient.get<unknown>('/instructor/sessions', {
    params,
    skipErrorToast: true,
  } as Record<string, unknown>)
  const sessions = parseSessionsPayload(res.data)
  if (sessions.length > 0) return sessions

  /* Fallback: dashboard embeds upcoming_sessions for some backends (only without course filter) */
  if (!params?.course_id) {
    try {
      const dash = await fetchInstructorLmsDashboard()
      const fromDash = (dash.upcoming_sessions ?? [])
        .map(normalizeLmsSessionRow)
        .filter((x): x is LmsSession => x != null)
      if (fromDash.length > 0) return fromDash
    } catch {
      /* ignore */
    }
  }

  return sessions
}

export async function fetchInstructorCourses(): Promise<TeachingCourseLms[]> {
  const res = await apiClient.get<unknown>('/instructor/courses')
  return asList<TeachingCourseLms>(res.data)
}

function normalizeInstructorStudentUser(raw: unknown): User {
  if (!raw || typeof raw !== 'object') return { id: 0, name: '', email: '' }
  const o = raw as Record<string, unknown>
  const id = Number(o.id ?? o.student_id ?? o.user_id ?? 0)
  const name = String(o.name ?? o.full_name ?? o.student_name ?? o.display_name ?? '').trim()
  const email = String(o.email ?? o.student_email ?? '').trim()
  return { id, name: name || (id ? `طالب #${id}` : ''), email, avatar_url: o.avatar_url != null ? String(o.avatar_url) : null }
}

export async function fetchInstructorStudents(params?: {
  session_id?: number
  course_id?: number
  class_group_id?: number
}): Promise<User[]> {
  const res = await apiClient.get<unknown>('/instructor/students', {
    params,
    skipErrorToast: true,
  } as Record<string, unknown>)
  return asList<unknown>(res.data)
    .map(normalizeInstructorStudentUser)
    .filter((u) => u.id > 0)
}

/** All students across all courses assigned to instructor */
export async function fetchInstructorAllStudents(): Promise<InstructorStudentRow[]> {
  const res = await apiClient.get<unknown>('/instructor/students', { skipErrorToast: true } as Record<string, unknown>)
  return asList<unknown>(res.data).map(normalizeInstructorStudentRow)
}

/** Students enrolled in a specific course */
export async function fetchInstructorCourseStudents(courseId: string | number): Promise<InstructorStudentRow[]> {
  const res = await apiClient.get<unknown>(`/instructor/courses/${courseId}/students`, { skipErrorToast: true } as Record<string, unknown>)
  return asList<unknown>(res.data).map(normalizeInstructorStudentRow)
}

export async function putInstructorAttendance(
  sessionId: number,
  records: { student_id: number; status: string; notes?: string | null }[],
): Promise<void> {
  await apiClient.put(`/instructor/attendance/${sessionId}`, { attendances: records })
}

/* ── Ticket 6: attendance dashboard + export ──────────────────────────────── */

export type AttendanceDashboardData = {
  today_sessions: number
  today_attendance_marked: number
  week_present: number
  week_absent: number
  week_late: number
  week_excused: number
  month_present: number
  month_absent: number
  month_late: number
  month_excused: number
  current_attendance_percentage: number
  at_risk_students: Array<{ user_id: number; name: string | null; attendance_percentage: number }>
  top_attendance: Array<{ user_id: number; name: string | null; attendance_percentage: number }>
  worst_attendance: Array<{ user_id: number; name: string | null; attendance_percentage: number }>
}

export async function fetchAttendanceDashboard(): Promise<AttendanceDashboardData> {
  const res = await apiClient.get<unknown>('/instructor/attendance/dashboard', { skipErrorToast: true } as Record<string, unknown>)
  const data = (res.data as Record<string, unknown>)?.data as AttendanceDashboardData | undefined
  return data ?? {
    today_sessions: 0, today_attendance_marked: 0,
    week_present: 0, week_absent: 0, week_late: 0, week_excused: 0,
    month_present: 0, month_absent: 0, month_late: 0, month_excused: 0,
    current_attendance_percentage: 0, at_risk_students: [], top_attendance: [], worst_attendance: [],
  }
}

export type AttendanceReportFilters = {
  course_id?: number
  class_group_id?: number
  student_id?: number
  status?: string
  from?: string
  to?: string
  month?: number
  year?: number
  page?: number
  per_page?: number
}

/** Downloads a file via the authenticated apiClient (a plain <a href> would
 *  not carry the Authorization header) and triggers a browser save. */
async function downloadAuthenticated(path: string, params: Record<string, unknown> | undefined, filename: string, mime: string): Promise<void> {
  const res = await apiClient.get(path, { params, responseType: 'blob' } as Record<string, unknown>)
  const blob = new Blob([res.data as BlobPart], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export async function downloadAttendanceExport(params?: AttendanceReportFilters): Promise<void> {
  await downloadAuthenticated('/instructor/attendance/export', params, `attendance-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;')
}

export async function downloadAttendanceExportPdf(params?: AttendanceReportFilters): Promise<void> {
  await downloadAuthenticated('/instructor/attendance/export-pdf', params, `attendance-${new Date().toISOString().slice(0, 10)}.pdf`, 'application/pdf')
}

export async function downloadAttendanceExportExcel(params?: AttendanceReportFilters): Promise<void> {
  await downloadAuthenticated('/instructor/attendance/export-excel', params, `attendance-${new Date().toISOString().slice(0, 10)}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
}

export type AttendanceReportRow = {
  id: number
  student_name: string | null
  student_email: string | null
  course_title: string | null
  session_title: string | null
  date: string | null
  status: string
  status_label: string
  notes: string | null
}

export type AttendanceReportSummary = {
  total: number
  present_count: number
  absent_count: number
  late_count: number
  excused_count: number
  attendance_percentage: number
  current_attendance_streak: number
  current_absence_streak: number
  risk_level: 'low' | 'medium' | 'high'
}

export type AttendanceReportResult = {
  summary: AttendanceReportSummary
  data: AttendanceReportRow[]
  meta: { total: number; per_page: number; current_page: number; last_page: number; from: string; to: string }
}

export async function fetchAttendanceReports(filters?: AttendanceReportFilters): Promise<AttendanceReportResult> {
  const res = await apiClient.get<unknown>('/instructor/attendance/reports', { params: filters, skipErrorToast: true } as Record<string, unknown>)
  const body = res.data as Record<string, unknown>
  return {
    summary: (body.summary as AttendanceReportSummary) ?? {
      total: 0, present_count: 0, absent_count: 0, late_count: 0, excused_count: 0,
      attendance_percentage: 0, current_attendance_streak: 0, current_absence_streak: 0, risk_level: 'low',
    },
    data: Array.isArray(body.data) ? body.data as AttendanceReportRow[] : [],
    meta: (body.meta as AttendanceReportResult['meta']) ?? { total: 0, per_page: 25, current_page: 1, last_page: 1, from: '', to: '' },
  }
}

export type AttendanceSettingsData = {
  late_threshold_minutes: number
  auto_absent_after_minutes: number
  minimum_attendance_percentage: number
  at_risk_percentage: number
  repeated_absence_threshold: number
  low_attendance_notification_threshold: number
  certificate_attendance_percentage: number
}

export async function fetchAttendanceSettings(): Promise<AttendanceSettingsData> {
  const res = await apiClient.get<unknown>('/instructor/attendance/settings', { skipErrorToast: true } as Record<string, unknown>)
  return (res.data as Record<string, unknown>).data as AttendanceSettingsData
}

export async function updateAttendanceSettings(data: AttendanceSettingsData): Promise<AttendanceSettingsData> {
  const res = await apiClient.put<unknown>('/admin/attendance-settings', data)
  return (res.data as Record<string, unknown>).data as AttendanceSettingsData
}

function normalizeAttendanceStatus(raw: unknown): AttendanceStatus | null {
  const s = String(raw ?? '').toLowerCase()
  if (!s) return null
  if (s.includes('present') || s.includes('حاض')) return 'present'
  if (s.includes('absent') || s.includes('غائ')) return 'absent'
  if (s.includes('late') || s.includes('متأ')) return 'late'
  if (s.includes('excus') || s.includes('معذ')) return 'excused'
  return null
}

function normalizeAttendanceRow(raw: unknown): AttendanceRow | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const student =
    o.student && typeof o.student === 'object' && !Array.isArray(o.student)
      ? (o.student as Record<string, unknown>)
      : o.user && typeof o.user === 'object' && !Array.isArray(o.user)
        ? (o.user as Record<string, unknown>)
        : null
  // Backend show() returns `id` (not student_id/user_id) — handle all variants
  const student_id = Number(o.student_id ?? o.user_id ?? student?.id ?? o.id ?? 0)
  if (!student_id) return null
  const student_name = String(
    o.student_name ?? student?.name ?? o.name ?? o.full_name ?? student?.full_name ?? '',
  ).trim() || `طالب #${student_id}`
  return {
    student_id,
    student_name,
    email:
      o.email != null ? String(o.email)
      : student?.email != null ? String(student.email)
      : o.student_email != null ? String(o.student_email)
      : null,
    // Backend returns `avatar` (not avatar_url) for user records
    avatar_url:
      o.avatar_url != null ? String(o.avatar_url)
      : o.avatar != null ? String(o.avatar)
      : student?.avatar_url != null ? String(student.avatar_url)
      : student?.avatar != null ? String(student.avatar)
      : null,
    status: normalizeAttendanceStatus(o.status ?? o.attendance_status ?? o.current_attendance_status),
    notes: o.notes != null ? String(o.notes) : o.note != null ? String(o.note) : null,
  }
}

export function usersToAttendanceRows(users: User[]): AttendanceRow[] {
  return users.map((u) => ({
    student_id: u.id,
    student_name: u.name?.trim() || `طالب #${u.id}`,
    email: u.email ?? null,
    avatar_url: u.avatar_url ?? null,
    status: null,
    notes: null,
  }))
}

/** Merge saved attendance with roster — preserves names from roster when API rows are sparse. */
export function mergeAttendanceRows(saved: AttendanceRow[], roster: AttendanceRow[]): AttendanceRow[] {
  if (roster.length === 0) return saved
  const byId = new Map<number, AttendanceRow>()
  for (const r of roster) byId.set(r.student_id, r)
  for (const s of saved) {
    const base = byId.get(s.student_id)
    byId.set(s.student_id, {
      student_id: s.student_id,
      student_name: s.student_name?.trim() || base?.student_name || `طالب #${s.student_id}`,
      email: s.email ?? base?.email ?? null,
      avatar_url: s.avatar_url ?? base?.avatar_url ?? null,
      status: s.status,
      notes: s.notes ?? base?.notes ?? null,
    })
  }
  return [...byId.values()].sort((a, b) => a.student_name.localeCompare(b.student_name, 'ar'))
}

export type AttendanceSessionResult = {
  rows: AttendanceRow[]
  is_locked: boolean
  locked_at: string | null
  locked_by: string | null
}

export async function fetchInstructorAttendanceSession(sessionId: number): Promise<AttendanceSessionResult> {
  try {
    const res = await apiClient.get<unknown>(`/instructor/attendance/${sessionId}`, { skipErrorToast: true } as Record<string, unknown>)
    const inner = unwrapData<unknown>(res.data)
    let rows: AttendanceRow[] = []
    let is_locked = false
    let locked_at: string | null = null
    let locked_by: string | null = null

    if (Array.isArray(inner)) {
      rows = inner.map(normalizeAttendanceRow).filter((r): r is AttendanceRow => r != null)
    } else if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
      const obj = inner as Record<string, unknown>
      is_locked = obj.is_locked === true
      locked_at = obj.locked_at != null ? String(obj.locked_at) : null
      locked_by = obj.locked_by != null ? String(obj.locked_by) : null
      const rawRows = obj.records ?? obj.attendance ?? obj.students ?? obj.data
      if (Array.isArray(rawRows)) {
        rows = rawRows.map(normalizeAttendanceRow).filter((r): r is AttendanceRow => r != null)
      }
    }

    return { rows, is_locked, locked_at, locked_by }
  } catch {
    return { rows: [], is_locked: false, locked_at: null, locked_by: null }
  }
}

type SubmissionStatus = InstructorSubmission['status']

function normalizeSubmissionStatus(raw: unknown): SubmissionStatus {
  const s = String(raw ?? '').toLowerCase()
  if (s.includes('not_submitted') || s.includes('missing') || s.includes('لم يسلم')) return 'not_submitted'
  if (s.includes('needs_revision') || s.includes('revision') || s.includes('إعادة')) return 'needs_revision'
  if (s.includes('reviewed') || s.includes('graded') || s.includes('تمت')) return 'reviewed'
  if (s.includes('submitted') || s.includes('pending_review') || s.includes('pending')) return 'pending_review'
  return 'pending_review'
}

function pickNested(
  raw: unknown,
): Record<string, unknown> | null {
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : null
}

/** Return the trimmed string value of `v`, or null if empty/absent. */
function nonEmptyStr(v: unknown): string | null {
  const s = v != null ? String(v).trim() : ''
  return s || null
}

function normalizeInstructorSubmissionRow(raw: unknown): InstructorSubmission | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const assignment = pickNested(o.assignment)
  const student = pickNested(o.student) ?? pickNested(o.user)
  const course =
    pickNested(o.course)
    ?? pickNested(assignment?.course)

  const submissionId = Number(o.id ?? o.submission_id ?? 0)
  const student_id = Number(
    o.student_id ?? o.user_id ?? student?.id ?? 0,
  )
  const status = normalizeSubmissionStatus(o.status ?? o.review_status)
  if (submissionId <= 0 && student_id <= 0) return null
  const id = submissionId > 0 ? submissionId : status === 'not_submitted' ? student_id : 0
  if (id <= 0) return null

  const assignment_title_raw =
    o.assignment_title ?? assignment?.title ?? o.title ?? null
  const assignment_title =
    assignment_title_raw != null && String(assignment_title_raw).trim() !== ''
      ? String(assignment_title_raw).trim()
      : null

  const workshop = pickNested(o.workshop)
  const userObj = pickNested(o.user)
  // nonEmptyStr treats empty strings as absent, unlike ?? which only skips null/undefined
  const course_name =
    nonEmptyStr(o.course_name) ??
    nonEmptyStr(o.course_title) ??
    nonEmptyStr(course?.title) ??
    nonEmptyStr(workshop?.title) ??
    nonEmptyStr(o.workshop_name) ??
    nonEmptyStr(o.workshop_title) ??
    null

  const student_name =
    nonEmptyStr(o.student_name) ??
    nonEmptyStr(student?.name) ??
    nonEmptyStr(student?.full_name) ??
    nonEmptyStr(userObj?.name) ??
    nonEmptyStr(userObj?.full_name) ??
    '—'

  const avatarRaw =
    o.student_avatar ?? student?.avatar ?? student?.avatar_url ?? userObj?.avatar ?? userObj?.avatar_url ?? null
  const student_avatar =
    avatarRaw != null && String(avatarRaw).trim() !== ''
      ? String(avatarRaw).trim()
      : null

  const max_score =
    o.max_score != null ? Number(o.max_score)
    : assignment?.max_score != null ? Number(assignment.max_score)
    : null

  return {
    id,
    assignment_id:
      assignment?.id != null ? Number(assignment.id)
      : o.assignment_id != null ? Number(o.assignment_id)
      : null,
    assignment_title,
    course_id:
      course?.id != null ? Number(course.id)
      : o.course_id != null ? Number(o.course_id)
      : null,
    course_name,
    student_name,
    student_id,
    student_email:
      nonEmptyStr(o.student_email) ??
      nonEmptyStr(student?.email) ??
      nonEmptyStr(userObj?.email) ??
      null,
    student_avatar,
    submitted_at:
      o.submitted_at != null ? String(o.submitted_at)
      : o.submitted_on != null ? String(o.submitted_on)
      : null,
    status,
    score:
      o.score != null ? Number(o.score)
      : o.grade != null ? Number(o.grade)
      : null,
    max_score: max_score != null && !Number.isNaN(max_score) ? max_score : null,
    body_preview:
      o.body_preview != null ? String(o.body_preview)
      : o.body_text != null ? String(o.body_text)
      : o.answer_text != null ? String(o.answer_text)
      : o.text_answer != null ? String(o.text_answer)
      : null,
    file_url:
      o.file_url != null ? String(o.file_url)
      : o.attachment_url != null ? String(o.attachment_url)
      : null,
  }
}

function normalizeSubmissionDetail(raw: unknown): SubmissionDetail | null {
  const base = normalizeInstructorSubmissionRow(raw)
  if (!base) return null
  const o = raw as Record<string, unknown>
  const assignment = pickNested(o.assignment)
  const course = pickNested(o.course) ?? pickNested(assignment?.course)
  const lp = pickNested(o.learning_path)

  return {
    ...base,
    body_text:
      o.body_text != null ? String(o.body_text)
      : o.text_answer != null ? String(o.text_answer)
      : o.answer_text != null ? String(o.answer_text)
      : base.body_preview ?? null,
    file_url:
      o.file_url != null ? String(o.file_url)
      : o.attachment_url != null ? String(o.attachment_url)
      : pickNested(o.file)?.url != null ? String(pickNested(o.file)!.url)
      : null,
    max_score:
      base.max_score
      ?? (o.max_score != null ? Number(o.max_score) : assignment?.max_score != null ? Number(assignment.max_score) : null),
    feedback:
      o.feedback != null ? String(o.feedback)
      : o.instructor_feedback != null ? String(o.instructor_feedback)
      : null,
    learning_path: lp?.id != null
      ? {
          id: Number(lp.id),
          title: String(lp.title ?? ''),
          slug: lp.slug != null ? String(lp.slug) : null,
        }
      : null,
    assignment: assignment?.id != null
      ? {
          id: Number(assignment.id),
          title: assignment.title != null ? String(assignment.title) : null,
          max_score: assignment.max_score != null ? Number(assignment.max_score) : null,
          due_date: assignment.due_date != null ? String(assignment.due_date) : null,
        }
      : null,
    course: course?.id != null
      ? {
          id: Number(course.id),
          title: course.title != null ? String(course.title) : null,
          slug: course.slug != null ? String(course.slug) : null,
        }
      : null,
  }
}

function parseSubmissionsPayload(payload: unknown): InstructorSubmission[] {
  const top = payload != null && typeof payload === 'object' && !Array.isArray(payload)
    ? (payload as Record<string, unknown>)
    : {}
  const inner = unwrapData<unknown>(payload)

  const buckets: unknown[] = []
  if (Array.isArray(inner)) {
    buckets.push(...inner)
  } else if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
    const obj = inner as Record<string, unknown>
    for (const k of ['submissions', 'assignments', 'data', 'items', 'pending', 'queue', 'not_submitted']) {
      const v = obj[k]
      if (Array.isArray(v)) buckets.push(...v)
    }
  }
  // Only fall back to scanning the raw envelope when the inner unwrap produced nothing,
  // to avoid pushing top.data twice when inner === payload.data.
  if (buckets.length === 0) {
    for (const k of ['submissions', 'assignments', 'data', 'items']) {
      const v = top[k]
      if (Array.isArray(v)) buckets.push(...v)
    }
  }

  return buckets
    .map(normalizeInstructorSubmissionRow)
    .filter((r): r is InstructorSubmission => r != null)
    .sort((a, b) => {
      const ta = a.submitted_at ? Date.parse(a.submitted_at) : 0
      const tb = b.submitted_at ? Date.parse(b.submitted_at) : 0
      return tb - ta
    })
}

export type SubmissionsQueueFilters = {
  course_id?: number
  status?: InstructorSubmission['status']
  per_page?: number
}

export async function fetchInstructorAssignmentsQueue(
  filters?: SubmissionsQueueFilters,
): Promise<InstructorSubmission[]> {
  const silent = { skipErrorToast: true } as Record<string, unknown>
  const params: Record<string, string | number> = {
    per_page: filters?.per_page ?? 100,
  }
  if (filters?.course_id) params.course_id = filters.course_id
  if (filters?.status && filters.status !== 'not_submitted') {
    params.status = filters.status
  }

  /* Primary: submissions queue (student homework deliveries) */
  try {
    const res = await apiClient.get<unknown>('/instructor/submissions', {
      ...silent,
      params,
    })
    const rows = parseSubmissionsPayload(res.data)
    if (rows.length > 0) return rows
  } catch {
    /* try fallback */
  }

  /* Fallback: assignments endpoint (some backends embed submission rows) */
  const res = await apiClient.get<unknown>('/instructor/assignments', silent)
  return parseSubmissionsPayload(res.data)
}

export async function fetchSubmissionDetail(submissionId: number): Promise<SubmissionDetail> {
  const res = await apiClient.get<unknown>(`/instructor/submissions/${submissionId}`, { skipErrorToast: true } as Record<string, unknown>)
  const inner = unwrapData<unknown>(res.data)
  const normalized = normalizeSubmissionDetail(inner ?? res.data)
  if (normalized) return normalized
  return unwrapLms<SubmissionDetail>(res.data)
}

export type ReviewPayload = {
  score: number
  feedback?: string
  status: 'reviewed' | 'needs_revision'
}

export async function reviewInstructorSubmission(
  submissionId: number,
  body: ReviewPayload,
): Promise<SubmissionDetail> {
  const res = await apiClient.put<unknown>(
    `/instructor/submissions/${submissionId}/review`,
    {
      ...body,
      grade: body.score,
    },
  )
  const inner = unwrapData<unknown>(res.data)
  const normalized = normalizeSubmissionDetail(inner ?? res.data)
  if (normalized) return normalized
  return fetchSubmissionDetail(submissionId)
}

/* ── Ticket 5 (remaining-gaps pass): dashboard, missing submissions, bulk review ── */

export type AssignmentDashboardCounters = {
  assignments_total: number
  submissions_total: number
  pending_review: number
  graded: number
  needs_revision: number
  missing_submissions: number
}

export async function fetchAssignmentDashboard(): Promise<AssignmentDashboardCounters> {
  const res = await apiClient.get<unknown>('/instructor/assignments/dashboard', { skipErrorToast: true } as Record<string, unknown>)
  const payload = (res.data as Record<string, unknown>)?.data as Record<string, unknown> | undefined
  return {
    assignments_total: Number(payload?.assignments_total ?? 0),
    submissions_total: Number(payload?.submissions_total ?? 0),
    pending_review: Number(payload?.pending_review ?? 0),
    graded: Number(payload?.graded ?? 0),
    needs_revision: Number(payload?.needs_revision ?? 0),
    missing_submissions: Number(payload?.missing_submissions ?? 0),
  }
}

export type MissingSubmissionsRow = {
  assignment_id: number
  assignment_title: string
  course_title: string | null
  deadline: string | null
  missing_count: number
  students: Array<{ user_id: number; name: string | null; email: string | null }>
}

export async function fetchMissingSubmissions(): Promise<MissingSubmissionsRow[]> {
  const res = await apiClient.get<unknown>('/instructor/assignments/missing-submissions', { skipErrorToast: true } as Record<string, unknown>)
  const rows = (res.data as Record<string, unknown>)?.data
  return Array.isArray(rows) ? rows as MissingSubmissionsRow[] : []
}

export async function bulkReviewSubmissions(payload: {
  submission_ids: number[]
  score?: number | null
  feedback?: string | null
  status: 'reviewed' | 'needs_revision' | 'graded'
}): Promise<{ updated_count: number; skipped_count: number }> {
  const res = await apiClient.put<unknown>('/instructor/submissions/bulk-review', payload)
  const body = res.data as Record<string, unknown>
  return { updated_count: Number(body.updated_count ?? 0), skipped_count: Number(body.skipped_count ?? 0) }
}
