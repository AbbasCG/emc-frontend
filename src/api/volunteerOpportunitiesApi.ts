import axios from 'axios'
import apiClient from './axios'

/**
 * Public volunteer opportunities: browse, read one, apply. No authentication.
 *
 * The server decides what is public (published and open only) and what an opportunity exposes;
 * this client renders what comes back and treats every value defensively. A 404 for a draft and a
 * 404 for an unknown id look the same on purpose.
 */

export type PublicOpportunityStatus = 'open' | 'closing_soon' | 'closed'
export type LocationMode = 'remote' | 'onsite' | 'hybrid'

export type PublicOpportunity = {
  id: number
  title: string
  summary: string
  field: string | null
  departmentId: number | null
  locationMode: LocationMode | null
  locationLabel: string | null
  commitment: string | null
  duration: string | null
  volunteersNeeded: number | null
  closesAt: string | null
  daysLeft: number | null
  publishedAt: string | null
  status: PublicOpportunityStatus
  statusLabel: string
}

export type PublicOpportunityDetail = PublicOpportunity & {
  responsibilities: string[]
  requiredSkills: string[]
  preferredSkills: string[]
  startDate: string | null
  applicationInstructions: string | null
  acceptingApplications: boolean
  closedReason: 'closed' | 'deadline_passed' | null
}

export type OpportunityQuery = {
  q?: string
  departmentId?: number | ''
  locationMode?: LocationMode | ''
  sort?: 'newest' | 'deadline' | 'title'
  page?: number
}

export type OpportunityList = {
  items: PublicOpportunity[]
  meta: { currentPage: number; lastPage: number; perPage: number; total: number }
  departments: { id: number; name: string; count: number }[]
  locationModes: { value: LocationMode; label: string }[]
}

export type ApplicationInput = {
  fullName: string
  email: string
  phone: string
  country: string
  city: string
  gender: 'male' | 'female' | ''
  experienceLevel: string
  availability: string
  skills: string
  previousExperience: string
  motivation: string
  agreeTerms: boolean
}

const silent = { skipErrorToast: true as const }

function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
const str = (v: unknown, d = ''): string => (typeof v === 'string' ? v : v == null ? d : String(v))
const strOrNull = (v: unknown): string | null => (v == null || v === '' ? null : String(v))
const numOrNull = (v: unknown): number | null => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v))
const strList = (v: unknown): string[] => arr(v).map((x) => str(x).trim()).filter(Boolean)

export function normalizeOpportunity(raw: unknown): PublicOpportunity {
  const r = rec(raw)
  const mode = r.location_mode
  const status = r.status === 'closing_soon' || r.status === 'closed' ? r.status : 'open'

  return {
    id: Number(r.id) || 0,
    title: str(r.title, 'فرصة تطوعية'),
    summary: str(r.summary),
    field: strOrNull(r.field),
    departmentId: numOrNull(r.department_id),
    locationMode: mode === 'remote' || mode === 'onsite' || mode === 'hybrid' ? mode : null,
    locationLabel: strOrNull(r.location_label),
    commitment: strOrNull(r.commitment),
    duration: strOrNull(r.duration),
    volunteersNeeded: numOrNull(r.volunteers_needed),
    closesAt: strOrNull(r.closes_at),
    daysLeft: numOrNull(r.days_left),
    publishedAt: strOrNull(r.published_at),
    status,
    statusLabel: str(r.status_label, status === 'closed' ? 'أُغلق التقديم' : 'التقديم مفتوح'),
  }
}

export function normalizeOpportunityDetail(raw: unknown): PublicOpportunityDetail {
  const r = rec(raw)
  const reason = r.closed_reason

  return {
    ...normalizeOpportunity(r),
    responsibilities: strList(r.responsibilities),
    requiredSkills: strList(r.required_skills),
    preferredSkills: strList(r.preferred_skills),
    startDate: strOrNull(r.start_date),
    applicationInstructions: strOrNull(r.application_instructions),
    // Applications are open only when the server says so explicitly.
    acceptingApplications: r.accepting_applications === true,
    closedReason: reason === 'closed' || reason === 'deadline_passed' ? reason : null,
  }
}

export async function fetchOpportunities(q: OpportunityQuery = {}): Promise<OpportunityList> {
  const params: Record<string, string | number> = {}
  if (q.q?.trim()) params.q = q.q.trim()
  if (q.departmentId) params.department_id = q.departmentId
  if (q.locationMode) params.location_mode = q.locationMode
  if (q.sort && q.sort !== 'newest') params.sort = q.sort
  if (q.page && q.page > 1) params.page = q.page

  const res = await apiClient.get<unknown>('/volunteer-opportunities', { params, ...silent })
  const body = rec(res.data)
  const meta = rec(body.meta)
  const filters = rec(body.filters)

  return {
    items: arr(body.data).map(normalizeOpportunity).filter((o) => o.id > 0),
    meta: { currentPage: Number(meta.current_page) || 1, lastPage: Number(meta.last_page) || 1, perPage: Number(meta.per_page) || 12, total: Number(meta.total) || 0 },
    departments: arr(filters.departments).map((d) => ({ id: Number(rec(d).id) || 0, name: str(rec(d).name), count: Number(rec(d).count) || 0 })).filter((d) => d.id > 0),
    locationModes: arr(filters.location_modes)
      .map((m) => ({ value: rec(m).value as LocationMode, label: str(rec(m).label) }))
      .filter((m) => m.value === 'remote' || m.value === 'onsite' || m.value === 'hybrid'),
  }
}

export async function fetchOpportunity(id: number): Promise<PublicOpportunityDetail> {
  const res = await apiClient.get<unknown>(`/volunteer-opportunities/${id}`, silent)
  return normalizeOpportunityDetail(rec(res.data).data)
}

export async function applyToOpportunity(id: number, input: ApplicationInput): Promise<string> {
  const res = await apiClient.post<unknown>(`/volunteer-opportunities/${id}/applications`, {
    full_name: input.fullName.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    country: input.country.trim(),
    city: input.city.trim(),
    gender: input.gender,
    experience_level: input.experienceLevel,
    availability: input.availability,
    skills: input.skills.trim() || null,
    previous_experience: input.previousExperience.trim() || null,
    motivation: input.motivation.trim(),
    agree_terms: input.agreeTerms,
  }, silent)
  return str(rec(res.data).message, 'تم استلام طلبك.')
}

export type OpportunityErrorKind = 'not_found' | 'closed_or_duplicate' | 'validation' | 'rate_limited' | 'error'

export function classifyOpportunityError(err: unknown): OpportunityErrorKind {
  if (axios.isAxiosError(err)) {
    const s = err.response?.status
    if (s === 404) return 'not_found'
    if (s === 409) return 'closed_or_duplicate'
    if (s === 422) return 'validation'
    if (s === 429) return 'rate_limited'
  }
  return 'error'
}

/** The server's Arabic message when it sent one. */
export function opportunityErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const m = (err.response?.data as { message?: unknown } | undefined)?.message
    if (typeof m === 'string' && m.trim()) return m
  }
  return fallback
}
