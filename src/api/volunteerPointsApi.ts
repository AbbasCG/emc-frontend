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

/**
 * What the signed-in user may do, computed by the server from the existing
 * business permission (members.recognize / members.manage) and department
 * scope. The page only reflects these; every endpoint re-checks them.
 */
export type PointsCapabilities = {
  can_view_all: boolean
  can_award: boolean
  can_adjust: boolean
  can_view_history: boolean
  can_manage: boolean
  scope: 'none' | 'department' | 'organization'
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
  capabilities?: PointsCapabilities
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

/** award = positive grant · deduction = negative grant · adjustment = manual correction */
export type PointEntryKind = 'award' | 'adjustment' | 'deduction'

export type PointAward = {
  id: number
  category: string
  points: number
  reason: string
  awarded_at: string
  kind?: PointEntryKind
  source_type?: string | null
  awarder?: { id: number; name: string } | null
  user?: { id: number; name: string }
}

/** A ledger row as staff see it: may carry the internal note (never sent to the recipient). */
export type PointHistoryEntry = PointAward & { note?: string | null }

/** A person in the management list — a real EMC team member in the caller's scope. */
export type PointsMember = PointRecipient & {
  awards_count: number
  last_activity_at: string | null
  level: { id: string; title: string }
  is_self: boolean
}

export type PointsMembersQuery = {
  search?: string
  department_id?: number
  level?: string
  sort?: 'points' | 'recent' | 'department' | 'name'
  direction?: 'asc' | 'desc'
  page?: number
  per_page?: number
  only_with_points?: boolean
}

export type PointsMembersKpis = {
  total_points: number
  members_with_points: number
  scope_members: number
  month_points_total: number
  top_contributor_month: { user_id: number; name: string; department: string | null; points: number } | null
}

export type PointsMembersPage = {
  rows: PointsMember[]
  total: number
  perPage: number
  currentPage: number
  lastPage: number
  kpis: PointsMembersKpis
  filters: { departments: Array<{ id: number; name: string | null }>; levels: Array<{ id: string; title: string }> }
  capabilities: PointsCapabilities | null
}

export type PointsMemberHistory = {
  user: { id: number; name: string; department: string | null; role_title: string | null }
  summary: Pick<PointsSummary, 'lifetime_points' | 'available_points' | 'redeemed_points' | 'eligible_level'>
  entries: PointHistoryEntry[]
  currentPage: number
  lastPage: number
  total: number
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

type RawPage<T> = { data?: T[]; current_page?: number; last_page?: number; total?: number }

/** GET /operations/volunteer-points/members — people with points in the caller's scope (managers only). */
export async function fetchPointsMembers(query: PointsMembersQuery = {}): Promise<PointsMembersPage> {
  const params: Record<string, string | number | boolean> = {}
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params[key] = value as string | number | boolean
  }

  const res = await apiClient.get<{
    data?: PointsMember[]
    meta?: {
      total: number
      per_page: number
      current_page: number
      last_page: number
      kpis: PointsMembersKpis
      filters: PointsMembersPage['filters']
    }
    capabilities?: PointsCapabilities
  }>('/operations/volunteer-points/members', { params })

  const body = res.data
  const meta = body.meta

  return {
    rows: body.data ?? [],
    total: meta?.total ?? 0,
    perPage: meta?.per_page ?? 20,
    currentPage: meta?.current_page ?? 1,
    lastPage: meta?.last_page ?? 1,
    kpis: meta?.kpis ?? { total_points: 0, members_with_points: 0, scope_members: 0, month_points_total: 0, top_contributor_month: null },
    filters: meta?.filters ?? { departments: [], levels: [] },
    capabilities: body.capabilities ?? null,
  }
}

/** GET /operations/volunteer-points/users/{id}/history — own history always; others for managers in scope. */
export async function fetchMemberHistory(userId: number, page = 1): Promise<PointsMemberHistory> {
  const res = await apiClient.get<unknown>(`/operations/volunteer-points/users/${userId}/history`, { params: { page } })
  const body = unwrapData<{
    user: PointsMemberHistory['user']
    summary: PointsMemberHistory['summary']
    entries: RawPage<PointHistoryEntry>
  }>(res.data)

  return {
    user: body.user,
    summary: body.summary,
    entries: body.entries?.data ?? [],
    currentPage: body.entries?.current_page ?? 1,
    lastPage: body.entries?.last_page ?? 1,
    total: body.entries?.total ?? 0,
  }
}

export type AdjustPointsInput = {
  direction: 'add' | 'subtract'
  points: number
  reason: string
  note?: string
}

/** POST /operations/volunteer-points/users/{id}/adjust — appends an attributed ledger row; never overwrites a total. */
export async function adjustMemberPoints(
  userId: number,
  input: AdjustPointsInput,
): Promise<{ entry: PointHistoryEntry; total_before: number; total_after: number }> {
  const res = await apiClient.post<unknown>(`/operations/volunteer-points/users/${userId}/adjust`, input)
  return unwrapData(res.data)
}
