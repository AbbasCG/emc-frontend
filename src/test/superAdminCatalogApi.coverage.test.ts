import { describe, it, expect, vi, beforeEach } from 'vitest'
import apiClient from '@/api/axios'
import {
  fetchCoursesStrict,
  fetchAdminCoursesStrict,
  fetchAdminCoursesPage,
  fetchTracksStrict,
  fetchWorkshopsStrict,
  type CourseSummary,
} from '@/api/superAdminCatalogApi'
import type { Course } from '@/types'

vi.mock('@/api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockedApi = vi.mocked(apiClient, true)

beforeEach(() => {
  vi.clearAllMocks()
})

function course(id: number, title: string): Course {
  return { id, title } as unknown as Course
}

/* ── fetchCoursesStrict ── */

describe('fetchCoursesStrict', () => {
  it('accepts a bare array body', async () => {
    const rows = [course(1, 'دورة البرمجة'), course(2, 'دورة التصميم')]
    mockedApi.get.mockResolvedValueOnce({ data: rows })
    const result = await fetchCoursesStrict()
    expect(mockedApi.get).toHaveBeenCalledWith('/courses', { skipErrorToast: true })
    expect(result).toEqual({ ok: true, rows })
  })

  it('unwraps a { data: [...] } body', async () => {
    const rows = [course(1, 'دورة البرمجة')]
    mockedApi.get.mockResolvedValueOnce({ data: { success: true, data: rows } })
    expect(await fetchCoursesStrict()).toEqual({ ok: true, rows })
  })

  it('returns empty rows (still ok) when the unwrapped body is not an array', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: { message: 'غير متوقع' } } })
    expect(await fetchCoursesStrict()).toEqual({ ok: true, rows: [] })
  })

  it('returns { ok: false } on transport error — never fake content', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('Network Error'))
    expect(await fetchCoursesStrict()).toEqual({ ok: false })
  })
})

/* ── fetchAdminCoursesStrict ── */

describe('fetchAdminCoursesStrict', () => {
  it('paginates through every page of the flat paginator shape', async () => {
    const page1 = [course(1, 'دورة 1')]
    const page2 = [course(2, 'دورة 2')]
    mockedApi.get
      .mockResolvedValueOnce({ data: { data: page1, meta: { last_page: 2 } } })
      .mockResolvedValueOnce({ data: { data: page2, meta: { last_page: 2 } } })

    const result = await fetchAdminCoursesStrict()
    expect(result).toEqual({ ok: true, rows: [...page1, ...page2] })
    expect(mockedApi.get).toHaveBeenNthCalledWith(1, '/admin/courses', {
      skipErrorToast: true,
      params: { per_page: 100, page: 1 },
    })
    expect(mockedApi.get).toHaveBeenNthCalledWith(2, '/admin/courses', {
      skipErrorToast: true,
      params: { per_page: 100, page: 2 },
    })
  })

  it('defaults to a single page when meta is missing', async () => {
    const rows = [course(1, 'دورة')]
    mockedApi.get.mockResolvedValueOnce({ data: { data: rows } })
    expect(await fetchAdminCoursesStrict()).toEqual({ ok: true, rows })
    expect(mockedApi.get).toHaveBeenCalledTimes(1)
  })

  it('reads the nested paginator shape { data: { data: [...], last_page } }', async () => {
    const rows = [course(3, 'دورة متداخلة')]
    mockedApi.get.mockResolvedValueOnce({ data: { data: { data: rows, last_page: 1 } } })
    expect(await fetchAdminCoursesStrict()).toEqual({ ok: true, rows })
  })

  it('returns a bare array body immediately without pagination', async () => {
    const rows = [course(4, 'دورة'), course(5, 'دورة أخرى')]
    mockedApi.get.mockResolvedValueOnce({ data: rows })
    expect(await fetchAdminCoursesStrict()).toEqual({ ok: true, rows })
    expect(mockedApi.get).toHaveBeenCalledTimes(1)
  })

  it('falls back to /courses when the admin body has no item list', async () => {
    const rows = [course(6, 'دورة عامة')]
    mockedApi.get
      .mockResolvedValueOnce({ data: { data: { data: 'ليست مصفوفة' } } }) // admin: unusable
      .mockResolvedValueOnce({ data: { data: rows } }) // public fallback
    expect(await fetchAdminCoursesStrict()).toEqual({ ok: true, rows })
    expect(mockedApi.get).toHaveBeenNthCalledWith(2, '/courses', {
      skipErrorToast: true,
      params: { per_page: 100 },
    })
  })

  it('falls back to /courses when the admin endpoint throws', async () => {
    const rows = [course(7, 'دورة عامة')]
    mockedApi.get
      .mockRejectedValueOnce(new Error('403'))
      .mockResolvedValueOnce({ data: rows }) // fallback returns bare array
    expect(await fetchAdminCoursesStrict()).toEqual({ ok: true, rows })
  })

  it('returns { ok: false } when both endpoints fail', async () => {
    mockedApi.get
      .mockRejectedValueOnce(new Error('admin down'))
      .mockRejectedValueOnce(new Error('public down'))
    expect(await fetchAdminCoursesStrict()).toEqual({ ok: false })
  })

  it('returns { ok: false } when admin is empty and the fallback body is not an array', async () => {
    mockedApi.get
      .mockResolvedValueOnce({ data: { data: [], meta: { last_page: 1 } } }) // admin: zero rows
      .mockResolvedValueOnce({ data: { data: null } }) // fallback: unusable
    expect(await fetchAdminCoursesStrict()).toEqual({ ok: false })
  })
})

