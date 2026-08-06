import apiClient from './axios'
import type { AdminLmsRow, AttendanceRow, LmsMaterial, LmsSession, StudentAssignment } from '../types/lms'
import { asList, unwrapLms } from './lmsApi'

export type SessionLinkOpenStudent = {
  id: number | null
  name: string | null
  email: string | null
  opened_at: string | null
}

export type AdminSession = LmsSession & {
  course_title?: string | null
  instructor_id?: number | null
  instructor_name?: string | null
  start_at?: string | null
  end_at?: string | null
  session_date?: string | null
  start_time?: string | null
  end_time?: string | null
  meeting_url?: string | null
  location_type?: string | null
  attendance_count?: number | null
  status_label_ar?: string | null
  is_ended?: boolean
  is_cancelled?: boolean
  is_live?: boolean
  is_upcoming?: boolean
  link_open_count?: number | null
  link_open_students?: SessionLinkOpenStudent[]
}

export async function adminListSessions(): Promise<AdminSession[]> {
  const res = await apiClient.get<unknown>('/admin/lms/sessions', { params: { per_page: 200 } })
  return asList<AdminSession>(res.data)
}

export async function adminGetSessionLinkOpens(sessionId: number): Promise<SessionLinkOpenStudent[]> {
  const res = await apiClient.get<unknown>(`/admin/lms/sessions/${sessionId}/link-opens`)
  const inner = (res.data as Record<string, unknown>)?.data
  return Array.isArray(inner) ? (inner as SessionLinkOpenStudent[]) : []
}

export async function adminCreateSession(body: Partial<LmsSession>): Promise<LmsSession> {
  const res = await apiClient.post<unknown>('/admin/lms/sessions', body)
  return unwrapLms<LmsSession>(res.data)
}

export async function adminUpdateSession(id: number, body: Partial<LmsSession>): Promise<LmsSession> {
  const res = await apiClient.put<unknown>(`/admin/lms/sessions/${id}`, body)
  return unwrapLms<LmsSession>(res.data)
}

export async function adminDeleteSession(id: number): Promise<void> {
  await apiClient.delete(`/admin/lms/sessions/${id}`)
}

export async function adminListAttendance(): Promise<AdminLmsRow[]> {
  const res = await apiClient.get<unknown>('/admin/lms/attendance')
  return asList<AdminLmsRow>(res.data)
}

export async function adminAttendanceDetail(sessionId: number): Promise<AttendanceRow[]> {
  const res = await apiClient.get<unknown>(`/admin/lms/attendance/${sessionId}`)
  return asList<AttendanceRow>(res.data)
}

export async function adminListAssignments(): Promise<StudentAssignment[]> {
  const res = await apiClient.get<unknown>('/admin/lms/assignments')
  return asList<StudentAssignment>(res.data)
}

export async function adminStoreAssignment(body: Record<string, unknown>): Promise<unknown> {
  const res = await apiClient.post<unknown>('/admin/lms/assignments', body)
  return unwrapLms(res.data)
}

export async function adminUpdateAssignment(id: number, body: Record<string, unknown>): Promise<unknown> {
  const res = await apiClient.put<unknown>(`/admin/lms/assignments/${id}`, body)
  return unwrapLms(res.data)
}

export async function adminDeleteAssignment(id: number): Promise<void> {
  await apiClient.delete(`/admin/lms/assignments/${id}`)
}

export type AdminAssignmentListItem = {
  id: number
  title?: string | null
  course_id?: number | null
  course_title?: string | null
  course?: { id: number; title?: string | null } | null
  instructor_name?: string | null
  instructor?: { id: number; name?: string | null; email?: string | null } | null
  due_date?: string | null
  max_score?: number | null
  status?: string | null
  assignment_status?: string | null
  submissions_count?: number
  pending_submissions_count?: number
  pending_count?: number
  graded_submissions_count?: number
  graded_count?: number
  needs_resubmission_count?: number
  description?: string | null
}

export type AdminAssignmentSubmissionRow = {
  id: number
  user_id?: number | null
  student_name?: string | null
  student_email?: string | null
  submitted_at?: string | null
  status?: string
  score?: number | null
  grade?: number | null
  feedback?: string | null
  has_file?: boolean
  has_text?: boolean
  text_answer?: string | null
  notes?: string | null
  file_url?: string | null
}

export type AdminAssignmentStudentRow = {
  user_id?: number | null
  name?: string | null
  email?: string | null
  registration_status?: string | null
  submitted?: boolean
  submission_status?: string
  submitted_at?: string | null
  score?: number | null
  is_late?: boolean
  progress_percentage?: number
}

export type AdminAssignmentDetail = {
  assignment: {
    id: number
    title?: string | null
    description?: string | null
    instructions?: string | null
    due_date?: string | null
    max_score?: number | null
    status?: string | null
    submission_type?: string | null
    resubmission_allowed?: boolean
    course_id?: number | null
    workshop_id?: number | null
    created_at?: string | null
  }
  course?: { id: number; title?: string | null; slug?: string | null } | null
  instructor?: { id: number; name?: string | null; email?: string | null } | null
  stats: {
    submissions_count?: number
    pending_submissions_count?: number
    graded_submissions_count?: number
    needs_resubmission_count?: number
    late_submissions_count?: number
  }
  submissions: AdminAssignmentSubmissionRow[]
  students: AdminAssignmentStudentRow[]
}

