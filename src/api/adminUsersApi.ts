import axios from 'axios'
import apiClient from './axios'
import { unwrapData } from './unwrap'
import { getApiErrorMessage } from './apiErrors'

const silent = { skipErrorToast: true as const }

/** Standard copy when AdminUser policy rejects an action with HTTP 403. */
export const ADMIN_USER_FORBIDDEN_AR = 'لا تملك صلاحية تنفيذ هذا الإجراء'

/**
 * Admin user management — `AdminUserController` under the API group (e.g. Sanctum + admin).
 *
 * Expected Laravel-style routes:
 *   GET    /admin/users
 *   POST   /admin/users
 *   GET    /admin/users/{user}
 *   PUT    /admin/users/{user}
 *   DELETE /admin/users/{user}
 */
const BASE = '/admin/users'

export type AdminManagedUser = {
  id: number
  name: string
  email: string
  role?: string | null
  /** When absent, treated as «active» in UI KPIs unless backend adds explicit flag later. */
  is_active?: boolean | null
  created_at?: string | null
  updated_at?: string | null
}

function normalizeManagedUser(raw: Record<string, unknown>): AdminManagedUser {
  const id = Number(raw.id)
  const roleRaw = raw.role
  let roleStr: string | null = null
  if (roleRaw != null && String(roleRaw).trim() !== '') {
    roleStr = String(roleRaw).trim().toLowerCase()
  }

  const nameFallback = typeof raw.full_name === 'string' ? raw.full_name : ''
  const name = String(raw.name ?? nameFallback ?? '')
  const ia = raw.is_active
  let is_active: boolean | null = null
  if (ia === true || ia === 1 || ia === '1') is_active = true
  else if (ia === false || ia === 0 || ia === '0') is_active = false

  return {
    id: Number.isFinite(id) ? Math.trunc(id) : 0,
    name,
    email: String(raw.email ?? ''),
    role: roleStr,
    is_active,
    created_at:
      raw.created_at != null ?
        typeof raw.created_at === 'string' ?
          raw.created_at
        : String(raw.created_at)
      : null,
    updated_at:
      raw.updated_at != null ?
        typeof raw.updated_at === 'string' ?
          raw.updated_at
        : String(raw.updated_at)
      : null,
  }
}

/** Extract list rows from Laravel array, `{ data: [] }`, or paginated `{ data: { data: [] } }`. */
export function unwrapAdminUsersList(payload: unknown): AdminManagedUser[] {
  const inner = unwrapData<unknown>(payload)
  let rows: unknown[] = []
  if (Array.isArray(inner)) rows = inner
  else if (inner && typeof inner === 'object' && inner !== null) {
    const o = inner as Record<string, unknown>
    if (Array.isArray(o.data)) rows = o.data
    else if (o.data && typeof o.data === 'object') {
      const nested = (o.data as Record<string, unknown>).data
      if (Array.isArray(nested)) rows = nested
    }
  }
  return rows
    .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null && !Array.isArray(r))
    .map((r) => normalizeManagedUser(r))
    .filter((u) => u.id > 0)
}

/** Map 403 responses to copy required by Super Admin UX. */
export function getAdminUserMutationMessage(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.status === 403) {
    const body = err.response?.data as Record<string, unknown> | undefined
    if (body && typeof body.message === 'string' && body.message.trim()) return body.message
    return ADMIN_USER_FORBIDDEN_AR
  }
  return getApiErrorMessage(err)
}

export async function fetchAdminUsers(): Promise<AdminManagedUser[]> {
  const res = await apiClient.get<unknown>(BASE, silent)
  return unwrapAdminUsersList(res.data)
}

export async function fetchAdminUser(id: number): Promise<AdminManagedUser> {
  const res = await apiClient.get<unknown>(`${BASE}/${id}`, silent)
  const inner = unwrapData<unknown>(res.data)
  const rec =
    inner && typeof inner === 'object' && !Array.isArray(inner) ?
      (inner as Record<string, unknown>)
    : {}
  const u = normalizeManagedUser(rec)
  if (!u.id) throw new Error('Invalid user payload')
  return u
}

export type CreateAdminUserInput = {
  name: string
  email: string
  password: string
  password_confirmation: string
  role: string
}

export async function createAdminUser(input: CreateAdminUserInput): Promise<AdminManagedUser> {
  const res = await apiClient.post<unknown>(BASE, input, silent)
  const inner = unwrapData<unknown>(res.data)
  const rec =
    inner && typeof inner === 'object' && !Array.isArray(inner) ?
      (inner as Record<string, unknown>)
    : typeof res.data === 'object' && res.data !== null ?
      (res.data as Record<string, unknown>)
    : {}
  return normalizeManagedUser(rec as Record<string, unknown>)
}

export type UpdateAdminUserInput = {
  name: string
  email: string
  role: string
  password?: string
  password_confirmation?: string
}

export async function updateAdminUser(id: number, patch: UpdateAdminUserInput): Promise<AdminManagedUser> {
  const body: Record<string, unknown> = {
    name: patch.name,
    email: patch.email,
    role: patch.role,
  }
  if (patch.password?.trim()) {
    body.password = patch.password
    body.password_confirmation = patch.password_confirmation ?? patch.password
  }
  const res = await apiClient.put<unknown>(`${BASE}/${id}`, body, silent)
  const inner = unwrapData<unknown>(res.data)
  const rec =
    inner && typeof inner === 'object' && !Array.isArray(inner) ?
      (inner as Record<string, unknown>)
    : { ...body, id }
  return normalizeManagedUser(rec as Record<string, unknown>)
}

export async function deleteAdminUser(id: number): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`, silent)
}
