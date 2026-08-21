import apiClient from './axios'
import { unwrapData } from './unwrap'

/** قراءة لوحة «تحليلات الزوار» — فوق مسارات /admin/visitor-analytics/*. */

export type AnalyticsTotals = {
  visitors: number
  pageviews: number
  events: number
  errors: number
}

export type AnalyticsDailyRow = {
  day: string
  events: number
  pageviews: number
  errors: number
  visitors: number
}

export type RankRow = { value: string; total: number; visitors: number }

export type AnalyticsTop = {
  pages: RankRow[]
  referrers: RankRow[]
  devices: RankRow[]
  browsers: RankRow[]
  timezones: RankRow[]
  events: RankRow[]
}

export type AnalyticsErrorRow = {
  id: number
  name: string | null
  path: string | null
  browser: string | null
  os: string | null
  device: string | null
  meta: Record<string, string> | null
  created_at: string
}

export async function fetchAnalyticsOverview(days: number): Promise<{
  totals: AnalyticsTotals
  daily: AnalyticsDailyRow[]
  since: string
}> {
  const res = await apiClient.get<unknown>('/admin/visitor-analytics/overview', { params: { days } })
  return unwrapData(res.data)
}

export async function fetchAnalyticsTop(days: number): Promise<AnalyticsTop> {
  const res = await apiClient.get<unknown>('/admin/visitor-analytics/top', { params: { days } })
  return unwrapData(res.data)
}

export async function fetchAnalyticsErrors(): Promise<AnalyticsErrorRow[]> {
  const res = await apiClient.get<unknown>('/admin/visitor-analytics/errors')
  return unwrapData(res.data)
}
