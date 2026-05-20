import axios from 'axios'
import apiClient from '@/api/axios'
import { unwrapData } from '@/api/unwrap'

const silent = { skipErrorToast: true as const }

export type AdminRegistrationListFilters = {
  search?: string
  status?: string
  course_id?: number
  date_from?: string
  date_to?: string
}

/** Row shape after normalizing Laravel `Registration::with(['course','course.instructor','user'])` payloads */
export type AdminRegistrationListRow = {
  id: number
  course_id: number
  course_title: string
  student_name: string | null
  email: string | null
  user_id: number | null
  status: string | null
  created_at: string | null
}

function coerceRegistrationList(payload: unknown): unknown[] {
  const inner = unwrapData<unknown>(payload)
  if (Array.isArray(inner)) return inner
  if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
    const o = inner as Record<string, unknown>
    const data = o.data
    if (Array.isArray(data)) return data
    if (data && typeof data === 'object' && Array.isArray((data as { data?: unknown }).data)) {
      return (data as { data: unknown[] }).data
    }
    for (const k of ['registrations', 'items']) {
      const v = o[k]
      if (Array.isArray(v)) return v
    }
  }
  return []
}

function str(v: unknown): string | null {
  if (v == null) return null
  const s = String(v).trim()
  return s === '' ? null : s
}

function normalizeAdminRegistrationListRow(raw: unknown): AdminRegistrationListRow | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const nestedCourse =
    o.course && typeof o.course === 'object' && !Array.isArray(o.course) ?
      (o.course as Record<string, unknown>)
    : null
  const nestedUser =
    o.user && typeof o.user === 'object' && !Array.isArray(o.user) ? (o.user as Record<string, unknown>) : null

  const id = Number(o.id ?? o.registration_id)
  const course_id = Number(o.course_id ?? nestedCourse?.id)
  if (!Number.isFinite(id) || !Number.isFinite(course_id)) return null

  const course_title =
    str(nestedCourse?.title) ??
    str(o.course_title) ??
    str(o.program_title) ??
    `دورة #${course_id}`

  const email =
    str(o.email) ?? str(o.student_email) ?? str(nestedUser?.email) ?? str(o.contact_email)

  const student_name =
    str(nestedUser?.name) ?? str(o.full_name) ?? str(o.student_name) ?? str(o.name)

  const userRaw = o.user_id ?? nestedUser?.id
  const user_id = userRaw != null && userRaw !== '' && Number.isFinite(Number(userRaw)) ? Number(userRaw) : null

  const created =
    str(o.created_at) ??
    str(o.registered_at) ??
    str(o.enrolled_at)

  return {
    id,
    course_id,
    course_title,
    student_name,
    email,
    user_id,
    status: str(o.status),
    created_at: created,
  }
}

function debugAdminRegs(label: string, payload: Record<string, unknown>) {
  if (!import.meta.env.DEV) return
  console.log(`[EMC admin/registrations] ${label}`, payload)
}

/**
 * GET `/admin/registrations` — expects `{ data: [...] }` with optional Laravel `data` wrapper.
 * Query params: search, status, course_id, date_from, date_to (backend-dependent naming).
 */
export async function fetchAdminRegistrations(
  filters: AdminRegistrationListFilters = {},
): Promise<AdminRegistrationListRow[]> {
  const params: Record<string, string | number> = {}
  const s = filters.search?.trim()
  if (s) params.search = s
  const st = filters.status?.trim()
  if (st) params.status = st
  if (filters.course_id != null && Number.isFinite(filters.course_id)) params.course_id = filters.course_id
  const df = filters.date_from?.trim()
  if (df) params.date_from = df
  const dt = filters.date_to?.trim()
  if (dt) params.date_to = dt

  try {
    debugAdminRegs('request', {
      method: 'GET',
      path: '/admin/registrations',
      params,
      baseURL: apiClient.defaults.baseURL,
    })
    const res = await apiClient.get<unknown>('/admin/registrations', { ...silent, params })
    const rawList = coerceRegistrationList(res.data)
    const rows = rawList.map(normalizeAdminRegistrationListRow).filter((x): x is AdminRegistrationListRow => x != null)
    debugAdminRegs('response', {
      httpStatus: res.status,
      rowCount: rows.length,
      shapeSample: rawList[0] && typeof rawList[0] === 'object' ? Object.keys(rawList[0] as object).slice(0, 24) : [],
    })
    return rows
  } catch (e) {
    debugAdminRegs('error', {
      axiosMessage: axios.isAxiosError(e) ? e.message : String(e),
      status: axios.isAxiosError(e) ? e.response?.status : undefined,
      data: axios.isAxiosError(e) ? e.response?.data : undefined,
    })
    throw e
  }
}
