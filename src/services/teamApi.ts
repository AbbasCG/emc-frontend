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
    import.meta.env.VITE_API_URL ?? import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api'
  const origin = apiBase.replace(/\/api\/?$/, '').replace(/\/$/, '')
  return image.startsWith('/') ? `${origin}${image}` : `${origin}/${image}`
}

/** Sort departments by `sort_order` ascending. */
export function sortDepartments(list: Department[]): Department[] {
  return [...list].sort((a, b) => a.sort_order - b.sort_order)
}

export async function getTeam(): Promise<Department[]> {
  const res = await apiClient.get<TeamResponse | Department[]>('/team', { skipErrorToast: true })
  const payload = res.data
  const list = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : []
  return sortDepartments(list as Department[])
}
