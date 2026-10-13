import axios from 'axios'
import apiClient from './axios'
import type {
  AttendanceSummary,
  MeetingAudience,
  MeetingCandidate,
  MeetingCapabilities,
  MeetingDisplayStatus,
  MeetingParticipantRow,
  MeetingRef,
  MeetingReportView,
  MeetingStatus,
  MeetingType,
  MyAttendance,
  OpsActionItem,
  OpsMeeting,
  OpsMeetingDetail,
  ParticipantStatus,
} from '@/types/operations'

/**
 * Meetings API. The admin schedule (/dashboard/admin/meetings), the lounge
 * (/dashboard/department/meeting-lounge) and the meeting page read the SAME rows
 * through `/department/meetings`.
 *
 * Every response is normalized here, once, into the shapes in `types/operations`.
 * A meeting the page receives always has a title, a type and a display status;
 * missing relations are `null`, never `undefined`; every capability flag is the
 * server's decision and defaults to "no" when absent.
 */

// ── Normalization ────────────────────────────────────────────────────────────

type Rec = Record<string, unknown>
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v : null)
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)

const TYPES: readonly MeetingType[] = ['executive', 'department', 'programs', 'partnerships', 'quality', 'external_partner', 'general']
const STATUSES: readonly MeetingStatus[] = ['scheduled', 'in_progress', 'completed', 'cancelled']
const DISPLAY: readonly MeetingDisplayStatus[] = ['scheduled', 'in_progress', 'awaiting_report', 'report_submitted', 'cancelled']
const AUDIENCES: readonly MeetingAudience[] = ['explicit', 'department', 'general']
const PARTICIPANT_STATUSES: readonly ParticipantStatus[] = ['invited', 'joined', 'attended', 'absent']
/** Names an older server build used for three of the types. */
const TYPE_ALIASES: Record<string, MeetingType> = { exec: 'executive', departments: 'department', external: 'external_partner' }

function pick<T extends string>(v: unknown, allowed: readonly T[], fallback: T, aliases: Record<string, T> = {}): T {
  if (typeof v !== 'string') return fallback
  if ((allowed as readonly string[]).includes(v)) return v as T
  return aliases[v] ?? fallback
}

function ref(v: unknown): MeetingRef | null {
  if (!isRec(v)) return null
  const id = num(v.id)
  const name = str(v.name)
  return id === null || name === null ? null : { id, name }
}

function day(v: unknown): string | null {
  const s = str(v)
  const m = s?.match(/^(\d{4}-\d{2}-\d{2})/)
  return m ? m[1] : null
}

function hhmm(v: unknown): string | null {
  const m = str(v)?.match(/(\d{2}:\d{2})/)
  return m ? m[1] : null
}

function capabilities(v: unknown): MeetingCapabilities {
  const c = isRec(v) ? v : {}
  return {
    can_view: c.can_view !== false,
    can_join: c.can_join === true,
    can_confirm_attendance: c.can_confirm_attendance === true,
    can_manage: c.can_manage === true,
    can_upload_report: c.can_upload_report === true,
    can_view_report: c.can_view_report === true,
    can_view_attendance: c.can_view_attendance === true,
    can_view_quality_data: c.can_view_quality_data === true,
  }
}

function myAttendance(v: unknown): MyAttendance | null {
  if (!isRec(v)) return null
  return {
    status: pick(v.status, PARTICIPANT_STATUSES, 'invited'),
    joined_at: str(v.joined_at),
    confirmed_at: str(v.confirmed_at),
  }
}

export function normalizeMeeting(raw: unknown): OpsMeeting | null {
  if (!isRec(raw)) return null
  const id = num(raw.id)
  if (id === null) return null

  const status = pick(raw.status, STATUSES, 'scheduled')
  const hasReport = raw.has_report === true
  // An older server sent no display_status: derive the cases it can express.
  const fallbackDisplay: MeetingDisplayStatus = status === 'cancelled' ? 'cancelled' : hasReport ? 'report_submitted' : status === 'in_progress' ? 'in_progress' : status === 'completed' ? 'awaiting_report' : 'scheduled'

  return {
    id,
    title: str(raw.title) ?? 'اجتماع بلا عنوان',
    type: pick(raw.type, TYPES, 'general', TYPE_ALIASES),
    status,
    display_status: pick(raw.display_status, DISPLAY, fallbackDisplay),
    meeting_date: day(raw.meeting_date),
    start_time: hhmm(raw.start_time),
    end_time: hhmm(raw.end_time),
    department: ref(raw.department),
    organizer: ref(raw.organizer),
    meeting_url: str(raw.meeting_url),
    audience: pick(raw.audience, AUDIENCES, raw.department ? 'department' : 'general'),
    my_attendance: myAttendance(raw.my_attendance),
    participants_count: num(raw.participants_count),
    has_report: hasReport,
    report_id: num(raw.report_id),
    capabilities: capabilities(raw.capabilities),
    created_at: str(raw.created_at),
  }
}

