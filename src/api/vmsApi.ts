/**
 * VMS — Volunteer Management System API
 * Calls the EMC-Volunteer-System Laravel backend at /api/*
 */
import apiClient from './axios'
import { unwrapData } from './unwrap'

// ── Types ─────────────────────────────────────────────────────────────────────

export type VmsDepartment = {
  id: number
  name: string
  name_ar: string | null
  slug: string
  description: string | null
  color: string | null
  icon: string | null
  is_active: boolean
  parent_id: number | null
  order_column: number
  users_count?: number
  job_descriptions_count?: number
  children?: VmsDepartment[]
  created_at: string
  updated_at: string
}

export type VmsJobDescription = {
  id: number
  title: string
  title_ar: string | null
  description: string | null
  description_ar: string | null
  department_id: number
  department?: Pick<VmsDepartment, 'id' | 'name' | 'name_ar'>
  requirements: string[] | null
  responsibilities: string[] | null
  skills: string[] | null
  is_active: boolean
  max_volunteers: number | null
  applications_count?: number
  created_at: string
  updated_at: string
}

export type VmsVolunteer = {
  id: number
  name: string
  email: string
  role: string
  status: 'active' | 'inactive' | 'suspended' | 'pending'
  phone: string | null
  city: string | null
  country_code: string | null
  gender: 'male' | 'female' | null
  bio: string | null
  avatar_url: string | null
  department_id: number | null
  department?: Pick<VmsDepartment, 'id' | 'name' | 'name_ar' | 'color'>
  job_description?: Pick<VmsJobDescription, 'id' | 'title' | 'title_ar'>
  email_verified_at: string | null
  last_login_at: string | null
  created_at: string
}

export type VmsApplication = {
  id: number
  user_id: number
  user?: Pick<VmsVolunteer, 'id' | 'name' | 'email' | 'phone' | 'avatar_url' | 'gender' | 'city'>
  job_description_id: number | null
  jobDescription?: Pick<VmsJobDescription, 'id' | 'title' | 'title_ar'>
  department_id: number | null
  department?: Pick<VmsDepartment, 'id' | 'name' | 'name_ar'>
  status: 'pending' | 'reviewing' | 'approved' | 'rejected' | 'waitlisted'
  motivation: string | null
  experience: string | null
  availability: string[] | null
  notes: string | null
  reviewed_by: number | null
  reviewer?: { id: number; name: string }
  reviewed_at: string | null
  created_at: string
}

export type VmsRequest = {
  id: number
  title: string
  description: string
  department_id: number | null
  department?: Pick<VmsDepartment, 'id' | 'name' | 'name_ar'>
  job_description_id: number | null
  jobDescription?: Pick<VmsJobDescription, 'id' | 'title' | 'title_ar'>
  required_volunteers: number
  status: 'draft' | 'open' | 'closed' | 'cancelled'
  deadline: string | null
  requirements: string[] | null
  location: string | null
  is_remote: boolean
  created_by: number
  createdBy?: { id: number; name: string }
  created_at: string
}

export type VmsDashboardStats = {
  total_volunteers: number
  active_volunteers: number
  pending_applications: number
  open_requests: number
  total_departments: number
  total_job_descriptions: number
  new_volunteers_this_month: number
  application_approval_rate: number
}

export type VmsDashboardCharts = {
  volunteers_by_month: Array<{ label: string; count: number }>
  applications_by_status: Record<string, number>
  volunteers_by_department: Array<{ department: string; count: number }>
  volunteers_by_gender: Record<string, number>
}

export type PaginatedResponse<T> = {
  data: T[]
  total: number
  per_page: number
  current_page: number
  last_page: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function asList<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[]
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>
    if (Array.isArray(obj.data)) return obj.data as T[]
  }
  return []
}

function paginated<T>(raw: unknown): PaginatedResponse<T> {
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>
    const data = Array.isArray(obj.data) ? (obj.data as T[]) : []
    return {
      data,
      total: Number(obj.total ?? data.length),
      per_page: Number(obj.per_page ?? 15),
      current_page: Number(obj.current_page ?? 1),
      last_page: Number(obj.last_page ?? 1),
    }
  }
  return { data: [], total: 0, per_page: 15, current_page: 1, last_page: 1 }
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export async function fetchVmsDashboard(): Promise<{ stats: VmsDashboardStats; charts: VmsDashboardCharts }> {
  const [statsRes, chartsRes] = await Promise.all([
    apiClient.get<unknown>('/admin/dashboard/stats', { skipErrorToast: true }),
    apiClient.get<unknown>('/admin/dashboard/charts', { skipErrorToast: true }),
  ])
  return {
    stats: unwrapData<VmsDashboardStats>(statsRes.data) as VmsDashboardStats,
    charts: unwrapData<VmsDashboardCharts>(chartsRes.data) as VmsDashboardCharts,
  }
}

// ── Departments ───────────────────────────────────────────────────────────────

export async function fetchVmsDepartments(params?: Record<string, unknown>): Promise<PaginatedResponse<VmsDepartment>> {
  const res = await apiClient.get<unknown>('/admin/departments', { params: params ?? {}, skipErrorToast: true })
  return paginated<VmsDepartment>(res.data)
}

