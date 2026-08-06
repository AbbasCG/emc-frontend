import apiClient from './axios'
import { unwrapData } from './unwrap'

export type MemberType = 'volunteer' | 'staff' | 'partner'

export type LinkedUser = {
  id: number
  name: string
  email: string
  role: string
}

export type InternalMember = {
  id: number
  name: string
  email?: string | null
  phone?: string | null
  avatar_url?: string | null
  department?: string | null
  department_id?: string | null
  role_label?: string | null
  member_type: MemberType
  is_new: boolean
  status?: string | null
  skills?: string | null
  source?: string | null
  volunteer_request_id?: number | null
  created_at?: string | null
  joined_at?: string | null
  user_id?: number | null
  has_user_account?: boolean
  can_create_user_account?: boolean | null
  linked_user?: LinkedUser | null
}

export type CreateUserAccountResult = {
  member: InternalMember | null
  user: LinkedUser | null
  temporary_password: string | null
  password_shown_once: boolean
  already_linked: boolean
  linked_existing: boolean
  created: boolean
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

function resolveType(raw: unknown): MemberType {
  const s = String(raw ?? '').toLowerCase()
  if (s === 'staff' || s === 'employee' || s === 'موظف') return 'staff'
  if (s === 'partner' || s === 'شريك') return 'partner'
  return 'volunteer'
}

function parseStr(v: unknown): string | null {
  if (v == null) return null
  const s = String(v).trim()
  return s || null
}

function normalizeMember(raw: unknown): InternalMember | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const r = raw as Record<string, unknown>

  const id = Number(r.id ?? 0)
  if (!id) return null

  const name = parseStr(r.name ?? r.full_name) ?? ''
  if (!name) return null

  const joinedAt = parseStr(r.joined_at ?? r.converted_to_member_at)
  const createdAt = parseStr(r.created_at)
  const isNewFromDate =
    joinedAt
      ? Date.now() - Date.parse(joinedAt) < THIRTY_DAYS_MS
      : createdAt
        ? Date.now() - Date.parse(createdAt) < THIRTY_DAYS_MS
        : false

  const deptRaw = r.department ?? r.department_name ?? r.desired_department
  const department = deptRaw != null ? parseStr(deptRaw) : null
  const roleLabelRaw = r.role_label ?? r.role
  const role_label = roleLabelRaw != null ? parseStr(roleLabelRaw) : null

  const vrId = r.volunteer_request_id ?? r.volunteerRequestId
  const volunteer_request_id =
    vrId != null && Number.isFinite(Number(vrId)) && Number(vrId) > 0
      ? Number(vrId)
      : null

  const userId =
    r.user_id != null && Number.isFinite(Number(r.user_id)) && Number(r.user_id) > 0
      ? Number(r.user_id)
      : null

  const hasUserAccount =
    r.has_user_account != null ? Boolean(r.has_user_account) : userId !== null

  let linked_user: LinkedUser | null = null
  if (r.linked_user && typeof r.linked_user === 'object' && !Array.isArray(r.linked_user)) {
    const lu = r.linked_user as Record<string, unknown>
    const luId = Number(lu.id ?? 0)
    const luName = parseStr(lu.name)
    const luEmail = parseStr(lu.email)
    if (luId && luName && luEmail) {
      linked_user = { id: luId, name: luName, email: luEmail, role: parseStr(lu.role) ?? 'volunteer' }
    }
  }

  return {
    id,
    name,
    email: parseStr(r.email),
    phone: parseStr(r.phone),
    avatar_url: parseStr(r.avatar_url ?? r.avatarUrl ?? r.avatar),
    department,
    department_id: parseStr(r.department_id),
    role_label,
    member_type: resolveType(r.member_type ?? r.type ?? r.source_type ?? 'volunteer'),
    is_new: Boolean(r.is_new ?? isNewFromDate),
    status: parseStr(r.status),
    skills: parseStr(r.skills),
    source: parseStr(r.source),
    volunteer_request_id,
    created_at: createdAt,
    joined_at: joinedAt,
    user_id: userId,
    has_user_account: hasUserAccount,
    can_create_user_account:
      r.can_create_user_account != null ? Boolean(r.can_create_user_account) : null,
    linked_user,
  }
}

