import api from './axios'
import type { VolunteerHrProfile, VolunteerHrProfileStatus } from './volunteerHrProfileApi'

export type HrVolunteerProfileStatistics = {
  total: number
  submitted: number
  under_review: number
  approved: number
  rejected: number
  departments_count: number
  joined_this_month: number
}

export type HrVolunteerProfileFilters = {
  page?: number
  per_page?: number
  search?: string
  status?: VolunteerHrProfileStatus
  department_id?: number
  job_title?: string
  country?: string
  city?: string
  join_from?: string
  join_to?: string
  submitted_from?: string
  submitted_to?: string
  has_cv?: 'yes' | 'no'
}

export type HrVolunteerProfileListResponse = {
  success: boolean
  data: VolunteerHrProfile[]
  meta: { current_page: number; last_page: number; total: number; per_page: number }
  statistics: HrVolunteerProfileStatistics
}

export async function fetchHrVolunteerProfiles(filters: HrVolunteerProfileFilters): Promise<HrVolunteerProfileListResponse> {
  const res = await api.get('/hr/volunteer-hr-profiles', { params: filters })
  return res.data
}

export async function fetchHrVolunteerProfileFilterOptions(): Promise<{
  departments: { id: number; name_ar: string; name: string | null }[]
  statuses: VolunteerHrProfileStatus[]
}> {
  const res = await api.get('/hr/volunteer-hr-profiles/filter-options')
  return res.data.data
}

export async function fetchHrVolunteerProfile(id: number): Promise<VolunteerHrProfile> {
  const res = await api.get(`/hr/volunteer-hr-profiles/${id}`)
  return res.data.data
}

/** What HR may change in a volunteer's profile (the server ignores anything else). */
export type HrVolunteerProfilePatch = Partial<{
  full_name: string
  email: string
  phone: string
  phone_country_code: string | null
  country: string | null
  country_code: string | null
  city: string | null
  date_of_birth: string | null
  gender: string | null
  nationality: string | null
  department_id: number
  job_title: string
  employment_type: string | null
  join_date: string
  availability: string | null
  weekly_hours: number | null
  skills: string | null
  languages: string[]
  education: string | null
  university_specialization: string | null
  experience: string | null
  professional_bio: string | null
  linkedin_url: string | null
  portfolio_url: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
}>

/**
 * Saves HR's edit. `expectedUpdatedAt` is the profile's `updated_at` as loaded: if someone saved in between, the server answers
 * 409 (`profile_conflict`) with the current profile instead of overwriting it.
 */
export async function updateHrVolunteerProfile(id: number, patch: HrVolunteerProfilePatch, expectedUpdatedAt?: string | null): Promise<VolunteerHrProfile> {
  const res = await api.put(`/hr/volunteer-hr-profiles/${id}`, expectedUpdatedAt ? { ...patch, expected_updated_at: expectedUpdatedAt } : patch, { skipErrorToast: true })
  return res.data.data
}

export async function startVolunteerProfileReview(id: number): Promise<VolunteerHrProfile> {
  const res = await api.patch(`/hr/volunteer-hr-profiles/${id}/review`)
  return res.data.data
}

export async function approveVolunteerProfile(id: number, departmentId?: number): Promise<VolunteerHrProfile> {
  const res = await api.post(`/hr/volunteer-hr-profiles/${id}/approve`, departmentId ? { department_id: departmentId } : undefined)
  return res.data.data
}

export async function rejectVolunteerProfile(id: number, reason: string): Promise<VolunteerHrProfile> {
  const res = await api.post(`/hr/volunteer-hr-profiles/${id}/reject`, { reason })
  return res.data.data
}

function parseContentDispositionFilename(cd: string | undefined, fallback: string): string {
  if (!cd) return fallback
  const star = /filename\*=UTF-8''([^;\n]*)/i.exec(cd)
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1]).trim()
    } catch {
      return star[1].trim()
    }
  }
  const plain = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i.exec(cd)
  if (plain?.[1]) return plain[1].replace(/['"]/g, '').trim()
  return fallback
}

/** Role-gated blob fetch for the volunteer's CV — preview only, never a public URL or download. */
export async function fetchVolunteerHrProfileCvBlob(
  profileId: number,
  mode: 'preview' = 'preview',
): Promise<{ blob: Blob; mime: string; filename: string }> {
  const res = await api.get<Blob>(`/hr/volunteers/${profileId}/cv/${mode}`, {
    responseType: 'blob',
    skipErrorToast: true,
  } as Record<string, unknown>)

  const rawType = String(res.headers['content-type'] ?? res.data.type ?? 'application/octet-stream')
  const mime = rawType.split(';')[0].trim()

  if (mime.includes('application/json')) {
    const text = await res.data.text()
    let message = 'تعذّر تحميل الملف.'
    try {
      const parsed = JSON.parse(text) as { message?: string }
      if (parsed.message) message = parsed.message
    } catch {
      /* keep default */
    }
    throw new Error(message)
  }

  const blob = res.data.size > 0 && !res.data.type ? new Blob([res.data], { type: mime }) : res.data
  const cd = (res.headers['content-disposition'] ?? res.headers['Content-Disposition']) as string | undefined

  return { blob, mime, filename: parseContentDispositionFilename(cd, `cv-${profileId}`) }
}
