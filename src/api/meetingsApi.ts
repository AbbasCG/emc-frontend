import axios from 'axios'
import apiClient from './axios'
import type {
  MeetingCapabilities,
  MeetingDisplayStatus,
  MeetingRef,
  MeetingReportView,
  MeetingStatus,
  MeetingType,
  OpsActionItem,
  OpsMeeting,
  OpsMeetingDetail,
} from '@/types/operations'

/**
 * Meetings API. The admin schedule (/dashboard/admin/meetings) and the lounge
 * (/dashboard/department/meeting-lounge) read the SAME rows through
 * `/department/meetings`.
 *
 * Every response is normalized here, once, into the shapes in `types/operations`.
 * A meeting the page receives always has a title, a type and a display status;
 * missing relations are `null`, never `undefined`; the capability flags are
 * the server's decision and default to "no" when absent.
 */

// ── Normalization ────────────────────────────────────────────────────────────

type Rec = Record<string, unknown>
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v : null)
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)

const TYPES: readonly MeetingType[] = ['executive', 'department', 'programs', 'partnerships', 'quality', 'external_partner', 'general']
const STATUSES: readonly MeetingStatus[] = ['scheduled', 'in_progress', 'completed', 'cancelled']
const DISPLAY: readonly MeetingDisplayStatus[] = ['scheduled', 'in_progress', 'awaiting_report', 'report_submitted', 'cancelled']
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
    can_manage: c.can_manage === true,
    can_upload_report: c.can_upload_report === true,
    can_view_report: c.can_view_report === true,
  }
}

export function normalizeMeeting(raw: unknown): OpsMeeting | null {
  if (!isRec(raw)) return null
  const id = num(raw.id)
  if (id === null) return null

  const status = pick(raw.status, STATUSES, 'scheduled')
  const hasReport = raw.has_report === true
  // An older server sent no display_status: derive the two cases it can express.
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

function agendaText(v: unknown): string | null {
  if (typeof v === 'string') return str(v)
  if (Array.isArray(v)) {
    const lines = v.map((x) => (typeof x === 'string' ? x : isRec(x) ? str(x.title) ?? str(x.text) : null)).filter((x): x is string => !!x)
    return lines.length > 0 ? lines.join('\n') : null
  }
  return null
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

  const attendees = (Array.isArray(raw.attendees) ? raw.attendees : []).flatMap((a): OpsMeetingDetail['attendees'] => {
    if (typeof a === 'string' && a.trim()) return [{ name: a }]
    if (isRec(a) && str(a.name)) return [{ name: str(a.name)!, ...(str(a.role) ? { role: str(a.role)! } : {}) }]
    return []
  })

  return {
    ...base,
    description: str(raw.description),
    meeting_url: str(raw.meeting_url),
    recording_link: str(raw.recording_url) ?? str(raw.recording_link),
    agenda: agendaText(raw.agenda),
    attendees,
    decisions,
    action_items: actionItems,
    minutes: str(raw.minutes),
    report: report(raw.report),
  }
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

export type MeetingsQuery = {
  q?: string
  type?: MeetingType
  status?: MeetingStatus
  report_status?: 'submitted' | 'pending'
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

export async function updateMeetingActionItem(
  meetingId: number,
  actionItemId: number,
  body: { done?: boolean; text?: string },
): Promise<void> {
  await apiClient.patch(`/department/meetings/${meetingId}/action-items/${actionItemId}`, body)
}

/** Body of the periodic meeting report submitted from MeetingReportModal. */
export type MeetingReportPayload = {
  absentees: string[]
  team_commitment_score: number
  team_commitment_notes: string
  completed_tasks_summary: string
  kpi_percentage: number
  top_interactive_member: string
  challenges: string
  executive_requests: string
  next_month_goals: string
  improvement_suggestions: string
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