/* ── fetchAdminCoursesPage ── */

describe('fetchAdminCoursesPage', () => {
  it('returns rows + meta + summary and passes the query params through', async () => {
    const rows = [course(1, 'دورة')]
    const summary: CourseSummary = {
      total: 50, published: 30, draft: 15, archived: 5,
      no_date: 2, no_instructor: 3, ended: 10, scheduled: 20,
    }
    mockedApi.get.mockResolvedValueOnce({
      data: {
        data: rows,
        meta: { total: 50, current_page: 2, last_page: 5, per_page: 10 },
        summary,
      },
    })

    const page = await fetchAdminCoursesPage({ page: 2, search: 'برمجة' })
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/courses', {
      skipErrorToast: true,
      params: { page: 2, search: 'برمجة' },
    })
    expect(page).toEqual({
      rows,
      meta: { total: 50, current_page: 2, last_page: 5, per_page: 10 },
      summary,
    })
  })

  it('synthesizes meta from the row count when the server omits it', async () => {
    const rows = [course(1, 'أ'), course(2, 'ب')]
    mockedApi.get.mockResolvedValueOnce({ data: { data: rows } })
    const page = await fetchAdminCoursesPage()
    expect(page).toEqual({
      rows,
      meta: { total: 2, current_page: 1, last_page: 1, per_page: 2 },
      summary: undefined,
    })
  })

  it('returns null when body.data is not an array', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: { nope: 1 } } })
    expect(await fetchAdminCoursesPage()).toBeNull()

    mockedApi.get.mockResolvedValueOnce({ data: {} })
    expect(await fetchAdminCoursesPage()).toBeNull()
  })

  it('returns null on transport error', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('boom'))
    expect(await fetchAdminCoursesPage()).toBeNull()
  })
})

/* ── fetchTracksStrict ── */

describe('fetchTracksStrict', () => {
  it('normalizes rows: numeric id, title fallbacks, null-safe optionals', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        data: [
          { id: '3', slug: 'web', title: 'تطوير الويب', duration_months: 6, courses_count: 4 },
          { id: 4, slug: 'ai' }, // no title → slug
          { id: 9 }, // no title, no slug → مسار 9
        ],
      },
    })

    const result = await fetchTracksStrict()
    expect(mockedApi.get).toHaveBeenCalledWith('/tracks', { skipErrorToast: true })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rows[0]).toEqual({
      id: 3, // '3' coerced to number
      title: 'تطوير الويب',
      slug: 'web',
      duration_months: 6,
      courses_count: 4,
    })
    expect(result.rows[1]).toEqual({
      id: 4,
      title: 'ai',
      slug: 'ai',
      duration_months: null,
      courses_count: undefined,
    })
    expect(result.rows[2]?.title).toBe('مسار 9')
  })

  it('returns empty rows (still ok) for a non-array payload', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: 'غير متوقع' } })
    expect(await fetchTracksStrict()).toEqual({ ok: true, rows: [] })
  })

  it('returns { ok: false } on transport error', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('Network Error'))
    expect(await fetchTracksStrict()).toEqual({ ok: false })
  })
})

/* ── fetchWorkshopsStrict ── */

describe('fetchWorkshopsStrict', () => {
  it('normalizes rows with Boolean coercion for is_online and slug title fallback', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        data: [
          {
            id: 1,
            slug: 'agile',
            title: 'ورشة أجايل',
            date: '2026-09-01',
            duration_hours: 3,
            trainer_name: 'م. سارة',
            is_online: 1, // truthy non-boolean
          },
          { id: 2, slug: 'scrum' }, // minimal row
        ],
      },
    })

    const result = await fetchWorkshopsStrict()
    expect(mockedApi.get).toHaveBeenCalledWith('/workshops', { skipErrorToast: true })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rows[0]).toEqual({
      id: 1,
      title: 'ورشة أجايل',
      slug: 'agile',
      date: '2026-09-01',
      duration_hours: 3,
      trainer_name: 'م. سارة',
      is_online: true,
    })
    expect(result.rows[1]).toEqual({
      id: 2,
      title: 'scrum', // slug fallback
      slug: 'scrum',
      date: null,
      duration_hours: null,
      trainer_name: null,
      is_online: false,
    })
  })

  it('returns empty rows (still ok) for a non-array payload', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: null } })
    expect(await fetchWorkshopsStrict()).toEqual({ ok: true, rows: [] })
  })

  it('returns { ok: false } on transport error', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('Network Error'))
    expect(await fetchWorkshopsStrict()).toEqual({ ok: false })
  })
})
