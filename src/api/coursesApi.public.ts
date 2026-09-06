import apiClient from './axios'
import { unwrapData } from './unwrap'
import type { Course } from '../types'

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === 'object' && !Array.isArray(x)
}

/**
 * Normalize ANY common API shape to a flat array of course-like objects.
 * Supports: [], { data }, { courses }, Laravel paginator { data: [...] }, nested { data: { data } }, etc.
 */
function coerceToObjectArray(payload: unknown, depth = 0): Record<string, unknown>[] {
  if (depth > 8) return []
  if (payload == null) return []

  if (Array.isArray(payload)) {
    return payload.filter((x): x is Record<string, unknown> => x != null && typeof x === 'object' && !Array.isArray(x))
  }

  if (!isRecord(payload)) return []

  const listKeys = ['data', 'courses', 'items', 'results', 'records', 'rows'] as const
  for (const key of listKeys) {
    if (!(key in payload)) continue
    const v = payload[key]
    if (Array.isArray(v)) {
      return v.filter((x): x is Record<string, unknown> => x != null && typeof x === 'object' && !Array.isArray(x))
    }
    if (isRecord(v)) {
      const nested = coerceToObjectArray(v, depth + 1)
      if (nested.length) return nested
      if (Array.isArray(v.data)) {
        return v.data.filter((x): x is Record<string, unknown> => x != null && typeof x === 'object' && !Array.isArray(x))
      }
      if (Array.isArray(v.courses)) {
        return v.courses.filter((x): x is Record<string, unknown> => x != null && typeof x === 'object' && !Array.isArray(x))
      }
    }
  }

  return []
}

/** Unwrap list from GET /courses — mirrors `response.data`, `response.data.data`, `response.data.courses`, paginators, etc. */
export function extractCoursesList(payload: unknown): Course[] {
  const rows = coerceToObjectArray(payload)
  return rows as Course[]
}

/** Same unwrap pattern as باقي الواجهات (`unwrapData`) ثم استخراج المصفوفة من أي شكل Laravel شائع */
export async function fetchCoursesFromApi(): Promise<Course[]> {
  const res = await apiClient.get('/courses', { params: { per_page: 200 }, skipErrorToast: true })
  const body = res.data as unknown
  const unwrapped = unwrapData<unknown>(body)
  const candidate = Array.isArray(body) ? body : (unwrapped ?? body)
  const courses = extractCoursesList(candidate)
  return Array.isArray(courses) ? courses : []
}

export async function fetchCourseBySlug(slug: string): Promise<Course | null> {
  try {
    const res = await apiClient.get<{ success?: boolean; data: Course }>(`/courses/${slug}`)
    const c = unwrapCourseDetail(res.data)
    return c?.slug ? c : null
  } catch {
    return null
  }
}

function unwrapCourseDetail(payload: unknown): Course | null {
  if (!payload || typeof payload !== 'object') return null
  if ('slug' in (payload as Course) && 'title' in (payload as Course)) {
    return payload as Course
  }
  if ('data' in (payload as Record<string, unknown>)) {
    const d = (payload as { data: unknown }).data
    if (d && typeof d === 'object' && 'slug' in (d as Course)) return d as Course
  }
  return null
}
