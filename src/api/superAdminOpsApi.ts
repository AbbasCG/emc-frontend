import apiClient from '@/api/axios'
import { asList } from '@/api/lmsApi'
import type { WorkspaceDepartment } from '@/types/operations'
import { normalizeWorkspaceDepartment } from '@/utils/workspaceDepartment'

const silent = { skipErrorToast: true as const }

/** Workspace departments — GET /operations/departments (throws on network/HTTP errors). */
export async function fetchWorkspaceDepartmentsForSuperAdmin(): Promise<WorkspaceDepartment[]> {
  const res = await apiClient.get<unknown>('/operations/departments', silent)
  const list = asList<unknown>(res.data)
  const safe = Array.isArray(list) ? list : []
  return safe.map((row) => normalizeWorkspaceDepartment(row))
}
