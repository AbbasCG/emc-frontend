import apiClient from './axios'
import type { QualityReview } from '@/types/intelligence'

const silent = { skipErrorToast: true as const }

/** Quality endpoints serve dynamic Laravel resources with no dedicated model type. */
export type QualityRecord = Record<string, unknown>

/** Laravel paginator meta shared by the quality list endpoints. */
export interface QualityListMeta {
  current_page?: number
  last_page?: number
  per_page?: number
  total?: number
}

/** Paginated list payload; some endpoints also include aggregate counters in `stats`. */
export interface QualityListPage<T = QualityRecord> {
  data: T[]
  meta: QualityListMeta
  stats?: Record<string, number>
}

export interface QualityIncidentRecord {
  id: number
  title?: string | null
  description?: string | null
  severity?: string
  priority?: string
  status?: string
  category?: string | null
  evidence?: string | null
  resolution?: string | null
  due_date?: string | null
  created_at?: string | null
  reporter?: { name?: string | null } | null
  assignee?: { name?: string | null } | null
}

export interface CorrectiveActionRecord {
  id: number
  title?: string | null
  description?: string | null
  priority?: string
  status?: string
  progress?: number | null
  due_date?: string | null
  created_at?: string | null
  assignee?: { name?: string | null } | null
}

export interface QualityAuditLogRecord {
  id?: number
  action?: string | null
  auditable_type?: string | null
  model_type?: string | null
  user?: { name?: string | null } | null
  user_name?: string | null
  ip_address?: string | null
  user_agent?: string | null
  old_values?: unknown
  old_value?: unknown
  new_values?: unknown
  new_value?: unknown
  created_at?: string | null
}

// Dashboard
export async function fetchQualityDashboard(): Promise<QualityRecord | null> {
  const res = await apiClient.get<{ data?: QualityRecord }>('/quality/dashboard', silent)
  return res.data?.data ?? null
}

// Workshop requests (quality view)
export async function fetchQualityWorkshops(params?: Record<string, string>): Promise<QualityListPage> {
  const res = await apiClient.get<{ data?: QualityListPage }>('/quality/workshops', { ...silent, params })
  return res.data?.data ?? { data: [], meta: {} }
}

// Reviews — the payload is consumed both as a bare review list (QualityAdminPage)
// and as a paginator object (QualityReviewsPage); the overloads mirror those uses.
export function fetchQualityReviews(): Promise<QualityReview[]>
export function fetchQualityReviews(params: Record<string, string>): Promise<QualityListPage<QualityReview>>
export async function fetchQualityReviews(
  params?: Record<string, string>,
): Promise<QualityReview[] | QualityListPage<QualityReview>> {
  const res = await apiClient.get<{ data?: QualityReview[] | QualityListPage<QualityReview> }>('/quality/reviews', { ...silent, params })
  return res.data?.data ?? { data: [], meta: {} }
}

export async function createQualityReview(body: Record<string, unknown>): Promise<QualityReview> {
  const res = await apiClient.post<{ data: QualityReview }>('/quality/reviews', body)
  return res.data?.data
}

export async function updateQualityReview(id: number, body: Record<string, unknown>): Promise<QualityRecord | undefined> {
  const res = await apiClient.patch<{ data?: QualityRecord }>(`/quality/reviews/${id}`, body)
  return res.data?.data
}

export async function approveQualityReview(id: number): Promise<QualityRecord | undefined> {
  const res = await apiClient.post<{ data?: QualityRecord }>(`/quality/reviews/${id}/approve`)
  return res.data?.data
}

// Incidents
export async function fetchQualityIncidents(params?: Record<string, string>): Promise<QualityListPage<QualityIncidentRecord>> {
  const res = await apiClient.get<{ data?: QualityListPage<QualityIncidentRecord> }>('/quality/incidents', { ...silent, params })
  return res.data?.data ?? { data: [], meta: {} }
}

export async function createQualityIncident(body: Record<string, unknown>): Promise<QualityIncidentRecord | undefined> {
  const res = await apiClient.post<{ data?: QualityIncidentRecord }>('/quality/incidents', body)
  return res.data?.data
}

export async function updateQualityIncident(id: number, body: Record<string, unknown>): Promise<QualityIncidentRecord | undefined> {
  const res = await apiClient.patch<{ data?: QualityIncidentRecord }>(`/quality/incidents/${id}`, body)
  return res.data?.data
}

// Corrective Actions
export async function fetchCorrectiveActions(params?: Record<string, string>): Promise<QualityListPage<CorrectiveActionRecord>> {
  const res = await apiClient.get<{ data?: QualityListPage<CorrectiveActionRecord> }>('/quality/corrective-actions', { ...silent, params })
  return res.data?.data ?? { data: [], meta: {} }
}

export async function createCorrectiveAction(body: Record<string, unknown>): Promise<CorrectiveActionRecord | undefined> {
  const res = await apiClient.post<{ data?: CorrectiveActionRecord }>('/quality/corrective-actions', body)
  return res.data?.data
}

export async function updateCorrectiveAction(id: number, body: Record<string, unknown>): Promise<CorrectiveActionRecord | undefined> {
  const res = await apiClient.patch<{ data?: CorrectiveActionRecord }>(`/quality/corrective-actions/${id}`, body)
  return res.data?.data
}

// Team
export async function fetchQualityTeam(): Promise<QualityRecord[]> {
  const res = await apiClient.get<{ data?: QualityRecord[] }>('/quality/team', silent)
  return res.data?.data ?? []
}

// Audit Logs
export async function fetchQualityAuditLogs(params?: Record<string, string>): Promise<QualityListPage<QualityAuditLogRecord>> {
  const res = await apiClient.get<{ data?: QualityListPage<QualityAuditLogRecord> }>('/quality/audit-logs', { ...silent, params })
  return res.data?.data ?? { data: [], meta: {} }
}

// Compliance
export async function fetchQualityCompliance(): Promise<QualityRecord | null> {
  const res = await apiClient.get<{ data?: QualityRecord }>('/quality/compliance', silent)
  return res.data?.data ?? null
}
