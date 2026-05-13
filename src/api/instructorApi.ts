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
