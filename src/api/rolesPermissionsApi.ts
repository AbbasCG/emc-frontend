import axios from 'axios'
import apiClient from './axios'
import { unwrapData } from './unwrap'
import { getApiErrorMessage } from './apiErrors'

const silent = { skipErrorToast: true as const }

export type AdminPermissionItem = {
  key: string
  label: string
  description: string
}

export type AdminPermissionGroup = {
  key: string
  label: string
  permissions: AdminPermissionItem[]
}

export type AdminPermissionsCatalog = {
  groups: AdminPermissionGroup[]
  /** Flat list of every known permission key from the catalog. */
  allKeys: string[]
}

export type RolePermissionsPayload = {
  permissions: string[]
}

function str(v: unknown): string {
  return v == null ? '' : String(v).trim()
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

function asStringList(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.map((x) => str(x)).filter(Boolean)
}

function permissionItemFromUnknown(raw: unknown, fallbackKey = ''): AdminPermissionItem | null {
  if (typeof raw === 'string') {
    const key = str(raw)
    if (!key) return null
    return { key, label: '', description: '' }
  }
  const o = asRecord(raw)
  if (!o) return null
  const key = str(o.key ?? o.name ?? o.slug ?? o.permission ?? fallbackKey)
  if (!key) return null
  return {
    key,
    label: str(o.label ?? o.label_ar ?? o.title ?? o.name_ar),
    description: str(o.description ?? o.description_ar ?? o.hint),
  }
}

function groupFromUnknown(raw: unknown): AdminPermissionGroup | null {
  const o = asRecord(raw)
  if (!o) return null
  const key = str(o.key ?? o.group ?? o.slug ?? o.module)
  const label = str(o.label ?? o.label_ar ?? o.title ?? o.name_ar)
  const permsRaw = o.permissions ?? o.items ?? o.abilities
  const permissions = Array.isArray(permsRaw)
    ? permsRaw
        .map((p) => permissionItemFromUnknown(p))
        .filter((p): p is AdminPermissionItem => p != null)
    : []
  if (!key && permissions.length === 0) return null
  return {
    key: key || permissions[0]?.key.split('.')[0] || 'general',
    label: label || key,
    permissions,
  }
}

/** Build groups from flat permission keys when API returns only strings. */
function groupsFromFlatKeys(keys: string[]): AdminPermissionGroup[] {
  const map = new Map<string, AdminPermissionItem[]>()
  for (const key of keys) {
    const groupKey = key.includes('.') ? key.split('.')[0]! : 'general'
    const list = map.get(groupKey) ?? []
    list.push({ key, label: '', description: '' })
    map.set(groupKey, list)
  }
  return [...map.entries()].map(([key, permissions]) => ({
    key,
    label: key,
    permissions,
  }))
}

function normalizePermissionsCatalog(payload: unknown): AdminPermissionsCatalog {
  const root = unwrapData<unknown>(payload)
  const obj = asRecord(root) ?? asRecord(payload)

  /* Grouped: { groups: [...] } or catalog { modules: [...] } */
  const groupsRaw = obj?.groups ?? obj?.modules ?? obj?.permission_groups
  if (Array.isArray(groupsRaw) && groupsRaw.length > 0) {
    const groups = groupsRaw
      .map((g) => groupFromUnknown(g))
      .filter((g): g is AdminPermissionGroup => g != null && g.permissions.length > 0)
    const allKeys = groups.flatMap((g) => g.permissions.map((p) => p.key))
    return { groups, allKeys }
  }

  /* Flat with metadata: { permissions: [{ key, ... }] } */
  const itemsRaw = obj?.permissions ?? obj?.items ?? (Array.isArray(root) ? root : null)
  if (Array.isArray(itemsRaw) && itemsRaw.length > 0) {
    const items = itemsRaw
      .map((p) => permissionItemFromUnknown(p))
      .filter((p): p is AdminPermissionItem => p != null)
    if (items.some((p) => p.key.includes('.'))) {
      return { groups: groupsFromFlatKeys(items.map((p) => p.key)), allKeys: items.map((p) => p.key) }
    }
    const byGroup = new Map<string, AdminPermissionItem[]>()
    for (const item of items) {
      const gKey = str(asRecord(itemsRaw.find((x) => permissionItemFromUnknown(x)?.key === item.key))?.group)
        || item.key.split('.')[0]
        || 'general'
      const list = byGroup.get(gKey) ?? []
      list.push(item)
      byGroup.set(gKey, list)
    }
    const groups = [...byGroup.entries()].map(([key, permissions]) => ({ key, label: key, permissions }))
    return { groups, allKeys: items.map((p) => p.key) }
  }

  /* Plain string array */
  const flat = asStringList(root).length > 0 ? asStringList(root) : asStringList(obj?.permissions)
  if (flat.length > 0) {
    const groups = groupsFromFlatKeys(flat)
    return { groups, allKeys: flat }
  }

  return { groups: [], allKeys: [] }
}

function permissionKeysFromMixedList(list: unknown): string[] {
  if (!Array.isArray(list)) return []
  const keys: string[] = []
  for (const item of list) {
    if (typeof item === 'string') {
      const k = str(item)
      if (k) keys.push(k)
      continue
    }
    const o = asRecord(item)
    if (!o) continue
    const k = str(o.name ?? o.key ?? o.slug ?? o.permission)
    if (k) keys.push(k)
  }
  return keys
}

function normalizeRolePermissions(payload: unknown): string[] {
  const root = unwrapData<unknown>(payload)
  const obj = asRecord(root) ?? asRecord(payload)

  /** GET /admin/roles/{role}/permissions → data.current_permissions */
  const fromCurrent = permissionKeysFromMixedList(obj?.current_permissions)
  if (fromCurrent.length > 0) return fromCurrent

  /** PUT /admin/roles/{role}/permissions → data.permissions (objects) or string[] */
  const fromPermissions = permissionKeysFromMixedList(obj?.permissions)
  if (fromPermissions.length > 0) return fromPermissions

  if (Array.isArray(root)) return permissionKeysFromMixedList(root)

  return []
}

/** GET /admin/permissions — full permission catalog for matrix UI. */
export async function fetchAdminPermissionsCatalog(): Promise<AdminPermissionsCatalog> {
  const res = await apiClient.get<unknown>('/admin/permissions', silent)
  return normalizePermissionsCatalog(res.data)
}

/** GET /admin/roles/{role}/permissions */
export async function fetchRolePermissions(roleSlug: string): Promise<string[]> {
  const res = await apiClient.get<unknown>(`/admin/roles/${encodeURIComponent(roleSlug)}/permissions`, silent)
  return normalizeRolePermissions(res.data)
}

/** PUT /admin/roles/{role}/permissions */
export async function updateRolePermissions(roleSlug: string, permissions: string[]): Promise<string[]> {
  const body: RolePermissionsPayload = { permissions }
  const res = await apiClient.put<unknown>(
    `/admin/roles/${encodeURIComponent(roleSlug)}/permissions`,
    body,
    silent,
  )
  return normalizeRolePermissions(res.data)
}

export function isPermissionsApiMissing(err: unknown): boolean {
  if (!axios.isAxiosError(err)) return false
  const status = err.response?.status
  return status === 404 || status === 405 || status === 501
}

export function permissionsApiErrorMessage(err: unknown): string {
  if (isPermissionsApiMissing(err)) {
    return 'واجهة صلاحيات الأدوار غير متوفرة على الخادم (GET/PUT /admin/permissions).'
  }
  return getApiErrorMessage(err)
}
