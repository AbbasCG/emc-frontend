import { getLaravelFieldErrors } from '@/api/apiErrors'
import type { TaskScope } from '@/types/operations'

/**
 * The «نقاط المهمة» + «المدة التقريبية» rules, in ONE place. The task form (`TaskCreateModal`) and the ticket flows
 * that turn a ticket into assigned work (approve-and-assign, reassign, bulk reassign, edit estimate) all use them,
 * so the two can never drift. The server enforces the same ranges (TaskWorkflowService::validatePointsForScope); this
 * file only lets the form say so BEFORE the request.
 */

export const TASK_SCOPE_RULES: Record<TaskScope, { label: string; min: number; max: number; open: boolean; desc: string; examples: string; option: string }> = {
  simple: {
    label: 'مهمة بسيطة',
    min: 25,
    max: 50,
    open: false,
    desc: 'إنجاز مهمة تشغيلية روتينية سريعة، لا تحتاج اعتماد الموارد البشرية.',
    examples: 'تصميم بسيط، نشر منشور، إدخال بيانات، تنسيق ملف، متابعة محدودة.',
    option: 'مهمة بسيطة (25 - 50 نقطة)',
  },
  medium: {
    label: 'مهمة متوسطة',
    min: 75,
    max: 150,
    open: false,
    desc: 'تتطلب تنسيقاً أو جهداً لعدة أيام، تحتاج اعتماد مدير الإدارة ثم الموارد البشرية.',
    examples: 'إدارة لقاء، إعداد تقرير، تنسيق مدرب، متابعة مجموعة، تصميم حملة محدودة.',
    option: 'مهمة متوسطة (75 - 150 نقطة)',
  },
  large: {
    label: 'مهمة كبيرة',
    min: 200,
    max: 300,
    open: false,
    desc: 'قيادة أو بناء عمل رئيسي واسع النطاق، تحتاج اعتماد الموارد البشرية.',
    examples: 'قيادة نشاط، إدارة حملة شاملة، إعداد برنامج، بناء نظام داخلي، حل مشكلة تشغيلية مؤثرة.',
    option: 'مهمة كبيرة (200 - 300 نقطة)',
  },
  strategic: {
    label: 'مهمة استراتيجية أو عالية الأثر',
    min: 300,
    max: 500,
    open: true,
    desc: 'مبادرة مؤسسية فارقة ذات أثر مباشر على أهداف المركز، ونقاط مفتوحة للأثر الاستثنائي.',
    examples: 'مبادرة مؤسسية، تطوير عملية محورية، مشروع كبير متعدد الأطراف، أثر استثنائي غير محدود.',
    option: 'استراتيجية أو عالية الأثر (300 - 500 أو مفتوح)',
  },
}

export const TASK_SCOPES: TaskScope[] = ['simple', 'medium', 'large', 'strategic']

export const isTaskScope = (v: unknown): v is TaskScope => typeof v === 'string' && (TASK_SCOPES as string[]).includes(v)

/**
 * What a TICKET's points and duration are: a planning estimate while the work is open. They are credited to the
 * assignee exactly once, at the FINAL approval of the completed ticket by an authorised approver (never the assignee).
 */
export const TICKET_ESTIMATE_NOTE = 'النقاط والمدة تقدير للتخطيط، ولا تُضاف إلى رصيد المكلّف إلا مرة واحدة بعد الاعتماد النهائي من معتمِد مخوّل.'

export type DurationUnit = 'hours' | 'minutes'

/** What the user has typed, as strings, so an empty field stays empty instead of becoming 0. */
export interface EstimateDraft {
  scope: TaskScope | ''
  points: string
  /** «أثر استثنائي»: open-ended points (strategic only). */
  exceptional: boolean
  duration: string
  unit: DurationUnit
}

/** Field errors keyed like the server's 422 `errors` object. */
export interface EstimateErrors {
  task_scope?: string
  task_points?: string
  estimated_hours?: string
}

export interface EstimatePayload {
  task_scope: TaskScope
  task_points: number
  /**
   * `undefined`: leave out of the request (the server KEEPS the stored hours: approve / reassign / bulk).
   * `null`: clear them (only the work-estimate PATCH honours it). A number sets them.
   */
  estimated_hours?: number | null
}

/** Server limits: points 1..1,000,000 (and inside the scope's range); hours 0.01..1000. */
export const MAX_POINTS = 1_000_000
export const MIN_HOURS = 0.01
export const MAX_HOURS = 1000

export const emptyEstimate = (): EstimateDraft => ({ scope: '', points: '', exceptional: false, duration: '', unit: 'hours' })

/** The task form's starting values: a simple task of 25 points and two hours. */
export const taskFormEstimate = (): EstimateDraft => ({ scope: 'simple', points: String(TASK_SCOPE_RULES.simple.min), exceptional: false, duration: '2', unit: 'hours' })

const trimNumber = (n: number): string => String(Math.round(n * 100) / 100)

/**
 * The draft for a record that may or may not have values. A legacy ticket (no scope, no points, no hours) opens
 * EMPTY: nothing is invented for it.
 */
export function estimateFromRecord(r: { task_scope?: string | null; task_points?: number | null; estimated_hours?: number | string | null }): EstimateDraft {
  const scope = isTaskScope(r.task_scope) ? r.task_scope : ''
  const points = r.task_points == null || !Number.isFinite(Number(r.task_points)) ? '' : String(Number(r.task_points))
  const hours = r.estimated_hours == null || r.estimated_hours === '' || !Number.isFinite(Number(r.estimated_hours)) ? '' : trimNumber(Number(r.estimated_hours))

  return {
    scope,
    points,
    exceptional: scope === 'strategic' && points !== '' && Number(points) > TASK_SCOPE_RULES.strategic.max,
    duration: hours,
    unit: 'hours',
  }
}

