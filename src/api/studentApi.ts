import apiClient from './axios'
import { extractCoursesList } from '@/api/coursesApi.public'
import { unwrapData } from './unwrap'
import { parseSessionsPayload } from '@/utils/lmsSession'
import type {
  LmsMaterial,
  LmsSession,
  StudentAssignment,
  StudentAttendanceRecord,
  StudentCertificateSummary,
  StudentDashboardCounts,
  StudentLmsDashboard,
  StudentProgressPayload,
} from '../types/lms'
import type { Course } from '@/types'
import { normalizeAssignmentStatus, resolveLmsAssignmentSubmitId } from '@/utils/lmsAssignment'

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

export type StudentClassAssignment = {
  class_group_id: number
  name: string
  level_code?: string | null
  schedule_day?: string | null
  schedule_time?: string | null
  location_type?: string | null
  meeting_link?: string | null
  start_date?: string | null
  instructor_name?: string | null
  assigned_at?: string | null
}

/** Row from `/student/courses` or nested `current_courses` on `/student/dashboard`. */
export type StudentListedCourse = {
  id: number
  title: string
  slug?: string | null
  instructor_name?: string | null
  progress_percent?: number
  status?: string
  start_date?: string | null
  start_time?: string | null
  end_date?: string | null
  end_time?: string | null
  /** Computed course lifecycle from CourseComputedStatus — never a stored DB status. */
  is_ended?: boolean | null
  computed_status?: string | null
  lifecycle_status?: string | null
  meeting_link?: string | null
  /** Placement fields — preserved so card can render correct CTA */
  requires_placement_test?: boolean
  placement_status?: string | null
  can_start_learning?: boolean | null
  placement_score?: number | null
  placement_total?: number | null
  placement_percentage?: number | null
  placement_estimated_level?: string | null
  /** Oral assessment fields extracted from placement_progress.oral_assessment */
  oral_booking_status?: string | null
  oral_booking_starts_at?: string | null
  oral_booking_ends_at?: string | null
  oral_final_level?: string | null
  oral_score?: number | null
  cover_url?: string | null
  /** Class group assignment — null until instructor assigns the student */
  class_assignment?: StudentClassAssignment | null
}

function slugifyFallback(id: number): string {
  return `course-${id}`
}

/** Prefer explicit course/program ids before falling back to top-level row id (may be enrollment/registration pk). */
function pickCoursePkFromEnrollmentLikeRow(
  o: Record<string, unknown>,
  nested: Record<string, unknown> | null,
): number | null {
  const tryNum = (v: unknown): number | null => {
    if (v == null || v === '') return null
    const n = Number(v)
    return Number.isFinite(n) && n > 0 ? n : null
  }

  const explicit =
    tryNum(o.course_id) ??
    tryNum(o.courseId) ??
    tryNum(o.course_pk) ??
    tryNum(o.course_primary_id) ??
    tryNum(o.program_id) ??
    (nested ? tryNum(nested.course_id) ?? tryNum(nested.program_id) ?? tryNum(nested.id) : null)
  const topId = tryNum(o.id)

  const pk = explicit ?? topId ?? null

  return pk && pk > 0 ? pk : null
}

