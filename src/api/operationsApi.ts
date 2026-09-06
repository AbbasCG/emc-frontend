import apiClient from './axios'
import { asList, unwrapLms } from './lmsApi'
import type { DepartmentDetail, OperationsDashboardData, WorkspaceDepartment } from '@/types/operations'

export async function fetchOperationsDashboard(): Promise<OperationsDashboardData> {
  const res = await apiClient.get<unknown>('/operations/dashboard')
  return unwrapLms<OperationsDashboardData>(res.data)
}

export type DepartmentsResult = {
  items: WorkspaceDepartment[]
  noDepartmentLinked: boolean
}

export async function fetchWorkspaceDepartments(): Promise<DepartmentsResult> {
  const res = await apiClient.get<unknown>('/operations/departments')
  const raw = res.data as Record<string, unknown> | null | undefined
  const noDepartmentLinked = Boolean(raw?.no_department_linked)
  return {
    items: asList<WorkspaceDepartment>(res.data),
    noDepartmentLinked,
  }
}

export async function fetchDepartmentDetail(id: string): Promise<DepartmentDetail> {
  const res = await apiClient.get<unknown>(`/operations/departments/${id}`)
  return unwrapLms<DepartmentDetail>(res.data)
}
