import apiClient from '@/api/axios'

export type TeamMember = {
  id: number
  name_ar: string
  name_en?: string | null
  position_ar: string
  role_key?: string | null
  image: string | null
  is_leader: boolean
  is_executive: boolean
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

/** Resolve storage-relative image paths from Laravel `/storage/...` */
export function resolveTeamMemberImage(image: string | null): string | null {
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
  const imageRaw = raw.image ?? raw.photo_url ?? raw.avatar ?? null
  return {
    id: Number(raw.id ?? 0),
    name_ar: String(raw.name_ar ?? raw.name ?? ''),
    name_en: raw.name_en != null ? String(raw.name_en) : null,
    position_ar: String(raw.position_ar ?? raw.role_ar ?? raw.position ?? raw.title ?? ''),
    role_key: raw.role_key != null ? String(raw.role_key) : null,
    image: imageRaw != null && String(imageRaw).trim() !== '' ? String(imageRaw) : null,
    is_leader: raw.is_leader === true || raw.is_leader === 1 || raw.is_leader === '1',
    is_executive: raw.is_executive === true || raw.is_executive === 1 || raw.is_executive === '1',
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

/** Admin-specific team fetch — tries /admin/team first, falls back to /team. */
export async function getAdminTeam(): Promise<Department[]> {
  async function fetchFrom(path: string): Promise<Department[]> {
    const res = await apiClient.get<TeamResponse | Department[]>(path, { skipErrorToast: true } as Record<string, unknown>)
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
