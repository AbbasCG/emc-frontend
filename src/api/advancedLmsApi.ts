import apiClient from './axios'
import { asList, unwrapLms } from './lmsApi'
import {
  seedLmsLesson,
  seedLmsModules,
  seedLmsQuiz,
  seedQuizResult,
} from '@/data/platformSeed'
import type { LmsLesson, LmsModule, LmsQuiz, QuizAttemptResult } from '@/types/platform'

export async function fetchCourseModules(courseId: number): Promise<LmsModule[]> {
  try {
    const res = await apiClient.get<unknown>(`/lms/courses/${courseId}/modules`)
    return asList<LmsModule>(res.data)
  } catch {
    return seedLmsModules(courseId)
  }
}

export async function fetchLesson(lessonId: number): Promise<LmsLesson> {
  try {
    const res = await apiClient.get<unknown>(`/lms/lessons/${lessonId}`)
    return unwrapLms<LmsLesson>(res.data)
  } catch {
    const s = seedLmsLesson(lessonId)
    if (!s) throw new Error('الدرس غير موجود')
    return s
  }
}

export async function fetchQuiz(quizId: number): Promise<LmsQuiz> {
  try {
    const res = await apiClient.get<unknown>(`/lms/quizzes/${quizId}`)
    return unwrapLms<LmsQuiz>(res.data)
  } catch {
    return seedLmsQuiz(quizId)
  }
}

export async function submitQuizAnswers(
  quizId: number,
  answers: Record<number, number>,
): Promise<QuizAttemptResult> {
  try {
    const res = await apiClient.post<unknown>(`/lms/quizzes/${quizId}/submit`, { answers })
    return unwrapLms<QuizAttemptResult>(res.data)
  } catch {
    return seedQuizResult()
  }
}

export async function fetchAdminModules(): Promise<LmsModule[]> {
  try {
    const res = await apiClient.get<unknown>('/admin/lms/modules')
    return asList<LmsModule>(res.data)
  } catch {
    return seedLmsModules(1)
  }
}

export async function fetchAdminLessons(): Promise<LmsLesson[]> {
  try {
    const res = await apiClient.get<unknown>('/admin/lms/lessons')
    return asList<LmsLesson>(res.data)
  } catch {
    return Array.from({ length: 8 }).map((_, i) => seedLmsLesson(i + 1)!).filter(Boolean)
  }
}

export async function fetchAdminQuizzes(): Promise<LmsQuiz[]> {
  try {
    const res = await apiClient.get<unknown>('/admin/lms/quizzes')
    return asList<LmsQuiz>(res.data)
  } catch {
    return [seedLmsQuiz(1)]
  }
}
