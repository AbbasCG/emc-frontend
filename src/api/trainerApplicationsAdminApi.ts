import apiClient from './axios'

export type TrainerApplicationStatus = 'new' | 'under_review' | 'approved' | 'rejected'

export const TRAINER_STATUS_LABELS: Record<TrainerApplicationStatus, string> = {
  new: 'جديد',
  under_review: 'قيد المراجعة',
  approved: 'مقبول',
  rejected: 'مرفوض',
}

export const TRAINER_STATUS_TRANSITIONS: Record<TrainerApplicationStatus, TrainerApplicationStatus[]> = {
  new: ['under_review', 'approved', 'rejected'],
  under_review: ['approved', 'rejected'],
  approved: [],
  rejected: [],
}

export type TrainerApplicationListItem = {
  id: number
  uuid: string
  status: TrainerApplicationStatus
  full_name: string
  email: string
  phone_or_whatsapp: string
  primary_specialty: string
  years_of_experience: string
  delivery_mode: string
  hourly_rate: number | null
  currency: string
  currency_other?: string
  created_at: string
}

export type TrainerApplicationDetail = TrainerApplicationListItem & {
  linkedin_url?: string
  has_training_experience: boolean
  ai_training_fields: string[]
  other_ai_field?: string
  training_program_types: string[]
  target_audiences: string[]
  additional_notes?: string
  admin_notes?: string
  reviewed_by?: number
  reviewed_at?: string
  updated_at: string
}

export type TrainerApplicationsPage = {
  data: TrainerApplicationListItem[]
  current_page: number
  last_page: number
  total: number
}

export async function fetchTrainerApplications(params: {
  page?: number
  search?: string
  status?: TrainerApplicationStatus | ''
}): Promise<TrainerApplicationsPage> {
  const query: Record<string, string | number> = { page: params.page ?? 1 }
  if (params.search?.trim()) query.search = params.search.trim()
  if (params.status) query.status = params.status
  const res = await apiClient.get<TrainerApplicationsPage>('/admin/trainer-applications', { params: query })
  return {
    data: res.data?.data ?? [],
    current_page: res.data?.current_page ?? 1,
    last_page: res.data?.last_page ?? 1,
    total: res.data?.total ?? 0,
  }
}

export async function fetchTrainerApplicationDetail(id: number): Promise<TrainerApplicationDetail> {
  const res = await apiClient.get<TrainerApplicationDetail>(`/admin/trainer-applications/${id}`)
  return res.data
}

export async function updateTrainerApplicationStatus(
  id: number,
  status: TrainerApplicationStatus
): Promise<{ success: boolean; application: TrainerApplicationDetail }> {
  const res = await apiClient.put<{ success: boolean; application: TrainerApplicationDetail }>(
    `/admin/trainer-applications/${id}/status`,
    { status }
  )
  return res.data
}

export async function updateTrainerApplicationNotes(
  id: number,
  admin_notes: string
): Promise<{ success: boolean; application: TrainerApplicationDetail }> {
  const res = await apiClient.put<{ success: boolean; application: TrainerApplicationDetail }>(
    `/admin/trainer-applications/${id}/notes`,
    { admin_notes }
  )
  return res.data
}
