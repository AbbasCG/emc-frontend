import apiClient from './axios'
import { unwrapData } from './unwrap'
import type { MeetingType } from '@/types/operations'

/**
 * تقارير التشغيل: محاضر ما بعد الاجتماع (مع تقييم الحاضرين) والتقارير
 * الأسبوعية لكل إدارة — الواجهة الموحدة فوق مسارات `/operations/*`.
 */

export type DepartmentMember = {
  id: number
  name: string
  role: string | null
  role_title: string | null
  kind: 'leader' | 'deputy_leader' | 'operational' | 'team'
}

export async function fetchDepartmentMembers(departmentId: number): Promise<DepartmentMember[]> {
  const res = await apiClient.get<unknown>(`/operations/departments/${departmentId}/members`)
  return unwrapData<DepartmentMember[]>(res.data) ?? []
}

// ── نطاق الإدارات المتاح للمستخدم ────────────────────────────────────────────

export type DepartmentOption = { id: number; name: string }

/**
 * Mirrors DepartmentAccessService::manifest(). Two deliberately separate
 * scopes — READ authority is not WRITE authority:
 *   - CREATE scope (`department_scope`, `allowed_departments`,
 *     `can_select_any_department`, `can_create_report`): leadership or global
 *     admin only. Drives the create form and sole-department auto-select.
 *   - READ scope (`read_scope`, `readable_departments`,
 *     `can_view_multiple_departments`): what the user may browse/filter.
 *     A read-only global role (quality) gets every department here while its
 *     create scope stays empty.
 * The read fields are optional only to tolerate an older backend during a
 * split deploy; useDepartmentAccess() supplies the fallback.
 */
export type DepartmentAccessManifest = {
  department_scope: 'restricted' | 'global'
  allowed_departments: DepartmentOption[]
  can_select_any_department: boolean
  /** true when the current user may create/submit reports (leader or global admin). false for read-only-global roles like quality. */
  can_create_report?: boolean
  read_scope?: 'restricted' | 'global'
  readable_departments?: DepartmentOption[]
  can_view_multiple_departments?: boolean
}

export async function fetchMyDepartmentAccess(): Promise<DepartmentAccessManifest> {
  const res = await apiClient.get<unknown>('/operations/departments/my-access')
  return unwrapData<DepartmentAccessManifest>(res.data)
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

/** One {id,name} reference. Either end can be absent on legacy rows, so consumers get `null`, never `undefined`. */
export type NamedRef = { id: number; name: string }

/**
 * A row of the meeting-reports list. This is the shape the SERVER guarantees
 * (OperationsMeetingReportResource) and the shape `normalizeMeetingReport`
 * enforces on the client: `title` and `meeting_date` are never null, so the
 * page can render a row without a single guard. A legacy quick-report row
 * (no title/date/department/author) used to crash the page precisely because
 * the previous type promised fields the data did not have.
 */
/** The scheduled meeting a report was filed for (reports filed from the lounge); null for a standalone department report. */
export type MeetingReportSource = { id: number; title: string; type: MeetingType }

export type MeetingReport = {
  id: number
  title: string
  /** `YYYY-MM-DD`, or null only if the server sent nothing parseable. */
  meeting_date: string | null
  department: NamedRef | null
  author: NamedRef | null
  meeting: MeetingReportSource | null
  ratings_count: number
  attended_count: number
  created_at: string | null
}

export type MeetingReportRatingRow = {
  id: number
  attended: boolean
  scores: Record<string, number> | null
  avg_score: number | null
  note: string | null
  user: NamedRef | null
}

/** Figures that exist only on quick reports filed from the meetings lounge. */
export type MeetingReportExtras = {
  team_commitment_score?: number
  team_commitment_notes?: string
  kpi_percentage?: number
  top_interactive_member?: string
  improvement_suggestions?: string
  absentees?: string[]
}

export type MeetingReportDetail = MeetingReport & {
  achieved: string | null
  planned: string | null
  needs: string | null
  needs_reason: string | null
  decisions: string | null
  notes: string | null
  extras: MeetingReportExtras
  ratings: MeetingReportRatingRow[]
}

export type MeetingReportsStats = {
  total: number
  this_month: number
  latest_at: string | null
  /** Null when no attendance has been recorded yet. */
  attendance_rate: number | null
}

export type MeetingReportsQuery = {
  department_id?: number
  q?: string
  date_from?: string
  date_to?: string
  page?: number
  per_page?: number
}

export type MeetingReportsPage = {
  rows: MeetingReport[]
  total: number
  page: number
  lastPage: number
  stats: MeetingReportsStats
}

type Rec = Record<string, unknown>
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v : null)
const num = (v: unknown, fallback = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)

