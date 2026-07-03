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
  status: VolunteerRequestStatus
  created_at?: string | null
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
  full_name: string
  email: string
  phone: string
  country: string
  city: string
  gender: string
  desired_department: string
  experience_level: string
  skills: string
  availability: string
  motivation: string
  previous_experience?: string
  cv_file?: File | null
  notes?: string
  agree_terms: boolean
}

export async function submitVolunteerApplication(data: VolunteerApplicationInput): Promise<void> {
  const fd = new FormData()
  fd.append('full_name', data.full_name.trim())
  fd.append('email', data.email.trim())
  fd.append('phone', data.phone.trim())
  fd.append('country', data.country.trim())
  fd.append('city', data.city.trim())
  fd.append('gender', data.gender)
  fd.append('desired_department', data.desired_department)
  fd.append('experience_level', data.experience_level)
  if (data.skills.trim()) fd.append('skills', data.skills.trim())
  fd.append('availability', data.availability)
  fd.append('motivation', data.motivation.trim())
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
    status,
    created_at: parseStr(raw.created_at),
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

function unwrapList(res: unknown): unknown[] {
  const inner = unwrapData<unknown>(res)
  if (Array.isArray(inner)) return inner
  if (inner && typeof inner === 'object') {
    const o = inner as Record<string, unknown>
    if (Array.isArray(o.data)) return o.data
    if (Array.isArray(o.members)) return o.members
    if (Array.isArray(o.items)) return o.items
  }
  return []
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

export async function fetchVolunteerRequests(): Promise<VolunteerRequest[]> {
  const res = await apiClient.get<unknown>('/admin/volunteer-requests', { skipErrorToast: true } as Record<string, unknown>)
  const list = unwrapList(res.data)
  return list
    .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null && !Array.isArray(r))
    .map(normalizeRequest)
    .filter((r) => r.id > 0)
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
