import apiClient from './axios'
import { unwrapData } from './unwrap'

const silent = { skipErrorToast: true as const }

export type RoleMemberSource = 'primary' | 'additional' | 'specialized'

export type RoleMember = {
  id: number
  name: string
  email: string
  isActive: boolean
  roleSource: RoleMemberSource
}

export type RoleMembersPage = {
  items: RoleMember[]
  total: number
  page: number
  perPage: number
  lastPage: number
}

export type RoleWithCount = {
  id: number
  name: string
  displayName: string
  usersCount: number
}

function str(v: unknown): string {
  return v == null ? '' : String(v).trim()
}

function num(v: unknown, fallback = 0): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

/**
 * GET /admin/roles — `users_count` is the SERVER's count of members of each role
 * (it replaces the old client-side tally over the first page of /admin/users).
 * Tolerant of `data: [...]`, `data.roles` and `data.items`.
 */
export async function fetchRolesWithUserCounts(): Promise<RoleWithCount[]> {
  const res = await apiClient.get<unknown>('/admin/roles', silent)
  const inner = unwrapData<unknown>(res.data)
  const rec = asRecord(inner)
  const list: unknown[] =
    Array.isArray(inner) ? inner
    : Array.isArray(rec?.roles) ? (rec.roles as unknown[])
    : Array.isArray(rec?.items) ? (rec.items as unknown[])
    : []

  return list
    .map(asRecord)
    .filter((r): r is Record<string, unknown> => r != null && str(r.name) !== '')
    .map((r) => ({
      id: num(r.id),
      name: str(r.name),
      displayName: str(r.display_name) || str(r.name),
      usersCount: num(r.users_count),
    }))
}

/** GET /admin/roles/{role}/users?search=&page=&per_page= */
export async function fetchRoleMembers(
  roleSlug: string,
  params: { search?: string; page?: number; perPage?: number } = {},
): Promise<RoleMembersPage> {
  const query: Record<string, string | number> = {}
  if (params.search?.trim()) query.search = params.search.trim()
  if (params.page) query.page = params.page
  if (params.perPage) query.per_page = params.perPage

  const res = await apiClient.get<unknown>(`/admin/roles/${encodeURIComponent(roleSlug)}/users`, {
    ...silent,
    params: query,
  })
  const d = asRecord(unwrapData<unknown>(res.data)) ?? {}
  const rawItems: unknown[] = Array.isArray(d.items) ? d.items : []

  const items: RoleMember[] = rawItems
    .map(asRecord)
    .filter((u): u is Record<string, unknown> => u != null)
    .map((u) => {
      const src = str(u.role_source)
      return {
        id: num(u.id),
        name: str(u.name),
        email: str(u.email),
        isActive: u.is_active !== false && u.is_active !== 0,
        roleSource: src === 'additional' || src === 'specialized' ? src : 'primary',
      }
    })

  return {
    items,
    total: num(d.total, items.length),
    page: num(d.page, 1),
    perPage: num(d.per_page, items.length || 15),
    lastPage: Math.max(1, num(d.last_page, 1)),
  }
}
