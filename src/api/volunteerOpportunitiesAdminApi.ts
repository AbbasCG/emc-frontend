import axios from 'axios'
import apiClient from './axios'
import {
  draftPayload,
  normalizeDraft,
  type IncomingCapabilities,
  type OpportunityDraft,
  type OpportunityDraftInput,
} from './hrIncomingRequestsApi'

/**
 * Administrative volunteer-opportunity management: list, create, edit, publish, unpublish, close,
 * and the applicants linked to an opportunity or to an incoming request.
 *
 * Every rule (who may publish, which fields are mandatory, whether applications are open) is the
 * server's. The client shows the controls the `capabilities` allow and reports what the server refuses.
 */

export type AdminOpportunity = Omit<OpportunityDraft, 'id'> & {
  id: number
  departmentName: string | null
  incomingRequest: { id: number; title: string | null } | null
  applicantsCount: number
  acceptsApplications: boolean
  /** Mandatory fields still missing before this can be published: field -> Arabic message. */
  missingForPublish: Record<string, string>
}

export type OpportunityStats = { total: number; draft: number; published: number; closed: number }

export type AdminOpportunityList = {
  items: AdminOpportunity[]
  meta: { currentPage: number; lastPage: number; perPage: number; total: number }
  stats: OpportunityStats
  capabilities: IncomingCapabilities
}

export type ApplicantStatus = 'pending' | 'reviewing' | 'reviewed' | 'accepted' | 'rejected' | 'contacted' | 'converted_to_member'

export type Applicant = {
  id: number
  name: string
  status: ApplicantStatus | string
  statusLabel: string
  source: 'direct_application'
  sourceLabel: string
  appliedAt: string | null
  reviewedAt: string | null
  experienceLevel: string | null
  availability: string | null
  skills: string | null
  opportunity: { id: number; title: string } | null
  url: string
}

export type ApplicantsResult = {
  items: Applicant[]
  counts: Record<string, number>
  total: number
  opportunity: { id: number; title: string; status: string; statusLabel: string; acceptsApplications: boolean } | null
}

const silent = { skipErrorToast: true as const }

function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
const str = (v: unknown, d = ''): string => (typeof v === 'string' ? v : v == null ? d : String(v))
const num = (v: unknown): number => (Number.isFinite(Number(v)) ? Number(v) : 0)

export function normalizeAdminOpportunity(raw: unknown): AdminOpportunity {
  const r = rec(raw)
  const incoming = rec(r.incoming_request)
  const missing = rec(r.missing_for_publish)

  return {
    ...normalizeDraft(r, num(r.incoming_request_id)),
    id: num(r.id),
    departmentName: r.department_name == null ? null : str(r.department_name),
    incomingRequest: incoming.id != null ? { id: num(incoming.id), title: incoming.title == null ? null : str(incoming.title) } : null,
    applicantsCount: num(r.applicants_count),
    acceptsApplications: r.accepts_applications === true,
    missingForPublish: Object.fromEntries(Object.entries(missing).map(([k, v]) => [k, str(v)])),
  }
}

function capabilities(raw: unknown): IncomingCapabilities {
  const c = rec(raw)
  return { canViewAll: c.can_view_all === true, canManage: c.can_manage === true, canMatchVolunteers: c.can_match_volunteers === true, canCreateDraft: c.can_create_draft === true }
}

export async function fetchAdminOpportunities(q: { status?: string; q?: string; page?: number } = {}): Promise<AdminOpportunityList> {
  const params: Record<string, string | number> = {}
  if (q.status) params.status = q.status
  if (q.q?.trim()) params.q = q.q.trim()
  if (q.page && q.page > 1) params.page = q.page

  const res = await apiClient.get<unknown>('/admin/volunteer-opportunities', { params, ...silent })
  const body = rec(res.data)
  const meta = rec(body.meta)
  const stats = rec(body.stats)

  return {
    items: arr(body.data).map(normalizeAdminOpportunity),
    meta: { currentPage: num(meta.current_page) || 1, lastPage: num(meta.last_page) || 1, perPage: num(meta.per_page) || 20, total: num(meta.total) },
    stats: { total: num(stats.total), draft: num(stats.draft), published: num(stats.published), closed: num(stats.closed) },
    capabilities: capabilities(body.capabilities),
  }
}

