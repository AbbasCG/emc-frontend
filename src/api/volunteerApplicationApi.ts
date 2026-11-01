import apiClient from './axios'
import { unwrapData } from './unwrap'

export type VolunteerRequestStatus = 'pending' | 'reviewing' | 'reviewed' | 'accepted' | 'rejected' | 'contacted' | 'converted_to_member'

export type VolunteerRequest = {
  id: number
  full_name: string
  email: string
  phone?: string | null
  country?: string | null
  city?: string | null
  gender?: string | null
  desired_department?: string | null
  experience_level?: string | null
  skills?: string | null
  availability?: string | null
  motivation?: string | null
  previous_experience?: string | null
  notes?: string | null
  admin_notes?: string | null
  cv_file_url?: string | null
  cv_view_url?: string | null
  cv_download_url?: string | null

  // التقييم الشامل والمستويات الخمسة
  birth_date?: string | null
  nationality?: string | null
  education_level?: string | null
  current_status?: string | null
  job_title?: string | null
  specialization?: string | null
  volunteer_days_availability?: string | null
  volunteer_days?: string[] | null
  preferred_time_slot?: string | null
  daily_hours?: string | null
  in_person_capable?: string | null
  remote_capable?: string | null
  has_previous_volunteering?: boolean | null
  volunteering_organizations?: string | null
  volunteering_duration?: string | null
  past_volunteer_tasks?: string[] | null
  personal_skills?: string[] | null
  skill_level_rating?: number | null
  technical_tools?: string[] | null
  value_add_contributions?: string | null
  portfolio_link_status?: string | null
  portfolio_url?: string | null
  motivation_ratings?: Record<string, number> | null
  commitment_ratings?: Record<string, number> | null
  situational_responses?: Record<string, string> | null
  expected_duration?: string | null
  commitment_three_months?: string | null
  reasons_for_applying?: string[] | null
  expected_gains?: string[] | null
  secondary_departments?: string[] | null
  primary_value_department?: string | null
  department_skills?: string[] | null
  preferred_work_environment?: string | null
  quit_reasons?: string[] | null
  suggestions?: string | null

  status: VolunteerRequestStatus
  /** The opportunity this application was made for; null/absent for a general application. */
  opportunity_id?: number | null
  opportunity_title?: string | null
  created_at?: string | null
  updated_at?: string | null
  reviewed_at?: string | null
  accepted_at?: string | null
  accepted_by?: { id: number; name: string } | null
  accepted_by_name?: string | null

  /** True when the volunteer has been converted to an internal member */
  is_converted?: boolean | null
  /** Timestamp of when conversion happened (primary signal from backend) */
  converted_to_member_at?: string | null
  /** ID of the created InternalMember record */
  converted_member_id?: number | null
  /** Embedded member snapshot returned after conversion */
  converted_member?: { id: number; name: string } | null
  /** Backend flag: false means already converted or not eligible */
  can_convert_to_member?: boolean | null
}

export type AcceptedVolunteersMeta = {
  total_accepted: number
  total_converted: number
  accepted_this_month: number
  top_department: string | null
}

export type VolunteerApplicationInput = {
  opportunity_id?: number | null
  full_name: string
  email: string
  phone: string
  country: string
  city: string
  gender: string
  birth_date?: string | null
  nationality?: string | null

  // المستوى الثاني
  education_level?: string | null
  current_status?: string | null
  job_title?: string | null
  specialization?: string | null
  volunteer_days_availability?: string | null
  volunteer_days?: string[] | null
  preferred_time_slot?: string | null
  daily_hours?: string | null
  in_person_capable?: string | null
  remote_capable?: string | null

  // المستوى الثالث
  has_previous_volunteering?: boolean | null
  volunteering_organizations?: string | null
  volunteering_duration?: string | null
  past_volunteer_tasks?: string[] | null
  personal_skills?: string[] | null
  skill_level_rating?: number | null
  technical_tools?: string[] | null
  value_add_contributions?: string | null
  portfolio_link_status?: string | null
  portfolio_url?: string | null

  // المستوى الرابع
  motivation_ratings?: Record<string, number> | null
  commitment_ratings?: Record<string, number> | null
  situational_responses?: Record<string, string> | null
  expected_duration?: string | null
  commitment_three_months?: string | null

  // المستوى الخامس
  reasons_for_applying?: string[] | null
  expected_gains?: string[] | null
  secondary_departments?: string[] | null
  primary_value_department?: string | null
  department_skills?: string[] | null
  preferred_work_environment?: string | null
  quit_reasons?: string[] | null
  suggestions?: string | null

  desired_department: string
  experience_level?: string | null
  skills?: string | null
  availability?: string | null
  motivation?: string | null
  previous_experience?: string | null
  cv_file?: File | null
  notes?: string | null
  agree_terms: boolean
}

