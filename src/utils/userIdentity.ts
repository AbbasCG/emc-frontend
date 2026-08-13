import { unwrapData } from '@/api/unwrap'
import type { User } from '@/types'
import { resolvePublicAssetUrl } from '@/utils/mediaUrl'

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
  // `r` is the user sub-record; `outer` is the full envelope (may have sibling `permissions`)
  const outer = payload && typeof payload === 'object' && !Array.isArray(payload)
    ? (payload as Record<string, unknown>)
    : {}
  const extracted = extractUserRecord(payload)
  const r = extracted ?? {}
  const name = trimStr(r.name ?? r.full_name ?? r.fullName)
  const email = trimStr(r.email ?? r.email_address ?? r.mail)
  // Session-integrity guard (M4.5 follow-up): a payload with NO user record, or a
  // record carrying neither id nor email nor name, is not a session — building a
  // nameless "ghost user" from it would render an authenticated shell with no
  // identity. Throwing routes callers (hydrate/readCachedUser) to a clean logout.
  if (extracted == null || (r.id == null && !email && !name)) {
    throw new Error('normalizeAuthUser: payload contains no usable user record')
  }
  const roleRaw = r.role
  const role =
    roleRaw != null && String(roleRaw).trim() !== '' ? String(roleRaw).trim() : undefined
  const phoneRaw = r.phone ?? r.phone_number ?? r.mobile
  const phone = trimStr(phoneRaw) || undefined

  const avatarRaw =
    r.avatar_url ??
    r.avatarUrl ??
    r.avatar ??
    r.photo_url ??
    r.profile_photo ??
    r.profile_photo_url ??
    r.profilePhoto ??
    r.profilePhotoUrl ??
    r.image ??
    r.profile_image
  const avatar_url = trimStr(avatarRaw) || undefined

  const countryRaw = r.country ?? r.country_name
  const country = trimStr(countryRaw) || undefined

  const howRaw =
    r.how_did_you_hear_about_us ??
    r.howDidYouHearAboutUs ??
    r.heard_from ??
    r.source ??
    r.referral_source
  const how_did_you_hear_about_us = trimStr(howRaw) || undefined

  const deptRaw =
    r.department ?? r.department_name ?? r.faculty
  let department: string | undefined
  if (typeof deptRaw === 'string') department = trimStr(deptRaw) || undefined
  else if (deptRaw && typeof deptRaw === 'object' && 'name' in (deptRaw as object))
    department = trimStr((deptRaw as { name?: unknown }).name) || undefined

  const ia = r.is_active
  let is_active: boolean | null | undefined = undefined
  if (ia === true || ia === 1 || ia === '1') is_active = true
  else if (ia === false || ia === 0 || ia === '0') is_active = false

  const ev = r.email_verified_at ?? r.emailVerifiedAt ?? r.email_verified
  const email_verified_at =
    ev != null && String(ev).trim() !== '' ? String(ev).trim() : undefined

  const lk = r.last_login_at ?? r.last_login ?? r.last_seen_at
  const last_login_at = lk != null && String(lk).trim() !== '' ? String(lk).trim() : undefined

  let created_at: string | undefined
  if (r.created_at != null && String(r.created_at).trim() !== '') created_at = String(r.created_at)
  let updated_at: string | undefined
  if (r.updated_at != null && String(r.updated_at).trim() !== '') updated_at = String(r.updated_at)

  // permissions may live on the outer envelope (sibling to `user`) or directly on `r`
  const rawPerms = outer.permissions ?? r.permissions
  const permissions: string[] | undefined =
    Array.isArray(rawPerms) ? (rawPerms as unknown[]).map(String).filter(Boolean) : undefined

  // is_department_leader may live on the outer envelope (sibling to `user`) or directly on `r`
  const rawLeader = outer.is_department_leader ?? r.is_department_leader
  const is_department_leader: boolean | undefined =
    typeof rawLeader === 'boolean' ? rawLeader : undefined

  // has_english_courses may live on the outer envelope (sibling to `user`) or directly on `r`
  const rawHasEnglish = outer.has_english_courses ?? r.has_english_courses
  const has_english_courses: boolean | undefined =
    typeof rawHasEnglish === 'boolean' ? rawHasEnglish : undefined

  return {
    id: finiteId(r.id),
    name,
    email,
    phone,
    city: trimStr(r.city ?? r.location) || undefined,
    country,
    gender: trimStr(r.gender ?? r.sex) || undefined,
    department,
    how_did_you_hear_about_us,
    avatar_url,
    email_verified_at,
    last_login_at,
    created_at,
    updated_at,
    is_active,
    role,
    permissions,
    is_department_leader,
    has_english_courses,
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

  // Pass the full inner envelope so normalizeAuthUser can pick up sibling `permissions`.
  return {
    token,
    user: normalizeAuthUser(innerObj ?? payload),
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

/** Absolute URL for profile image if present — safe for `<img src>`. */
export function getUserAvatarUrl(u: User | null | undefined): string | null {
  if (!u) return null
  return resolvePublicAssetUrl(trimStr(u.avatar_url) !== '' ? trimStr(u.avatar_url) : null)
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
