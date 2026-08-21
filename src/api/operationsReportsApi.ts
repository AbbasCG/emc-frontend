import apiClient from './axios'
import { unwrapData } from './unwrap'

/**
 * تقارير التشغيل: محاضر ما بعد الاجتماع (مع تقييم الحاضرين) والتقارير
 * الأسبوعية لكل إدارة — الواجهة الموحدة فوق مسارات `/operations/*`.
 */

export type DepartmentMember = {
  id: number
  name: string
  role: string | null
  role_title: string | null
  kind: 'leader' | 'team'
}

export async function fetchDepartmentMembers(departmentId: number): Promise<DepartmentMember[]> {
  const res = await apiClient.get<unknown>(`/operations/departments/${departmentId}/members`)
  return unwrapData<DepartmentMember[]>(res.data) ?? []
}

// ── تقارير الاجتماعات ─────────────────────────────────────────────────────────

export type MeetingReportRatingInput = {
  user_id: number
  attended: boolean
  /** {criterion: 1..10} — معايير التقييم العشرة الموحدة */
  scores?: Record<string, number>
  note?: string
}

export type MeetingReportInput = {
  department_id: number
  title: string
  meeting_date: string
  achieved?: string
  planned?: string
  needs?: string
  needs_reason?: string
  decisions?: string
  notes?: string
  ratings: MeetingReportRatingInput[]
}

export type MeetingReport = {
  id: number
  title: string
  meeting_date: string
  achieved: string | null
  planned: string | null
  needs: string | null
  needs_reason: string | null
  decisions: string | null
  notes: string | null
  department?: { id: number; name: string }
  author?: { id: number; name: string }
  ratings_count?: number
  ratings?: Array<{
    id: number
    attended: boolean
    rating: number | null
    scores: Record<string, number> | null
    avg_score: number | null
    note: string | null
    user?: { id: number; name: string }
  }>
  created_at: string
}

type Paginated<T> = { data?: T[]; total?: number }

export async function fetchMeetingReports(params?: {
  department_id?: number
  page?: number
}): Promise<{ rows: MeetingReport[]; total: number }> {
  const res = await apiClient.get<unknown>('/operations/meeting-reports', { params })
  const page = unwrapData<Paginated<MeetingReport>>(res.data)
  return { rows: page?.data ?? [], total: page?.total ?? 0 }
}

export async function fetchMeetingReport(id: number): Promise<MeetingReport> {
  const res = await apiClient.get<unknown>(`/operations/meeting-reports/${id}`)
  return unwrapData<MeetingReport>(res.data)
}

export async function createMeetingReport(input: MeetingReportInput): Promise<MeetingReport> {
  const res = await apiClient.post<unknown>('/operations/meeting-reports', input)
  return unwrapData<MeetingReport>(res.data)
}

// ── التقارير الأسبوعية (إثنين كل أسبوع) ──────────────────────────────────────

export type WeeklyReportInput = {
  department_id: number
  week_start?: string
  achievements: string
  planned: string
  blockers?: string
  needs?: string
  notes?: string
  ratings?: Array<{ user_id: number; scores?: Record<string, number>; note?: string }>
}

export type WeeklyReport = {
  id: number
  week_start: string
  ratings?: Array<{
    id: number
    scores: Record<string, number> | null
    avg_score: number | null
    note: string | null
    user?: { id: number; name: string }
  }>
  achievements: string
  planned: string
  blockers: string | null
  needs: string | null
  notes: string | null
  department?: { id: number; name: string }
  submitter?: { id: number; name: string }
  submitted_at: string
}

export async function fetchWeeklyReports(params?: {
  department_id?: number
  week_start?: string
  page?: number
}): Promise<{ rows: WeeklyReport[]; total: number }> {
  const res = await apiClient.get<unknown>('/operations/weekly-reports', { params })
  const page = unwrapData<Paginated<WeeklyReport>>(res.data)
  return { rows: page?.data ?? [], total: page?.total ?? 0 }
}

export async function fetchWeeklyReportsDue(): Promise<{
  week_start: string
  missing: Array<{ id: number; name: string }>
  submitted: number
}> {
  const res = await apiClient.get<unknown>('/operations/weekly-reports/due')
  return unwrapData(res.data)
}

export async function submitWeeklyReport(input: WeeklyReportInput): Promise<WeeklyReport> {
  const res = await apiClient.post<unknown>('/operations/weekly-reports', input)
  return unwrapData<WeeklyReport>(res.data)
}