export async function submitVolunteerApplication(data: VolunteerApplicationInput): Promise<void> {
  const fd = new FormData()
  if (data.opportunity_id) fd.append('opportunity_id', String(data.opportunity_id))
  fd.append('full_name', data.full_name.trim())
  fd.append('email', data.email.trim())
  fd.append('phone', data.phone.trim())
  fd.append('country', data.country.trim())
  fd.append('city', data.city.trim())
  fd.append('gender', data.gender || 'unspecified')
  if (data.birth_date) fd.append('birth_date', data.birth_date)
  if (data.nationality) fd.append('nationality', data.nationality.trim())

  // المستوى الثاني
  if (data.education_level) fd.append('education_level', data.education_level)
  if (data.current_status) fd.append('current_status', data.current_status)
  if (data.job_title) fd.append('job_title', data.job_title.trim())
  if (data.specialization) fd.append('specialization', data.specialization.trim())
  if (data.volunteer_days_availability) fd.append('volunteer_days_availability', data.volunteer_days_availability)
  if (data.volunteer_days?.length) fd.append('volunteer_days', JSON.stringify(data.volunteer_days))
  if (data.preferred_time_slot) fd.append('preferred_time_slot', data.preferred_time_slot)
  if (data.daily_hours) fd.append('daily_hours', data.daily_hours)
  if (data.in_person_capable) fd.append('in_person_capable', data.in_person_capable)
  if (data.remote_capable) fd.append('remote_capable', data.remote_capable)

  // المستوى الثالث
  if (data.has_previous_volunteering !== undefined && data.has_previous_volunteering !== null) {
    fd.append('has_previous_volunteering', data.has_previous_volunteering ? '1' : '0')
  }
  if (data.volunteering_organizations) fd.append('volunteering_organizations', data.volunteering_organizations.trim())
  if (data.volunteering_duration) fd.append('volunteering_duration', data.volunteering_duration)
  if (data.past_volunteer_tasks?.length) fd.append('past_volunteer_tasks', JSON.stringify(data.past_volunteer_tasks))
  if (data.personal_skills?.length) fd.append('personal_skills', JSON.stringify(data.personal_skills))
  if (data.skill_level_rating) fd.append('skill_level_rating', String(data.skill_level_rating))
  if (data.technical_tools?.length) fd.append('technical_tools', JSON.stringify(data.technical_tools))
  if (data.value_add_contributions) fd.append('value_add_contributions', data.value_add_contributions.trim())
  if (data.portfolio_link_status) fd.append('portfolio_link_status', data.portfolio_link_status)
  if (data.portfolio_url) fd.append('portfolio_url', data.portfolio_url.trim())

  // المستوى الرابع
  if (data.motivation_ratings) fd.append('motivation_ratings', JSON.stringify(data.motivation_ratings))
  if (data.commitment_ratings) fd.append('commitment_ratings', JSON.stringify(data.commitment_ratings))
  if (data.situational_responses) fd.append('situational_responses', JSON.stringify(data.situational_responses))
  if (data.expected_duration) fd.append('expected_duration', data.expected_duration)
  if (data.commitment_three_months) fd.append('commitment_three_months', data.commitment_three_months)

  // المستوى الخامس
  if (data.reasons_for_applying?.length) fd.append('reasons_for_applying', JSON.stringify(data.reasons_for_applying))
  if (data.expected_gains?.length) fd.append('expected_gains', JSON.stringify(data.expected_gains))
  if (data.secondary_departments?.length) fd.append('secondary_departments', JSON.stringify(data.secondary_departments))
  if (data.primary_value_department) fd.append('primary_value_department', data.primary_value_department)
  if (data.department_skills?.length) fd.append('department_skills', JSON.stringify(data.department_skills))
  if (data.preferred_work_environment) fd.append('preferred_work_environment', data.preferred_work_environment)
  if (data.quit_reasons?.length) fd.append('quit_reasons', JSON.stringify(data.quit_reasons))
  if (data.suggestions) fd.append('suggestions', data.suggestions.trim())

  // الحقول العامة السابقة لضمان التوافق الكامل
  fd.append('desired_department', data.desired_department || data.primary_value_department || 'غير محدد')
  if (data.experience_level) fd.append('experience_level', data.experience_level)
  if (data.skills?.trim()) fd.append('skills', data.skills.trim())
  if (data.availability) fd.append('availability', data.availability)
  if (data.motivation) fd.append('motivation', data.motivation.trim())
  if (data.previous_experience?.trim()) fd.append('previous_experience', data.previous_experience.trim())
  if (data.cv_file) fd.append('cv_file', data.cv_file)
  if (data.notes?.trim()) fd.append('notes', data.notes.trim())
  fd.append('agree_terms', '1')

  if (import.meta.env.DEV) {
    console.group('[VolunteerApply] FormData payload')
    for (const [key, val] of fd.entries()) {
      console.log(`  ${key}:`, val instanceof File ? `File(${val.name}, ${val.size}B)` : val)
    }
    console.groupEnd()
  }

  await apiClient.post('/volunteer-requests', fd, { skipErrorToast: true })
}

