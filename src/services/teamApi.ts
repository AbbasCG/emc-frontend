import apiClient from '@/api/axios'

export type TeamMember = {
  id: number
  user_id?: number | null
  name_ar: string
  name_en?: string | null
  position_ar: string
  position_en?: string | null
  role_key?: string | null
  image: string | null
  user_avatar_url?: string | null
  resolved_photo_url?: string | null
  bio_ar?: string | null
  is_leader: boolean
  is_executive: boolean
  is_active?: boolean
  // User account fields (admin endpoint only — not exposed publicly)
  user_is_active?: boolean | null
  user_name?: string | null
  user_email?: string | null
  user_role?: string | null
}

export type Department = {
  id: number
  name_ar: string
  name_en?: string | null
  slug: string
  description_ar: string
  icon: string
  sort_order: number
  members: TeamMember[]
}

export type TeamResponse = {
  data: Department[]
}

/** Full admin profile shape returned by /admin/team-profiles CRUD endpoints. */
export type AdminTeamProfile = {
  id: number
  user_id: number | null
  name_ar: string
  name_en: string | null
  position_ar: string
  position_en: string | null
  role_key: string | null
  bio_ar: string | null
  country: string | null
  email: string | null
  phone: string | null
  is_leader: boolean
  is_executive: boolean
  is_active: boolean
  sort_order: number
  image: string | null
  user_avatar_url: string | null
  resolved_photo_url: string | null
  department: { id: number; name_ar: string; name_en: string | null; slug: string } | null
  user: {
    id: number
    name: string
    email: string
    role: string
    is_active: boolean
    avatar_url: string | null
  } | null
  created_at?: string
}

/** Result from searching the users list for account linking. */
export type UserSearchResult = {
  id: number
  name: string
  email: string
  role: string
  is_active: boolean
  avatar_url: string | null
}

/** Result from POST /admin/team-profiles/{id}/create-user-account */
export type CreateAccountResult = {
  member: {
    id: number
    name: string
    email: string | null
    user_id: number | null
    has_user_account: boolean
  }
  user: {
    id: number
    name: string
    email: string
    role: string
    is_active: boolean
  } | null
  temporary_password: string | null
  password_shown_once: boolean
  already_linked: boolean
  linked_existing: boolean
  created: boolean
}

export type CreateTeamProfilePayload = {
  name_ar: string
  name_en?: string | null
  position_ar: string
  position_en?: string | null
  department_id?: number | null
  user_id?: number | null
  role_key?: string | null
  bio_ar?: string | null
  country?: string | null
  email?: string | null
  phone?: string | null
  is_leader?: boolean
  is_executive?: boolean
  is_active?: boolean
  sort_order?: number | null
}

/** Resolve storage-relative image paths from Laravel `/storage/...` */
export function resolveTeamMemberImage(image: string | null | undefined): string | null {
  if (!image?.trim()) return null
  if (/^https?:\/\//i.test(image)) return image
  const apiBase =
    import.meta.env.VITE_API_URL ?? import.meta.env.VITE_API_BASE_URL ?? ''
  const origin = apiBase.replace(/\/api\/?$/, '').replace(/\/$/, '')
  return image.startsWith('/') ? `${origin}${image}` : `${origin}/${image}`
}

/** Sort departments by `sort_order` ascending. */
export function sortDepartments(list: Department[]): Department[] {
  return [...list].sort((a, b) => a.sort_order - b.sort_order)
}

function normalizeMember(raw: Record<string, unknown>): TeamMember {
  const resolvedRaw = raw.resolved_photo_url
  const imageRaw = raw.image ?? raw.photo_url ?? raw.avatar ?? null

  const finalImage =
    resolvedRaw != null && String(resolvedRaw).trim() !== ''
      ? String(resolvedRaw)
      : imageRaw != null && String(imageRaw).trim() !== ''
      ? String(imageRaw)
      : null

  const isActive = raw.is_active
  return {
    id: Number(raw.id ?? 0),
    user_id: raw.user_id != null ? Number(raw.user_id) : null,
    name_ar: String(raw.name_ar ?? raw.name ?? ''),
    name_en: raw.name_en != null ? String(raw.name_en) : null,
    position_ar: String(raw.position_ar ?? raw.role_ar ?? raw.position ?? raw.title ?? ''),
    position_en: raw.position_en != null ? String(raw.position_en) : null,
    role_key: raw.role_key != null ? String(raw.role_key) : null,
    image: finalImage,
    user_avatar_url:
      raw.user_avatar_url != null && String(raw.user_avatar_url).trim() !== ''
        ? String(raw.user_avatar_url)
        : null,
    resolved_photo_url:
      resolvedRaw != null && String(resolvedRaw).trim() !== ''
        ? String(resolvedRaw)
        : null,
    bio_ar: raw.bio_ar != null ? String(raw.bio_ar) : null,
    is_leader: raw.is_leader === true || raw.is_leader === 1 || raw.is_leader === '1',
    is_executive: raw.is_executive === true || raw.is_executive === 1 || raw.is_executive === '1',
    is_active: isActive === undefined || isActive === null || isActive === true || isActive === 1 || isActive === '1',
    // Admin-only user account fields
    user_is_active: raw.user_is_active != null ? Boolean(raw.user_is_active) : null,
    user_name: raw.user_name != null ? String(raw.user_name) : null,
    user_email: raw.user_email != null ? String(raw.user_email) : null,
    user_role: raw.user_role != null ? String(raw.user_role) : null,
  }
}

function normalizeDepartment(raw: Record<string, unknown>): Department {
  const rawMembers = (
    Array.isArray(raw.members) ? raw.members
    : Array.isArray(raw.team_members) ? raw.team_members
    : Array.isArray(raw.users) ? raw.users
    : Array.isArray(raw.staff) ? raw.staff
    : []
  ) as unknown[]

  return {
    id: Number(raw.id ?? 0),
    name_ar: String(raw.name_ar ?? raw.name ?? ''),
    name_en: raw.name_en != null ? String(raw.name_en) : null,
    slug: String(raw.slug ?? ''),
    description_ar: String(raw.description_ar ?? raw.description ?? ''),
    icon: String(raw.icon ?? ''),
    sort_order: Number(raw.sort_order ?? 0),
    members: rawMembers
      .filter((m): m is Record<string, unknown> => typeof m === 'object' && m !== null && !Array.isArray(m))
      .map(normalizeMember)
      .filter((m) => m.id > 0 || m.name_ar !== ''),
  }
}

export async function getTeam(): Promise<Department[]> {
  const res = await apiClient.get<TeamResponse | Department[]>('/team', { skipErrorToast: true })
  const payload = res.data
  const list = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : []
  const normalized = (list as unknown[])
    .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null && !Array.isArray(r))
    .map(normalizeDepartment)
  return sortDepartments(normalized)
}