function ref(v: unknown): NamedRef | null {
  if (!isRec(v)) return null
  const id = num(v.id, NaN)
  const name = str(v.name)
  return Number.isNaN(id) || name === null ? null : { id, name }
}

const MEETING_TYPES: readonly string[] = ['executive', 'department', 'programs', 'partnerships', 'quality', 'external_partner', 'general']

function source(v: unknown): MeetingReportSource | null {
  if (!isRec(v)) return null
  const id = num(v.id, NaN)
  const title = str(v.title)
  if (Number.isNaN(id) || title === null) return null
  return { id, title, type: (typeof v.type === 'string' && MEETING_TYPES.includes(v.type) ? v.type : 'general') as MeetingType }
}

/** `2026-10-12T00:00:00.000000Z` and `2026-10-12` both become `2026-10-12`; anything else becomes null. */
function dateOnly(v: unknown): string | null {
  const s = str(v)
  const m = s?.match(/^(\d{4}-\d{2}-\d{2})/)
  return m ? m[1] : null
}

/**
 * Coerces whatever the API returned into a safe MeetingReport. Tolerates an
 * older backend (raw model with nulls) as well as the current resource, so a
 * single odd row can never take the whole page down.
 */
export function normalizeMeetingReport(raw: unknown): MeetingReport | null {
  if (!isRec(raw)) return null
  const id = num(raw.id, NaN)
  if (Number.isNaN(id)) return null
  return {
    id,
    title: str(raw.title) ?? 'تقرير اجتماع',
    meeting_date: dateOnly(raw.meeting_date) ?? dateOnly(raw.created_at),
    department: ref(raw.department),
    author: ref(raw.author),
    meeting: source(raw.meeting),
    ratings_count: num(raw.ratings_count),
    attended_count: num(raw.attended_count),
    created_at: str(raw.created_at),
  }
}

export function normalizeMeetingReportDetail(raw: unknown): MeetingReportDetail | null {
  const base = normalizeMeetingReport(raw)
  if (!base || !isRec(raw)) return null
  const extras = isRec(raw.extras) ? raw.extras : {}
  const ratings = Array.isArray(raw.ratings) ? raw.ratings : []
  return {
    ...base,
    achieved: str(raw.achieved) ?? str(raw.completed_tasks_summary),
    planned: str(raw.planned) ?? str(raw.next_month_goals),
    needs: str(raw.needs) ?? str(raw.executive_requests),
    needs_reason: str(raw.needs_reason) ?? str(raw.challenges),
    decisions: str(raw.decisions),
    notes: str(raw.notes),
    extras: {
      ...(typeof extras.team_commitment_score === 'number' ? { team_commitment_score: extras.team_commitment_score } : {}),
      ...(str(extras.team_commitment_notes) ? { team_commitment_notes: str(extras.team_commitment_notes)! } : {}),
      ...(typeof extras.kpi_percentage === 'number' ? { kpi_percentage: extras.kpi_percentage } : {}),
      ...(str(extras.top_interactive_member) ? { top_interactive_member: str(extras.top_interactive_member)! } : {}),
      ...(str(extras.improvement_suggestions) ? { improvement_suggestions: str(extras.improvement_suggestions)! } : {}),
      ...(Array.isArray(extras.absentees)
        ? { absentees: extras.absentees.filter((a): a is string => typeof a === 'string' && a.trim() !== '') }
        : {}),
    },
    ratings: ratings.flatMap((r): MeetingReportRatingRow[] => {
      if (!isRec(r)) return []
      const rid = num(r.id, NaN)
      if (Number.isNaN(rid)) return []
      return [{
        id: rid,
        attended: r.attended === true,
        scores: isRec(r.scores) ? (r.scores as Record<string, number>) : null,
        avg_score: typeof r.avg_score === 'number' ? r.avg_score : null,
        note: str(r.note),
        user: ref(r.user),
      }]
    }),
  }
}