function report(raw: unknown): MeetingReportView | null {
  if (!isRec(raw)) return null
  const id = num(raw.id)
  if (id === null) return null
  return {
    id,
    absentees: Array.isArray(raw.absentees) ? raw.absentees.filter((a): a is string => typeof a === 'string' && a.trim() !== '') : [],
    team_commitment_score: num(raw.team_commitment_score),
    team_commitment_notes: str(raw.team_commitment_notes),
    completed_tasks_summary: str(raw.completed_tasks_summary),
    kpi_percentage: num(raw.kpi_percentage),
    top_interactive_member: str(raw.top_interactive_member),
    challenges: str(raw.challenges),
    executive_requests: str(raw.executive_requests),
    next_month_goals: str(raw.next_month_goals),
    improvement_suggestions: str(raw.improvement_suggestions),
    uploaded_by: ref(raw.uploaded_by),
    uploaded_at: str(raw.uploaded_at) ?? str(raw.created_at),
  }
}

function agendaLines(v: unknown): string[] {
  if (typeof v === 'string') return v.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (Array.isArray(v)) {
    return v
      .map((x) => (typeof x === 'string' ? x.trim() : isRec(x) ? (str(x.title) ?? str(x.text) ?? '') : ''))
      .filter((x) => x !== '')
  }
  return []
}

function summary(v: unknown): AttendanceSummary | null {
  if (!isRec(v)) return null
  return { invited: num(v.invited) ?? 0, joined: num(v.joined) ?? 0, attended: num(v.attended) ?? 0, absent: num(v.absent) ?? 0 }
}

export function normalizeMeetingDetail(raw: unknown): OpsMeetingDetail | null {
  const base = normalizeMeeting(raw)
  if (!base || !isRec(raw)) return null

  const decisions = (Array.isArray(raw.decisions) ? raw.decisions : []).flatMap((d): OpsMeetingDetail['decisions'] => {
    if (!isRec(d)) return []
    const id = num(d.id)
    const text = [str(d.title), str(d.description)].filter(Boolean).join(' — ') || str(d.text)
    return id === null || !text ? [] : [{ id, text }]
  })

  const actionItems = (Array.isArray(raw.action_items) ? raw.action_items : []).flatMap((a): OpsActionItem[] => {
    if (!isRec(a)) return []
    const id = num(a.id)
    const text = str(a.title) ?? str(a.text)
    if (id === null || !text) return []
    return [{ id, text, owner: ref(a.assigned_to)?.name ?? null, due_at: day(a.due_date), done: a.status === 'completed' }]
  })

  const participants = (Array.isArray(raw.participants) ? raw.participants : []).flatMap((p): MeetingParticipantRow[] => {
    if (!isRec(p) || !isRec(p.user)) return []
    const id = num(p.user.id)
    const name = str(p.user.name)
    if (id === null || name === null) return []
    return [{
      user: { id, name, department: str(p.user.department) },
      status: pick(p.status, PARTICIPANT_STATUSES, 'invited'),
      joined_at: str(p.joined_at),
      confirmed_at: str(p.confirmed_at),
    }]
  })

  return {
    ...base,
    description: str(raw.description),
    recording_link: str(raw.recording_url) ?? str(raw.recording_link),
    agenda: agendaLines(raw.agenda),
    timezone: str(raw.timezone) ?? 'Europe/Amsterdam',
    updated_at: str(raw.updated_at),
    participants_visible: raw.participants_visible === true,
    participants,
    attendance_summary: summary(raw.attendance_summary),
    decisions,
    action_items: actionItems,
    report: report(raw.report),
  }
}

export function normalizeCandidate(raw: unknown): MeetingCandidate | null {
  if (!isRec(raw)) return null
  const id = num(raw.id)
  const name = str(raw.name)
  if (id === null || name === null) return null
  return { id, name, role: str(raw.role), role_title: str(raw.role_title), department: str(raw.department) }
}

// ── Requests ─────────────────────────────────────────────────────────────────

export type MeetingStats = {
  total: number
  this_month: number
  awaiting_report: number
  with_report: number
}

/** What the server says this viewer may schedule. `creatable_departments: null` = every department. */
export type MeetingCreationAccess = {
  can_create: boolean
  creatable_departments: MeetingRef[] | null
}

export type MeetingsWhen = 'upcoming' | 'live' | 'past'

export type MeetingsQuery = {
  q?: string
  type?: MeetingType
  status?: MeetingStatus
  report_status?: 'submitted' | 'pending'
  when?: MeetingsWhen
  department_id?: number
  date_from?: string
  date_to?: string
  page?: number
  per_page?: number
}

