import apiClient from './axios'

export type VolunteerStatus = 'active' | 'inactive' | 'on_leave' | 'withdrawn'

export interface VolunteerHubItem {
  id: number
  user_id: number
  name: string
  email: string | null
  avatar: string | null
  department_id: number | null
  department_name: string
  is_leader: boolean
  status: VolunteerStatus
  hours_logged: number
  actual_points: number
  used_points: number
  balance: number
  last_weekly_rating: number | null
  created_at: string
}

export interface VolunteerHubSummary {
  total_volunteers: number
  total_actual_points: number
  total_used_points: number
  total_balance: number
  status_counts: {
    active: number
    inactive: number
    on_leave: number
    withdrawn: number
  }
}

export interface VolunteerStatusLogItem {
  id: number
  old_status: string | null
  new_status: VolunteerStatus
  reason: string
  changed_by_name: string
  changed_by_id: number | null
  created_at: string
  date_formatted: string
}

export interface PointsLedgerItem {
  id: string
  date: string | null
  category: string
  reason: string
  points: number
  type: 'earn' | 'deduction' | 'redemption'
  source: string
  creator: string
}

export interface PointsLedgerResponse {
  ledger: PointsLedgerItem[]
  actual_points: number
  used_points: number
  balance: number
}

export interface WeeklyRatingItem {
  id: number
  report_id: number
  date: string | null
  department_name: string
  scores: Record<string, number>
  avg_score: number
  note: string | null
}

export interface WeeklyRatingsResponse {
  ratings: WeeklyRatingItem[]
  monthly_averages: Array<{
    month_key: string
    month_label: string
    avg_score: number
    count: number
  }>
  criteria_averages: Record<string, number>
  overall_avg: number | null
}

export interface VolunteersHubQuery {
  search?: string
  department_id?: number | string
  status?: string
  sort?: 'points' | 'name' | 'balance' | 'last_rating'
  direction?: 'asc' | 'desc'
}

export async function fetchVolunteersHub(params: VolunteersHubQuery = {}): Promise<{
  volunteers: VolunteerHubItem[]
  departments: Array<{ id: number; name: string }>
  summary: VolunteerHubSummary
}> {
  const res = await apiClient.get<{
    success: boolean
    data: {
      volunteers: VolunteerHubItem[]
      departments: Array<{ id: number; name: string }>
      summary: VolunteerHubSummary
    }
  }>('/operations/volunteers/hub', { params })
  return (
    res.data?.data ?? {
      volunteers: [],
      departments: [],
      summary: {
        total_volunteers: 0,
        total_actual_points: 0,
        total_used_points: 0,
        total_balance: 0,
        status_counts: { active: 0, inactive: 0, on_leave: 0, withdrawn: 0 },
      },
    }
  )
}

export async function updateVolunteerStatus(
  volunteerId: number,
  payload: { status: VolunteerStatus; reason: string },
): Promise<void> {
  await apiClient.put(`/operations/volunteers/${volunteerId}/status`, payload)
}

export async function fetchVolunteerStatusLogs(volunteerId: number): Promise<VolunteerStatusLogItem[]> {
  const res = await apiClient.get<{ success: boolean; data: VolunteerStatusLogItem[] }>(
    `/operations/volunteers/${volunteerId}/status-logs`,
  )
  return res.data?.data ?? []
}

export async function fetchVolunteerPointsLedger(volunteerId: number): Promise<PointsLedgerResponse> {
  const res = await apiClient.get<{ success: boolean; data: PointsLedgerResponse }>(
    `/operations/volunteers/${volunteerId}/points-ledger`,
  )
  return (
    res.data?.data ?? {
      ledger: [],
      actual_points: 0,
      used_points: 0,
      balance: 0,
    }
  )
}

export async function fetchVolunteerWeeklyRatings(volunteerId: number): Promise<WeeklyRatingsResponse> {
  const res = await apiClient.get<{ success: boolean; data: WeeklyRatingsResponse }>(
    `/operations/volunteers/${volunteerId}/weekly-ratings`,
  )
  return (
    res.data?.data ?? {
      ratings: [],
      monthly_averages: [],
      criteria_averages: {},
      overall_avg: null,
    }
  )
}