function normalizeListedCourse(raw: unknown): StudentListedCourse | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const nested =
    o.course && typeof o.course === 'object' && !Array.isArray(o.course) ? (o.course as Record<string, unknown>) : null
  const id = pickCoursePkFromEnrollmentLikeRow(o, nested)
  if (!(id != null && id > 0)) return null
  const title = String(o.title ?? o.course_title ?? nested?.title ?? slugifyFallback(id))
  const slugRaw = o.slug ?? o.course_slug ?? nested?.slug
  const startRaw = o.start_date ?? nested?.start_date ?? o.course_start_date
  const timeRaw = o.start_time ?? nested?.start_time ?? o.study_time
  const endRaw = o.end_date ?? nested?.end_date
  const endTimeRaw = o.end_time ?? nested?.end_time
  const isEndedRaw = o.is_ended ?? nested?.is_ended
  const computedStatusRaw = o.computed_status ?? nested?.computed_status
  const lifecycleStatusRaw = o.lifecycle_status ?? nested?.lifecycle_status
  const meetRaw = o.meeting_link ?? nested?.meeting_link ?? o.join_url

  // Placement fields — read from top-level, placement_progress nested object, AND nested course object
  // placement_progress is the authoritative source: backend sends placement_progress.status, never flat placement_status
  const ppObj =
    o.placement_progress && typeof o.placement_progress === 'object' && !Array.isArray(o.placement_progress)
      ? (o.placement_progress as Record<string, unknown>)
      : null
  const ppWt =
    ppObj?.written_test && typeof ppObj.written_test === 'object' && !Array.isArray(ppObj.written_test)
      ? (ppObj.written_test as Record<string, unknown>)
      : null
  const ppOa =
    ppObj?.oral_assessment && typeof ppObj.oral_assessment === 'object' && !Array.isArray(ppObj.oral_assessment)
      ? (ppObj.oral_assessment as Record<string, unknown>)
      : null

  const rawRequires = o.requires_placement_test ?? o.requires_placement ?? nested?.requires_placement_test ?? nested?.requires_placement
  const hasPlacementTestType = (nested?.placement_test_type ?? o.placement_test_type) != null
  // FIX #1: read from placement_progress.status first (backend wraps status inside placement_progress)
  const rawPlacementStatus =
    o.placement_status ??
    ppObj?.status ??
    nested?.placement_status
  const placementStatusStr = rawPlacementStatus != null && String(rawPlacementStatus).trim() !== '' ? String(rawPlacementStatus) : null
  // Course requires placement if explicitly flagged OR placement_test_type exists OR a non-null non-completed status is present
  const requiresPlacementTest =
    !!rawRequires ||
    hasPlacementTestType ||
    (placementStatusStr != null && placementStatusStr !== 'completed' && placementStatusStr !== 'none')
  const rawCanStart = o.can_start_learning ?? nested?.can_start_learning
  const canStartLearning = rawCanStart != null ? !!rawCanStart : null
  // FIX #2: read score/total from placement_progress.written_test when not at top-level
  const rawScore = o.placement_score ?? o.written_score ?? ppWt?.score ?? nested?.placement_score ?? nested?.written_score
  const placementScore = rawScore != null && Number.isFinite(Number(rawScore)) ? Number(rawScore) : null
  const rawTotal = o.placement_total ?? o.total_questions ?? ppWt?.total_questions ?? nested?.placement_total ?? nested?.total_questions
  const placementTotal = rawTotal != null && Number.isFinite(Number(rawTotal)) ? Number(rawTotal) : null
  const rawPct = ppWt?.percentage ?? null
  const placementPercentage = rawPct != null && Number.isFinite(Number(rawPct)) ? Number(rawPct) : null
  const rawEstLevel = ppWt?.estimated_level ?? null
  const placementEstimatedLevel = rawEstLevel != null && String(rawEstLevel).trim() !== '' ? String(rawEstLevel) : null
  // FIX #3: extract oral assessment data from placement_progress.oral_assessment
  const oralBookingStatus    = ppOa?.status       != null ? String(ppOa.status)       : null
  const oralBookingStartsAt  = ppOa?.starts_at    != null ? String(ppOa.starts_at)    : null
  const oralBookingEndsAt    = ppOa?.ends_at      != null ? String(ppOa.ends_at)      : null
  const oralFinalLevel       = ppOa?.final_level  != null ? String(ppOa.final_level)  : null
  const oralScoreVal         = ppOa?.oral_score   != null && Number.isFinite(Number(ppOa.oral_score)) ? Number(ppOa.oral_score) : null

  // Cover image — check top-level and nested
  const coverKeys = ['course_image', 'image_url', 'cover_image', 'thumbnail', 'image', 'cover', 'media_url']
  let coverUrl: string | null = null
  for (const k of coverKeys) {
    const v = o[k] ?? nested?.[k]
    if (v != null && String(v).trim() !== '') { coverUrl = String(v).trim(); break }
  }

  // Class assignment — parse from top-level class_assignment object
  const caRaw = o.class_assignment
  const caObj = caRaw && typeof caRaw === 'object' && !Array.isArray(caRaw) ? (caRaw as Record<string, unknown>) : null
  const classAssignment: StudentClassAssignment | null = caObj
    ? {
        class_group_id: Number(caObj.class_group_id ?? caObj.id),
        name:           String(caObj.name ?? ''),
        level_code:     caObj.level_code   != null ? String(caObj.level_code)   : null,
        schedule_day:   caObj.schedule_day != null ? String(caObj.schedule_day) : null,
        schedule_time:  caObj.schedule_time != null ? String(caObj.schedule_time) : null,
        location_type:  caObj.location_type != null ? String(caObj.location_type) : null,
        meeting_link:   caObj.meeting_link  != null ? String(caObj.meeting_link)  : null,
        start_date:     caObj.start_date    != null ? String(caObj.start_date)    : null,
        instructor_name: caObj.instructor_name != null ? String(caObj.instructor_name) : null,
        assigned_at:    caObj.assigned_at   != null ? String(caObj.assigned_at)   : null,
      }
    : null

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
    end_date: endRaw != null && String(endRaw).trim() !== '' ? String(endRaw) : null,
    end_time: endTimeRaw != null && String(endTimeRaw).trim() !== '' ? String(endTimeRaw) : null,
    is_ended: isEndedRaw != null ? !!isEndedRaw : null,
    computed_status: computedStatusRaw != null ? String(computedStatusRaw) : null,
    lifecycle_status: lifecycleStatusRaw != null ? String(lifecycleStatusRaw) : null,
    meeting_link: meetRaw != null && String(meetRaw).trim() !== '' ? String(meetRaw) : null,
    requires_placement_test: requiresPlacementTest,
    placement_status: placementStatusStr,
    can_start_learning: canStartLearning,
    placement_score: placementScore,
    placement_total: placementTotal,
    placement_percentage: placementPercentage,
    placement_estimated_level: placementEstimatedLevel,
    oral_booking_status: oralBookingStatus,
    oral_booking_starts_at: oralBookingStartsAt,
    oral_booking_ends_at: oralBookingEndsAt,
    oral_final_level: oralFinalLevel,
    oral_score: oralScoreVal,
    cover_url: coverUrl,
    class_assignment: classAssignment,
  }
}

