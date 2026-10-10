import apiClient from './axios'
import { unwrapData } from './unwrap'

/**
 * نقاط أثر EMC — سياسة التقدير والمكافآت والتدرج للمتطوعين v1.0.
 * 1,000 نقطة = €10 رصيد تعليمي داخلي غير نقدي.
 */

export type PointsLevel = {
  id: string
  title: string
  months: number
  points: number
  sadeem: string
}

export type PointsSummary = {
  lifetime_points: number
  available_points: number
  redeemed_points: number
  credit_eur: number
  active_months: number
  eligible_level: PointsLevel
  next_level: PointsLevel | null
  /**
   * Business authority to award points, decided by the server
   * (members.recognize / members.manage). The award endpoint re-checks it.
   */
  can_award?: boolean
  monthly_cap?: number
}

/** A member the current user may award — an active EMC team member in scope. */
export type PointRecipient = {
  user_id: number
  name: string
  department_id: number
  department: string | null
  role_title: string | null
  month_points: number
  lifetime_points: number
}

export type PointAward = {
  id: number
  category: string
  points: number
  reason: string
  awarded_at: string
  awarder?: { id: number; name: string } | null
  user?: { id: number; name: string }
}

export const AWARD_CATEGORIES: Array<{ value: string; label: string }> = [
  { value: 'meetings', label: 'الالتزام والاجتماعات' },
  { value: 'task', label: 'مهمة' },
  { value: 'quality_bonus', label: 'جودة الأداء الشهري' },
  { value: 'initiative', label: 'مبادرة' },
  { value: 'workshop', label: 'ورشة' },
  { value: 'camp', label: 'معسكر' },
  { value: 'community', label: 'خدمة المجتمع والمتعلمين' },
  { value: 'mentoring', label: 'مساعدة المتطوعين الجدد' },
  { value: 'knowledge', label: 'نقل المعرفة' },
  { value: 'institutional', label: 'إنجاز مؤسسي' },
  { value: 'best_of_department', label: 'أفضل متطوع في الإدارة' },
  { value: 'best_of_center', label: 'أفضل متطوع في المركز' },
  { value: 'exceptional_impact', label: 'جائزة الأثر الاستثنائي' },
  { value: 'continuity', label: 'مكافأة الاستمرارية' },
  { value: 'other', label: 'أخرى' },
]

export async function fetchMyPointsSummary(): Promise<PointsSummary> {
  const res = await apiClient.get<unknown>('/operations/volunteer-points/summary')
  return unwrapData<PointsSummary>(res.data)
}

export async function fetchMyAwards(): Promise<PointAward[]> {
  const res = await apiClient.get<unknown>('/operations/volunteer-points/my-awards')
  const page = unwrapData<{ data?: PointAward[] }>(res.data)
  return page?.data ?? []
}

export async function fetchPointsLeaderboard(): Promise<
  Array<{ user: { id: number; name: string; role: string | null }; lifetime_points: number }>
> {
  const res = await apiClient.get<unknown>('/operations/volunteer-points/leaderboard')
  return unwrapData(res.data) ?? []
}

export async function fetchPointsPolicy(): Promise<{
  levels: PointsLevel[]
  euro_per_1000: number
  monthly_cap: number
  version: string
}> {
  const res = await apiClient.get<unknown>('/operations/volunteer-points/policy')
  return unwrapData(res.data)
}

export async function fetchPointRecipients(): Promise<PointRecipient[]> {
  const res = await apiClient.get<unknown>('/operations/volunteer-points/recipients')
  return unwrapData<PointRecipient[]>(res.data) ?? []
}

export async function awardPoints(input: {
  user_id: number
  category: string
  points: number
  reason: string
}): Promise<PointAward> {
  const res = await apiClient.post<unknown>('/operations/volunteer-points/awards', input)
  return unwrapData<PointAward>(res.data)
}

export async function redeemPoints(input: {
  user_id: number
  points: number
  purpose: string
  note?: string
}): Promise<void> {
  await apiClient.post('/operations/volunteer-points/redemptions', input)
}
