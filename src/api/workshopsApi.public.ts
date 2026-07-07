import apiClient from '@/api/axios'
import { unwrapData } from '@/api/unwrap'

const silent = { skipErrorToast: true as const }

export type PublicWorkshop = {
  id: number
  title: string
  slug: string
  description: string | null
  short_description: string | null
  status: string | null
  start_date: string | null
  start_time: string | null
  end_date: string | null
  end_time: string | null
  location_type: string | null
  meeting_link: string | null
  registration_open: boolean
  is_online: boolean
  instructor_name: string | null
  instructor_avatar: string | null
  course_id: number | null
  course_slug: string | null
  course_title: string | null
  price: number | null
  is_free: boolean
  seats_total: number | null
  seats_remaining: number | null
  duration_hours: number | null
  certificate_name: string | null
  cover_image: string | null
  external_registration_url: string | null
}

export type WorkshopsQuery = {
  page?: number
  per_page?: number
  search?: string
  location_type?: 'all' | 'online' | 'offline' | 'hybrid'
  status?: string
  instructor_id?: number | null
  department_id?: number | null
  date_from?: string | null
  date_to?: string | null
  price_type?: 'all' | 'free' | 'paid'
}

export type WorkshopsPageResult = {
  workshops: PublicWorkshop[]
  total: number
  page: number
  perPage: number
  lastPage: number
  ok: boolean
}

function toNum(v: unknown): number | null {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function pickStr(...vals: unknown[]): string | null {
  for (const v of vals) {
    if (v != null && String(v).trim() !== '') return String(v).trim()
  }
  return null
}

function normalizeWorkshopRow(raw: unknown): PublicWorkshop | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const id = Number(o.id)
  const slug = pickStr(o.slug, o.workshop_slug)
  const title = pickStr(o.title, o.name, o.workshop_title)
  if (!Number.isFinite(id) || !slug || !title) return null

  const instructor =
    o.instructor && typeof o.instructor === 'object' && !Array.isArray(o.instructor) ?
      (o.instructor as Record<string, unknown>)
    : null
  const course =
    o.course && typeof o.course === 'object' && !Array.isArray(o.course) ?
      (o.course as Record<string, unknown>)
    : null

  const locationType = pickStr(o.location_type, o.delivery_type, o.mode)?.toLowerCase() ?? null
  const isOnline =
    o.is_online === true ||
    o.is_online === 1 ||
    locationType === 'online' ||
    Boolean(pickStr(o.meeting_link) && locationType !== 'offline')

  const price = toNum(o.price ?? course?.price)
  const isFree =
    o.is_free === true ||
    o.type === 'free' ||
    course?.type === 'free' ||
    (price != null && price <= 0)

  const totalSpots = toNum(o.total_spots ?? o.seats_total ?? o.capacity ?? o.max_seats)
  const remaining = toNum(o.spots_remaining ?? o.seats_remaining ?? o.available_seats)

  return {
    id,
    title,
    slug,
    description: pickStr(o.description, o.full_description),
    short_description: pickStr(o.short_description, o.summary),
    status: pickStr(o.status),
    start_date: pickStr(o.start_date, o.date, o.session_date),
    start_time: pickStr(o.start_time, o.time),
    end_date: pickStr(o.end_date),
    end_time: pickStr(o.end_time),
    location_type: locationType,
    meeting_link: pickStr(o.meeting_link, o.join_url),
    registration_open: o.registration_open !== false && o.registration_open !== 0,
    is_online: isOnline,
    instructor_name: pickStr(
      o.trainer_name,
      o.instructor_name,
      instructor?.name,
      instructor?.full_name,
    ),
    instructor_avatar: pickStr(instructor?.avatar_url, instructor?.photo, instructor?.image),
    course_id: toNum(o.course_id ?? course?.id),
    course_slug: pickStr(course?.slug, o.course_slug),
    course_title: pickStr(course?.title, o.course_title),
    price,
    is_free: Boolean(isFree),
    seats_total: totalSpots,
    seats_remaining: remaining,
    duration_hours: toNum(o.duration_hours ?? o.hours ?? o.duration),
    certificate_name: pickStr(o.certificate_name, o.certificate, course?.certificate_name),
    cover_image: pickStr(
      o.cover_image,
      o.image_url,
      o.thumbnail,
      o.course_image,
      course?.course_image,
      course?.cover_image,
    ),
    external_registration_url: pickStr(
      o.external_registration_url,
      o.registration_url,
      o.external_url,
    ),
  }
}

function extractWorkshopRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload
  const inner = unwrapData<unknown>(payload)
  if (Array.isArray(inner)) return inner
  if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
    const o = inner as Record<string, unknown>
    if (Array.isArray(o.data)) return o.data
    if (Array.isArray(o.workshops)) return o.workshops
    if (Array.isArray(o.items)) return o.items
  }
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const root = payload as Record<string, unknown>
    if (Array.isArray(root.data)) return root.data
    if (Array.isArray(root.workshops)) return root.workshops
  }
  return []
}

function parseMeta(payload: unknown): { total: number; page: number; perPage: number; lastPage: number } | null {
  const root = payload && typeof payload === 'object' && !Array.isArray(payload) ? (payload as Record<string, unknown>) : null
  const inner = unwrapData<unknown>(payload)
  const innerObj = inner && typeof inner === 'object' && !Array.isArray(inner) ? (inner as Record<string, unknown>) : null
  const meta = (root?.meta ?? innerObj?.meta) as Record<string, unknown> | undefined
  if (!meta) return null
  const total = Number(meta.total)
  const page = Number(meta.current_page ?? meta.page ?? 1)
  const perPage = Number(meta.per_page ?? meta.perPage ?? 12)
  const lastPage = Number(meta.last_page ?? meta.lastPage ?? Math.ceil(total / perPage))
  if (!Number.isFinite(total)) return null
  return {
    total,
    page: Number.isFinite(page) ? page : 1,
    perPage: Number.isFinite(perPage) ? perPage : 12,
    lastPage: Number.isFinite(lastPage) && lastPage > 0 ? lastPage : 1,
  }
}

export async function fetchPublicWorkshopsPage(q: WorkshopsQuery = {}): Promise<WorkshopsPageResult> {
  const params: Record<string, string | number> = {
    page: q.page ?? 1,
    per_page: q.per_page ?? 12,
  }
  if (q.search?.trim()) params.search = q.search.trim()
  if (q.status?.trim()) params.status = q.status.trim()
  if (q.instructor_id) params.instructor_id = q.instructor_id
  if (q.department_id) params.department_id = q.department_id
  if (q.date_from?.trim()) params.date_from = q.date_from.trim()
  if (q.date_to?.trim()) params.date_to = q.date_to.trim()
  if (q.price_type && q.price_type !== 'all') params.price_type = q.price_type

  try {
    const res = await apiClient.get<unknown>('/workshops', { ...silent, params })
    const rows = extractWorkshopRows(res.data)
    const workshops = rows
      .map(normalizeWorkshopRow)
      .filter((w): w is PublicWorkshop => w != null)

    let filtered = workshops
    if (q.location_type && q.location_type !== 'all') {
      filtered = workshops.filter((w) => {
        const lt = String(w.location_type ?? '').toLowerCase()
        if (q.location_type === 'online') return w.is_online || lt === 'online'
        if (q.location_type === 'offline') return lt === 'offline' || (!w.is_online && lt !== 'online')
        if (q.location_type === 'hybrid') return lt === 'hybrid'
        return true
      })
    }

    const meta = parseMeta(res.data)
    if (meta) {
      return {
        workshops: filtered,
        total: meta.total,
        page: meta.page,
        perPage: meta.perPage,
        lastPage: meta.lastPage,
        ok: true,
      }
    }

    const perPage = q.per_page ?? 12
    const page = q.page ?? 1
    const total = filtered.length
    const lastPage = Math.max(1, Math.ceil(total / perPage))
    const safePage = Math.min(Math.max(1, page), lastPage)
    const start = (safePage - 1) * perPage

    return {
      workshops: filtered.slice(start, start + perPage),
      total,
      page: safePage,
      perPage,
      lastPage,
      ok: true,
    }
  } catch {
    return { workshops: [], total: 0, page: 1, perPage: q.per_page ?? 12, lastPage: 1, ok: false }
  }
}

export async function fetchPublicWorkshopBySlug(slug: string): Promise<{ workshop: PublicWorkshop | null; ok: boolean }> {
  const key = slug.trim()
  if (!key) return { workshop: null, ok: false }

  try {
    const res = await apiClient.get<unknown>(`/workshops/${encodeURIComponent(key)}`, silent)
    const inner = unwrapData<unknown>(res.data)
    const row =
      inner && typeof inner === 'object' && !Array.isArray(inner) ?
        inner
      : res.data
    const workshop = normalizeWorkshopRow(row)
    return { workshop, ok: Boolean(workshop) }
  } catch {
    const list = await fetchPublicWorkshopsPage({ per_page: 200 })
    const found = list.workshops.find((w) => w.slug === key) ?? null
    return { workshop: found, ok: found != null }
  }
}
