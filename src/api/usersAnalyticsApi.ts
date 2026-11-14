import apiClient from '@/api/axios'

/**
 * Users Management hub — analytics client (read-only aggregates).
 *
 *   GET /admin/users-analytics/overview      users.analytics.view
 *   GET /admin/users-analytics/activity      users.activity.view
 *   GET /admin/users-analytics/last-logins   users.activity.view
 *
 * Every figure is computed by the backend; nothing here derives or invents numbers. Each response says what its login
 * numbers cover (`meta.login_history`) and the UI states those limits next to the figures.
 */

const BASE = '/admin/users-analytics'
const silent = { skipErrorToast: true as const }

export interface UsersAnalyticsQuery {
  /** `YYYY-MM-DD` in the reporting zone. */
  from: string
  to: string
  compare: boolean
}

export interface PeriodInfo {
  from: string
  to: string
  days: number
  timezone: string
}

export interface Kpi {
  value: number
  previous: number | null
  change_pct: number | null
}

export interface LoginHistoryCoverage {
  /** ISO 8601, UTC; null when no login event was ever recorded. */
  first_event_at: string | null
  /** True when the window starts before the first recorded login: figures are lower bounds. */
  partial: boolean
}

interface MetaBase {
  period: PeriodInfo
  previous_period: PeriodInfo | null
  generated_at: string
  login_history: LoginHistoryCoverage
}

export interface OverviewData {
  meta: MetaBase & { cumulative: string[] }
  kpis: {
    total_accounts: { value: number; cumulative: true }
    accounts_created: Kpi
    successful_logins: Kpi
    unique_logged_in_users: Kpi
    registration_growth_pct: { value: number | null; previous: null; change_pct: null }
  }
  charts: {
    accounts_growth: Array<{ date: string; created: number; total: number }>
    login_trend: Array<{ date: string; events: number; users: number }>
    new_vs_returning: Array<{ date: string; new: number; returning: number }>
    by_role: Array<{ role: string; count: number }>
    by_status: { active: number; inactive: number; deleted: number; verified: number; unverified: number }
    by_country: {
      items: Array<{ country: string; count: number }>
      other: number
      unknown: number
      coverage_pct: number
      self_reported: true
    }
  }
}

export interface ActivityData {
  meta: MetaBase & { cumulative: string[]; excludes: string[] }
  kpis: {
    login_events: Kpi
    unique_logged_in_users: Kpi
    returning_users: Kpi
    new_users_logged_in: Kpi
    users_back_on_another_day: { value: number; share_pct: number | null }
  }
  charts: {
    login_trend: Array<{ date: string; events: number; users: number }>
    heatmap: { weekday_hour: number[][]; weekday_base: string; timezone: string }
    return_frequency: Array<{ label: string; users: number }>
    by_role: Array<{ role: string; events: number; users: number }>
  }
  inactivity: Array<{ days: number; users: number }>
  never_logged_in: number
}

export interface LastLoginRow {
  id: number
  name: string
  role: string | null
  is_active: boolean
  last_login_at: string | null
}

export interface LastLoginsPage {
  rows: LastLoginRow[]
  total: number
  page: number
  lastPage: number
  perPage: number
}

function params(q: UsersAnalyticsQuery): Record<string, string | number> {
  return { from: q.from, to: q.to, compare: q.compare ? 1 : 0 }
}

export async function fetchUsersOverview(q: UsersAnalyticsQuery, signal?: AbortSignal): Promise<OverviewData> {
  const res = await apiClient.get<{ data: OverviewData }>(`${BASE}/overview`, { ...silent, params: params(q), signal })
  return res.data.data
}

export async function fetchUsersActivity(q: UsersAnalyticsQuery, signal?: AbortSignal): Promise<ActivityData> {
  const res = await apiClient.get<{ data: ActivityData }>(`${BASE}/activity`, { ...silent, params: params(q), signal })
  return res.data.data
}

export async function fetchLastLogins(page = 1, perPage = 10, signal?: AbortSignal): Promise<LastLoginsPage> {
  const res = await apiClient.get<{
    data: LastLoginRow[]
    meta: { total: number; current_page: number; last_page: number; per_page: number }
  }>(`${BASE}/last-logins`, { ...silent, params: { page, per_page: perPage }, signal })

  return {
    rows: res.data.data,
    total: res.data.meta.total,
    page: res.data.meta.current_page,
    lastPage: res.data.meta.last_page,
    perPage: res.data.meta.per_page,
  }
}
