import apiClient from './axios'
import { asList, unwrapLms } from './lmsApi'
import type { LmsLesson, LmsModule, LmsQuiz, QuizAttemptResult } from '@/types/platform'

export async function fetchCourseModules(courseId: number): Promise<LmsModule[]> {
  try {
    const res = await apiClient.get<unknown>(`/lms/courses/${courseId}/modules`)
    return asList<LmsModule>(res.data)
  } catch {
    return []
  }
}

export async function fetchLesson(lessonId: number): Promise<LmsLesson> {
  const res = await apiClient.get<unknown>(`/lms/lessons/${lessonId}`)
  return unwrapLms<LmsLesson>(res.data)
}

export async function fetchQuiz(quizId: number): Promise<LmsQuiz> {
  const res = await apiClient.get<unknown>(`/lms/quizzes/${quizId}`)
  return unwrapLms<LmsQuiz>(res.data)
}

export async function submitQuizAnswers(
  quizId: number,
  answers: Record<number, number>,
): Promise<QuizAttemptResult> {
  const res = await apiClient.post<unknown>(`/lms/quizzes/${quizId}/submit`, { answers })
  return unwrapLms<QuizAttemptResult>(res.data)
}

export async function fetchAdminModules(params?: { course_id?: number }): Promise<LmsModule[]> {
  try {
    const res = await apiClient.get<unknown>('/admin/modules', { params })
    return asList<LmsModule>(res.data)
  } catch {
    return []
  }
}

export async function adminCreateModule(body: {
  course_id: number
  title: string
  description?: string
  sort_order?: number
  status?: string
}): Promise<LmsModule> {
  const res = await apiClient.post<unknown>('/admin/modules', body)
  return unwrapLms<LmsModule>(res.data)
}

export async function adminUpdateModule(id: number, body: {
  title?: string
  description?: string
  sort_order?: number
  status?: string
}): Promise<LmsModule> {
  const res = await apiClient.put<unknown>(`/admin/modules/${id}`, body)
  return unwrapLms<LmsModule>(res.data)
}

export async function adminGetModule(id: number): Promise<LmsModule> {
  const res = await apiClient.get<unknown>(`/admin/modules/${id}`)
  return unwrapLms<LmsModule>(res.data)
}

export async function adminDeleteModule(id: number): Promise<void> {
  await apiClient.delete(`/admin/modules/${id}`)
}

export async function fetchAdminLessons(params?: { module_id?: number }): Promise<LmsLesson[]> {
  try {
    const res = await apiClient.get<unknown>('/admin/lessons', { params })
    return asList<LmsLesson>(res.data)
  } catch {
    return []
  }
}

export async function adminCreateLesson(body: {
  module_id: number
  title: string
  description?: string
  video_url?: string
  duration_minutes?: number
  sort_order?: number
  status?: string
}): Promise<LmsLesson> {
  const res = await apiClient.post<unknown>('/admin/lessons', body)
  return unwrapLms<LmsLesson>(res.data)
}

export async function adminUpdateLesson(id: number, body: {
  module_id?: number
  title?: string
  description?: string
  video_url?: string
  duration_minutes?: number
  sort_order?: number
  status?: string
}): Promise<LmsLesson> {
  const res = await apiClient.put<unknown>(`/admin/lessons/${id}`, body)
  return unwrapLms<LmsLesson>(res.data)
}

export async function adminDeleteLesson(id: number): Promise<void> {
  await apiClient.delete(`/admin/lessons/${id}`)
}

export async function fetchAdminQuizzes(): Promise<LmsQuiz[]> {
  try {
    const res = await apiClient.get<unknown>('/admin/lms/quizzes')
    return asList<LmsQuiz>(res.data)
  } catch {
    return []
  }
}
