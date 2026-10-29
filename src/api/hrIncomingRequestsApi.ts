import axios from 'axios'
import apiClient from './axios'

/**
 * HR incoming (staffing) requests, smart volunteer matching and draft opportunities.
 *
 * Every rule lives on the server: who may see a request, the match scoring, and whether a
 * draft exists. The client renders what comes back and passes a 403 through as an
 * unauthorized state. Nothing here publishes, assigns or contacts anyone.
 */

export type HrRequestStatus = 'pending' | 'in_progress' | 'approved' | 'rejected'

export type IncomingDraftRef = { id: number; title: string; status: string; statusLabel: string; applicantsCount: number }

export type IncomingRequest = {
  id: number
  title: string
  requestType: string
  department: { id: number; name: string } | null
  requester: { id: number; name: string } | null
  requiredCount: number
  skillsAndSpecs: string
  skills: string[]
  notes: string | null
  status: HrRequestStatus
  statusLabel: string
  targetAudience: string | null
  targetAudienceLabel: string | null
  hrFeedback: string | null
  createdAt: string | null
  updatedAt: string | null
  draft: IncomingDraftRef | null
}

export type IncomingStats = { total: number; pending: number; inProgress: number; approved: number; rejected: number; withDrafts: number }

export type IncomingCapabilities = { canViewAll: boolean; canManage: boolean; canMatchVolunteers: boolean; canCreateDraft: boolean }

export type IncomingList = {
  items: IncomingRequest[]
  meta: { currentPage: number; lastPage: number; perPage: number; total: number }
  stats: IncomingStats
  departments: { id: number; name: string }[]
  capabilities: IncomingCapabilities
}

export type IncomingQuery = {
  q?: string
  status?: HrRequestStatus | ''
  departmentId?: number | ''
  hasDraft?: 'yes' | 'no' | ''
  dateFrom?: string
  dateTo?: string
  page?: number
}

export type MatchCriterion = { key: string; label: string; earned: number; max: number }

export type VolunteerMatch = {
  id: number
  name: string
  status: string
  statusLabel: string
  score: number
  label: string
  matchedSkills: string[]
  missingSkills: string[]
  reasons: string[]
  warnings: string[]
  breakdown: MatchCriterion[]
  desiredDepartment: string | null
  experienceLevel: string | null
  availability: string | null
  /** `direct_application`: applied to the opportunity made from this request. `smart_match`: suggested by the matcher. */
  source: 'direct_application' | 'smart_match'
  sourceLabel: string
  url: string
  actionLabel: string
}

export type MatchResult = {
  candidates: VolunteerMatch[]
  meta: { minScore: number; evaluated: number; returned: number; generatedAt: string | null; persisted: boolean; limitations: string[] }
}

export type OpportunityDraft = {
  id: number | null
  incomingRequestId: number
  departmentId: number | null
  departmentName: string | null
  title: string
  summary: string
  responsibilities: string[]
  requiredSkills: string[]
  preferredSkills: string[]
  volunteersNeeded: number | null
  availability: string
  duration: string
  locationMode: '' | 'remote' | 'onsite' | 'hybrid'
  startDate: string
  closesAt: string
  applicationInstructions: string
  status: string
  statusLabel: string
  isPublished: boolean
  publishedAt: string | null
}

export type OpportunityDraftInput = {
  title: string
  summary: string
  responsibilities: string[]
  requiredSkills: string[]
  preferredSkills: string[]
  volunteersNeeded: number | null
  availability: string
  duration: string
  locationMode: string
  startDate: string
  closesAt: string
  applicationInstructions: string
  departmentId: number | null
}

const BASE = '/admin/hr-requests'
const silent = { skipErrorToast: true as const }

function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
const str = (v: unknown, d = ''): string => (typeof v === 'string' ? v : v == null ? d : String(v))
const strOrNull = (v: unknown): string | null => (v == null || v === '' ? null : String(v))
const num = (v: unknown): number => (Number.isFinite(Number(v)) ? Number(v) : 0)
const strList = (v: unknown): string[] => arr(v).map((x) => str(x).trim()).filter(Boolean)

const STATUSES: HrRequestStatus[] = ['pending', 'in_progress', 'approved', 'rejected']

