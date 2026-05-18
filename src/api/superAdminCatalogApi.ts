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
