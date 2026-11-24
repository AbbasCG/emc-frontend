import apiClient from './axios'
import { unwrapData } from './unwrap'

/**
 * Action permissions («صلاحيات الإجراءات») — typed clients for the access-control endpoints.
 *
 * The SERVER decides everything shown here: whether a permission is effective, which layers
 * contribute (`sources`), and whether the viewer may grant or revoke it (`can_grant` /
 * `can_revoke`). Nothing in this module derives access from a role name.
 */

const silent = { skipErrorToast: true as const }

export type ActionPermissionSourceType = 'role' | 'system' | 'direct_allow' | 'direct_deny'

export type ActionPermissionSource = {
  type: ActionPermissionSourceType
  labelAr: string
}

export type ActionPermissionPrimarySource = 'role' | 'direct' | 'system' | 'none'

export type ActionPermissionRow = {
  key: string
  labelAr: string
  descriptionAr: string
  group: string
  effective: boolean
  source: ActionPermissionPrimarySource
  sources: ActionPermissionSource[]
  directState: 'allow' | 'deny' | null
  directExpiresAt: string | null
  grantedBy: { id: number; name: string } | null
  roleGrants: boolean
  stillEffectiveAfterRevoke: boolean
  explicitOnly: boolean
  canGrant: boolean
  canRevoke: boolean
}

export type ActionPermissionGroup = {
  key: string
  labelAr: string
  permissions: ActionPermissionRow[]
}

export type UserActionPermissions = {
  user: { id: number; name: string; email: string; role: string; isActive: boolean }
  groups: ActionPermissionGroup[]
}

/** Compact row inlined in the effective-access preview. */
export type EffectiveActionPermission = {
  key: string
  labelAr: string
  effective: boolean
  source: ActionPermissionPrimarySource
  sources: ActionPermissionSource[]
}

function str(v: unknown): string {
  return v == null ? '' : String(v).trim()
}

function bool(v: unknown): boolean {
  return v === true || v === 1 || v === '1'
}

function num(v: unknown, fallback = 0): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

const SOURCE_TYPES: readonly ActionPermissionSourceType[] = ['role', 'system', 'direct_allow', 'direct_deny']
const PRIMARY_SOURCES: readonly ActionPermissionPrimarySource[] = ['role', 'direct', 'system', 'none']

export function asPrimarySource(v: unknown): ActionPermissionPrimarySource {
  const s = str(v)
  return (PRIMARY_SOURCES as readonly string[]).includes(s) ? (s as ActionPermissionPrimarySource) : 'none'
}

export function actionSourcesFromUnknown(raw: unknown): ActionPermissionSource[] {
  if (!Array.isArray(raw)) return []
  const out: ActionPermissionSource[] = []
  for (const item of raw) {
    const o = asRecord(item)
    if (!o) continue
    const type = str(o.type)
    if (!(SOURCE_TYPES as readonly string[]).includes(type)) continue
    out.push({ type: type as ActionPermissionSourceType, labelAr: str(o.label_ar) })
  }
  return out
}

/** `action_permissions` as inlined in the effective-access payload. Tolerates the key being absent. */
export function effectiveActionPermissionsFromUnknown(raw: unknown): EffectiveActionPermission[] {
  if (!Array.isArray(raw)) return []
  const out: EffectiveActionPermission[] = []
  for (const item of raw) {
    const o = asRecord(item)
    const key = o ? str(o.key) : ''
    if (!o || !key) continue
    out.push({
      key,
      labelAr: str(o.label_ar),
      effective: bool(o.effective),
      source: asPrimarySource(o.source),
      sources: actionSourcesFromUnknown(o.sources),
    })
  }
  return out
}

export function actionPermissionRowFromUnknown(raw: unknown): ActionPermissionRow | null {
  const o = asRecord(raw)
  if (!o) return null
  const key = str(o.key)
  if (!key) return null
  const direct = str(o.direct_state)
  const grantedBy = asRecord(o.granted_by)

  return {
    key,
    labelAr: str(o.label_ar),
    descriptionAr: str(o.description_ar),
    group: str(o.group),
    effective: bool(o.effective),
    source: asPrimarySource(o.source),
    sources: actionSourcesFromUnknown(o.sources),
    directState: direct === 'allow' || direct === 'deny' ? direct : null,
    directExpiresAt: o.direct_expires_at ? str(o.direct_expires_at) : null,
    grantedBy: grantedBy ? { id: num(grantedBy.id), name: str(grantedBy.name) } : null,
    roleGrants: bool(o.role_grants),
    stillEffectiveAfterRevoke: bool(o.still_effective_after_revoke),
    explicitOnly: bool(o.explicit_only),
    canGrant: bool(o.can_grant),
    canRevoke: bool(o.can_revoke),
  }
}

function normalizeUserActionPermissions(payload: unknown): UserActionPermissions {
  const d = asRecord(unwrapData<unknown>(payload)) ?? {}
  const user = asRecord(d.user) ?? {}
  const groupsRaw = Array.isArray(d.groups) ? d.groups : []

  const groups: ActionPermissionGroup[] = []
  for (const g of groupsRaw) {
    const go = asRecord(g)
    if (!go) continue
    const perms = Array.isArray(go.permissions) ? go.permissions : []
    groups.push({
      key: str(go.key),
      labelAr: str(go.label_ar) || str(go.key),
      permissions: perms.map(actionPermissionRowFromUnknown).filter((p): p is ActionPermissionRow => p != null),
    })
  }

  return {
    user: {
      id: num(user.id),
      name: str(user.name),
      email: str(user.email),
      role: str(user.role),
      isActive: user.is_active !== false,
    },
    groups,
  }
}