const EMPTY_STATS: MeetingReportsStats = { total: 0, this_month: 0, latest_at: null, attendance_rate: null }

export async function fetchMeetingReports(params?: MeetingReportsQuery): Promise<MeetingReportsPage> {
  const res = await apiClient.get<unknown>('/operations/meeting-reports', { params })
  const body = isRec(res.data) ? res.data : {}
  const page = isRec(body.data) ? body.data : {}
  const rows = (Array.isArray(page.data) ? page.data : [])
    .map(normalizeMeetingReport)
    .filter((r): r is MeetingReport => r !== null)
  const stats = isRec(body.stats) ? body.stats : {}
  return {
    rows,
    total: num(page.total, rows.length),
    page: num(page.current_page, 1),
    lastPage: Math.max(1, num(page.last_page, 1)),
    stats: {
      ...EMPTY_STATS,
      total: num(stats.total),
      this_month: num(stats.this_month),
      latest_at: str(stats.latest_at),
      attendance_rate: typeof stats.attendance_rate === 'number' ? stats.attendance_rate : null,
    },
  }
}

export async function fetchMeetingReport(id: number): Promise<MeetingReportDetail> {
  const res = await apiClient.get<unknown>(`/operations/meeting-reports/${id}`)
  const detail = normalizeMeetingReportDetail(unwrapData<unknown>(res.data))
  if (!detail) throw new Error('تعذر قراءة تفاصيل التقرير')
  return detail
}

export async function createMeetingReport(input: MeetingReportInput): Promise<void> {
  await apiClient.post<unknown>('/operations/meeting-reports', input)
}

type Paginated<T> = { data?: T[]; total?: number }

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
  created_at?: string
  updated_at?: string
}

export async function fetchWeeklyReports(params?: {
  department_id?: number
  week_start?: string
  week_from?: string
  week_to?: string
  q?: string
  page?: number
  per_page?: number
}): Promise<{ rows: WeeklyReport[]; total: number }> {
  const res = await apiClient.get<unknown>('/operations/weekly-reports', { params })
  const page = unwrapData<Paginated<WeeklyReport>>(res.data)
  return { rows: page?.data ?? [], total: page?.total ?? 0 }
}

export type LedDepartmentState = {
  department: { id: number; name: string }
  current_report: { id: number; submitted_at: string; submitter: { id: number; name: string } | null } | null
  can_create: boolean
  can_edit: boolean
  can_submit: boolean
  state: 'submitted' | 'overdue' | 'in_progress'
}

export async function fetchWeeklyReportsDue(): Promise<{
  week_start: string
  missing: Array<{ id: number; name: string }>
  submitted: number
  deadline: string
  deadline_passed: boolean
  led_departments: LedDepartmentState[]
}> {
  const res = await apiClient.get<unknown>('/operations/weekly-reports/due')
  return unwrapData(res.data)
}

export type WeeklyReportsSummary = {
  week_start: string
  deadline: string
  expected: number
  submitted: number
  overdue: number
  in_progress: number
  completion_rate: number
  deadline_passed: boolean
}

export async function fetchWeeklyReportsSummary(): Promise<WeeklyReportsSummary> {
  const res = await apiClient.get<unknown>('/operations/weekly-reports/summary')
  return unwrapData<WeeklyReportsSummary>(res.data)
}

export async function submitWeeklyReport(input: WeeklyReportInput): Promise<WeeklyReport> {
  const res = await apiClient.post<unknown>('/operations/weekly-reports', input)
  return unwrapData<WeeklyReport>(res.data)
}
