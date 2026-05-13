import apiClient from './axios'
import type {
  LmsMaterial,
  LmsSession,
  StudentAssignment,
  StudentLmsDashboard,
  StudentProgressPayload,
} from '../types/lms'
import { asList, unwrapLms } from './lmsApi'

export async function fetchStudentLmsDashboard(): Promise<StudentLmsDashboard> {
  const res = await apiClient.get<unknown>('/student/dashboard')
  return unwrapLms<StudentLmsDashboard>(res.data)
}

export async function fetchStudentSessions(): Promise<{
  upcoming: LmsSession[]
  completed: LmsSession[]
}> {
  const res = await apiClient.get<unknown>('/student/sessions')
  const raw = unwrapLms<{ upcoming?: LmsSession[]; completed?: LmsSession[] } | LmsSession[]>(res.data)
  if (Array.isArray(raw)) {
    const upcoming = raw.filter((s) => s.status !== 'completed')
    const completed = raw.filter((s) => s.status === 'completed')
    return { upcoming, completed }
  }
  return {
    upcoming: raw.upcoming ?? [],
    completed: raw.completed ?? [],
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
  const res = await apiClient.get<unknown>('/student/progress')
  return unwrapLms<StudentProgressPayload>(res.data)
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
