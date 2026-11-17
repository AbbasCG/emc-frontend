import apiClient from './axios'
import { normalizeRequest, type VolunteerRequest } from './volunteerApplicationApi'

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
  /** Legacy volunteers that have no login account: they cannot be given points until converted with one. */
  without_account: number
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

const EMPTY_SUMMARY: VolunteerHubSummary = {
  total_volunteers: 0,
  total_actual_points: 0,
  total_used_points: 0,
  total_balance: 0,
  status_counts: { active: 0, inactive: 0, on_leave: 0, withdrawn: 0 },
  without_account: 0,
}

export async function fetchVolunteersHub(params: VolunteersHubQuery = {}): Promise<{
  volunteers: VolunteerHubItem[]
  departments: Array<{ id: number; name: string }>
  summary: VolunteerHubSummary
}> {
  const res = await apiClient.get<{
    success: boolean
    data?: {
      volunteers?: VolunteerHubItem[]
      departments?: Array<{ id: number; name: string }>
      summary?: Partial<VolunteerHubSummary>
    }
  }>('/operations/volunteers/hub', { params, skipErrorToast: true } as Record<string, unknown>)

  const data = res.data?.data
  const summary = data?.summary ?? {}

  return {
    volunteers: Array.isArray(data?.volunteers) ? data.volunteers : [],
    departments: Array.isArray(data?.departments) ? data.departments : [],
    // An older server that does not send the key means "none", never NaN or a banner.
    summary: {
      ...EMPTY_SUMMARY,
      ...summary,
      status_counts: { ...EMPTY_SUMMARY.status_counts, ...(summary.status_counts ?? {}) },
      without_account: Math.max(0, Number(summary.without_account ?? 0) || 0),
    },
  }
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
    { skipErrorToast: true } as Record<string, unknown>,
  )
  return res.data?.data ?? []
}