export function normalizeIncomingRequest(raw: unknown): IncomingRequest {
  const r = rec(raw)
  const dept = rec(r.department)
  const req = rec(r.requester)
  const draft = rec(r.draft)
  const status = STATUSES.includes(r.status as HrRequestStatus) ? (r.status as HrRequestStatus) : 'pending'

  return {
    id: num(r.id),
    title: str(r.title, 'طلب احتياج'),
    requestType: str(r.request_type),
    department: dept.id != null ? { id: num(dept.id), name: str(dept.name) } : null,
    requester: req.id != null ? { id: num(req.id), name: str(req.name) } : null,
    requiredCount: Math.max(1, num(r.required_count) || 1),
    skillsAndSpecs: str(r.skills_and_specs),
    skills: strList(r.skills),
    notes: strOrNull(r.notes),
    status,
    statusLabel: str(r.status_label, 'غير محدد'),
    targetAudience: strOrNull(r.target_audience),
    targetAudienceLabel: strOrNull(r.target_audience_label),
    hrFeedback: strOrNull(r.hr_feedback),
    createdAt: strOrNull(r.created_at),
    updatedAt: strOrNull(r.updated_at),
    draft: draft.id != null ?
      { id: num(draft.id), title: str(draft.title), status: str(draft.status, 'draft'), statusLabel: str(draft.status_label, 'مسودة'), applicantsCount: num(draft.applicants_count) }
    : null,
  }
}

function normalizeCapabilities(raw: unknown): IncomingCapabilities {
  const c = rec(raw)
  // Anything but an explicit true is false: the client never grants itself an action.
  return {
    canViewAll: c.can_view_all === true,
    canManage: c.can_manage === true,
    canMatchVolunteers: c.can_match_volunteers === true,
    canCreateDraft: c.can_create_draft === true,
  }
}

export async function fetchIncomingRequests(q: IncomingQuery = {}): Promise<IncomingList> {
  const params: Record<string, string | number> = {}
  if (q.q?.trim()) params.q = q.q.trim()
  if (q.status) params.status = q.status
  if (q.departmentId) params.department_id = q.departmentId
  if (q.hasDraft) params.has_draft = q.hasDraft
  if (q.dateFrom) params.date_from = q.dateFrom
  if (q.dateTo) params.date_to = q.dateTo
  if (q.page && q.page > 1) params.page = q.page

  const res = await apiClient.get<unknown>(`${BASE}/incoming`, { params, ...silent })
  const body = rec(res.data)
  const meta = rec(body.meta)
  const stats = rec(body.stats)

  return {
    items: arr(body.data).map(normalizeIncomingRequest),
    meta: { currentPage: num(meta.current_page) || 1, lastPage: num(meta.last_page) || 1, perPage: num(meta.per_page) || 25, total: num(meta.total) },
    stats: {
      total: num(stats.total), pending: num(stats.pending), inProgress: num(stats.in_progress),
      approved: num(stats.approved), rejected: num(stats.rejected), withDrafts: num(stats.with_drafts),
    },
    departments: arr(rec(body.filters).departments).map((d) => ({ id: num(rec(d).id), name: str(rec(d).name) })).filter((d) => d.id > 0),
    capabilities: normalizeCapabilities(body.capabilities),
  }
}

export async function fetchIncomingRequest(id: number): Promise<{ request: IncomingRequest; capabilities: IncomingCapabilities }> {
  const res = await apiClient.get<unknown>(`${BASE}/${id}`, silent)
  const body = rec(res.data)
  return { request: normalizeIncomingRequest(body.data), capabilities: normalizeCapabilities(body.capabilities) }
}

export async function updateIncomingRequestStatus(id: number, status: HrRequestStatus): Promise<IncomingRequest> {
  const res = await apiClient.patch<unknown>(`${BASE}/${id}/status`, { status }, silent)
  return normalizeIncomingRequest(rec(res.data).data)
}

export async function fetchVolunteerMatches(id: number, minScore: number): Promise<MatchResult> {
  const res = await apiClient.get<unknown>(`${BASE}/${id}/volunteer-matches`, { params: { min_score: minScore }, ...silent })
  const body = rec(res.data)
  const meta = rec(body.meta)

  return {
    candidates: arr(body.data).map((raw) => {
      const c = rec(raw)
      return {
        id: num(c.id),
        name: str(c.name, 'متقدم بدون اسم'),
        status: str(c.status),
        statusLabel: str(c.status_label),
        score: Math.max(0, Math.min(100, Math.round(num(c.score)))),
        label: str(c.label),
        matchedSkills: strList(c.matched_skills),
        missingSkills: strList(c.missing_skills),
        reasons: strList(c.reasons),
        warnings: strList(c.warnings),
        breakdown: arr(c.breakdown).map((b) => ({ key: str(rec(b).key), label: str(rec(b).label), earned: num(rec(b).earned), max: num(rec(b).max) })),
        desiredDepartment: strOrNull(c.desired_department),
        experienceLevel: strOrNull(c.experience_level),
        availability: strOrNull(c.availability),
        source: c.source === 'direct_application' ? 'direct_application' : 'smart_match',
        sourceLabel: str(c.source_label, c.source === 'direct_application' ? 'تقدّم مباشرة على الفرصة' : 'اقتراح من المطابقة الذكية'),
        url: safeInternalUrl(c.url),
        actionLabel: str(c.action_label, 'مراجعة المرشح'),
      }
    }),
    meta: {
      minScore: num(meta.min_score),
      evaluated: num(meta.evaluated),
      returned: num(meta.returned),
      generatedAt: strOrNull(meta.generated_at),
      persisted: meta.persisted === true,
      limitations: strList(meta.limitations),
    },
  }
}