export async function adminGetAssignmentDetail(id: number): Promise<AdminAssignmentDetail> {
  const res = await apiClient.get<unknown>(`/admin/lms/assignments/${id}`)
  const inner = unwrapLms<AdminAssignmentDetail>(res.data)
  return {
    assignment: inner.assignment ?? ({} as AdminAssignmentDetail['assignment']),
    course: inner.course ?? null,
    instructor: inner.instructor ?? null,
    stats: inner.stats ?? {},
    submissions: Array.isArray(inner.submissions) ? inner.submissions : [],
    students: Array.isArray(inner.students) ? inner.students : [],
  }
}

export async function adminListMaterials(): Promise<LmsMaterial[]> {
  const res = await apiClient.get<unknown>('/admin/lms/materials')
  return asList<LmsMaterial>(res.data)
}

export async function adminStoreMaterial(body: FormData | Record<string, unknown>): Promise<LmsMaterial> {
  const res =
    body instanceof FormData
      ? await apiClient.post<unknown>('/admin/lms/materials', body, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      : await apiClient.post<unknown>('/admin/lms/materials', body)
  return unwrapLms<LmsMaterial>(res.data)
}

export async function adminUpdateMaterial(id: number, body: FormData | Record<string, unknown>): Promise<LmsMaterial> {
  const res =
    body instanceof FormData
      ? await apiClient.post<unknown>(`/admin/lms/materials/${id}?_method=PATCH`, body, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      : await apiClient.patch<unknown>(`/admin/lms/materials/${id}`, body)
  return unwrapLms<LmsMaterial>(res.data)
}

export async function adminDeleteMaterial(id: number): Promise<void> {
  await apiClient.delete(`/admin/lms/materials/${id}`)
}

/**
 * Fetch a material file as an authenticated Blob.
 * mode='file'     → inline preview (Content-Disposition: inline)
 * mode='download' → attachment (Content-Disposition: attachment)
 *
 * Uses the axios apiClient so the Authorization: Bearer header is sent.
 * The caller must revoke the resulting object URL when done.
 */
export async function adminFetchMaterialBlob(
  id: number,
  mode: 'file' | 'download',
): Promise<{ blob: Blob; mime: string }> {
  const res = await apiClient.get<Blob>(`/admin/lms/materials/${id}/${mode}`, {
    responseType: 'blob',
  })

  const rawType = String(res.headers['content-type'] ?? res.data.type ?? 'application/octet-stream')
  const mime = rawType.split(';')[0].trim()

  if (mime.includes('application/json') || res.data.type?.includes('json')) {
    const text = await res.data.text()
    let message = 'تعذّر تحميل الملف.'
    try {
      const parsed = JSON.parse(text) as { message?: string }
      if (parsed.message) message = parsed.message
    } catch {
      /* keep default */
    }
    const err = new Error(message) as Error & { response?: { status?: number } }
    err.response = { status: res.status }
    throw err
  }

  const blob = res.data.size > 0 && !res.data.type ? new Blob([res.data], { type: mime }) : res.data
  return { blob, mime }
}

export async function adminListEvaluations(): Promise<AdminLmsRow[]> {
  const res = await apiClient.get<unknown>('/admin/lms/evaluations')
  return asList<AdminLmsRow>(res.data)
}

export async function adminListProgress(): Promise<AdminLmsRow[]> {
  const res = await apiClient.get<unknown>('/admin/lms/progress')
  return asList<AdminLmsRow>(res.data)
}

export type StudentDetail = {
  student: {
    id: number
    name: string
    email: string
    avatar_url?: string | null
    created_at?: string | null
  }
  summary: {
    total_courses: number
    completed_courses: number
    in_progress_courses: number
    avg_progress: number
    total_sessions: number
    attended_sessions: number
    missed_sessions: number
    attendance_pct: number
    assignments_submitted: number
    assignments_pending: number
    avg_assignment_score: number | null
    certificates_count: number
    last_activity_at: string | null
    risk_level: 'on_track' | 'watch' | 'at_risk'
  }
  courses: Array<{
    course_id: number | null
    title: string
    progress: number
    status: string
    completed_at: string | null
    last_activity_at: string | null
    completed_sessions: number | null
    total_sessions: number | null
  }>
  learning_paths: Array<{
    path_id: number | null
    title: string
    status: string
    enrolled_at: string | null
    completed_at: string | null
  }>
  attendance: Array<{
    session_title: string
    date: string | null
    status: string
  }>
  assignments: Array<{
    title: string
    status: string
    submitted_at: string | null
    score: number | null
    feedback: string | null
  }>
  evaluations: Array<{
    id: number
    title: string
    type: string
    issued_at: string | null
    status: string
  }>
  activity: Array<{
    date: string | null
    type: string
    description: string
  }>
}

export async function adminFetchStudentDetail(userId: number): Promise<StudentDetail> {
  const res = await apiClient.get<StudentDetail>(`/admin/lms/progress/students/${userId}`)
  return (res.data as unknown as { data?: StudentDetail } & StudentDetail).data ?? res.data
}
