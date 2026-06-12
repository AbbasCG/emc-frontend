import axios from 'axios'
import apiClient from './axios'
import type { CatalogWorkshopRow } from '@/api/superAdminCatalogApi'
import { unwrapData } from '@/api/unwrap'

const silent = { skipErrorToast: true as const }

// ── Workflow types ────────────────────────────────────────────────────────────

export type WorkflowStepStatus = 'pending' | 'approved' | 'rejected' | 'returned'

export interface WorkflowStep {
  step_number: number
  department_key: string
  department_label: string
  status: WorkflowStepStatus
  actor_name: string | null
  actor_email: string | null
  acted_at: string | null
  notes: string | null
  is_current?: boolean
}

export interface WorkshopRequestDetail {
  id: number
  requester_name: string
  requester_email: string
  requester_phone: string | null
  requester_department: string | null
  program_name: string
  speaker_name: string
  speaker_job_title: string
  speaker_photo_url: string | null
  topics: string
  categories: string[]
  target_audience: string
  proposed_date_1: string | null
  proposed_time_1: string | null
  proposed_date_2: string | null
  proposed_time_2: string | null
  proposed_date_3: string | null
  proposed_time_3: string | null
  location_types: string[]
  price_type: 'free' | 'paid'
  price_amount: string | null
  generated_announcement_text: string | null
  status: string
  current_step: number
  current_department: string
  workflow_status: string
  created_at: string
  updated_at: string
  workflow_steps?: WorkflowStep[]
  can_act?: boolean
  is_history_viewer?: boolean
  selected_date_option?: number | null
}

export interface WorkflowHistoryResponse {
  success: boolean
  current_step: number
  current_department: string
  workflow_status: string
  can_act: boolean
  is_history_viewer?: boolean
  all_steps: (WorkflowStep & { is_current: boolean })[]
}

export interface WorkshopRequestsPage {
  data: WorkshopRequestDetail[]
  current_page: number
  last_page: number
  total: number
}

