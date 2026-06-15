import apiClient from '@/api/axios'
import { unwrapData } from '@/api/unwrap'

const silent = { skipErrorToast: true as const }

export type AdminRegistrationListFilters = {
  search?: string
  status?: string
  course_id?: number
  date_from?: string
  date_to?: string
  /** 'linked' → user_id IS NOT NULL | 'guest' → user_id IS NULL | undefined → all */
  has_account?: 'linked' | 'guest'
}

export type AdminRegistrationListRow = {
  id: number
  course_id: number
  course_title: string
  student_name: string | null
  email: string | null
  phone: string | null
  user_id: number | null
  has_account: boolean
  status: string | null
  created_at: string | null
}

function coerceList(payload: unknown): unknown[] {
  const inner = unwrapData<unknown>(payload)
  if (Array.isArray(inner)) return inner
  if (inner && typeof inner === 'object') {
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

function normalizeRow(raw: unknown): AdminRegistrationListRow | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>

  const nestedCourse =
    o.course && typeof o.course === 'object' && !Array.isArray(o.course)
      ? (o.course as Record<string, unknown>)
      : null

  const nestedUser =
    o.user && typeof o.user === 'object' && !Array.isArray(o.user)
      ? (o.user as Record<string, unknown>)
      : null

  const id = Number(o.id ?? o.registration_id)
  const course_id = Number(o.course_id ?? nestedCourse?.id)
  if (!Number.isFinite(id) || !Number.isFinite(course_id)) return null

  const course_title =
    str(nestedCourse?.title) ?? str(o.course_title) ?? `دورة #${course_id}`

  const email =
    str(o.email) ?? str(nestedUser?.email) ?? str(o.student_email) ?? null

  const phone =
    str(o.phone) ?? str(nestedUser?.phone) ?? null

  const student_name =
    str(nestedUser?.name) ?? str(o.full_name) ?? str(o.student_name) ?? str(o.name)

  const userRaw = o.user_id ?? nestedUser?.id
  const user_id =
    userRaw != null && userRaw !== '' && Number.isFinite(Number(userRaw))
      ? Number(userRaw)
      : null

  // Prefer explicit backend field; fall back to null-check.
  const has_account =
    typeof o.has_account === 'boolean' ? o.has_account : user_id !== null

  return {
    id,
    course_id,
    course_title,
    student_name,
    email,
    phone,
    user_id,
    has_account,
    status: str(o.status),
    created_at: str(o.created_at) ?? str(o.registered_at) ?? str(o.enrolled_at),
  }
}

/** GET /admin/registrations */
export async function fetchAdminRegistrations(
  filters: AdminRegistrationListFilters = {},
): Promise<AdminRegistrationListRow[]> {
  const params: Record<string, string | number> = {}
  if (filters.search?.trim()) params.search = filters.search.trim()
  if (filters.status?.trim()) params.status = filters.status.trim()
  if (filters.course_id != null && Number.isFinite(filters.course_id))
    params.course_id = filters.course_id
  if (filters.date_from?.trim()) params.date_from = filters.date_from.trim()
  if (filters.date_to?.trim()) params.date_to = filters.date_to.trim()
  if (filters.has_account === 'linked') params.has_account = 1
  if (filters.has_account === 'guest') params.has_account = 0

  const res = await apiClient.get<unknown>('/admin/registrations', { ...silent, params })
  const rawList = coerceList(res.data)
  return rawList.map(normalizeRow).filter((x): x is AdminRegistrationListRow => x !== null)
}

/** POST /admin/registrations/{id}/create-account */
export async function createAccountFromRegistration(registrationId: number): Promise<{
  user_id: number
  created: boolean
  linked: boolean
}> {
  const res = await apiClient.post<{
    success: boolean
    data: { user_id: number; created: boolean; linked: boolean }
  }>(`/admin/registrations/${registrationId}/create-account`)
  return res.data.data
}

export type RepairLinksResult = {
  linked_registrations: number
  created_progress_records: number
  skipped_duplicates: number
  message?: string
}

/** POST /admin/registrations/repair-links — bulk-link guest regs + backfill missing progress */
export async function repairRegistrationLinks(): Promise<RepairLinksResult> {
  const res = await apiClient.post<unknown>('/admin/registrations/repair-links', {})
  const raw = ((res.data ?? {}) as Record<string, unknown>)
  return {
    linked_registrations:     Number(raw.linked_registrations ?? 0),
    created_progress_records: Number(raw.created_progress_records ?? 0),
    skipped_duplicates:       Number(raw.skipped_duplicates ?? 0),
    message:                  typeof raw.message === 'string' ? raw.message : undefined,
  }
}
