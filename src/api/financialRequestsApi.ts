import apiClient from './axios'

const BASE = '/financial-requests'
const silent = { skipErrorToast: true as const }

export type FinancialRequestStatus =
  | 'draft' | 'submitted' | 'finance_review' | 'finance_approved'
  | 'finance_rejected' | 'executive_review' | 'approved' | 'rejected'
  | 'returned' | 'cancelled'

export type FinancialRequestType =
  | 'budget' | 'purchase' | 'invoice_payment' | 'reimbursement'
  | 'operational_expense' | 'transfer' | 'other'

export type FinancialRequestPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface FinancialRequestAttachment {
  id: number
  original_name: string
  mime_type: string | null
  file_size: number | null
  uploaded_by: { id: number; name: string } | null
  created_at: string
  download_url: string
}

export interface WorkflowStep {
  id: number
  action: string
  from_status: string
  to_status: string
  note: string | null
  actor_role: string
  actor: { id: number; name: string } | null
  created_at: string
}

export interface FinancialRequest {
  id: number
  title: string
  description: string | null
  request_type: FinancialRequestType
  amount: number
  currency: string
  needed_by_date: string | null
  priority: FinancialRequestPriority
  status: FinancialRequestStatus
  finance_note: string | null
  executive_note: string | null
  rejection_reason: string | null
  returned_reason: string | null
  submitted_at: string | null
  finance_reviewed_at: string | null
  executive_reviewed_at: string | null
  created_at: string
  updated_at: string
  requester: { id: number; name: string; email: string } | null
  department: { id: number; name: string } | null
  finance_reviewer: { id: number; name: string } | null
  executive_reviewer: { id: number; name: string } | null
  attachments: FinancialRequestAttachment[]
  workflow_steps: WorkflowStep[]
}

export interface FinancialRequestsParams {
  status?: string
  department_id?: string
  request_type?: string
  priority?: string
  per_page?: number
  page?: number
}

export interface MyFinancialContext {
  is_super_admin: boolean
  can_create: boolean
  departments: { id: number; name: string; is_leader: boolean }[]
  primary_department: { id: number; name: string; is_leader: boolean } | null
}

/** Laravel paginator payload returned by the list endpoint. */
export interface FinancialRequestsPage {
  data: FinancialRequest[]
  meta: Record<string, unknown>
}

/** Laravel success envelope `{ success, data }` used by the financial-requests API. */
interface Envelope<T> {
  success?: boolean
  data: T
}

export async function fetchMyFinancialContext(): Promise<MyFinancialContext> {
  const res = await apiClient.get<Envelope<MyFinancialContext>>(`${BASE}/my-context`, silent)
  return res.data?.data
}

export async function fetchFinancialRequests(params?: FinancialRequestsParams): Promise<FinancialRequestsPage> {
  const res = await apiClient.get<{ data?: FinancialRequestsPage }>(BASE, { ...silent, params })
  return res.data?.data ?? { data: [], meta: {} }
}

export async function fetchFinancialRequest(id: number): Promise<FinancialRequest> {
  const res = await apiClient.get<Envelope<FinancialRequest>>(`${BASE}/${id}`, silent)
  return res.data?.data
}

export async function createFinancialRequest(body: Record<string, unknown>): Promise<FinancialRequest> {
  const res = await apiClient.post<Envelope<FinancialRequest>>(BASE, body)
  return res.data?.data
}

export async function updateFinancialRequest(id: number, body: Record<string, unknown>): Promise<FinancialRequest> {
  const res = await apiClient.put<Envelope<FinancialRequest>>(`${BASE}/${id}`, body)
  return res.data?.data
}

export async function submitFinancialRequest(id: number): Promise<FinancialRequest> {
  const res = await apiClient.post<Envelope<FinancialRequest>>(`${BASE}/${id}/submit`)
  return res.data?.data
}

export async function financeApprove(id: number, note?: string): Promise<FinancialRequest> {
  const res = await apiClient.post<Envelope<FinancialRequest>>(`${BASE}/${id}/finance-approve`, { note })
  return res.data?.data
}

export async function financeReject(id: number, reason: string): Promise<FinancialRequest> {
  const res = await apiClient.post<Envelope<FinancialRequest>>(`${BASE}/${id}/finance-reject`, { reason })
  return res.data?.data
}

export async function returnFinancialRequest(id: number, reason: string): Promise<FinancialRequest> {
  const res = await apiClient.post<Envelope<FinancialRequest>>(`${BASE}/${id}/return`, { reason })
  return res.data?.data
}

export async function executiveApprove(id: number, note?: string): Promise<FinancialRequest> {
  const res = await apiClient.post<Envelope<FinancialRequest>>(`${BASE}/${id}/executive-approve`, { note })
  return res.data?.data
}

export async function executiveReject(id: number, reason: string): Promise<FinancialRequest> {
  const res = await apiClient.post<Envelope<FinancialRequest>>(`${BASE}/${id}/executive-reject`, { reason })
  return res.data?.data
}

export async function uploadAttachment(id: number, file: File): Promise<FinancialRequestAttachment> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await apiClient.post<Envelope<FinancialRequestAttachment>>(`${BASE}/${id}/attachments`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data?.data
}

export function getDownloadUrl(requestId: number, attachmentId: number): string {
  return `${import.meta.env.VITE_API_URL ?? ''}/api/financial-requests/${requestId}/attachments/${attachmentId}/download`
}

// Status label + color mapping
export const STATUS_LABELS: Record<FinancialRequestStatus, string> = {
  draft:             'مسودة',
  submitted:         'مُرسل',
  finance_review:    'مراجعة مالية',
  finance_approved:  'معتمد مالياً',
  finance_rejected:  'مرفوض مالياً',
  executive_review:  'اعتماد تنفيذي',
  approved:          'معتمد',
  rejected:          'مرفوض',
  returned:          'مُعاد',
  cancelled:         'ملغى',
}

export const STATUS_COLORS: Record<FinancialRequestStatus, string> = {
  draft:             'bg-slate-100 text-slate-600',
  submitted:         'bg-blue-100 text-blue-700',
  finance_review:    'bg-amber-100 text-amber-700',
  finance_approved:  'bg-teal-100 text-teal-700',
  finance_rejected:  'bg-red-100 text-red-700',
  executive_review:  'bg-purple-100 text-purple-700',
  approved:          'bg-green-100 text-green-700',
  rejected:          'bg-red-100 text-red-700',
  returned:          'bg-orange-100 text-orange-700',
  cancelled:         'bg-slate-100 text-slate-400',
}

export const TYPE_LABELS: Record<FinancialRequestType, string> = {
  budget:              'ميزانية',
  purchase:            'مشتريات',
  invoice_payment:     'دفع فاتورة',
  reimbursement:       'استرداد مصاريف',
  operational_expense: 'مصروف تشغيلي',
  transfer:            'تحويل',
  other:               'أخرى',
}

export const PRIORITY_LABELS: Record<FinancialRequestPriority, string> = {
  low:    'منخفضة',
  normal: 'عادية',
  high:   'عالية',
  urgent: 'عاجلة',
}

export const PRIORITY_COLORS: Record<FinancialRequestPriority, string> = {
  low:    'bg-slate-100 text-slate-500',
  normal: 'bg-blue-50 text-blue-600',
  high:   'bg-amber-100 text-amber-700',
  urgent: 'bg-red-100 text-red-700',
}
