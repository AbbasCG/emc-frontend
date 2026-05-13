import apiClient from './axios'
import type { AdminLmsRow, AttendanceRow, LmsMaterial, LmsSession, StudentAssignment } from '../types/lms'
import { asList, unwrapLms } from './lmsApi'

export async function adminListSessions(): Promise<LmsSession[]> {
  const res = await apiClient.get<unknown>('/admin/lms/sessions')
  return asList<LmsSession>(res.data)
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

export async function adminDeleteMaterial(id: number): Promise<void> {
  await apiClient.delete(`/admin/lms/materials/${id}`)
}

export async function adminListEvaluations(): Promise<AdminLmsRow[]> {
  const res = await apiClient.get<unknown>('/admin/lms/evaluations')
  return asList<AdminLmsRow>(res.data)
}

export async function adminListProgress(): Promise<AdminLmsRow[]> {
  const res = await apiClient.get<unknown>('/admin/lms/progress')
  return asList<AdminLmsRow>(res.data)
}