function parseBool(v: unknown): boolean | null {
  if (v === true || v === 1 || v === '1' || v === 'true') return true
  if (v === false || v === 0 || v === '0' || v === 'false') return false
  return null
}

function parseId(v: unknown): number | null {
  const n = Number(v)
  return v != null && Number.isFinite(n) && n > 0 ? n : null
}

function parseStr(v: unknown): string | null {
  if (v == null) return null
  const s = String(v).trim()
  return s || null
}

export function normalizeRequest(raw: Record<string, unknown>): VolunteerRequest {
  const statusRaw = String(raw.status ?? 'pending').toLowerCase()
  const validStatuses: VolunteerRequestStatus[] = ['pending', 'reviewing', 'reviewed', 'accepted', 'rejected', 'contacted', 'converted_to_member']
  const status: VolunteerRequestStatus = validStatuses.includes(statusRaw as VolunteerRequestStatus)
    ? (statusRaw as VolunteerRequestStatus)
    : 'pending'

  // Resolve conversion fields from multiple possible backend shapes
  const convertedAt =
    parseStr(raw.converted_to_member_at) ??
    parseStr(raw.converted_at) ??
    null
  const convertedMemberId =
    parseId(raw.converted_member_id) ??
    parseId(raw.member_id) ??
    null

  // Derive is_converted from explicit flag OR from presence of converted_at/id
  const isConvertedExplicit = parseBool(raw.is_converted)
  const isConverted: boolean | null =
    isConvertedExplicit !== null
      ? isConvertedExplicit
      : convertedAt !== null || convertedMemberId !== null
        ? true
        : null

  // can_convert_to_member: false means already converted or ineligible
  const canConvert = parseBool(raw.can_convert_to_member)

  // Embedded member snapshot from the convert endpoint response
  let convertedMember: { id: number; name: string } | null = null
  const rawMember = raw.converted_member ?? raw.member
  if (rawMember && typeof rawMember === 'object' && !Array.isArray(rawMember)) {
    const m = rawMember as Record<string, unknown>
    const mid = parseId(m.id)
    const mname = parseStr(m.name ?? m.full_name)
    if (mid && mname) convertedMember = { id: mid, name: mname }
  }

  return {
    id: Number(raw.id ?? 0),
    full_name: String(raw.full_name ?? raw.name ?? ''),
    email: String(raw.email ?? ''),
    phone: parseStr(raw.phone),
    country: parseStr(raw.country),
    city: parseStr(raw.city),
    gender: parseStr(raw.gender),
    desired_department: parseStr(raw.desired_department),
    experience_level: parseStr(raw.experience_level),
    skills: parseStr(raw.skills),
    availability: parseStr(raw.availability),
    motivation: parseStr(raw.motivation),
    previous_experience: parseStr(raw.previous_experience),
    notes: parseStr(raw.notes),
    admin_notes: parseStr(raw.admin_notes),
    cv_file_url: parseStr(raw.cv_file_url ?? raw.cv_url),
    cv_view_url: parseStr(raw.cv_view_url),
    cv_download_url: parseStr(raw.cv_download_url ?? raw.cv_file_url ?? raw.cv_url),

    // التقييم الشامل
    birth_date: parseStr(raw.birth_date),
    nationality: parseStr(raw.nationality),
    education_level: parseStr(raw.education_level),
    current_status: parseStr(raw.current_status),
    job_title: parseStr(raw.job_title),
    specialization: parseStr(raw.specialization),
    volunteer_days_availability: parseStr(raw.volunteer_days_availability),
    volunteer_days: Array.isArray(raw.volunteer_days) ? (raw.volunteer_days as string[]) : null,
    preferred_time_slot: parseStr(raw.preferred_time_slot),
    daily_hours: parseStr(raw.daily_hours),
    in_person_capable: parseStr(raw.in_person_capable),
    remote_capable: parseStr(raw.remote_capable),
    has_previous_volunteering: parseBool(raw.has_previous_volunteering),
    volunteering_organizations: parseStr(raw.volunteering_organizations),
    volunteering_duration: parseStr(raw.volunteering_duration),
    past_volunteer_tasks: Array.isArray(raw.past_volunteer_tasks) ? (raw.past_volunteer_tasks as string[]) : null,
    personal_skills: Array.isArray(raw.personal_skills) ? (raw.personal_skills as string[]) : null,
    skill_level_rating: parseId(raw.skill_level_rating),
    technical_tools: Array.isArray(raw.technical_tools) ? (raw.technical_tools as string[]) : null,
    value_add_contributions: parseStr(raw.value_add_contributions),
    portfolio_link_status: parseStr(raw.portfolio_link_status),
    portfolio_url: parseStr(raw.portfolio_url),
    motivation_ratings: (raw.motivation_ratings && typeof raw.motivation_ratings === 'object') ? (raw.motivation_ratings as Record<string, number>) : null,
    commitment_ratings: (raw.commitment_ratings && typeof raw.commitment_ratings === 'object') ? (raw.commitment_ratings as Record<string, number>) : null,
    situational_responses: (raw.situational_responses && typeof raw.situational_responses === 'object') ? (raw.situational_responses as Record<string, string>) : null,
    expected_duration: parseStr(raw.expected_duration),
    commitment_three_months: parseStr(raw.commitment_three_months),
    reasons_for_applying: Array.isArray(raw.reasons_for_applying) ? (raw.reasons_for_applying as string[]) : null,
    expected_gains: Array.isArray(raw.expected_gains) ? (raw.expected_gains as string[]) : null,
    secondary_departments: Array.isArray(raw.secondary_departments) ? (raw.secondary_departments as string[]) : null,
    primary_value_department: parseStr(raw.primary_value_department),
    department_skills: Array.isArray(raw.department_skills) ? (raw.department_skills as string[]) : null,
    preferred_work_environment: parseStr(raw.preferred_work_environment),
    quit_reasons: Array.isArray(raw.quit_reasons) ? (raw.quit_reasons as string[]) : null,
    suggestions: parseStr(raw.suggestions),
    status,
    opportunity_id: parseId(raw.opportunity_id),
    opportunity_title: parseStr(raw.opportunity_title),
    created_at: parseStr(raw.created_at),
    updated_at: parseStr(raw.updated_at),
    reviewed_at: parseStr(raw.reviewed_at),
    accepted_at: parseStr(raw.accepted_at),
    accepted_by_name: parseStr(raw.accepted_by_name),
    accepted_by: (() => {
      const ab = raw.accepted_by
      if (ab && typeof ab === 'object' && !Array.isArray(ab)) {
        const o = ab as Record<string, unknown>
        const mid = parseId(o.id); const mname = parseStr(o.name)
        if (mid && mname) return { id: mid, name: mname }
      }
      return null
    })(),
    is_converted: isConverted,
    converted_to_member_at: convertedAt,
    converted_member_id: convertedMemberId,
    converted_member: convertedMember,
    can_convert_to_member: canConvert,
  }
}