export async function submitWorkshopRequest(formData: FormData): Promise<void> {
  await apiClient.post('/workshop-requests', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

/** Extract rows from Laravel `[]`, `{ data: [] }`, or `{ data: { data: [] } }` pagination. */
function unwrapWorkshopRequestsPayload(payload: unknown): Record<string, unknown>[] {
  const inner = unwrapData<unknown>(payload)
  let rows: unknown[] = []
  if (Array.isArray(inner)) rows = inner
  else if (inner && typeof inner === 'object' && inner !== null) {
    const o = inner as Record<string, unknown>
    if (Array.isArray(o.data)) rows = o.data
    else if (o.data && typeof o.data === 'object') {
      const nested = (o.data as Record<string, unknown>).data
      if (Array.isArray(nested)) rows = nested
    }
  }
  return rows.filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null && !Array.isArray(r))
}

function strVal(v: unknown): string | null {
  if (v == null) return null
  const s = String(v).trim()
  return s || null
}

function inferOnline(locationTypes: unknown): boolean {
  if (!Array.isArray(locationTypes) || locationTypes.length === 0) return false
  return locationTypes.some((entry) => {
    const raw = String(entry).toLowerCase()
    return raw.includes('zoom') || raw.includes('meet') || raw.includes('google')
  })
}

function proposedAtIso(raw: Record<string, unknown>): string | null {
  const d = strVal(raw.proposed_date ?? raw.date)
  if (!d) return null
  const t = strVal(raw.proposed_time ?? raw.time)?.replace(/^\s+/, '')
  if (!t || t.length === 0) return d.slice(0, 10)
  const timePart =
    /\d{1,2}:\d{2}/.test(t) ?
      /\d{1,2}:\d{2}:\d{2}/.test(t) ?
        t
      : `${t}:00`
    : `${t}:00:00`
  return `${String(d).slice(0, 10)}T${timePart}`
}

/** Map Laravel `WorkshopRequest` (+ legacy aliases) to shared Super Admin workshop row UI. */
function mapApiWorkshopRequestToRow(raw: Record<string, unknown>): CatalogWorkshopRow {
  const id = Number(raw.id)
  const title =
    strVal(raw.program_name) ?? strVal(raw.title) ?? strVal(raw.name) ?? (Number.isFinite(id) ? `طلب ورشة #${id}` : 'طلب ورشة')
  const slug = strVal(raw.slug) ?? (Number.isFinite(id) ? `workshop-request-${id}` : 'workshop-request')
  const date = proposedAtIso(raw)
  const locationTypes =
    raw.location_types ?? raw.locationTypes ?? raw.location_type ?? raw.execution_modes
  const locArr = Array.isArray(locationTypes) ? locationTypes : []
  const isOnline =
    typeof raw.is_online === 'boolean' ? raw.is_online : (
      typeof raw.online === 'boolean' ?
        raw.online
      : inferOnline(locArr)
    )

  return {
    id: Number.isFinite(id) ? id : 0,
    title,
    slug,
    date,
    duration_hours: typeof raw.duration_hours === 'number' ? raw.duration_hours : null,
    trainer_name:
      strVal(raw.speaker_name) ?? strVal(raw.trainer_name) ?? strVal(raw.speaker_full_name),
    is_online: Boolean(isOnline),
    requester_email: strVal(raw.requester_email),
    requester_name: strVal(raw.requester_name),
  }
}

/**
 * قائمة طلبات الورش للإدارة — `GET /api/workshop-requests`
 * *(baseURL غالبًا تتضمن `/api`; المسار هنا هو `workshop-requests` فقط)*
 *
 * Middleware على الخادم: `auth:sanctum` + سياسات الدور؛ يعتمد Bearer من `apiClient`.
 */
export async function fetchWorkshopRequestsStrict(): Promise<
  | { ok: true; rows: CatalogWorkshopRow[] }
  | { ok: false; status?: number }
> {
  try {
    const res = await apiClient.get<unknown>('/workshop-requests', silent)
    const loose = unwrapWorkshopRequestsPayload(res.data)
    const rows = loose.map(mapApiWorkshopRequestToRow).filter((w) => w.id > 0)
    return { ok: true, rows }
  } catch (e) {
    const status = axios.isAxiosError(e) ? e.response?.status : undefined
    return { ok: false, status }
  }
}

// ── Admin workflow API ────────────────────────────────────────────────────────

export async function fetchAdminWorkshopRequests(
  params: { page?: number; per_page?: number; workflow_status?: string; search?: string } = {}
): Promise<WorkshopRequestsPage> {
  const res = await apiClient.get<{ data: WorkshopRequestDetail[]; current_page: number; last_page: number; total: number }>(
    '/admin/workshop-requests',
    { params }
  )
  const payload = res.data as unknown as Record<string, unknown>
  const inner = (payload.data ?? payload) as Record<string, unknown>
  if (Array.isArray(inner.data)) {
    return inner as unknown as WorkshopRequestsPage
  }
  if (Array.isArray(inner)) {
    return { data: inner as unknown as WorkshopRequestDetail[], current_page: 1, last_page: 1, total: (inner as unknown[]).length }
  }
  return { data: [], current_page: 1, last_page: 1, total: 0 }
}

export async function fetchAdminWorkshopRequestDetail(id: number): Promise<WorkshopRequestDetail> {
  const res = await apiClient.get<{ data: WorkshopRequestDetail; can_act?: boolean; is_history_viewer?: boolean }>(`/admin/workshop-requests/${id}`, silent)
  const payload = res.data as unknown as Record<string, unknown>
  const detail = (payload.data ?? payload) as WorkshopRequestDetail
  if (typeof payload.can_act === 'boolean') {
    detail.can_act = payload.can_act
  }
  if (typeof payload.is_history_viewer === 'boolean') {
    detail.is_history_viewer = payload.is_history_viewer
  }
  return detail
}

export async function approveWorkshopRequest(
  id: number,
  notes?: string,
  selectedDateOption?: number | null,
): Promise<{ message: string }> {
  const body: Record<string, unknown> = { notes }
  if (selectedDateOption != null) body.selected_date_option = selectedDateOption
  const res = await apiClient.post<{ message: string }>(`/admin/workshop-requests/${id}/approve`, body)
  return res.data
}

export async function rejectWorkshopRequest(id: number, notes?: string): Promise<{ message: string }> {
  const res = await apiClient.post<{ message: string }>(`/admin/workshop-requests/${id}/reject`, { notes })
  return res.data
}

export async function fetchWorkshopWorkflowHistory(id: number): Promise<WorkflowHistoryResponse> {
  const res = await apiClient.get<WorkflowHistoryResponse>(`/admin/workshop-requests/${id}/workflow-history`, silent)
  return res.data
}