/** Only an internal dashboard path may become a link. */
export function safeInternalUrl(url: unknown): string {
  const u = str(url)
  return /^\/dashboard\/[A-Za-z0-9/_-]*$/.test(u) && !u.includes('//') ? u : '/dashboard'
}

export function normalizeDraft(raw: unknown, requestId: number): OpportunityDraft {
  const d = rec(raw)
  const mode = str(d.location_mode)
  return {
    id: d.id == null ? null : num(d.id),
    incomingRequestId: num(d.incoming_request_id) || requestId,
    departmentId: d.department_id == null ? null : num(d.department_id),
    departmentName: strOrNull(d.department_name),
    title: str(d.title),
    summary: str(d.summary),
    responsibilities: strList(d.responsibilities),
    requiredSkills: strList(d.required_skills),
    preferredSkills: strList(d.preferred_skills),
    volunteersNeeded: d.volunteers_needed == null ? null : num(d.volunteers_needed),
    availability: str(d.availability),
    duration: str(d.duration),
    locationMode: mode === 'remote' || mode === 'onsite' || mode === 'hybrid' ? mode : '',
    startDate: str(d.start_date),
    closesAt: str(d.closes_at),
    applicationInstructions: str(d.application_instructions),
    status: str(d.status, 'draft'),
    statusLabel: str(d.status_label, 'مسودة'),
    isPublished: d.is_published === true,
    publishedAt: strOrNull(d.published_at),
  }
}

/** Auto-filled values for the review form (nothing is saved), plus the existing draft if there is one. */
export async function fetchDraftSuggestion(requestId: number): Promise<{ suggestion: OpportunityDraft; existing: OpportunityDraft | null }> {
  const res = await apiClient.get<unknown>(`${BASE}/${requestId}/opportunity-draft/suggestion`, silent)
  const body = rec(res.data)
  return {
    suggestion: normalizeDraft(body.data, requestId),
    existing: body.existing_draft ? normalizeDraft(body.existing_draft, requestId) : null,
  }
}

export function draftPayload(input: OpportunityDraftInput): Record<string, unknown> {
  return {
    title: input.title.trim(),
    summary: input.summary.trim(),
    responsibilities: input.responsibilities,
    required_skills: input.requiredSkills,
    preferred_skills: input.preferredSkills,
    volunteers_needed: input.volunteersNeeded,
    availability: input.availability.trim() || null,
    duration: input.duration.trim() || null,
    location_mode: input.locationMode || null,
    start_date: input.startDate || null,
    closes_at: input.closesAt || null,
    application_instructions: input.applicationInstructions.trim() || null,
    department_id: input.departmentId,
  }
}

export async function createOpportunityDraft(requestId: number, input: OpportunityDraftInput): Promise<OpportunityDraft> {
  const res = await apiClient.post<unknown>(`${BASE}/${requestId}/opportunity-draft`, draftPayload(input), silent)
  return normalizeDraft(rec(res.data).data, requestId)
}

export async function updateOpportunityDraft(requestId: number, input: OpportunityDraftInput): Promise<OpportunityDraft> {
  const res = await apiClient.put<unknown>(`${BASE}/${requestId}/opportunity-draft`, draftPayload(input), silent)
  return normalizeDraft(rec(res.data).data, requestId)
}

export type IncomingErrorKind = 'forbidden' | 'not_found' | 'conflict' | 'validation' | 'unauthenticated' | 'error'

export function classifyIncomingError(err: unknown): IncomingErrorKind {
  if (axios.isAxiosError(err)) {
    const s = err.response?.status
    if (s === 403) return 'forbidden'
    if (s === 404) return 'not_found'
    if (s === 409) return 'conflict'
    if (s === 422) return 'validation'
    if (s === 401) return 'unauthenticated'
  }
  return 'error'
}

/** The server's Arabic message when it sent one. */
export function incomingErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const m = (err.response?.data as { message?: unknown } | undefined)?.message
    if (typeof m === 'string' && m.trim()) return m
  }
  return fallback
}