export async function fetchAcceptedVolunteers(params?: Record<string, string>): Promise<{
  data: VolunteerRequest[]
  meta: AcceptedVolunteersMeta
  pagination: { total: number; current_page: number; last_page: number; per_page: number }
}> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  const res = await apiClient.get<unknown>(`/admin/volunteers/accepted${qs}`, { skipErrorToast: true } as Record<string, unknown>)

  if (import.meta.env.DEV) {
    console.log('[fetchAcceptedVolunteers] raw API response:', res.data)
  }

  // res.data = { success, data: { data: [...], meta: {pagination} }, meta: {stats} }
  const body = unwrapData<unknown>(res.data) as Record<string, unknown>
  // body = { data: [...volunteers], meta: {pagination}, links: {...} }

  const rawData = Array.isArray(body?.data) ? body.data as unknown[] :
    // Fallback: if body itself is an array (non-paginated response), use it directly
    Array.isArray(body) ? body as unknown[] : []

  const paginationMeta = (body?.meta ?? {}) as Record<string, unknown>
  const appMeta = (res.data as Record<string, unknown>)?.meta as AcceptedVolunteersMeta ?? {
    total_accepted: 0, total_converted: 0, accepted_this_month: 0, top_department: null,
  }

  const volunteers = rawData
    .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
    .map(normalizeRequest)
    .filter((r) => r.id > 0)

  if (import.meta.env.DEV) {
    console.log('[fetchAcceptedVolunteers] body:', body, '| rawData length:', rawData.length, '| normalized volunteers:', volunteers, '| meta:', appMeta)
  }

  return {
    data: volunteers,
    meta: appMeta,
    pagination: {
      total: Number(paginationMeta.total ?? 0),
      current_page: Number(paginationMeta.current_page ?? 1),
      last_page: Number(paginationMeta.last_page ?? 1),
      per_page: Number(paginationMeta.per_page ?? 50),
    },
  }
}