export async function fetchVolunteerPointsLedger(volunteerId: number): Promise<PointsLedgerResponse> {
  const res = await apiClient.get<{ success: boolean; data: PointsLedgerResponse }>(
    `/operations/volunteers/${volunteerId}/points-ledger`,
    { skipErrorToast: true } as Record<string, unknown>,
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
    { skipErrorToast: true } as Record<string, unknown>,
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

/* ── Volunteer profile (ops drawer, personal tab) ───────────────────────── */

/** Where the volunteer's data came from: their application, a team profile, or nothing but the login account. */
export type VolunteerProfileSource = 'volunteer_request' | 'team_profile' | 'account_only'

/** Each flag is null when the server did not say: «unknown» is never shown as «no». */
export interface VolunteerAccountInfo {
  has_account: boolean | null
  email_verified: boolean | null
  must_change_password: boolean | null
  created_at: string | null
}

export interface VolunteerProfileVolunteer {
  id: number
  user_id: number | null
  name: string
  email: string | null
  phone: string | null
  status: string | null
  department_id: number | null
  department_name: string | null
  hours_logged: number | null
  created_at: string | null
  account: VolunteerAccountInfo
}

export interface VolunteerTeamProfile {
  id: number
  position_ar: string | null
  member_type: string | null
  joined_at: string | null
  is_active: boolean
  phone: string | null
  email: string | null
  country: string | null
  city: string | null
  gender: string | null
}

/** How the server tied the request to this volunteer; `email` is an UNVERIFIED link (same e-mail address only). */
export type VolunteerProfileMatch = 'team_source' | 'converted_member' | 'email'

export interface VolunteerProfile {
  volunteer: VolunteerProfileVolunteer
  /** The application the volunteer was accepted with; null for a volunteer added by hand or from an old source. */
  request: VolunteerRequest | null
  source: VolunteerProfileSource
  team_profile: VolunteerTeamProfile | null
  /** Absent on an older server. */
  match?: VolunteerProfileMatch | null
}

type Raw = Record<string, unknown>

const isRecord = (v: unknown): v is Raw => v != null && typeof v === 'object' && !Array.isArray(v)
const str = (v: unknown): string | null => {
  if (v == null) return null
  const s = String(v).trim()
  return s || null
}
const bool = (v: unknown): boolean => v === true || v === 1 || v === '1' || v === 'true'
/** true / false when the server said so, null when it said nothing (never an invented «false»). */
const boolOrNull = (v: unknown): boolean | null => {
  if (v === true || v === 1 || v === '1' || v === 'true') return true
  if (v === false || v === 0 || v === '0' || v === 'false') return false
  return null
}
const num = (v: unknown): number => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
const numOrNull = (v: unknown): number | null => {
  const n = Number(v)
  return v != null && v !== '' && Number.isFinite(n) ? n : null
}

function parseTeamProfile(raw: unknown): VolunteerTeamProfile | null {
  if (!isRecord(raw)) return null
  return {
    id: num(raw.id),
    position_ar: str(raw.position_ar),
    member_type: str(raw.member_type),
    joined_at: str(raw.joined_at),
    is_active: raw.is_active === undefined ? true : bool(raw.is_active),
    phone: str(raw.phone),
    email: str(raw.email),
    country: str(raw.country),
    city: str(raw.city),
    gender: str(raw.gender),
  }
}

/** The request is read through the same normaliser as the accepted list, so both screens agree on every field. */
export function parseVolunteerProfile(data: unknown): VolunteerProfile {
  const root = isRecord(data) ? data : {}
  const v = isRecord(root.volunteer) ? root.volunteer : {}
  const account = isRecord(v.account) ? v.account : {}
  const request = isRecord(root.request) ? normalizeRequest(root.request) : null
  const source = root.source === 'volunteer_request' || root.source === 'team_profile' || root.source === 'account_only'
    ? root.source
    : request ? 'volunteer_request' : 'account_only'

  return {
    volunteer: {
      id: num(v.id),
      user_id: numOrNull(v.user_id),
      name: str(v.name) ?? '',
      email: str(v.email),
      phone: str(v.phone),
      status: str(v.status),
      department_id: numOrNull(v.department_id),
      department_name: str(v.department_name),
      hours_logged: numOrNull(v.hours_logged),
      created_at: str(v.created_at),
      account: {
        has_account: boolOrNull(account.has_account),
        email_verified: boolOrNull(account.email_verified),
        must_change_password: boolOrNull(account.must_change_password),
        created_at: str(account.created_at),
      },
    },
    request,
    source,
    team_profile: parseTeamProfile(root.team_profile),
    match: root.match === 'team_source' || root.match === 'converted_member' || root.match === 'email' ? root.match : null,
  }
}

/** True when the request was refused for lack of permission (HTTP 403), as opposed to any other failure. */
export function isForbiddenError(err: unknown): boolean {
  return (err as { response?: { status?: number } } | null)?.response?.status === 403
}

/** GET /operations/volunteers/{id}/profile: everything known about one volunteer (HR / admin roles). */
export async function fetchVolunteerProfile(volunteerId: number): Promise<VolunteerProfile> {
  const res = await apiClient.get<{ success: boolean; data?: unknown }>(
    `/operations/volunteers/${volunteerId}/profile`,
    { skipErrorToast: true } as Record<string, unknown>,
  )
  return parseVolunteerProfile(res.data?.data)
}

/* ── Unified activity timeline ──────────────────────────────────────────── */

export type VolunteerActivityType =
  | 'request_submitted'
  | 'request_accepted'
  | 'converted_to_member'
  | 'profile_created'
  | 'status_change'
  | 'points_awarded'
  | 'points_deducted'
  | 'points_redeemed'
  | 'weekly_rating'

export interface VolunteerActivityItem {
  id: string | number
  /** One of VolunteerActivityType; an unknown value from a newer server is kept as is and still rendered. */
  type: VolunteerActivityType | (string & {})
  title: string
  description: string | null
  occurred_at: string | null
  date_formatted: string | null
  actor_name: string | null
  meta: Record<string, unknown>
}

/** GET /operations/volunteers/{id}/activity: the timeline, newest first. */
export async function fetchVolunteerActivity(volunteerId: number): Promise<VolunteerActivityItem[]> {
  const res = await apiClient.get<{ success: boolean; data?: unknown }>(
    `/operations/volunteers/${volunteerId}/activity`,
    { skipErrorToast: true } as Record<string, unknown>,
  )
  const rows = Array.isArray(res.data?.data) ? (res.data.data as unknown[]) : []

  return rows.filter(isRecord).map((r, i) => ({
    id: typeof r.id === 'string' || typeof r.id === 'number' ? r.id : `row-${i}`,
    type: str(r.type) ?? 'unknown',
    title: str(r.title) ?? '',
    description: str(r.description),
    occurred_at: str(r.occurred_at),
    date_formatted: str(r.date_formatted),
    actor_name: str(r.actor_name),
    meta: isRecord(r.meta) ? r.meta : {},
  }))
}
