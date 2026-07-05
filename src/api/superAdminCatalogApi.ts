import apiClient from '@/api/axios'
import type { Course } from '@/types'
import { unwrapData } from '@/api/unwrap'

const silent = { skipErrorToast: true as const }

export type CatalogTrackRow = {
  id: number
  title: string
  slug: string
  duration_months?: number | null
  courses_count?: number
}

export type CatalogWorkshopRow = {
  id: number
  title: string
  slug: string
  date?: string | null
  duration_hours?: number | null
  trainer_name?: string | null
  is_online?: boolean
  /** مملوء عند المصدر طلب الزائر `workshop-requests` */
  requester_email?: string | null
  requester_name?: string | null
}

/** GET /courses — لا يُحمِّل محتويات وهمية عند الخطأ. */
export async function fetchCoursesStrict(): Promise<{ ok: true; rows: Course[] } | { ok: false }> {
  try {
    const res = await apiClient.get('/courses', silent)
    const body = res.data as unknown
    const list =
      Array.isArray(body)
        ? (body as Course[])
        : unwrapData<Course[]>(body)
    return { ok: true, rows: Array.isArray(list) ? list : [] }
  } catch {
    return { ok: false }
  }
}

/**
 * GET /admin/courses — returns ALL courses (all statuses) for admin management.
 * Paginates through every page (backend caps per_page at 100) to collect the full
 * catalogue. Falls back to /courses if the admin endpoint is unavailable.
 */
export async function fetchAdminCoursesStrict(): Promise<{ ok: true; rows: Course[] } | { ok: false }> {
  // Primary path: admin endpoint with full pagination
  try {
    const allRows: Course[] = []
    let page = 1
    let lastPage = 1

    do {
      const res = await apiClient.get('/admin/courses', {
        ...silent,
        params: { per_page: 100, page },
      })
      const body = res.data as Record<string, unknown>

      // Body may be { success, data: [...], meta: {...} }  or  { data: { data: [...], meta: {...} } }
      let items: unknown[] | null = null
      let metaLastPage = 1

      if (Array.isArray(body.data)) {
        // { data: [...], meta: { last_page } }
        items = body.data as unknown[]
        const m = body.meta as Record<string, number> | undefined
        metaLastPage = m?.last_page ?? 1
      } else if (body.data && typeof body.data === 'object' && !Array.isArray(body.data)) {
        // Nested paginator: { data: { data: [...], last_page } }
        const inner = body.data as Record<string, unknown>
        if (Array.isArray(inner.data)) {
          items = inner.data as unknown[]
          metaLastPage = Number(inner.last_page ?? 1)
        }
      } else if (Array.isArray(body)) {
        // Plain array (no pagination)
        return { ok: true, rows: body as Course[] }
      }

      if (!items) break

      allRows.push(...(items as Course[]))
      lastPage = metaLastPage
      page++
    } while (page <= lastPage)

    if (allRows.length > 0) return { ok: true, rows: allRows }
  } catch {
    /* fall through to /courses fallback */
  }

  // Fallback: public /courses endpoint
  try {
    const res = await apiClient.get('/courses', { ...silent, params: { per_page: 100 } })
    const body = res.data as unknown
    const list = Array.isArray(body) ? (body as Course[]) : unwrapData<Course[]>(body)
    if (Array.isArray(list)) return { ok: true, rows: list }
  } catch { /* */ }

  return { ok: false }
}

// ─── Server-side paginated course list ──────────────────────────────────────

export type CoursePageMeta = {
  total: number
  current_page: number
  last_page: number
  per_page: number
}

export type CourseSummary = {
  total: number
  published: number
  draft: number
  archived: number
  no_date: number
  no_instructor: number
  ended: number
  scheduled: number
}

export type CoursePage = {
  rows: Course[]
  meta: CoursePageMeta
  summary?: CourseSummary
}

/**
 * GET /admin/courses — returns one page of courses with full meta + global summary.
 * Pass any combination of: page, per_page, search, selected (array of IDs),
 * status, program_type, instructor_id, department_id, location_type,
 * learning_path_id, has_date, has_instructor, ended, sort.
 */
export async function fetchAdminCoursesPage(
  params: Record<string, unknown> = {},
): Promise<CoursePage | null> {
  try {
    const res = await apiClient.get('/admin/courses', { ...silent, params })
    const body = res.data as Record<string, unknown>
    if (!Array.isArray(body.data)) return null
    return {
      rows: body.data as Course[],
      meta: (body.meta as CoursePageMeta) ?? {
        total: (body.data as unknown[]).length,
        current_page: 1,
        last_page: 1,
        per_page: (body.data as unknown[]).length,
      },
      summary: body.summary as CourseSummary | undefined,
    }
  } catch {
    return null
  }
}

/** GET /tracks */
export async function fetchTracksStrict(): Promise<{ ok: true; rows: CatalogTrackRow[] } | { ok: false }> {
  try {
    const res = await apiClient.get<unknown>('/tracks', silent)
    const raw = unwrapData<
      {
        id: number
        title?: string
        slug: string
        description?: string | null
        duration_months?: number | null
        courses_count?: number
      }[]
    >(res.data)
    const list = Array.isArray(raw) ? raw : []
    const rows = list.map((r) => ({
      id: Number(r.id),
      title: r.title ?? r.slug ?? `مسار ${r.id}`,
      slug: r.slug,
      duration_months: r.duration_months ?? null,
      courses_count: r.courses_count,
    }))
    return { ok: true, rows }
  } catch {
    return { ok: false }
  }
}

/** GET /workshops */
export async function fetchWorkshopsStrict(): Promise<{ ok: true; rows: CatalogWorkshopRow[] } | { ok: false }> {
  try {
    const res = await apiClient.get<unknown>('/workshops', silent)
    const raw = unwrapData<
      {
        id: number
        title?: string
        slug: string
        date?: string | null
        duration_hours?: number | null
        trainer_name?: string | null
        is_online?: boolean
      }[]
    >(res.data)
    const list = Array.isArray(raw) ? raw : []
    const rows = list.map((w) => ({
      id: Number(w.id),
      title: w.title ?? w.slug,
      slug: w.slug,
      date: w.date ?? null,
      duration_hours: w.duration_hours ?? null,
      trainer_name: w.trainer_name ?? null,
      is_online: Boolean(w.is_online),
    }))
    return { ok: true, rows }
  } catch {
    return { ok: false }
  }
}