/** Admin team fetch — tries /admin/team (all members incl. inactive), falls back to /team. */
export async function getAdminTeam(): Promise<Department[]> {
  async function fetchFrom(path: string): Promise<Department[]> {
    const res = await apiClient.get<TeamResponse | Department[]>(path, {
      skipErrorToast: true,
    } as Record<string, unknown>)
    const payload = res.data
    const list = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : []
    return (list as unknown[])
      .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null && !Array.isArray(r))
      .map(normalizeDepartment)
  }

  try {
    const data = await fetchFrom('/admin/team')
    if (data.length > 0) return sortDepartments(data)
  } catch { /* fall through */ }

  const data = await fetchFrom('/team')
  return sortDepartments(data)
}

// ─── Admin CRUD ───────────────────────────────────────────────────────────────

export async function createTeamProfile(payload: CreateTeamProfilePayload): Promise<AdminTeamProfile> {
  const res = await apiClient.post<{ success: boolean; data: AdminTeamProfile }>('/admin/team-profiles', payload)
  return res.data.data
}

export async function updateTeamProfile(id: number, payload: Partial<CreateTeamProfilePayload>): Promise<AdminTeamProfile> {
  const res = await apiClient.patch<{ success: boolean; data: AdminTeamProfile }>(
    `/admin/team-profiles/${id}`,
    payload,
  )
  return res.data.data
}

export async function deleteTeamProfile(id: number): Promise<void> {
  await apiClient.delete(`/admin/team-profiles/${id}`)
}

export async function uploadTeamProfilePhoto(id: number, file: File): Promise<AdminTeamProfile> {
  const form = new FormData()
  form.append('photo', file)
  const res = await apiClient.post<{ success: boolean; data: AdminTeamProfile }>(
    `/admin/team-profiles/${id}/photo`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  return res.data.data
}

export async function getTeamProfileDetail(id: number): Promise<AdminTeamProfile> {
  const res = await apiClient.get<{ success: boolean; data: AdminTeamProfile }>(
    `/admin/team-profiles/${id}`,
  )
  return res.data.data
}

/** Search users by name or email for account linking. */
export async function searchAdminUsers(q: string): Promise<UserSearchResult[]> {
  const res = await apiClient.get<{
    data: Array<{
      id: number
      name: string
      email: string
      role: string
      is_active: boolean | number
      avatar?: string | null
      avatar_url?: string | null
    }>
  }>('/admin/users', {
    params: { search: q, status: 'all', per_page: 10 },
    skipErrorToast: true,
  } as Record<string, unknown>)

  const list = Array.isArray(res.data?.data) ? res.data.data : []
  return list.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    is_active: u.is_active === true || u.is_active === 1,
    avatar_url: u.avatar_url ?? u.avatar ?? null,
  }))
}

/** Link an existing user account to a team profile (sets user_id). */
export async function linkUserToTeamProfile(
  profileId: number,
  userId: number,
): Promise<AdminTeamProfile> {
  return updateTeamProfile(profileId, { user_id: userId })
}

/** Remove user_id link from a team profile (does NOT delete user). */
export async function unlinkUserFromTeamProfile(profileId: number): Promise<AdminTeamProfile> {
  const res = await apiClient.post<{ success: boolean; data: AdminTeamProfile }>(
    `/admin/team-profiles/${profileId}/unlink-user`,
  )
  return res.data.data
}

/** Create or link a user account for a team profile member. */
export async function createAccountForTeamProfile(profileId: number): Promise<CreateAccountResult> {
  const res = await apiClient.post<{ success: boolean; data: CreateAccountResult }>(
    `/admin/team-profiles/${profileId}/create-user-account`,
  )
  return res.data.data
}
