import apiClient from './axios'
import { asList, unwrapLms } from './lmsApi'
import type { DepartmentDetail, OperationsDashboardData, WorkspaceDepartment } from '@/types/operations'

export async function fetchOperationsDashboard(): Promise<OperationsDashboardData> {
  const res = await apiClient.get<unknown>('/operations/dashboard')
  return unwrapLms<OperationsDashboardData>(res.data)
}

export async function fetchWorkspaceDepartments(): Promise<WorkspaceDepartment[]> {
  const res = await apiClient.get<unknown>('/operations/departments')
  return asList<WorkspaceDepartment>(res.data)
}

export async function fetchDepartmentDetail(id: string): Promise<DepartmentDetail> {
  const res = await apiClient.get<unknown>(`/operations/departments/${id}`)
  return unwrapLms<DepartmentDetail>(res.data)
}
