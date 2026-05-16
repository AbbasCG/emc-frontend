import { unwrapData } from '@/api/unwrap'
import type { User } from '@/types'

const DEFAULT_DISPLAY_NAME = 'مستخدم EMC'

function finiteId(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? Math.trunc(n) : 0
}

function trimStr(v: unknown): string {
  if (v == null) return ''
  return String(v).trim()
}

/**
 * Laravel-style envelopes: `{ data }`, `{ user }`, `{ data: { user } }`, bare user keys.
 * Shared by auth hydration and profile API.
 */
export function extractUserRecord(payload: unknown): Record<string, unknown> | null {
  const inner = unwrapData<unknown>(payload)

  const fromObject = (o: Record<string, unknown>): Record<string, unknown> | null => {
    if ('user' in o && o.user && typeof o.user === 'object' && !Array.isArray(o.user)) {
      return o.user as Record<string, unknown>
    }
    if ('id' in o || 'name' in o || 'email' in o) return o

    const d = o.data
    if (d && typeof d === 'object' && !Array.isArray(d)) {
      const rec = d as Record<string, unknown>
      const u = rec.user
      if (u && typeof u === 'object' && !Array.isArray(u)) return u as Record<string, unknown>
      if ('id' in rec || 'name' in rec || 'email' in rec) return rec
    }
    return null
  }

  if (inner != null && typeof inner === 'object' && !Array.isArray(inner)) {
    const got = fromObject(inner as Record<string, unknown>)
    if (got) return got
  }

  return null
}

/** Map API / cached shapes into a canonical `User` for auth store (empty strings when unknown). */
export function normalizeAuthUser(payload: unknown): User {
  const r = extractUserRecord(payload) ?? {}
  const name = trimStr(r.name ?? r.full_name ?? r.fullName)
  const email = trimStr(r.email ?? r.email_address ?? r.mail)
  const roleRaw = r.role
  const role =
    roleRaw != null && String(roleRaw).trim() !== '' ? String(roleRaw).trim() : undefined
  const phoneRaw = r.phone ?? r.phone_number ?? r.mobile
  const phone = trimStr(phoneRaw) || undefined

  return {
    id: finiteId(r.id),
    name,
    email,
    phone,
    city: trimStr(r.city ?? r.location) || undefined,
    gender: trimStr(r.gender ?? r.sex) || undefined,
    role,
  }
}

/** Login/register body: token + user may be nested under `data` or sibling fields. */
export function normalizeAuthLoginPayload(payload: unknown): { token: string; user: User } {
  const root = payload && typeof payload === 'object' && !Array.isArray(payload)
    ? (payload as Record<string, unknown>)
    : {}
  let token = trimStr(
    root.token ?? root.access_token ?? root.plainTextToken ?? root.plain_text_token,
  )

  const inner = unwrapData<unknown>(payload)
  const innerObj =
    inner && typeof inner === 'object' && !Array.isArray(inner)
      ? (inner as Record<string, unknown>)
      : null

  if (!token && innerObj) {
    token = trimStr(
      innerObj.token ??
        innerObj.access_token ??
        innerObj.plainTextToken ??
        innerObj.plain_text_token,
    )
  }

  const userCandidate =
    innerObj?.user ?? root.user ?? extractUserRecord(payload) ?? inner ?? payload

  return {
    token,
    user: normalizeAuthUser(userCandidate),
  }
}

export function getUserDisplayName(u: User | null | undefined): string {
  if (!u) return DEFAULT_DISPLAY_NAME
  const raw = trimStr(u.name)
  if (raw && raw !== '—') return raw
  const mail = trimStr(u.email)
  if (mail && mail !== '—') {
    const local = mail.split('@')[0]
    return local ? local : DEFAULT_DISPLAY_NAME
  }
  return DEFAULT_DISPLAY_NAME
}

export function getUserDisplayEmail(u: User | null | undefined): string {
  if (!u) return ''
  const e = trimStr(u.email)
  if (!e || e === '—') return ''
  return e
}

/** Secondary line: prefer email; if missing show role translated as plain string */
export function getUserSidebarSubtitle(u: User | null | undefined): string {
  const email = getUserDisplayEmail(u)
  if (email) return email
  const role = getUserRoleLabel(u)
  if (role) return role
  return ''
}

export function getUserRoleLabel(u: User | null | undefined): string | null {
  if (!u?.role) return null
  const r = trimStr(u.role)
  return r === '' ? null : r
}

export function getUserInitials(u: User | null | undefined): string {
  const name = getUserDisplayName(u)
  const email = trimStr(u?.email)

  if (name !== DEFAULT_DISPLAY_NAME) {
    const parts = name.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      const a = [...parts[0]!][0] ?? '?'
      const b = [...parts[parts.length - 1]!][0] ?? '?'
      return (a + b).toUpperCase()
    }
    const first = [...name][0]
    return first ? first.toUpperCase() : '?'
  }
  if (email) {
    const ch = [...email][0]
    return ch ? ch.toUpperCase() : '?'
  }
  return '?'
}