export async function fetchVmsDepartmentsList(): Promise<VmsDepartment[]> {
  const res = await apiClient.get<unknown>('/admin/departments', { params: { all_records: 1, is_active: 1 }, skipErrorToast: true })
  const d = res.data as Record<string, unknown>
  return asList<VmsDepartment>(d.data ?? res.data)
}

export async function createVmsDepartment(body: Partial<VmsDepartment>): Promise<VmsDepartment> {
  const res = await apiClient.post<unknown>('/admin/departments', body)
  return unwrapData<VmsDepartment>(res.data) as VmsDepartment
}

export async function updateVmsDepartment(id: number, body: Partial<VmsDepartment>): Promise<VmsDepartment> {
  const res = await apiClient.patch<unknown>(`/admin/departments/${id}`, body)
  return unwrapData<VmsDepartment>(res.data) as VmsDepartment
}

export async function deleteVmsDepartment(id: number): Promise<void> {
  await apiClient.delete(`/admin/departments/${id}`)
}

// ── Job Descriptions ──────────────────────────────────────────────────────────

export async function fetchVmsJobDescriptions(params?: Record<string, unknown>): Promise<PaginatedResponse<VmsJobDescription>> {
  const res = await apiClient.get<unknown>('/admin/job-descriptions', { params, skipErrorToast: true })
  return paginated<VmsJobDescription>(res.data)
}

export async function createVmsJobDescription(body: Partial<VmsJobDescription>): Promise<VmsJobDescription> {
  const res = await apiClient.post<unknown>('/admin/job-descriptions', body)
  return unwrapData<VmsJobDescription>(res.data) as VmsJobDescription
}

export async function updateVmsJobDescription(id: number, body: Partial<VmsJobDescription>): Promise<VmsJobDescription> {
  const res = await apiClient.patch<unknown>(`/admin/job-descriptions/${id}`, body)
  return unwrapData<VmsJobDescription>(res.data) as VmsJobDescription
}

export async function deleteVmsJobDescription(id: number): Promise<void> {
  await apiClient.delete(`/admin/job-descriptions/${id}`)
}

// ── Volunteers ────────────────────────────────────────────────────────────────

export async function fetchVmsVolunteers(params?: Record<string, unknown>): Promise<PaginatedResponse<VmsVolunteer>> {
  const res = await apiClient.get<unknown>('/operations/volunteers', { params, skipErrorToast: true })
  return paginated<VmsVolunteer>(res.data)
}

export async function updateVmsVolunteer(id: number, body: Partial<VmsVolunteer>): Promise<VmsVolunteer> {
  const res = await apiClient.patch<unknown>(`/operations/volunteers/${id}`, body)
  return unwrapData<VmsVolunteer>(res.data) as VmsVolunteer
}

// ── Applications ──────────────────────────────────────────────────────────────

export async function fetchVmsApplications(params?: Record<string, unknown>): Promise<PaginatedResponse<VmsApplication>> {
  const res = await apiClient.get<unknown>('/admin/volunteer-applications', { params, skipErrorToast: true })
  return paginated<VmsApplication>(res.data)
}

export async function approveVmsApplication(id: number): Promise<VmsApplication> {
  const res = await apiClient.post<unknown>(`/admin/volunteer-applications/${id}/approve`)
  return unwrapData<VmsApplication>(res.data) as VmsApplication
}

export async function rejectVmsApplication(id: number, notes?: string): Promise<VmsApplication> {
  const res = await apiClient.post<unknown>(`/admin/volunteer-applications/${id}/reject`, { notes })
  return unwrapData<VmsApplication>(res.data) as VmsApplication
}

export async function markApplicationUnderReview(id: number): Promise<VmsApplication> {
  const res = await apiClient.post<unknown>(`/admin/volunteer-applications/${id}/review`)
  return unwrapData<VmsApplication>(res.data) as VmsApplication
}

// ── Volunteer Requests ────────────────────────────────────────────────────────

export async function fetchVmsRequests(params?: Record<string, unknown>): Promise<PaginatedResponse<VmsRequest>> {
  const res = await apiClient.get<unknown>('/admin/volunteer-requests', { params, skipErrorToast: true })
  return paginated<VmsRequest>(res.data)
}

export async function createVmsRequest(body: Partial<VmsRequest>): Promise<VmsRequest> {
  const res = await apiClient.post<unknown>('/admin/volunteer-requests', body)
  return unwrapData<VmsRequest>(res.data) as VmsRequest
}

export async function updateVmsRequest(id: number, body: Partial<VmsRequest>): Promise<VmsRequest> {
  const res = await apiClient.patch<unknown>(`/admin/volunteer-requests/${id}`, body)
  return unwrapData<VmsRequest>(res.data) as VmsRequest
}

export async function publishVmsRequest(id: number): Promise<VmsRequest> {
  const res = await apiClient.post<unknown>(`/admin/volunteer-requests/${id}/publish`)
  return unwrapData<VmsRequest>(res.data) as VmsRequest
}

export async function closeVmsRequest(id: number): Promise<VmsRequest> {
  const res = await apiClient.post<unknown>(`/admin/volunteer-requests/${id}/close`)
  return unwrapData<VmsRequest>(res.data) as VmsRequest
}