/** A record with no estimate at all (nothing to prefill, and the form explains why). */
export const isLegacyRecord = (r: { task_scope?: string | null; task_points?: number | null; estimated_hours?: number | string | null }): boolean =>
  !isTaskScope(r.task_scope) && r.task_points == null && (r.estimated_hours == null || r.estimated_hours === '')

/** Decimal hours from what was typed (minutes are converted exactly as the task form always did: /60, 2 decimals). */
export function durationToHours(duration: string, unit: DurationUnit): number | null {
  const raw = duration.trim()
  if (raw === '') return null
  const n = Number(raw)
  if (!Number.isFinite(n)) return Number.NaN

  return unit === 'minutes' ? Math.round((n / 60) * 100) / 100 : n
}

export function validatePointsForScope(scope: TaskScope, points: number, exceptional: boolean): string | null {
  const rule = TASK_SCOPE_RULES[scope]
  if (!Number.isFinite(points)) return 'أدخل عدد النقاط.'
  if (!Number.isInteger(points)) return 'النقاط يجب أن تكون عدداً صحيحاً'
  if (points > MAX_POINTS) return `النقاط لا تتجاوز ${MAX_POINTS.toLocaleString('en-US')} نقطة.`
  if (exceptional && scope === 'strategic') return points < rule.min ? 'النقاط الاستثنائية تبدأ من 300 نقطة فما فوق' : null
  if (points < rule.min || (!rule.open && points > rule.max)) return `النقاط لهذا الحجم يجب أن تكون بين ${rule.min} و ${rule.max} نقطة`

  return null
}

/**
 * Mirrors the server. `required`: scope and points must be present (an assignee is being chosen / the task form).
 * Not required and fully empty: valid (nothing is saved). The duration is always optional, but when given it must
 * be a positive number.
 */
export function validateEstimate(d: EstimateDraft, { required }: { required: boolean }): EstimateErrors {
  const errors: EstimateErrors = {}
  const touched = d.scope !== '' || d.points.trim() !== '' || d.duration.trim() !== ''

  if (required || touched) {
    if (d.scope === '') errors.task_scope = 'اختر حجم المهمة.'
    if (d.points.trim() === '') errors.task_points = 'نقاط المهمة مطلوبة.'
    else if (d.scope !== '') {
      const msg = validatePointsForScope(d.scope, Number(d.points), d.exceptional)
      if (msg) errors.task_points = msg
    }
  }

  const hours = durationToHours(d.duration, d.unit)
  if (hours !== null) {
    if (!Number.isFinite(hours) || hours < MIN_HOURS) errors.estimated_hours = 'المدة التقريبية يجب ألا تقل عن 0.01 ساعة (أقل من دقيقة لا تُحتسب).'
    else if (hours > MAX_HOURS) errors.estimated_hours = `المدة التقريبية لا تتجاوز ${MAX_HOURS} ساعة.`
  }

  return errors
}

export const hasEstimateErrors = (e: EstimateErrors): boolean => Boolean(e.task_scope || e.task_points || e.estimated_hours)

/**
 * The values to send. Call only after {@link validateEstimate} passed with `required: true`.
 * An empty duration is OMITTED (the stored hours are kept); `clearHours` turns an emptied field into an explicit
 * null, which only the work-estimate PATCH (a deliberate edit) uses.
 */
export function toEstimatePayload(d: EstimateDraft, { clearHours = false }: { clearHours?: boolean } = {}): EstimatePayload {
  const hours = durationToHours(d.duration, d.unit)
  const base = { task_scope: d.scope as TaskScope, task_points: Number(d.points) }
  if (hours === null || !Number.isFinite(hours)) return clearHours ? { ...base, estimated_hours: null } : base

  return { ...base, estimated_hours: hours }
}

/** The server's 422 field errors for the estimate, ready to show under the fields. */
export function mapEstimateServerErrors(err: unknown): EstimateErrors {
  const f = getLaravelFieldErrors(err)
  const out: EstimateErrors = {}
  if (f.task_scope) out.task_scope = f.task_scope
  // The task endpoints call the points field `points`; the ticket endpoints `task_points`.
  if (f.task_points ?? f.points) out.task_points = f.task_points ?? f.points
  if (f.estimated_hours) out.estimated_hours = f.estimated_hours

  return out
}

const fmt = (n: number): string => trimNumber(n)

export const hasEstimate = (r: { task_points?: number | null; estimated_hours?: number | string | null }): boolean =>
  r.task_points != null || (r.estimated_hours != null && r.estimated_hours !== '')

/**
 * The server leaves the three estimate keys OUT of a ticket payload for people who may not see them. A missing key
 * is «غير متاح لك»; only a PRESENT null means «لم تُحدَّد».
 */
export const isEstimateHidden = (r: object): boolean => !('task_scope' in r) && !('task_points' in r) && !('estimated_hours' in r)

/** «120 نقطة · 2.5 ساعة». Missing parts are left out; nothing at all is «—». */
export function formatEstimate(r: { task_points?: number | null; estimated_hours?: number | string | null }): string {
  const parts: string[] = []
  if (r.task_points != null && Number.isFinite(Number(r.task_points))) parts.push(`${fmt(Number(r.task_points))} نقطة`)
  if (r.estimated_hours != null && r.estimated_hours !== '' && Number.isFinite(Number(r.estimated_hours))) parts.push(`${fmt(Number(r.estimated_hours))} ساعة`)

  return parts.length > 0 ? parts.join(' · ') : '—'
}
