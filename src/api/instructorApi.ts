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

export async function putInstructorAttendance(
  sessionId: number,
  records: { student_id: number; status: string }[],
): Promise<void> {
  await apiClient.put(`/instructor/attendance/${sessionId}`, { records })
}

export async function fetchInstructorAttendanceSession(sessionId: number): Promise<AttendanceRow[]> {
  const res = await apiClient.get<unknown>(`/instructor/attendance/${sessionId}`)
  return asList<AttendanceRow>(res.data)
}

export async function fetchInstructorAssignmentsQueue(): Promise<InstructorSubmission[]> {
  const res = await apiClient.get<unknown>('/instructor/assignments')
  return asList<InstructorSubmission>(res.data)
}

export async function fetchSubmissionDetail(submissionId: number): Promise<SubmissionDetail> {
  const res = await apiClient.get<unknown>(`/instructor/submissions/${submissionId}`)
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

// ─── Materials ────────────────────────────────────────────────────────────────

export type InstructorMaterial = {
  id: number
  course_id: number
  session_id: number | null
  title: string
  description: string | null
  file_path: string | null
  external_url: string | null
  type: string | null
  sort_order: number | null
  course?: { id: number; title: string }
  session?: { id: number; title: string }
  created_at?: string
  updated_at?: string
}

export async function fetchInstructorMaterials(params?: {
  course_id?: number
  type?: string
}): Promise<InstructorMaterial[]> {
  const res = await apiClient.get<unknown>('/instructor/materials', { params })
  return asList<InstructorMaterial>(res.data)
}

export async function createInstructorMaterial(data: Partial<InstructorMaterial>): Promise<InstructorMaterial> {
  const res = await apiClient.post<unknown>('/instructor/materials', data)
  return unwrapLms<InstructorMaterial>(res.data)
}

export async function updateInstructorMaterial(id: number, data: Partial<InstructorMaterial>): Promise<InstructorMaterial> {
  const res = await apiClient.put<unknown>(`/instructor/materials/${id}`, data)
  return unwrapLms<InstructorMaterial>(res.data)
}

export async function deleteInstructorMaterial(id: number): Promise<void> {
  await apiClient.delete(`/instructor/materials/${id}`)
}

// ─── Recordings ───────────────────────────────────────────────────────────────

export type InstructorRecording = {
  id: number
  title: string
  recording_url: string
  session_date: string
  course?: { id: number; title: string }
  workshop?: { id: number; title: string }
}

export async function fetchInstructorRecordings(params?: { course_id?: number }): Promise<InstructorRecording[]> {
  const res = await apiClient.get<unknown>('/instructor/recordings', { params })
  return asList<InstructorRecording>(res.data)
}

// ─── Evaluations ──────────────────────────────────────────────────────────────

export type StudentEvaluation = {
  id: number
  user_id: number
  course_id: number
  rating: number
  content_quality: number | null
  instructor_quality: number | null
  organization_quality: number | null
  comment: string | null
  user?: { id: number; name: string; email: string }
  course?: { id: number; title: string }
  created_at: string
}

export async function fetchInstructorEvaluations(params?: {
  course_id?: number
  rating?: number
}): Promise<StudentEvaluation[]> {
  const res = await apiClient.get<unknown>('/instructor/evaluations', { params })
  return asList<StudentEvaluation>(res.data)
}

// ─── Progress ─────────────────────────────────────────────────────────────────

export type StudentProgressItem = {
  id: number
  user_id: number
  course_id: number
  progress_percentage: number
  completed_sessions: number
  total_sessions: number
  attendance_percentage: number
  assignment_completion_percentage: number
  status: string
  user?: { id: number; name: string; email: string }
  course?: { id: number; title: string }
}

export async function fetchInstructorProgress(params?: {
  course_id?: number
  status?: string
  q?: string
}): Promise<StudentProgressItem[]> {
  const res = await apiClient.get<unknown>('/instructor/progress', { params })
  return asList<StudentProgressItem>(res.data)
}

// ─── Tickets ──────────────────────────────────────────────────────────────────

export type InstructorTicket = {
  id: number
  user_id: number
  name: string
  email: string
  type: string
  priority: string
  status: string
  subject: string
  message: string
  assigned_to?: number | null
  replies?: InstructorTicketReply[]
  assignedTo?: { id: number; name: string } | null
  created_at: string
}

export type InstructorTicketReply = {
  id: number
  user_id: number
  message: string
  user?: { id: number; name: string }
  created_at: string
}

export async function fetchInstructorTickets(params?: { status?: string }): Promise<InstructorTicket[]> {
  const res = await apiClient.get<unknown>('/instructor/tickets', { params })
  return asList<InstructorTicket>(res.data)
}

export async function createInstructorTicket(data: {
  type: string
  priority: string
  subject: string
  message: string
}): Promise<InstructorTicket> {
  const res = await apiClient.post<unknown>('/instructor/tickets', data)
  return unwrapLms<InstructorTicket>(res.data)
}

export async function fetchInstructorTicket(id: number): Promise<InstructorTicket> {
  const res = await apiClient.get<unknown>(`/instructor/tickets/${id}`)
  return unwrapLms<InstructorTicket>(res.data)
}

export async function replyInstructorTicket(ticketId: number, message: string): Promise<InstructorTicketReply> {
  const res = await apiClient.post<unknown>(`/instructor/tickets/${ticketId}/reply`, { message })
  return unwrapLms<InstructorTicketReply>(res.data)
}
