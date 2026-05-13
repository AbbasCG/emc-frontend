import apiClient from './axios'
import type { Course } from '../types'
import { unwrapData } from './unwrap'

export async function fetchCoursesFromApi(): Promise<Course[]> {
  const res = await apiClient.get('/courses')
  const body = res.data as unknown
  if (Array.isArray(body)) return body as Course[]
  return unwrapData<Course[]>(body)
}

export async function fetchCourseBySlug(slug: string): Promise<Course | null> {
  try {
    const res = await apiClient.get<{ success?: boolean; data: Course }>(`/courses/${slug}`)
    const c = unwrapData<Course>(res.data)
    return c?.slug ? c : null
  } catch {
    return null
  }
}
