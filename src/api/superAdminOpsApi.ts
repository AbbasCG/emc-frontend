import apiClient from '@/api/axios'
import { asList } from '@/api/lmsApi'
import type { WorkspaceDepartment } from '@/types/operations'

const silent = { skipErrorToast: true as const }

/** Workspace departments — GET /operations/departments */
export async function fetchWorkspaceDepartmentsForSuperAdmin(): Promise<WorkspaceDepartment[]> {
  try {
    const res = await apiClient.get<unknown>('/operations/departments', silent)
    return asList<WorkspaceDepartment>(res.data)
  } catch {
    return []
  }
}
