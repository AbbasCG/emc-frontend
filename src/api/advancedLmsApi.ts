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

export async function fetchAdminModules(): Promise<LmsModule[]> {
  try {
    const res = await apiClient.get<unknown>('/admin/lms/modules')
    return asList<LmsModule>(res.data)
  } catch {
    return []
  }
}

export async function fetchAdminLessons(): Promise<LmsLesson[]> {
  try {
    const res = await apiClient.get<unknown>('/admin/lms/lessons')
    return asList<LmsLesson>(res.data)
  } catch {
    return []
  }
}

export async function fetchAdminQuizzes(): Promise<LmsQuiz[]> {
  try {
    const res = await apiClient.get<unknown>('/admin/lms/quizzes')
    return asList<LmsQuiz>(res.data)
  } catch {
    return []
  }
}
