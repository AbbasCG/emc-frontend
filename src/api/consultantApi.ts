import apiClient from './axios'
import { unwrapData } from './unwrap'

/** طلب انضمام كمستشار — النقطة العامة بلا حساب. */
export type ConsultantApplicationInput = {
  full_name: string
  email: string
  phone?: string
  country?: string
  city?: string
  specialty: string
  desired_department?: string
  years_experience?: number
  cv_file?: File | null
  linkedin_url?: string
  motivation: string
  availability?: string
  agree_terms: boolean
}

export type ConsultantApplication = {
  id: number
  full_name: string
  email: string
  phone: string | null
  country: string | null
  city: string | null
  specialty: string
  desired_department: string | null
  years_experience: number | null
  linkedin_url: string | null
  motivation: string | null
  availability: string | null
  status: 'new' | 'under_review' | 'interview' | 'accepted' | 'rejected' | 'archived'
  reviewer_note: string | null
  reviewer?: { id: number; name: string } | null
  cv_view_url?: string | null
  created_at: string
}

export async function submitConsultantApplication(input: ConsultantApplicationInput): Promise<void> {
  // multipart دائمًا — السيرة الذاتية ملف، وLaravel يقرأ الحقول النصية من نفس الجسد.
  const fd = new FormData()
  const set = (k: string, v: string | number | undefined) => {
    if (v !== undefined && v !== '') fd.append(k, String(v))
  }
  set('full_name', input.full_name)
  set('email', input.email)
  set('phone', input.phone)
  set('country', input.country)
  set('city', input.city)
  set('specialty', input.specialty)
  set('desired_department', input.desired_department)
  set('years_experience', input.years_experience)
  set('linkedin_url', input.linkedin_url)
  set('motivation', input.motivation)
  set('availability', input.availability)
  fd.append('agree_terms', '1')
  if (input.cv_file) fd.append('cv_file', input.cv_file)
  await apiClient.post('/consultant-applications', fd, { skipErrorToast: true })
}

export async function fetchConsultantApplications(params?: {
  status?: string
  search?: string
  page?: number
}): Promise<{ rows: ConsultantApplication[]; total: number; counts: Record<string, number> }> {
  const res = await apiClient.get<unknown>('/admin/consultant-applications', { params })
  const body = res.data as {
    data?: { data?: ConsultantApplication[]; total?: number }
    meta?: { counts?: Record<string, number> }
  }
  return {
    rows: body.data?.data ?? [],
    total: body.data?.total ?? 0,
    counts: body.meta?.counts ?? {},
  }
}

export async function updateConsultantApplicationStatus(
  id: number,
  status: ConsultantApplication['status'],
  reviewerNote?: string,
): Promise<ConsultantApplication> {
  const res = await apiClient.put<unknown>(`/admin/consultant-applications/${id}/status`, {
    status,
    reviewer_note: reviewerNote,
  })
  return unwrapData<ConsultantApplication>(res.data)
}
