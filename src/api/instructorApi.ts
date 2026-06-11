import apiClient from './axios'
import type {
  AttendanceRow,
  InstructorLmsDashboard,
  InstructorSubmission,
  LmsSession,
  SubmissionDetail,
  TeachingCourseLms,
} from '../types/lms'
import type { User } from '../types'
import { asList, unwrapLms } from './lmsApi'

/* ── Instructor student row (enriched, across all courses) ───────────────── */

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
}

function normalizeInstructorStudentRow(r: unknown): InstructorStudentRow {
  if (!r || typeof r !== 'object') {
    return { id: 0, name: '', email: '', course_id: null, course_title: null, enrollment_status: null, placement_status: null, written_score: null, total_questions: null, written_level: null, oral_booking_at: null, final_level: null, oral_score: null, instructor_notes: null, enrolled_at: null, avatar_url: null, attempt_id: null }
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

  const score =
    o.written_score  != null ? Number(o.written_score)  :
    att?.written_score != null ? Number(att.written_score) :
    att?.score         != null ? Number(att.score)         : null

  const total =
    o.total_questions   != null ? Number(o.total_questions)   :
    att?.total_questions != null ? Number(att.total_questions) : null

  const courseTitle =
    o.course_title != null ? String(o.course_title) :
    o.course != null && typeof o.course === 'object'
      ? String((o.course as Record<string, unknown>).title ?? '') || null
      : null

  const oralBookingAt =
    oralObj != null
      ? (oralObj.starts_at != null ? String(oralObj.starts_at) : null)
      : o.oral_booking_at != null ? String(o.oral_booking_at) : null

  return {
    id:                Number(o.id ?? o.student_id ?? 0),
    name:              String(o.name ?? o.student_name ?? ''),
    email:             String(o.email ?? o.student_email ?? ''),
    course_id:         o.course_id != null ? Number(o.course_id) : null,
    course_title:      courseTitle,
    enrollment_status: o.enrollment_status != null ? String(o.enrollment_status) :
                       o.status           != null ? String(o.status)            : null,
    placement_status:  o.placement_status != null ? String(o.placement_status) :
                       att?.status        != null ? String(att.status)         : null,
    written_score:     score,
    total_questions:   total,
    written_level:     String(att?.written_level ?? att?.estimated_level ?? o.written_level ?? '') || null,
    oral_booking_at:   oralBookingAt,
    final_level:       o.final_level  != null ? String(o.final_level)  :
                       att?.final_level != null ? String(att.final_level) : null,
    oral_score:        o.oral_score   != null ? Number(o.oral_score)   :
                       att?.oral_score != null ? Number(att.oral_score) : null,
    instructor_notes:  o.instructor_notes != null ? String(o.instructor_notes) : null,
    enrolled_at:       o.enrolled_at  != null ? String(o.enrolled_at)  :
                       o.created_at   != null ? String(o.created_at)   : null,
    avatar_url:        o.avatar_url  != null ? String(o.avatar_url)  :
                       o.profile_photo_url != null ? String(o.profile_photo_url) : null,
    attempt_id:        o.attempt_id  != null ? Number(o.attempt_id)  :
                       att?.id       != null ? Number(att.id)        : null,
  }
}

export async function fetchInstructorLmsDashboard(): Promise<InstructorLmsDashboard> {
  const res = await apiClient.get<unknown>('/instructor/dashboard')
  return unwrapLms<InstructorLmsDashboard>(res.data)
}

export async function fetchInstructorSessions(): Promise<LmsSession[]> {
  const res = await apiClient.get<unknown>('/instructor/sessions')
  return asList<LmsSession>(res.data)
}

export async function fetchInstructorCourses(): Promise<TeachingCourseLms[]> {
  const res = await apiClient.get<unknown>('/instructor/courses')
  return asList<TeachingCourseLms>(res.data)
}

export async function fetchInstructorStudents(params?: {
  session_id?: number
  course_id?: number
}): Promise<User[]> {
  const res = await apiClient.get<unknown>('/instructor/students', { params })
  return asList<User>(res.data)
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
  records: { student_id: number; status: string }[],
): Promise<void> {
  await apiClient.put(`/instructor/attendance/${sessionId}`, { records })
}

export async function fetchInstructorAttendanceSession(sessionId: number): Promise<AttendanceRow[]> {
  try {
    const res = await apiClient.get<unknown>(`/instructor/attendance/${sessionId}`, { skipErrorToast: true } as Record<string, unknown>)
    return asList<AttendanceRow>(res.data)
  } catch {
    return []
  }
}

export async function fetchInstructorAssignmentsQueue(): Promise<InstructorSubmission[]> {
  const res = await apiClient.get<unknown>('/instructor/assignments')
  return asList<InstructorSubmission>(res.data)
}

export async function fetchSubmissionDetail(submissionId: number): Promise<SubmissionDetail> {
  const res = await apiClient.get<unknown>(`/instructor/submissions/${submissionId}`, { skipErrorToast: true } as Record<string, unknown>)
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
): Promise<void> {
  await apiClient.put(`/instructor/submissions/${submissionId}/review`, body)
}