function normalizeCourseProgressRow(x: unknown): StudentProgressPayload['course_progress'][number] | null {
  if (!x || typeof x !== 'object') return null
  const o = x as Record<string, unknown>
  const nestedCourse =
    o.course && typeof o.course === 'object' && !Array.isArray(o.course) ? (o.course as Record<string, unknown>) : null
  const cid = pickCoursePkFromEnrollmentLikeRow(o as Record<string, unknown>, nestedCourse)
  if (!(cid != null && cid > 0)) return null
  const slugFrom = (v: unknown) => (v != null && String(v).trim() !== '' ? String(v).trim() : undefined)
  return {
    course_id: cid,
    course_title: String(o.course_title ?? o.title ?? nestedCourse?.title ?? 'دورة'),
    slug: slugFrom(o.slug ?? o.course_slug ?? nestedCourse?.slug),
    progress_percent: toFiniteNumber(o.progress_percent ?? o.progress ?? o.percent),
    sessions_completed: Math.max(0, Math.floor(toFiniteNumber(o.sessions_completed ?? o.completed_sessions))),
    sessions_total: Math.max(0, Math.floor(toFiniteNumber(o.sessions_total ?? o.total_sessions))),
    assignments_done: Math.max(0, Math.floor(toFiniteNumber(o.assignments_done ?? o.completed_assignments))),
    assignments_total: Math.max(0, Math.floor(toFiniteNumber(o.assignments_total ?? o.total_assignments))),
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

function normalizeCertificateSummary(raw: unknown): StudentCertificateSummary | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = Number(o.id)
  if (!Number.isFinite(id)) return null
  const course =
    o.course && typeof o.course === 'object' && !Array.isArray(o.course) ?
      (o.course as Record<string, unknown>)
    : null
  const track =
    o.track && typeof o.track === 'object' && !Array.isArray(o.track) ?
      (o.track as Record<string, unknown>)
    : null
  const title = String(o.title ?? o.professional_title ?? 'شهادة')
  return {
    id,
    title,
    course_name:
      o.course_name != null ? String(o.course_name)
      : course?.title != null ? String(course.title)
      : null,
    track_name:
      o.track_name != null ? String(o.track_name)
      : track?.name != null ? String(track.name)
      : track?.title != null ? String(track.title)
      : null,
    issued_at: o.issued_at != null ? String(o.issued_at) : null,
    verification_code: o.verification_code != null ? String(o.verification_code) : null,
  }
}

function sumTrainingHoursFromCourses(rows: unknown[]): number {
  let total = 0
  for (const raw of rows) {
    if (!raw || typeof raw !== 'object') continue
    const o = raw as Record<string, unknown>
    const nested =
      o.course && typeof o.course === 'object' && !Array.isArray(o.course) ?
        (o.course as Record<string, unknown>)
      : null
    const hours = Number(o.training_hours ?? o.hours_count ?? nested?.training_hours ?? nested?.hours_count)
    if (Number.isFinite(hours) && hours > 0) total += hours
  }
  return total
}

function averageProgressField(rows: unknown[], keys: readonly string[]): number {
  let sum = 0
  let count = 0
  for (const raw of rows) {
    if (!raw || typeof raw !== 'object') continue
    const o = raw as Record<string, unknown>
    for (const k of keys) {
      const n = Number(o[k])
      if (Number.isFinite(n)) {
        sum += n
        count += 1
        break
      }
    }
  }
  return count > 0 ? Math.round(sum / count) : 0
}

const EMPTY_DASHBOARD_COUNTS: StudentDashboardCounts = {
  enrolled_courses_count: 0,
  active_courses_count: 0,
  completed_courses_count: 0,
  pending_assignments_count: 0,
  upcoming_sessions_count: 0,
  unread_notifications_count: 0,
  certificates_count: 0,
  learning_paths_count: 0,
}

function isDashboardCourseCompleted(status: string | undefined | null): boolean {
  const st = String(status ?? '').toLowerCase()
  return st.includes('complete') || st.includes('finished') || st === 'completed'
}

function mapListedCoursesToDashboard(rawList: unknown[]): StudentLmsDashboard['current_courses'] {
  return rawList
    .map(normalizeListedCourse)
    .filter((c): c is StudentListedCourse => c != null)
    .map((c) => ({
      id: c.id,
      title: c.title,
      slug: c.slug ?? null,
      instructor_name: c.instructor_name ?? null,
      progress_percent: c.progress_percent,
      status: c.status,
      start_date: c.start_date ?? null,
      start_time: c.start_time ?? null,
      meeting_link: c.meeting_link ?? null,
      cover_url: c.cover_url ?? null,
      requires_placement_test: c.requires_placement_test,
      placement_status: c.placement_status ?? null,
      can_start_learning: c.can_start_learning ?? null,
      class_assignment: c.class_assignment ?? null,
    }))
}

function countUnreadNotifications(
  notifications: unknown[],
  statsObj: Record<string, unknown> | null,
): number {
  if (statsObj?.unread_notifications_count != null) {
    return toFiniteNumber(statsObj.unread_notifications_count)
  }
  if (statsObj?.unread_notifications != null) {
    return toFiniteNumber(statsObj.unread_notifications)
  }
  let n = 0
  for (const raw of notifications) {
    if (!raw || typeof raw !== 'object') continue
    const o = raw as Record<string, unknown>
    if (typeof o.is_read === 'boolean') {
      if (!o.is_read) n += 1
    } else if (o.read_at == null || String(o.read_at).trim() === '') {
      n += 1
    }
  }
  return n
}

function buildDashboardCounts(
  statsObj: Record<string, unknown> | null,
  current_courses: StudentLmsDashboard['current_courses'],
  active_courses: StudentLmsDashboard['current_courses'],
  pending_assignments: StudentAssignment[],
  upcoming_sessions: LmsSession[],
  notifications: unknown[],
  certificates: StudentCertificateSummary[],
): StudentDashboardCounts {
  const pendingOnly = pending_assignments.filter(
    (a) => a.status === 'pending' || a.status === 'late',
  )
  const completedCourses = current_courses.filter((c) => isDashboardCourseCompleted(c.status))

  return {
    enrolled_courses_count: toFiniteNumber(
      statsObj?.enrolled_courses_count ?? statsObj?.courses_enrolled ?? current_courses.length,
    ),
    active_courses_count: toFiniteNumber(
      statsObj?.active_courses_count ?? active_courses.length,
    ),
    completed_courses_count: toFiniteNumber(
      statsObj?.completed_courses_count ?? completedCourses.length,
    ),
    pending_assignments_count: toFiniteNumber(
      statsObj?.pending_assignments_count ?? statsObj?.assignments_pending ?? pendingOnly.length,
    ),
    upcoming_sessions_count: toFiniteNumber(
      statsObj?.upcoming_sessions_count ?? upcoming_sessions.length,
    ),
    unread_notifications_count: countUnreadNotifications(notifications, statsObj),
    certificates_count: toFiniteNumber(
      statsObj?.certificates_count ?? statsObj?.certificates_earned ?? certificates.length,
    ),
    learning_paths_count: toFiniteNumber(statsObj?.learning_paths_count ?? 0),
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
      active_courses: [],
      recent_courses: [],
      counts: { ...EMPTY_DASHBOARD_COUNTS },
      upcoming_sessions: [],
      notifications: [],
    }
  }

  const row = unwrapped as Record<string, unknown>
  const statsObj =
    row.stats && typeof row.stats === 'object' && !Array.isArray(row.stats) ?
      (row.stats as Record<string, unknown>)
    : null

  const certsRaw = firstArray(row, ['certificates', 'certificates_placeholder'])
  const certificates = certsRaw
    .map(normalizeCertificateSummary)
    .filter((x): x is StudentCertificateSummary => x != null)

  const certificateObjects =
    certsRaw.length > 0 && certificates.length === 0 ?
      (certsRaw as { label: string; note?: string }[]).filter(
        (x) => x && typeof x === 'object' && typeof x.label === 'string',
      )
    : []

  const progressRows = firstArray(row, ['progress'])
  const coursesForHours = firstArray(row, ['courses', 'current_courses'])
  const training_hours =
    statsObj?.training_hours != null ?
      toFiniteNumber(statsObj.training_hours)
    : sumTrainingHoursFromCourses(coursesForHours)

  const progress_percent =
    row.progress_percent != null ?
      toFiniteNumber(row.progress_percent)
    : averageProgressField(progressRows, ['progress_percentage', 'progress_percent'])

  const attendance_percent =
    row.attendance_percent != null ?
      toFiniteNumber(row.attendance_percent)
    : averageProgressField(progressRows, ['attendance_percentage', 'attendance_percent'])

  const notifications = firstArray(row, ['notifications'])

  // Prefer the new segmented arrays; fall back to legacy flat list
  const upcomingRaw   = firstArray(row, ['upcoming_sessions', 'sessions', 'upcoming'])
  const liveRaw       = firstArray(row, ['live_sessions'])
  const endedRaw      = firstArray(row, ['ended_sessions'])
  const allSessRaw    = firstArray(row, ['all_sessions'])

  // upcoming_sessions = live + scheduled (for backward-compat consumers)
  const upcoming_sessions = parseSessionsPayload({
    upcoming_sessions: [...liveRaw, ...upcomingRaw],
    sessions:          [...liveRaw, ...upcomingRaw],
  })
  const live_sessions    = parseSessionsPayload({ upcoming_sessions: liveRaw,   sessions: liveRaw   })
  const ended_sessions   = parseSessionsPayload({ completed_sessions: endedRaw, sessions: endedRaw  })
  const all_sessions     = allSessRaw.length > 0
    ? parseSessionsPayload({ sessions: allSessRaw })
    : undefined

  const pendingRaw = firstArray(row, ['pending_assignments', 'assignments'])
  const pending_assignments = pendingRaw
    .map(normalizeStudentAssignmentRow)
    .filter((x): x is StudentAssignment => x != null)

  const currentCoursesRaw = firstArray(row, ['current_courses', 'courses'])
  const current_courses = mapListedCoursesToDashboard(currentCoursesRaw)

  const activeCoursesRaw = firstArray(row, ['active_courses'])
  let active_courses = mapListedCoursesToDashboard(activeCoursesRaw)
  if (active_courses.length === 0) {
    active_courses = current_courses.filter((c) => !isDashboardCourseCompleted(c.status))
  }

  const recentCoursesRaw = firstArray(row, ['recent_courses'])
  let recent_courses = mapListedCoursesToDashboard(recentCoursesRaw)
  if (recent_courses.length === 0) {
    recent_courses = current_courses.slice(0, 6)
  }

  const counts = buildDashboardCounts(
    statsObj,
    current_courses,
    active_courses,
    pending_assignments,
    upcoming_sessions,
    notifications,
    certificates,
  )

  const completedRaw = row.completed_sessions ?? row.completed
  const completed_sessions = Array.isArray(completedRaw) ?
    parseSessionsPayload({ completed_sessions: completedRaw })
  : ended_sessions.length > 0 ? ended_sessions : undefined

  return {
    progress_percent,
    attendance_percent,
    pending_assignments,
    current_courses,
    active_courses,
    recent_courses,
    counts,
    upcoming_sessions,
    live_sessions,
    ended_sessions: ended_sessions.length > 0 ? ended_sessions : undefined,
    all_sessions,
    completed_sessions,
    certificates: certificates.length > 0 ? certificates : undefined,
    certificates_count: counts.certificates_count,
    training_hours: training_hours > 0 ? training_hours : undefined,
    certificates_placeholder:
      certificateObjects.length > 0 ? certificateObjects : undefined,
    notifications: notifications.length > 0 ? (notifications as StudentLmsDashboard['notifications']) : [],
  }
}

