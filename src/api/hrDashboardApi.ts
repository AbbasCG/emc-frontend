import apiClient from '@/api/axios'

export type HrStats = {
  total_members: number
  active_members: number
  team_members: number
  instructors: number
  pending_volunteer_requests: number
  accepted_volunteers: number
  volunteers_waiting_conversion: number
  converted_volunteers: number
  departments_count: number
  open_hr_tasks: number
}

export type HrVolunteerRow = {
  id: number
  full_name: string
  email: string
  desired_department: string | null
  status: string
  created_at: string | null
  accepted_at?: string | null
}

export type HrInstructorRow = {
  id: number
  name: string
  title: string | null
  email: string | null
  courses_count: number
}

export type HrDeptBreakdown = {
  name: string
  members_count: number
}

export type HrDashboardData = {
  stats: HrStats
  recent_volunteer_requests: HrVolunteerRow[]
  accepted_volunteers: HrVolunteerRow[]
  recent_instructors: HrInstructorRow[]
  department_breakdown: HrDeptBreakdown[]
}

const DEFAULT_STATS: HrStats = {
  total_members: 0,
  active_members: 0,
  team_members: 0,
  instructors: 0,
  pending_volunteer_requests: 0,
  accepted_volunteers: 0,
  volunteers_waiting_conversion: 0,
  converted_volunteers: 0,
  departments_count: 0,
  open_hr_tasks: 0,
}

export async function fetchHrDashboard(): Promise<HrDashboardData> {
  const res = await apiClient.get<unknown>('/hr/dashboard', { skipErrorToast: true })
  const raw = res.data as Record<string, unknown>
  const payload = (raw?.data ?? raw) as Record<string, unknown>

  const stats = { ...DEFAULT_STATS, ...(payload.stats as Partial<HrStats> ?? {}) }

  const toList = <T>(v: unknown): T[] => (Array.isArray(v) ? v as T[] : [])

  return {
    stats,
    recent_volunteer_requests: toList<HrVolunteerRow>(payload.recent_volunteer_requests),
    accepted_volunteers: toList<HrVolunteerRow>(payload.accepted_volunteers),
    recent_instructors: toList<HrInstructorRow>(payload.recent_instructors),
    department_breakdown: toList<HrDeptBreakdown>(payload.department_breakdown),
  }
}