/** Accepts `data.permission`, a bare `data` row, or a bare row. */
function normalizeMutatedRow(payload: unknown): ActionPermissionRow {
  const inner = asRecord(unwrapData<unknown>(payload)) ?? {}
  const row = actionPermissionRowFromUnknown(inner.permission ?? inner)
  if (!row) throw new Error('استجابة غير صالحة من الخادم.')
  return row
}

/** GET /admin/access/users/{user}/action-permissions */
export async function fetchUserActionPermissions(
  userId: number | string,
  params: { search?: string; group?: string } = {},
): Promise<UserActionPermissions> {
  const query: Record<string, string> = {}
  if (params.search?.trim()) query.search = params.search.trim()
  if (params.group) query.group = params.group
  const res = await apiClient.get<unknown>(`/admin/access/users/${userId}/action-permissions`, {
    ...silent,
    params: query,
  })
  return normalizeUserActionPermissions(res.data)
}

/** POST /admin/access/users/{user}/action-permissions/{key}/grant — returns the SERVER's updated row. */
export async function grantUserActionPermission(
  userId: number | string,
  key: string,
  expiresAt?: string | null,
): Promise<ActionPermissionRow> {
  const body = expiresAt ? { expires_at: expiresAt } : {}
  const res = await apiClient.post<unknown>(
    `/admin/access/users/${userId}/action-permissions/${encodeURIComponent(key)}/grant`,
    body,
    silent,
  )
  return normalizeMutatedRow(res.data)
}

/** POST /admin/access/users/{user}/action-permissions/{key}/revoke — returns the SERVER's updated row. */
export async function revokeUserActionPermission(userId: number | string, key: string): Promise<ActionPermissionRow> {
  const res = await apiClient.post<unknown>(
    `/admin/access/users/${userId}/action-permissions/${encodeURIComponent(key)}/revoke`,
    {},
    silent,
  )
  return normalizeMutatedRow(res.data)
}

/* ── Permission holders («من يملك هذه الصلاحية») ──────────────────────── */

export type PermissionHolderRole = {
  id: number
  name: string
  displayName: string
  usersCount: number
  source: 'role' | 'system'
}

export type PermissionDirectUser = {
  id: number
  name: string
  email: string
  role: string
  state: 'allow' | 'deny' | ''
  expiresAt: string | null
  grantedBy: string
}

export type PermissionEffectiveUser = {
  id: number
  name: string
  email: string
  isActive: boolean
  role: string
  sources: ActionPermissionSource[]
}

export type PermissionHolders = {
  permission: { key: string; labelAr: string; descriptionAr: string; group: string; explicitOnly: boolean }
  roles: PermissionHolderRole[]
  directUsers: { items: PermissionDirectUser[]; total: number }
  effectiveUsers: {
    items: PermissionEffectiveUser[]
    total: number
    page: number
    perPage: number
    lastPage: number
  }
}

function records(v: unknown): Record<string, unknown>[] {
  return Array.isArray(v) ? v.map(asRecord).filter((x): x is Record<string, unknown> => x != null) : []
}

function nameOf(v: unknown): string {
  const o = asRecord(v)
  return o ? str(o.name) : str(v)
}

function normalizeHolders(payload: unknown): PermissionHolders {
  const d = asRecord(unwrapData<unknown>(payload)) ?? {}
  const p = asRecord(d.permission) ?? {}
  const direct = asRecord(d.direct_users) ?? {}
  const eff = asRecord(d.effective_users) ?? {}

  const effItems: PermissionEffectiveUser[] = records(eff.items).map((u) => ({
    id: num(u.id),
    name: str(u.name),
    email: str(u.email),
    isActive: u.is_active !== false,
    role: str(u.role),
    sources: actionSourcesFromUnknown(u.sources),
  }))
  const directItems: PermissionDirectUser[] = records(direct.items).map((u) => {
    const state = str(u.state)
    return {
      id: num(u.id),
      name: str(u.name),
      email: str(u.email),
      role: str(u.role),
      state: state === 'allow' || state === 'deny' ? state : '',
      expiresAt: u.expires_at ? str(u.expires_at) : null,
      grantedBy: nameOf(u.granted_by),
    }
  })

  return {
    permission: {
      key: str(p.key),
      labelAr: str(p.label_ar),
      descriptionAr: str(p.description_ar),
      group: str(p.group),
      explicitOnly: bool(p.explicit_only),
    },
    roles: records(d.roles).map((r) => ({
      id: num(r.id),
      name: str(r.name),
      displayName: str(r.display_name) || str(r.name),
      usersCount: num(r.users_count),
      source: str(r.source) === 'system' ? 'system' : 'role',
    })),
    directUsers: { items: directItems, total: num(direct.total, directItems.length) },
    effectiveUsers: {
      items: effItems,
      total: num(eff.total, effItems.length),
      page: num(eff.page, 1),
      perPage: num(eff.per_page, effItems.length || 15),
      lastPage: Math.max(1, num(eff.last_page, 1)),
    },
  }
}

/** GET /admin/permissions/{key}/holders */
export async function fetchPermissionHolders(
  key: string,
  params: { search?: string; page?: number; perPage?: number } = {},
): Promise<PermissionHolders> {
  const query: Record<string, string | number> = {}
  if (params.search?.trim()) query.search = params.search.trim()
  if (params.page) query.page = params.page
  if (params.perPage) query.per_page = params.perPage
  const res = await apiClient.get<unknown>(`/admin/permissions/${encodeURIComponent(key)}/holders`, {
    ...silent,
    params: query,
  })
  return normalizeHolders(res.data)
}
