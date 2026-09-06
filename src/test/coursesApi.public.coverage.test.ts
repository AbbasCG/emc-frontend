import { describe, it, expect, vi, beforeEach } from 'vitest'
import apiClient from '@/api/axios'
import { extractCoursesList, fetchCoursesFromApi, fetchCourseBySlug } from '@/api/coursesApi.public'
import type { Course } from '@/types'

vi.mock('@/api/axios', () => ({
  default: {
    get: vi.fn(),
  },
}))

const mockedApi = vi.mocked(apiClient, true)

beforeEach(() => {
  vi.clearAllMocks()
})

function makeCourse(id: number, overrides: Partial<Course> = {}): Course {
  return {
    id,
    title: `دورة إدارة المشاريع ${id}`,
    slug: `project-management-${id}`,
    type: 'paid',
    price: 999,
    is_online: true,
    ...overrides,
  }
}

/* ── extractCoursesList — normalizer over every common Laravel shape ── */

describe('extractCoursesList', () => {
  const rows = [makeCourse(1), makeCourse(2)]

  it('accepts a bare array', () => {
    expect(extractCoursesList(rows)).toEqual(rows)
  })

  it('filters non-object entries out of a mixed array (never crashes)', () => {
    const dirty = [makeCourse(1), null, 'نص', 42, [makeCourse(9)], makeCourse(2)]
    expect(extractCoursesList(dirty).map((c) => c.id)).toEqual([1, 2])
  })

  it('unwraps { data: [...] }', () => {
    expect(extractCoursesList({ data: rows })).toEqual(rows)
  })

  it('unwraps { courses: [...] } and the other list keys', () => {
    expect(extractCoursesList({ courses: rows })).toEqual(rows)
    expect(extractCoursesList({ items: rows })).toEqual(rows)
    expect(extractCoursesList({ results: rows })).toEqual(rows)
    expect(extractCoursesList({ records: rows })).toEqual(rows)
    expect(extractCoursesList({ rows: rows })).toEqual(rows)
  })

  it('unwraps a nested Laravel paginator { data: { data: [...] } }', () => {
    expect(extractCoursesList({ data: { data: rows, total: 2, current_page: 1 } })).toEqual(rows)
  })

  it('unwraps { data: { courses: [...] } }', () => {
    expect(extractCoursesList({ data: { courses: rows } })).toEqual(rows)
  })

  it('returns [] when the nested arrays contain only non-objects', () => {
    expect(extractCoursesList({ data: { data: [1, 2, 'x'] } })).toEqual([])
    expect(extractCoursesList({ data: { courses: [null] } })).toEqual([])
  })

  it('returns [] for null, primitives, and unrecognized objects', () => {
    expect(extractCoursesList(null)).toEqual([])
    expect(extractCoursesList(undefined)).toEqual([])
    expect(extractCoursesList('نص')).toEqual([])
    expect(extractCoursesList(17)).toEqual([])
    expect(extractCoursesList({ message: 'لا توجد بيانات' })).toEqual([])
  })

  it('stops at the recursion depth guard instead of looping forever', () => {
    // 12 levels of { data: ... } nesting — beyond the depth-8 guard AND beyond the
    // one-level v.data fallback, so the normalizer must give up with [].
    let payload: unknown = rows
    for (let i = 0; i < 12; i++) payload = { data: payload }
    expect(extractCoursesList(payload)).toEqual([])
  })

  it('still resolves a list wrapped just at the edge of the depth guard via the v.data fallback', () => {
    // 10 levels: recursion hits the guard, but the direct { data: [...] } fallback rescues it.
    let payload: unknown = rows
    for (let i = 0; i < 10; i++) payload = { data: payload }
    expect(extractCoursesList(payload)).toEqual(rows)
  })
})

/* ── fetchCoursesFromApi ── */

describe('fetchCoursesFromApi', () => {
  it('requests GET /courses with per_page 200 and a silent error toast', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [] })
    await fetchCoursesFromApi()
    expect(mockedApi.get).toHaveBeenCalledWith('/courses', { params: { per_page: 200 }, skipErrorToast: true })
  })

  it('returns a bare-array body as-is', async () => {
    const rows = [makeCourse(1)]
    mockedApi.get.mockResolvedValueOnce({ data: rows })
    await expect(fetchCoursesFromApi()).resolves.toEqual(rows)
  })

  it('unwraps { success, data: [...] }', async () => {
    const rows = [makeCourse(1), makeCourse(2)]
    mockedApi.get.mockResolvedValueOnce({ data: { success: true, data: rows } })
    await expect(fetchCoursesFromApi()).resolves.toEqual(rows)
  })

  it('unwraps a paginator body { data: { data: [...], meta } }', async () => {
    const rows = [makeCourse(3)]
    mockedApi.get.mockResolvedValueOnce({ data: { data: { data: rows, total: 1 } } })
    await expect(fetchCoursesFromApi()).resolves.toEqual(rows)
  })

  it('returns [] for a malformed body without crashing', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { message: 'خطأ غير متوقع' } })
    await expect(fetchCoursesFromApi()).resolves.toEqual([])
  })

  it('propagates transport errors (no internal catch)', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('Network Error'))
    await expect(fetchCoursesFromApi()).rejects.toThrow('Network Error')
  })
})

/* ── fetchCourseBySlug ── */

describe('fetchCourseBySlug', () => {
  it('unwraps { success, data: course } from GET /courses/{slug}', async () => {
    const course = makeCourse(1)
    mockedApi.get.mockResolvedValueOnce({ data: { success: true, data: course } })
    await expect(fetchCourseBySlug('project-management-1')).resolves.toEqual(course)
    expect(mockedApi.get).toHaveBeenCalledWith('/courses/project-management-1')
  })

  it('accepts a bare course object at the top level (legacy shape)', async () => {
    const course = makeCourse(2)
    mockedApi.get.mockResolvedValueOnce({ data: course })
    await expect(fetchCourseBySlug('project-management-2')).resolves.toEqual(course)
  })

  it('returns null when the payload has no recognizable course (missing slug)', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: { id: 9, title: 'بدون معرف' } } })
    await expect(fetchCourseBySlug('x')).resolves.toBeNull()
  })

  it('returns null when the unwrapped course has an empty slug', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: makeCourse(3, { slug: '' }) })
    await expect(fetchCourseBySlug('x')).resolves.toBeNull()
  })

  it('returns null for a null/primitive body', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: null })
    await expect(fetchCourseBySlug('x')).resolves.toBeNull()
  })

  it('returns null on request failure (404 etc.)', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('Request failed with status code 404'))
    await expect(fetchCourseBySlug('missing')).resolves.toBeNull()
  })
})