export type VolunteerRequestsParams = {
  page?: number
  per_page?: number
  status?: VolunteerRequestStatus | 'all'
  search?: string
  desired_department?: string
}

export type VolunteerRequestsPagination = {
  current_page: number
  last_page: number
  per_page: number
  total: number
  from: number
  to: number
}

export type VolunteerRequestsStatistics = {
  total: number
  pending: number
  reviewing: number
  reviewed: number
  accepted: number
  rejected: number
  contacted: number
  converted_to_member: number
}

export type FetchVolunteerRequestsResult = {
  data: VolunteerRequest[]
  meta: VolunteerRequestsPagination
  statistics: VolunteerRequestsStatistics
}

export async function fetchVolunteerRequests(
  params: VolunteerRequestsParams = {},
): Promise<FetchVolunteerRequestsResult> {
  const qs: Record<string, string> = {}
  if (params.page && params.page > 1) qs.page = String(params.page)
  if (params.per_page) qs.per_page = String(params.per_page)
  if (params.status && params.status !== 'all') qs.status = params.status
  if (params.search?.trim()) qs.search = params.search.trim()
  if (params.desired_department && params.desired_department !== 'all') qs.desired_department = params.desired_department

  const query = Object.keys(qs).length ? '?' + new URLSearchParams(qs).toString() : ''
  const res = await apiClient.get<unknown>(`/admin/volunteer-requests${query}`, { skipErrorToast: true } as Record<string, unknown>)

  const body = res.data as Record<string, unknown>

  const rawList = Array.isArray(body?.data) ? (body.data as unknown[]) : []
  const data = rawList
    .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null && !Array.isArray(r))
    .map(normalizeRequest)
    .filter((r) => r.id > 0)

  const rawMeta = (body?.meta ?? {}) as Record<string, unknown>
  const meta: VolunteerRequestsPagination = {
    current_page: Number(rawMeta.current_page ?? 1),
    last_page:    Number(rawMeta.last_page    ?? 1),
    per_page:     Number(rawMeta.per_page     ?? 20),
    total:        Number(rawMeta.total        ?? data.length),
    from:         Number(rawMeta.from         ?? 1),
    to:           Number(rawMeta.to           ?? data.length),
  }

  const rawStats = (body?.statistics ?? {}) as Record<string, unknown>
  const statistics: VolunteerRequestsStatistics = {
    total:               Number(rawStats.total               ?? meta.total),
    pending:             Number(rawStats.pending             ?? 0),
    reviewing:           Number(rawStats.reviewing           ?? 0),
    reviewed:            Number(rawStats.reviewed            ?? 0),
    accepted:            Number(rawStats.accepted            ?? 0),
    rejected:            Number(rawStats.rejected            ?? 0),
    contacted:           Number(rawStats.contacted           ?? 0),
    converted_to_member: Number(rawStats.converted_to_member ?? 0),
  }

  return { data, meta, statistics }
}