export type MeetingsPage = {
  rows: OpsMeeting[]
  total: number
  page: number
  lastPage: number
  stats: MeetingStats
  access: MeetingCreationAccess
}

const EMPTY_STATS: MeetingStats = { total: 0, this_month: 0, awaiting_report: 0, with_report: 0 }

export async function fetchMeetings(params?: MeetingsQuery): Promise<MeetingsPage> {
  const res = await apiClient.get<unknown>('/department/meetings', { params })
  const body = isRec(res.data) ? res.data : {}
  const page = isRec(body.data) ? body.data : {}
  const rows = (Array.isArray(page.data) ? page.data : []).map(normalizeMeeting).filter((m): m is OpsMeeting => m !== null)
  const stats = isRec(body.stats) ? body.stats : {}
  const access = isRec(body.access) ? body.access : {}
  const meta = isRec(page.meta) ? page.meta : {}

  return {
    rows,
    total: num(meta.total) ?? num(page.total) ?? rows.length,
    page: num(meta.current_page) ?? num(page.current_page) ?? 1,
    lastPage: Math.max(1, num(meta.last_page) ?? num(page.last_page) ?? 1),
    stats: {
      ...EMPTY_STATS,
      total: num(stats.total) ?? 0,
      this_month: num(stats.this_month) ?? 0,
      awaiting_report: num(stats.awaiting_report) ?? 0,
      with_report: num(stats.with_report) ?? 0,
    },
    access: {
      can_create: access.can_create === true,
      creatable_departments: Array.isArray(access.creatable_departments)
        ? access.creatable_departments.map(ref).filter((d): d is MeetingRef => d !== null)
        : null,
    },
  }
}

export type NewMeetingInput = {
  title: string
  type: MeetingType
  department_id?: number
  meeting_date: string
  start_time: string
  end_time?: string
  meeting_url?: string
  /** One agenda item per line. */
  agenda?: string
  /** Explicit invitees. Omit for a department-wide meeting. */
  participant_ids?: number[]
}

function unwrapRow(payload: unknown): unknown {
  return isRec(payload) && 'data' in payload ? payload.data : payload
}

export async function createMeeting(input: NewMeetingInput): Promise<OpsMeeting> {
  const res = await apiClient.post<unknown>('/department/meetings', input)
  const meeting = normalizeMeeting(unwrapRow(res.data))
  if (!meeting) throw new Error('تعذر قراءة الاجتماع المحفوظ')
  return meeting
}

export async function fetchMeeting(id: number): Promise<OpsMeetingDetail> {
  const res = await apiClient.get<unknown>(`/department/meetings/${id}`)
  const detail = normalizeMeetingDetail(unwrapRow(res.data))
  if (!detail) throw new Error('تعذر قراءة تفاصيل الاجتماع')
  return detail
}

/**
 * People who can be invited when scheduling: the chosen department's members, or,
 * with no department, EMC members inside the viewer's scope. The server decides;
 * nothing is filtered on the client.
 */
export async function fetchMeetingCandidates(departmentId?: number): Promise<MeetingCandidate[]> {
  const res = await apiClient.get<unknown>('/department/meeting-participants', { params: departmentId ? { department_id: departmentId } : undefined })
  const rows = unwrapRow(res.data)
  return (Array.isArray(rows) ? rows : []).map(normalizeCandidate).filter((c): c is MeetingCandidate => c !== null)
}

export type AttendanceCandidate = MeetingCandidate & {
  status: ParticipantStatus
  joined_at: string | null
}

/** The attendance roster for a meeting's report: who can be marked, and who already joined. */
export async function fetchMeetingParticipantPool(meetingId: number): Promise<{ rows: AttendanceCandidate[]; audience: MeetingAudience }> {
  const res = await apiClient.get<unknown>(`/department/meetings/${meetingId}/participants`)
  const body = isRec(res.data) ? res.data : {}
  const rows = (Array.isArray(body.data) ? body.data : []).flatMap((r): AttendanceCandidate[] => {
    const c = normalizeCandidate(r)
    if (!c || !isRec(r)) return []
    return [{ ...c, status: pick(r.status, PARTICIPANT_STATUSES, 'invited'), joined_at: str(r.joined_at) }]
  })
  return { rows, audience: pick(body.audience, AUDIENCES, 'general') }
}

async function postAttendance(meetingId: number, action: 'join' | 'confirm-attendance'): Promise<OpsMeetingDetail> {
  const res = await apiClient.post<unknown>(`/department/meetings/${meetingId}/${action}`)
  const meeting = normalizeMeetingDetail(unwrapRow(res.data))
  if (!meeting) throw new Error('تعذر قراءة الاجتماع بعد تسجيل الحضور')
  return meeting
}

/** "انضمام": records that the person opened the meeting. Resolves with the meeting, including its join link. */
export const joinMeeting = (meetingId: number) => postAttendance(meetingId, 'join')