export async function createAdminOpportunity(input: OpportunityDraftInput): Promise<AdminOpportunity> {
  const res = await apiClient.post<unknown>('/admin/volunteer-opportunities', draftPayload(input), silent)
  return normalizeAdminOpportunity(rec(res.data).data)
}

export async function updateAdminOpportunity(id: number, input: OpportunityDraftInput): Promise<AdminOpportunity> {
  const res = await apiClient.put<unknown>(`/admin/volunteer-opportunities/${id}`, draftPayload(input), silent)
  return normalizeAdminOpportunity(rec(res.data).data)
}

export type OpportunityAction = 'publish' | 'unpublish' | 'close'

export async function runOpportunityAction(id: number, action: OpportunityAction): Promise<{ opportunity: AdminOpportunity; message: string }> {
  const res = await apiClient.post<unknown>(`/admin/volunteer-opportunities/${id}/${action}`, {}, silent)
  const body = rec(res.data)
  return { opportunity: normalizeAdminOpportunity(body.data), message: str(body.message) }
}

function normalizeApplicants(raw: unknown): ApplicantsResult {
  const d = rec(raw)
  const opp = rec(d.opportunity)

  return {
    items: arr(d.items).map((x) => {
      const a = rec(x)
      const o = rec(a.opportunity)
      return {
        id: num(a.id),
        name: str(a.name, 'متقدم بدون اسم'),
        status: str(a.status, 'pending'),
        statusLabel: str(a.status_label, 'غير محدد'),
        source: 'direct_application' as const,
        sourceLabel: str(a.source_label, 'تقدّم مباشرة'),
        appliedAt: a.applied_at == null ? null : str(a.applied_at),
        reviewedAt: a.reviewed_at == null ? null : str(a.reviewed_at),
        experienceLevel: a.experience_level == null ? null : str(a.experience_level),
        availability: a.availability == null ? null : str(a.availability),
        skills: a.skills == null ? null : str(a.skills),
        opportunity: o.id != null ? { id: num(o.id), title: str(o.title) } : null,
        url: /^\/dashboard\/[A-Za-z0-9/_-]*$/.test(str(a.url)) && !str(a.url).includes('//') ? str(a.url) : '/dashboard',
      }
    }),
    counts: Object.fromEntries(Object.entries(rec(d.counts)).map(([k, v]) => [k, num(v)])),
    total: num(d.total),
    opportunity: opp.id != null ? { id: num(opp.id), title: str(opp.title), status: str(opp.status), statusLabel: str(opp.status_label), acceptsApplications: opp.accepts_applications === true } : null,
  }
}

/** Applicants of one opportunity. */
export async function fetchOpportunityApplicants(opportunityId: number): Promise<ApplicantsResult> {
  const res = await apiClient.get<unknown>(`/admin/volunteer-opportunities/${opportunityId}/applicants`, silent)
  return normalizeApplicants(rec(res.data).data)
}

/** Applicants of an incoming request, found through its opportunity by the server. */
export async function fetchRequestApplicants(requestId: number): Promise<ApplicantsResult> {
  const res = await apiClient.get<unknown>(`/admin/hr-requests/${requestId}/applicants`, silent)
  return normalizeApplicants(rec(res.data).data)
}

/** The existing volunteer-application review workflow (pending -> reviewing -> accepted / rejected). */
export async function setApplicantStatus(id: number, status: 'reviewing' | 'accepted' | 'rejected'): Promise<void> {
  await apiClient.patch(`/admin/volunteer-requests/${id}/status`, { status }, silent)
}

/** Active departments, for choosing the department of a standalone opportunity. */
export async function fetchDepartmentOptions(): Promise<{ id: number; name: string }[]> {
  const res = await apiClient.get<unknown>('/departments/options', silent)
  return arr(rec(res.data).data)
    .map((d) => ({ id: num(rec(d).id), name: str(rec(d).name_ar) || str(rec(d).name) }))
    .filter((d) => d.id > 0)
}

/** Field -> first message, when the server refused a publish or a save (422). */
export function validationFields(err: unknown): Record<string, string> {
  if (!axios.isAxiosError(err)) return {}
  const errors = (err.response?.data as { errors?: Record<string, string[] | string> } | undefined)?.errors
  if (!errors) return {}
  return Object.fromEntries(Object.entries(errors).map(([k, v]) => [k, Array.isArray(v) ? str(v[0]) : str(v)]))
}
