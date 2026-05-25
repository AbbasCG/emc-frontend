import apiClient from './axios'

const BASE = '/admin/management'

export type ManagedUser = {
  id: number
  name: string
  email: string
  role: string
  is_active: boolean
  department_id: number | null
  department: { id: number; name: string } | null
  created_by: number | null
  creator: { id: number; name: string } | null
  permissions: string[]
  subordinates_count: number
  created_at: string | null
}

export type DepartmentOption = {
  id: number
  name: string
  name_ar: string | null
}

export type CreateManagedUserInput = {
  name: string
  email: string
  password: string
  role: string
  department_id?: number | null
  permissions?: string[]
}

export type UpdateManagedUserInput = {
  name?: string
  email?: string
  password?: string
  role?: string
  department_id?: number | null
  is_active?: boolean
  permissions?: string[]
}

export async function fetchManagedUsers(params?: {
  department_id?: number
  role?: string
  q?: string
  page?: number
}): Promise<{ users: ManagedUser[]; meta: { total: number; current_page: number; last_page: number } }> {
  const res = await apiClient.get<unknown>(BASE + '/users', { params })
  const root = res.data as Record<string, unknown>
  return {
    users: (root.data ?? []) as ManagedUser[],
    meta: (root.meta ?? { total: 0, current_page: 1, last_page: 1 }) as { total: number; current_page: number; last_page: number },
  }
}

export async function fetchManagedUser(id: number): Promise<ManagedUser> {
  const res = await apiClient.get<unknown>(`${BASE}/users/${id}`)
  const root = res.data as Record<string, unknown>
  return (root.data ?? {}) as ManagedUser
}

export async function createManagedUser(input: CreateManagedUserInput): Promise<ManagedUser> {
  const res = await apiClient.post<unknown>(`${BASE}/users`, input)
  const root = res.data as Record<string, unknown>
  return (root.data ?? {}) as ManagedUser
}

export async function updateManagedUser(id: number, input: UpdateManagedUserInput): Promise<ManagedUser> {
  const res = await apiClient.put<unknown>(`${BASE}/users/${id}`, input)
  const root = res.data as Record<string, unknown>
  return (root.data ?? {}) as ManagedUser
}

export async function deleteManagedUser(id: number): Promise<void> {
  await apiClient.delete(`${BASE}/users/${id}`)
}

export async function fetchManagedDepartments(): Promise<DepartmentOption[]> {
  const res = await apiClient.get<unknown>(BASE + '/departments')
  const root = res.data as Record<string, unknown>
  return (root.data ?? []) as DepartmentOption[]
}

export async function fetchAssignablePermissions(): Promise<Record<string, string[]>> {
  const res = await apiClient.get<unknown>(BASE + '/permissions')
  const root = res.data as Record<string, unknown>
  return (root.data ?? {}) as Record<string, string[]>
}