export async function updateVolunteerRequestStatus(
  id: number,
  status: VolunteerRequestStatus,
  admin_notes?: string,
): Promise<VolunteerRequest> {
  const body: Record<string, unknown> = { status }
  if (admin_notes !== undefined) body.admin_notes = admin_notes
  const res = await apiClient.patch<unknown>(
    `/admin/volunteer-requests/${id}/status`,
    body,
    { skipErrorToast: true } as Record<string, unknown>,
  )
  const inner = unwrapData<unknown>(res.data)
  return normalizeRequest(
    inner && typeof inner === 'object' && !Array.isArray(inner)
      ? (inner as Record<string, unknown>)
      : { id, status },
  )
}

/** Returns the updated VolunteerRequest with conversion data filled in. */
export async function convertVolunteerToMember(id: number): Promise<VolunteerRequest> {
  const res = await apiClient.post<unknown>(
    `/admin/volunteer-requests/${id}/convert-to-member`,
    {},
    { skipErrorToast: true } as Record<string, unknown>,
  )
  const inner = unwrapData<unknown>(res.data)

  if (import.meta.env.DEV) {
    console.log('[convertVolunteerToMember] raw response:', res.data, '→ inner:', inner)
  }

  const raw =
    inner && typeof inner === 'object' && !Array.isArray(inner)
      ? (inner as Record<string, unknown>)
      : {}

  // The backend might return the member record directly or nest the request inside
  // Try request first, fall back to treating the whole response as the member record
  const requestRaw =
    raw.volunteer_request ?? raw.request ?? raw.data ?? raw
  const requestRecord =
    requestRaw && typeof requestRaw === 'object' && !Array.isArray(requestRaw)
      ? (requestRaw as Record<string, unknown>)
      : {}

  // Merge: if request record has the id, use it; otherwise fall back to known id
  const merged: Record<string, unknown> = {
    id,
    status: 'accepted',
    is_converted: true,
    converted_to_member_at: new Date().toISOString(),
    ...requestRecord,
    // Embedded member might be at top level if backend returns { id, name, ... } of member
    converted_member: raw.converted_member ?? raw.member ?? requestRecord.converted_member ?? requestRecord.member ?? null,
    converted_member_id:
      raw.converted_member_id ??
      raw.member_id ??
      requestRecord.converted_member_id ??
      requestRecord.member_id ??
      (raw.id !== id ? raw.id : null) ??
      null,
    can_convert_to_member: false,
  }

  return normalizeRequest(merged)
}