/** "تأكيد الحضور": for in-person meetings or when there is no link. */
export const confirmMeetingAttendance = (meetingId: number) => postAttendance(meetingId, 'confirm-attendance')

export async function updateMeetingActionItem(
  meetingId: number,
  actionItemId: number,
  body: { done?: boolean; text?: string },
): Promise<void> {
  await apiClient.patch(`/department/meetings/${meetingId}/action-items/${actionItemId}`, body)
}

/** Body of the official meeting report submitted from MeetingReportModal. */
export type MeetingReportPayload = {
  /** Free-text extra absentees (names). Absent participants are derived on the server from `attendance`. */
  absentees: string[]
  attendance: Array<{ user_id: number; attended: boolean }>
  team_commitment_score: number
  team_commitment_notes: string
  completed_tasks_summary: string
  kpi_percentage: number
  top_interactive_member: string
  challenges: string
  executive_requests: string
  next_month_goals: string
  improvement_suggestions: string
  notes: string
  decisions: Array<{ title: string; description?: string }>
  action_items: Array<{ title: string; assigned_to?: number; due_date?: string }>
}

/**
 * Files the meeting's ONE official report. Resolves with the updated meeting
 * (has_report: true, capabilities.can_upload_report: false) so the card can
 * change in place. A second attempt is refused by the server with 422.
 */
export async function submitMeetingReport(meetingId: number, payload: MeetingReportPayload): Promise<OpsMeetingDetail> {
  const res = await apiClient.post<unknown>(`/department/meetings/${meetingId}/report`, payload)
  const meeting = normalizeMeetingDetail(unwrapRow(res.data))
  if (!meeting) throw new Error('تعذر قراءة الاجتماع بعد رفع التقرير')
  return meeting
}

// ── Errors ───────────────────────────────────────────────────────────────────

export type MeetingErrorKind = 'unauthenticated' | 'forbidden' | 'not_found' | 'validation' | 'duplicate_report' | 'server' | 'network'

export type MeetingError = {
  kind: MeetingErrorKind
  title: string
  /** The server's Arabic reason when it sent one, else a generic line. */
  message: string
  /** Per-field messages from a 422 (`errors`), first message each. */
  fields: Record<string, string>
  retryable: boolean
}

export const DUPLICATE_REPORT_MESSAGE = 'تم رفع تقرير لهذا الاجتماع مسبقًا.'

const ARABIC = /[؀-ۿ]/

/** Maps any thrown value to Arabic copy, keeping the server's own Arabic reason when it gave one. */
export function describeMeetingError(error: unknown, subject = 'الاجتماعات'): MeetingError {
  if (!axios.isAxiosError(error)) {
    return { kind: 'server', title: `تعذّر تحميل ${subject}`, message: 'حدث خطأ غير متوقع. أعد المحاولة بعد قليل.', fields: {}, retryable: true }
  }
  if (!error.response) {
    return { kind: 'network', title: 'تعذّر الاتصال بالخادم', message: 'تحقق من اتصالك بالإنترنت ثم أعد المحاولة.', fields: {}, retryable: true }
  }

  const data = (isRec(error.response.data) ? error.response.data : {}) as Rec
  const serverMessage = typeof data.message === 'string' && ARABIC.test(data.message) ? data.message : null
  const fields: Record<string, string> = {}
  if (isRec(data.errors)) {
    for (const [k, v] of Object.entries(data.errors)) {
      const first = Array.isArray(v) ? v[0] : v
      if (typeof first === 'string' && first) fields[k] = first
    }
  }

  switch (error.response.status) {
    case 401:
      return { kind: 'unauthenticated', title: 'انتهت جلسة الدخول', message: 'سجّل الدخول مرة أخرى للمتابعة.', fields, retryable: false }
    case 403:
      return {
        kind: 'forbidden',
        title: 'لا تملك الصلاحية',
        message: serverMessage ?? 'هذا الإجراء غير متاح لحسابك. تواصل مع مسؤول النظام إذا كنت تحتاجه.',
        fields,
        retryable: false,
      }
    case 404:
      return { kind: 'not_found', title: 'الاجتماع غير موجود', message: 'ربما حُذف أو لم يعد متاحًا لك.', fields, retryable: false }
    case 422:
      return {
        kind: fields.meeting === DUPLICATE_REPORT_MESSAGE ? 'duplicate_report' : 'validation',
        title: 'تعذّر الحفظ',
        message: serverMessage ?? 'راجع الحقول المظلَّلة ثم أعد المحاولة.',
        fields,
        retryable: true,
      }
    default:
      return { kind: 'server', title: `تعذّر تحميل ${subject}`, message: 'المشكلة من جهتنا وليست من جهتك. أعد المحاولة بعد قليل.', fields, retryable: true }
  }
}