/**
 * Unwrap the API response into a flat array, handling all common Laravel shapes:
 *  - `{ data: [...] }`           (paginated or resource collection)
 *  - `{ data: { data: [...] } }` (nested paginated)
 *  - `{ members: [...] }`
 *  - `{ data: { members: [...] } }`
 *  - `[...]`                      (bare array)
 */
function unwrapMembersList(resData: unknown): unknown[] {
  const inner = unwrapData<unknown>(resData)

  if (Array.isArray(inner)) return inner

  if (inner && typeof inner === 'object') {
    const o = inner as Record<string, unknown>

    // { data: [...] }
    if (Array.isArray(o.data)) return o.data

    // { members: [...] }
    if (Array.isArray(o.members)) return o.members

    // { items: [...] }
    if (Array.isArray(o.items)) return o.items

    // { team_profiles: [...] }
    if (Array.isArray(o.team_profiles)) return o.team_profiles

    // { data: { data: [...] } }  or  { data: { members: [...] } }  or  { data: { team_profiles: [...] } }
    if (o.data && typeof o.data === 'object' && !Array.isArray(o.data)) {
      const nested = o.data as Record<string, unknown>
      if (Array.isArray(nested.data)) return nested.data
      if (Array.isArray(nested.members)) return nested.members
      if (Array.isArray(nested.team_profiles)) return nested.team_profiles
    }
  }

  return []
}

export async function createUserAccount(memberId: number): Promise<CreateUserAccountResult> {
  const res = await apiClient.post<unknown>(
    `/admin/team-profiles/${memberId}/create-user-account`,
    {},
    { skipErrorToast: true } as Record<string, unknown>,
  )

  // Unwrap { success, data: { member, user, temporary_password, ... } }
  const outer = res.data as Record<string, unknown>
  const data = (outer.data ?? outer) as Record<string, unknown>

  const rawMember = data.member as Record<string, unknown> | undefined
  const rawUser   = data.user   as Record<string, unknown> | undefined

  const member = rawMember ? normalizeMember(rawMember) : null

  let user: LinkedUser | null = null
  if (rawUser && typeof rawUser === 'object') {
    const uid = Number(rawUser.id ?? 0)
    const uname = String(rawUser.name ?? '')
    const uemail = String(rawUser.email ?? '')
    if (uid && uname && uemail) {
      user = { id: uid, name: uname, email: uemail, role: String(rawUser.role ?? 'volunteer') }
    }
  }

  return {
    member,
    user,
    temporary_password: parseStr(data.temporary_password) ?? null,
    password_shown_once: Boolean(data.password_shown_once),
    already_linked:  Boolean(data.already_linked),
    linked_existing: Boolean(data.linked_existing),
    created:         Boolean(data.created),
  }
}

/**
 * Load internal members directory.
 *
 * Tries the admin endpoint first, then a non-admin `/members` fallback (some roles such as
 * Dept. Manager may only be authorized on the broader directory route). Throws when ALL
 * endpoints fail so the page can show a real error + retry instead of a misleading
 * "no data" empty state. Returns `[]` only when the API genuinely responds with no rows.
 */
export async function fetchMembers(): Promise<InternalMember[]> {
  const endpoints = ['/admin/members', '/members']
  let lastErr: unknown

  for (const ep of endpoints) {
    try {
      const res = await apiClient.get<unknown>(ep, { skipErrorToast: true } as Record<string, unknown>)

      if (import.meta.env.DEV) {
        console.group(`[membersApi] fetchMembers ${ep}`)
        console.log('raw res.data:', res.data)
      }

      const list = unwrapMembersList(res.data)

      if (import.meta.env.DEV) {
        console.log('unwrapped list length:', list.length, '→ first item:', list[0])
        console.groupEnd()
      }

      return list.map(normalizeMember).filter((m): m is InternalMember => m !== null)
    } catch (err) {
      lastErr = err
      if (import.meta.env.DEV) {
        console.warn(`[membersApi] ${ep} failed:`, err)
      }
      // try next endpoint
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error('تعذّر تحميل قائمة الأعضاء.')
}