/** Raw `{ data }` / bare body plus normalized LMS dashboard (one HTTP call). */
export async function fetchStudentLmsDashboardWithEnvelope(): Promise<{
  dashboard: StudentLmsDashboard
  envelope: unknown
  ok: boolean
}> {
  try {
    const res = await apiClient.get<unknown>('/student/dashboard', { skipErrorToast: true })
    return { dashboard: normalizeStudentLmsDashboard(res.data), envelope: res.data, ok: true }
  } catch {
    return { dashboard: normalizeStudentLmsDashboard(null), envelope: null, ok: false }
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

/** GET /student/courses — empty array on failure. */
export async function fetchStudentCoursesList(): Promise<StudentListedCourse[]> {
  try {
    const res = await apiClient.get<unknown>('/student/courses', { skipErrorToast: true })
    const rawList = coerceFlexibleList(res.data, ['courses', 'data', 'items', 'enrollments'])
    if (import.meta.env.DEV && rawList.length > 0) {
      const sample = rawList[0]
      if (sample && typeof sample === 'object') {
        const s = sample as Record<string, unknown>
        console.log('[EMC /student/courses] raw[0] keys:', Object.keys(s))
        console.log('[EMC /student/courses] placement fields:', {
          requires_placement_test: s.requires_placement_test,
          placement_status: s.placement_status,
          placement_progress_status: s.placement_progress && typeof s.placement_progress === 'object' ? (s.placement_progress as Record<string,unknown>).status : 'n/a',
          can_start_learning: s.can_start_learning,
          placement_score: s.placement_score,
          course_nested_keys: s.course && typeof s.course === 'object' ? Object.keys(s.course as object) : 'no nested course',
        })
      }
    }
    return rawList
      .map(normalizeListedCourse)
      .filter((x): x is StudentListedCourse => x != null)
  } catch {
    return []
  }
}

/**
 * Production hotfix — canonical backend payment/placement eligibility block.
 * Single source of truth: the backend (CourseAccessEligibilityService) decides
 * this, never re-derived on the frontend from `status`/registration existence.
 */
export type StudentCourseAccess = {
  is_paid_course: boolean
  payment_required: boolean
  payment_status: string | null
  payment_completed: boolean
  payment_url: string | null
  enrollment_active: boolean
  can_start_placement_test: boolean
  placement_test_required: boolean
  can_access_learning: boolean
  block_reason:
    | 'no_registration'
    | 'payment_pending'
    | 'payment_failed'
    | 'payment_required'
    | 'registration_cancelled'
    | 'placement_test_required'
    | 'placement_test_in_progress'
    | 'access_allowed'
  registration_id: number | null
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
  end_date?: string | null
  end_time?: string | null
  is_ended?: boolean | null
  computed_status?: string | null
  lifecycle_status?: string | null
  meeting_link?: string | null
  instructor_name?: string | null
  /** Resolved from nested course media keys when backend sends them */
  course_cover_url?: string | null
  /** Payment / checkout flags when backend exposes them */
  payment_status?: string | null
  /** Placement test fields preserved from registration payload */
  requires_placement_test?: boolean
  placement_status?: string | null
  can_start_learning?: boolean | null
  /** Canonical backend eligibility block — see StudentCourseAccess. */
  access?: StudentCourseAccess | null
}

function normalizeAccessBlock(raw: unknown): StudentCourseAccess | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const a = raw as Record<string, unknown>
  return {
    is_paid_course: a.is_paid_course === true,
    payment_required: a.payment_required === true,
    payment_status: a.payment_status != null ? String(a.payment_status) : null,
    payment_completed: a.payment_completed === true,
    payment_url: a.payment_url != null && String(a.payment_url).trim() !== '' ? String(a.payment_url) : null,
    enrollment_active: a.enrollment_active === true,
    can_start_placement_test: a.can_start_placement_test === true,
    placement_test_required: a.placement_test_required === true,
    can_access_learning: a.can_access_learning === true,
    block_reason: (a.block_reason != null ? String(a.block_reason) : 'no_registration') as StudentCourseAccess['block_reason'],
    registration_id: typeof a.registration_id === 'number' ? a.registration_id : null,
  }
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
  const rawCoursePk =
    o.course_id ??
    o.courseId ??
    o.program_id ??
    nested?.course_id ??
    nested?.program_id ??
    nested?.id
  const course_id = Number(rawCoursePk)
  if (!Number.isFinite(id) || !Number.isFinite(course_id) || course_id <= 0) return null
  const slugRaw = o.slug ?? o.course_slug ?? nested?.slug
  const title = nested?.title ?? o.course_title ?? o.program_title ?? o.course_name
  const enrolled =
    o.enrolled_at ?? o.registered_at ?? o.created_at
  const startD = o.start_date ?? nested?.start_date ?? o.course_start_at
  const startT = o.start_time ?? nested?.start_time ?? o.study_time
  const endD = o.end_date ?? nested?.end_date
  const endT = o.end_time ?? nested?.end_time
  const isEndedRaw = o.is_ended ?? nested?.is_ended
  const computedStatusRaw = o.computed_status ?? nested?.computed_status
  const lifecycleStatusRaw = o.lifecycle_status ?? nested?.lifecycle_status
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

  // Placement fields from registration payload
  const rawRequiresReg = o.requires_placement_test ?? o.requires_placement ?? nested?.requires_placement_test ?? nested?.requires_placement
  const ppObjReg =
    o.placement_progress && typeof o.placement_progress === 'object' && !Array.isArray(o.placement_progress)
      ? (o.placement_progress as Record<string, unknown>)
      : null
  const rawPlacementStatusReg = o.placement_status ?? ppObjReg?.status ?? nested?.placement_status
  const placementStatusReg = rawPlacementStatusReg != null && String(rawPlacementStatusReg).trim() !== '' ? String(rawPlacementStatusReg) : null
  const requiresPlacementTestReg =
    !!rawRequiresReg ||
    (nested?.placement_test_type ?? o.placement_test_type) != null ||
    (placementStatusReg != null && placementStatusReg !== 'completed' && placementStatusReg !== 'none')
  const rawCanStartReg = o.can_start_learning ?? nested?.can_start_learning
  const canStartLearningReg = rawCanStartReg != null ? !!rawCanStartReg : null

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
    end_date: endD != null && String(endD).trim() !== '' ? String(endD) : null,
    end_time: endT != null && String(endT).trim() !== '' ? String(endT) : null,
    is_ended: isEndedRaw != null ? !!isEndedRaw : null,
    computed_status: computedStatusRaw != null ? String(computedStatusRaw) : null,
    lifecycle_status: lifecycleStatusRaw != null ? String(lifecycleStatusRaw) : null,
    meeting_link: link != null && String(link).trim() !== '' ? String(link) : null,
    instructor_name: inst,
    course_cover_url: cover ?? null,
    requires_placement_test: requiresPlacementTestReg || undefined,
    placement_status: placementStatusReg,
    can_start_learning: canStartLearningReg,
    access: normalizeAccessBlock(o.access),
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
    starts_at: o.starts_at != null ? String(o.starts_at) : o.start_at != null ? String(o.start_at) : null,
    ends_at: o.ends_at != null ? String(o.ends_at) : o.end_at != null ? String(o.end_at) : null,
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

/** POST /student/sessions/{id}/open-link — records and returns meeting URL */
export async function openStudentSessionLink(sessionId: number): Promise<string> {
  const res = await apiClient.post<unknown>(
    `/student/sessions/${sessionId}/open-link`,
    {},
    { skipErrorToast: true } as Record<string, unknown>,
  )
  const data = (res.data as Record<string, unknown>)
  const url = data?.meeting_url ?? (data?.data as Record<string, unknown>)?.meeting_url
  if (typeof url === 'string' && url) return url
  throw new Error('لم يتم إرجاع رابط الاجتماع')
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

    // Merge course_sessions (CourseSession model) from additional data
    const topLevel = res.data != null && typeof res.data === 'object' ? (res.data as Record<string, unknown>) : {}
    const courseSessExtra = Array.isArray(topLevel.course_sessions)
      ? normalizeList(topLevel.course_sessions as unknown[])
      : []

    function mergeAndDedupe(sessions: LmsSession[]): { upcoming: LmsSession[]; completed: LmsSession[] } {
      const merged = [...sessions, ...courseSessExtra]
      const seen = new Set<number>()
      const deduped = merged.filter((s) => {
        const key = s.id
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      return {
        upcoming: deduped.filter((s) => s.status !== 'completed' && s.status !== 'cancelled'),
        completed: deduped.filter((s) => s.status === 'completed'),
      }
    }

    if (Array.isArray(raw)) {
      return mergeAndDedupe(normalizeList(raw))
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
      // Merge course sessions in
      const { upcoming: csUpcoming, completed: csCompleted } = mergeAndDedupe([])
      return {
        upcoming: [...upcomingSessions, ...csUpcoming],
        completed: [...completedSessions, ...csCompleted],
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
  if (s === 'zip' || s === 'programming_project') return 'zip'
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
    // Backend's material Resources (LmsCourseMaterialResource / CourseMaterialResource)
    // send the external-link field as `external_url` — `url`/`link` were never
    // actually present in this endpoint's response, so link-type materials always
    // normalized to a null url and rendered "لا رابط أو ملف متاح" regardless of
    // whether a valid link existed server-side.
    url:
      o.external_url != null ? String(o.external_url)
      : o.url != null ? String(o.url)
      : o.link != null ? String(o.link)
      : null,
    description: o.description != null ? String(o.description) : null,
    course_name:
      o.course_name != null ? String(o.course_name) : nested?.title != null ? String(nested.title) : null,
    size_label: o.size_label != null ? String(o.size_label) : null,
    updated_at: o.updated_at != null ? String(o.updated_at) : null,
    original_filename: o.original_filename != null ? String(o.original_filename) : null,
    extension: o.extension != null ? String(o.extension) : null,
    mime_type: o.mime_type != null ? String(o.mime_type) : null,
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
  const mySubmission =
    o.my_submission && typeof o.my_submission === 'object' && !Array.isArray(o.my_submission) ?
      (o.my_submission as Record<string, unknown>)
    : null

  const rowId = Number(o.id ?? o.student_assignment_id ?? o.course_assignment_id)
  const courseAssignmentId =
    o.course_assignment_id != null && Number.isFinite(Number(o.course_assignment_id)) ?
      Number(o.course_assignment_id)
    : Number.isFinite(rowId) ? rowId : null

  const assignment_id = resolveLmsAssignmentSubmitId({
    lms_assignment_id: o.lms_assignment_id != null ? Number(o.lms_assignment_id) : null,
    assignment_id:
      o.assignment_id != null ? Number(o.assignment_id)
      : nestedAssignment?.id != null ? Number(nestedAssignment.id)
      : null,
    id: Number.isFinite(rowId) ? rowId : null,
    course_assignment_id: courseAssignmentId,
  })

  if (assignment_id == null) return null

  const id =
    courseAssignmentId != null && Number.isFinite(courseAssignmentId) ?
      courseAssignmentId
    : Number.isFinite(rowId) ? rowId : assignment_id

  const cidRaw = o.course_id ?? nested?.id
  const course_id = cidRaw != null && cidRaw !== '' && Number.isFinite(Number(cidRaw)) ? Number(cidRaw) : null
  const statusRaw = String(
    o.status ?? mySubmission?.status ?? (mySubmission?.submitted_at || o.submitted_at ? 'submitted' : 'pending'),
  )

  return {
    id,
    course_id,
    assignment_id,
    title: String(o.title ?? o.assignment_title ?? nestedAssignment?.title ?? 'واجب'),
    course_name:
      o.course_name != null ?
        String(o.course_name)
      : nested?.title != null ?
        String(nested.title)
      : null,
    due_at:
      o.due_at != null ? String(o.due_at)
      : o.deadline != null ? String(o.deadline)
      : o.due_date != null ? String(o.due_date)
      : null,
    status: normalizeAssignmentStatus(statusRaw),
    score:
      o.score != null ? Number(o.score)
      : mySubmission?.score != null ? Number(mySubmission.score)
      : null,
    max_score:
      o.max_score != null ? Number(o.max_score)
      : o.max_points != null ? Number(o.max_points)
      : null,
    feedback:
      o.feedback != null ? String(o.feedback)
      : mySubmission?.feedback != null ? String(mySubmission.feedback)
      : null,
    submitted_at:
      o.submitted_at != null ? String(o.submitted_at)
      : mySubmission?.submitted_at != null ? String(mySubmission.submitted_at)
      : null,
    submission_id:
      mySubmission?.id != null && Number.isFinite(Number(mySubmission.id)) ?
        Number(mySubmission.id)
      : o.submission_id != null && Number.isFinite(Number(o.submission_id)) ?
        Number(o.submission_id)
      : null,
  }
}

/**
 * Authenticated file download — uses the Bearer token via Axios, never
 * window.open / window.location.href (which drop the Authorization header
 * and cause the backend to return 401 Unauthenticated).
 *
 * Throws on failure so the caller can show a proper error state in the UI.
 */
export async function downloadMaterial(materialId: number, fallbackFilename?: string): Promise<void> {
  const res = await apiClient.get<Blob>(`/materials/${materialId}/download`, {
    responseType: 'blob',
    skipErrorToast: true,
  })
  const blob = res.data
  const disposition = String(res.headers['content-disposition'] ?? '')

  // Parse RFC 5987 filename* first (UTF-8 encoded), then fall back to filename=.
  let filename: string | null = null
  const rfc5987 = /filename\*\s*=\s*UTF-8''([^\s;]+)/i.exec(disposition)
  if (rfc5987?.[1]) {
    try { filename = decodeURIComponent(rfc5987[1]) } catch { /* ignore */ }
  }
  if (!filename) {
    const ascii = /filename[^;=\n]*=(['"]?)([^'";\n]+)\1/i.exec(disposition)
    filename = ascii?.[2]?.trim() ?? null
  }
  filename = filename || fallbackFilename || `material-${materialId}`

  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(objectUrl)
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

export type AssignmentSubmitResult = {
  status: StudentAssignment['status']
  submitted_at: string | null
  submission_id: number | null
}

export async function submitStudentAssignment(
  assignmentId: number,
  payload: FormData | { text_answer?: string; answer_text?: string; file?: File | null; notes?: string },
): Promise<AssignmentSubmitResult> {
  const post = async (body: FormData) => {
    const res = await apiClient.post<unknown>(`/student/assignments/${assignmentId}/submit`, body, {
      skipErrorToast: true,
    })
    const data = unwrapData<Record<string, unknown>>(res.data)
    const submittedAt =
      data?.submitted_at != null ? String(data.submitted_at)
      : data?.submittedAt != null ? String(data.submittedAt)
      : new Date().toISOString()
    const submissionId =
      data?.id != null && Number.isFinite(Number(data.id)) ? Number(data.id) : null
    const statusRaw = data?.status != null ? String(data.status) : 'submitted'
    return {
      status: normalizeAssignmentStatus(statusRaw),
      submitted_at: submittedAt,
      submission_id: submissionId,
    } satisfies AssignmentSubmitResult
  }

  if (payload instanceof FormData) {
    return post(payload)
  }
  const fd = new FormData()
  const text = payload.text_answer ?? payload.answer_text
  if (text) {
    fd.append('text_answer', text)
    fd.append('answer_text', text)
  }
  if (payload.notes) fd.append('notes', payload.notes)
  if (payload.file) fd.append('file', payload.file)
  return post(fd)
}

export async function fetchStudentProgress(): Promise<StudentProgressPayload> {
  try {
    const res = await apiClient.get<unknown>('/student/progress', { skipErrorToast: true })
    return normalizeStudentProgressPayload(res.data)
  } catch {
    return normalizeStudentProgressPayload(null)
  }
}

function normalizeStudentAttendanceRow(raw: unknown): StudentAttendanceRecord | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = Number(o.id ?? o.attendance_id)
  if (!Number.isFinite(id)) return null
  const session_id = o.session_id != null && Number.isFinite(Number(o.session_id)) ? Number(o.session_id) : null
  const course_session_id =
    o.course_session_id != null && Number.isFinite(Number(o.course_session_id)) ?
      Number(o.course_session_id)
    : null
  return {
    id,
    session_id,
    course_session_id,
    session_title: String(o.session_title ?? o.title ?? '—'),
    course_id: o.course_id != null && Number.isFinite(Number(o.course_id)) ? Number(o.course_id) : null,
    course_title: o.course_title != null ? String(o.course_title) : null,
    date: o.date != null ? String(o.date) : null,
    starts_at: o.starts_at != null ? String(o.starts_at) : null,
    status: String(o.status ?? '—'),
    notes: o.notes != null ? String(o.notes) : null,
    marked_at: o.marked_at != null ? String(o.marked_at) : null,
  }
}

/** GET /student/attendance — student's attendance history with session/course metadata. */
export async function fetchStudentAttendance(): Promise<StudentAttendanceRecord[]> {
  try {
    const res = await apiClient.get<unknown>('/student/attendance', { skipErrorToast: true })
    const rawList = coerceFlexibleList(res.data, ['data', 'attendance', 'records', 'items'])
    return rawList.map(normalizeStudentAttendanceRow).filter((x): x is StudentAttendanceRecord => x != null)
  } catch {
    return []
  }
}

export type StudentAttendanceSummary = {
  total: number
  present_count: number
  absent_count: number
  late_count: number
  excused_count: number
  attendance_percentage: number
  current_attendance_streak: number
  current_absence_streak: number
  current_late_streak: number
  longest_attendance_streak: number
  longest_absence_streak: number
  risk_level: 'low' | 'medium' | 'high'
}

/** GET /student/attendance/summary — Ticket 6: student's own attendance
 *  statistics/streaks. Always derives the student from auth server-side. */
export async function fetchStudentAttendanceSummary(courseId?: number): Promise<StudentAttendanceSummary> {
  const res = await apiClient.get<unknown>('/student/attendance/summary', {
    params: courseId ? { course_id: courseId } : {}, skipErrorToast: true,
  })
  const data = (res.data as Record<string, unknown>)?.data as StudentAttendanceSummary | undefined
  return data ?? {
    total: 0, present_count: 0, absent_count: 0, late_count: 0, excused_count: 0,
    attendance_percentage: 0, current_attendance_streak: 0, current_absence_streak: 0,
    current_late_streak: 0, longest_attendance_streak: 0, longest_absence_streak: 0, risk_level: 'low',
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
