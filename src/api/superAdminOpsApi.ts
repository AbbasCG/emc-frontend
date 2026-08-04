import apiClient from '@/api/axios'
import { asList } from '@/api/lmsApi'
import type { AdminDepartment, WorkspaceDepartment } from '@/types/operations'
import { normalizeWorkspaceDepartment } from '@/utils/workspaceDepartment'

const silent = { skipErrorToast: true as const }

/** Workspace departments — GET /operations/departments (throws on network/HTTP errors). */
export async function fetchWorkspaceDepartmentsForSuperAdmin(): Promise<WorkspaceDepartment[]> {
  const res = await apiClient.get<unknown>('/operations/departments', silent)
  const list = asList<unknown>(res.data)
  const safe = Array.isArray(list) ? list : []
  return safe.map((row) => normalizeWorkspaceDepartment(row))
}

function normalizeAdminDepartment(raw: unknown): AdminDepartment {
  const r =
    raw != null && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  const n = (v: unknown, d = 0) => { const x = Number(v); return Number.isFinite(x) ? x : d }
  const s = (v: unknown) => v != null ? String(v).trim() : ''

  const rawOtc = r.open_tasks_count
  const open_tasks_count: number | null =
    rawOtc === null ? null
    : rawOtc !== undefined && Number.isFinite(Number(rawOtc)) ? Number(rawOtc)
    : null

  const statusRaw = s(r.status).toLowerCase()
  const status: AdminDepartment['status'] =
    statusRaw === 'healthy' || statusRaw === 'attention' || statusRaw === 'risk'
      ? statusRaw
      : 'attention'

  return {
    id: s(r.id) || 0,
    name_ar: s(r.name_ar) || s(r.name) || s(r.title) || 'إدارة',
    name_en: r.name_en != null ? s(r.name_en) || null : null,
    description_ar: r.description_ar != null ? s(r.description_ar) || null : r.description != null ? s(r.description) || null : null,
    leader_name: r.leader_name != null && s(r.leader_name) ? s(r.leader_name) : null,
    members_count: n(r.members_count),
    leaders_count: n(r.leaders_count),
    courses_count: n(r.courses_count),
    volunteer_requests_count: n(r.volunteer_requests_count),
    pending_items_count: n(r.pending_items_count),
    open_tasks_count,
    status,
  }
}

/** Single department detail — GET /operations/departments/:id */
export async function fetchAdminDepartmentById(id: string): Promise<AdminDepartment> {
  const res = await apiClient.get<unknown>(`/operations/departments/${id}`, silent)
  const raw =
    res.data != null && typeof res.data === 'object' && !Array.isArray(res.data)
      ? (res.data as Record<string, unknown>)
      : {}
  const payload = (raw.data ?? res.data) as unknown
  return normalizeAdminDepartment(payload)
}
