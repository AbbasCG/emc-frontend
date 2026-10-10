import apiClient from './axios'

/**
 * Admin review of expert / trainer applications.
 * Backend: /api/admin/expert-applications (admin tier + ai_manager).
 */

/** The single canonical workflow: new → under_review → approved | rejected. */
export type ExpertApplicationStatus = 'new' | 'under_review' | 'approved' | 'rejected'

export const EXPERT_STATUS_LABELS: Record<ExpertApplicationStatus, string> = {
  new: 'جديد',
  under_review: 'قيد المراجعة',
  approved: 'مقبول',
  rejected: 'مرفوض',
}

/** Mirrors AdminExpertApplicationController::TRANSITIONS. */
export const EXPERT_STATUS_TRANSITIONS: Record<ExpertApplicationStatus, ExpertApplicationStatus[]> = {
  new: ['under_review', 'approved', 'rejected'],
  under_review: ['approved', 'rejected'],
  approved: [],
  rejected: [],
}

export type ExpertApplicationListItem = {
  id: number
  uuid: string
  status: string
  full_name: string
  email: string
  whatsapp_number: string | null
  country: string | null
  city: string | null
  primary_specialty: string | null
  created_at: string
}

/** The full record — every column the public form stores. */
export type ExpertApplicationDetail = ExpertApplicationListItem & Record<string, unknown>

export type ExpertApplicationsPage = {
  data: ExpertApplicationListItem[]
  current_page: number
  last_page: number
  total: number
}

export async function fetchExpertApplications(params: {
  page?: number
  search?: string
  status?: ExpertApplicationStatus | ''
}): Promise<ExpertApplicationsPage> {
  const query: Record<string, string | number> = { page: params.page ?? 1 }
  if (params.search?.trim()) query.search = params.search.trim()
  if (params.status) query.status = params.status
  const res = await apiClient.get<ExpertApplicationsPage>('/admin/expert-applications', { params: query })
  return {
    data: res.data?.data ?? [],
    current_page: res.data?.current_page ?? 1,
    last_page: res.data?.last_page ?? 1,
    total: res.data?.total ?? 0,
  }
}

export async function fetchExpertApplication(id: number): Promise<ExpertApplicationDetail> {
  const res = await apiClient.get<ExpertApplicationDetail>(`/admin/expert-applications/${id}`)
  return res.data
}

export async function updateExpertApplicationStatus(
  id: number,
  status: ExpertApplicationStatus,
): Promise<ExpertApplicationDetail> {
  const res = await apiClient.put<{ application: ExpertApplicationDetail }>(
    `/admin/expert-applications/${id}/status`,
    { status },
  )
  return res.data.application
}
