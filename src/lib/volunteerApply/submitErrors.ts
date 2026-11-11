import axios from 'axios'
import {
  FIELD_LABEL,
  serverFieldToFormField,
  type VolunteerFieldKey,
} from './formModel'
import { MESSAGES, type VolunteerFieldErrors } from './validation'

/**
 * Turns whatever came back from sending the application into one thing the form can show: which fields to mark and
 * what to say. Nothing from the server body is shown as it came, unless the server wrote it in Arabic for a person.
 * Stack traces, SQL and exception text never reach the screen.
 */

export type SubmitFailureKind =
  | 'validation'
  | 'conflict'
  | 'session'
  | 'forbidden'
  | 'too_large'
  | 'rate_limit'
  | 'server'
  | 'timeout'
  | 'offline'
  | 'network'
  | 'unknown'

export interface SubmitFailure {
  kind: SubmitFailureKind
  /** HTTP status, or null when no response came back. */
  status: number | null
  /** One sentence for the person: what happened and what to do next. */
  message: string
  /** Messages for fields the form shows, by form field name. */
  fieldErrors: VolunteerFieldErrors
  /** Server messages about something the form has no field for, already in Arabic. */
  unmapped: string[]
  /** True when trying again, with the same data, can work. */
  retryable: boolean
  /** A short code the person can quote to support. Never contains personal data. */
  reference: string
}

const HAS_ARABIC = /[\u0600-\u06FF]/

/** Fields answered by typing: a missing one is "enter", the rest are "choose". */
const TYPED_FIELDS: ReadonlySet<VolunteerFieldKey> = new Set([
  'full_name', 'email', 'phone', 'city', 'nationality', 'job_title', 'specialization', 'birth_date',
  'volunteering_organizations', 'value_add_contributions', 'portfolio_url', 'suggestions', 'notes',
])

const CV_MESSAGE = 'ملف السيرة الذاتية يجب أن يكون PDF صالحاً وبحجم لا يتجاوز 5 ميجابايت.'

function digitsIn(text: string): string | null {
  return text.match(/(\d+)/)?.[1] ?? null
}

/** An Arabic sentence for one server validation message about one field. */
export function translateServerMessage(field: VolunteerFieldKey | null, message: string): string {
  const text = message.trim()
  if (HAS_ARABIC.test(text)) return text

  const lower = text.toLowerCase()
  const label = field ? FIELD_LABEL[field] : 'هذا الحقل'

  if (field === 'agree_terms' || lower.includes('must be accepted')) return MESSAGES.agree_terms
  if (field === 'cv_file') return CV_MESSAGE
  if (lower.includes('valid email')) return MESSAGES.email_invalid
  if (field === 'phone') return lower.includes('required') ? MESSAGES.phone_required : MESSAGES.phone_invalid
  if (lower.includes('field is required') || lower.includes('is required')) {
    return field && TYPED_FIELDS.has(field) ? `يرجى إدخال ${label}.` : `يرجى تحديد ${label}.`
  }
  if (lower.includes('greater than') && lower.includes('characters')) {
    const max = digitsIn(text.slice(text.toLowerCase().indexOf('greater than')))
    return max ? `${label} أطول من الحد المسموح (${max} حرفاً).` : `${label} أطول من الحد المسموح.`
  }
  if (lower.includes('at least') && lower.includes('characters')) {
    const min = digitsIn(text.slice(text.toLowerCase().indexOf('at least')))
    return min ? `${label} أقصر من الحد المطلوب (${min} أحرف على الأقل).` : `${label} أقصر من الحد المطلوب.`
  }
  if (lower.includes('valid date') || lower.includes('not a valid date')) return `${label} غير صالح. اكتب تاريخاً صحيحاً.`
  if (lower.includes('selected') && lower.includes('invalid')) return `القيمة المختارة في «${label}» غير مقبولة. اختر قيمة أخرى.`

  return `يرجى مراجعة ${label}.`
}

function isTimeout(error: { code?: string; message?: string }): boolean {
  return error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || /timeout/i.test(error.message ?? '')
}

function retryAfterSeconds(headers: unknown): number | null {
  const raw = (headers as Record<string, unknown> | undefined)?.['retry-after']
  const seconds = typeof raw === 'string' || typeof raw === 'number' ? Number.parseInt(String(raw), 10) : Number.NaN

  return Number.isFinite(seconds) && seconds > 0 && seconds <= 3600 ? seconds : null
}

function serverArabicMessage(data: unknown): string | null {
  const message = (data as { message?: unknown } | undefined)?.message
  if (typeof message !== 'string') return null
  const text = message.trim()

  return text.length > 0 && text.length <= 240 && HAS_ARABIC.test(text) ? text : null
}

function emptyFailure(kind: SubmitFailureKind, status: number | null, message: string, retryable: boolean, reference: string): SubmitFailure {
  return { kind, status, message, fieldErrors: {}, unmapped: [], retryable, reference }
}

export function classifySubmitError(
  error: unknown,
  options: { hasAttachment?: boolean; online?: boolean } = {},
): SubmitFailure {
  const online = options.online ?? (typeof navigator === 'undefined' ? true : navigator.onLine)

  if (!axios.isAxiosError(error)) {
    return emptyFailure('unknown', null, 'تعذّر إرسال الطلب. بياناتك محفوظة؛ أعد المحاولة.', true, 'CLIENT')
  }

  const response = error.response

  if (!response) {
    if (isTimeout(error)) {
      return emptyFailure(
        'timeout',
        null,
        'استغرق الإرسال وقتاً أطول من المعتاد. بياناتك محفوظة؛ تحقق من الاتصال وأعد المحاولة.',
        true,
        'TIMEOUT',
      )
    }
    if (!online) {
      return emptyFailure('offline', null, 'لا يوجد اتصال بالإنترنت. بياناتك محفوظة؛ أعد المحاولة عند عودة الاتصال.', true, 'OFFLINE')
    }
    const hint = options.hasAttachment ? ' إن كنت ترفق سيرة ذاتية فجرّب حجماً أصغر.' : ''

    return emptyFailure('network', null, `تعذّر الوصول إلى الخادم. بياناتك محفوظة؛ تحقق من الاتصال وأعد المحاولة.${hint}`, true, 'NETWORK')
  }

  const status = response.status
  const reference = `HTTP ${status}`

  if (status === 422) {
    const failure = emptyFailure('validation', status, 'راجع الحقول المعلّمة بالأحمر ثم أعد الإرسال.', false, reference)
    const errors = (response.data as { errors?: unknown } | undefined)?.errors
    if (errors && typeof errors === 'object') {
      for (const [serverKey, value] of Object.entries(errors as Record<string, unknown>)) {
        const first = Array.isArray(value) ? value[0] : value
        if (typeof first !== 'string' || !first.trim()) continue
        const field = serverFieldToFormField(serverKey)
        const text = translateServerMessage(field, first)
        if (field) {
          if (!failure.fieldErrors[field]) failure.fieldErrors[field] = text
        } else if (!failure.unmapped.includes(text)) {
          failure.unmapped.push(text)
        }
      }
    }

    return failure
  }

  if (status === 409) {
    return emptyFailure(
      'conflict',
      status,
      serverArabicMessage(response.data) ?? 'يوجد طلب سابق مرتبط بهذه البيانات. إن أردت تعديله فتواصل مع فريق الموارد البشرية.',
      false,
      reference,
    )
  }
  if (status === 401 || status === 419) {
    return emptyFailure('session', status, 'انتهت صلاحية الجلسة. حدّث الصفحة وأعد المحاولة؛ بياناتك محفوظة على هذا الجهاز.', false, reference)
  }
  if (status === 403) {
    return emptyFailure('forbidden', status, 'لا تملك صلاحية تنفيذ هذا الإجراء. إن كان ذلك غير متوقع فتواصل معنا.', false, reference)
  }
  if (status === 413) {
    return emptyFailure('too_large', status, 'حجم الملف المرفق أكبر من المسموح. اختر سيرة ذاتية بصيغة PDF لا يتجاوز حجمها 5 ميجابايت.', false, reference)
  }
  if (status === 429) {
    const wait = retryAfterSeconds(response.headers)
    const when = wait ? `انتظر ${wait} ثانية` : 'انتظر دقيقة'

    return emptyFailure('rate_limit', status, `عدد محاولات الإرسال كبير. ${when} ثم أعد المحاولة؛ بياناتك محفوظة.`, true, reference)
  }
  if (status >= 500) {
    return emptyFailure('server', status, 'حدث خلل مؤقت في الخادم ولم يُحفظ الطلب. بياناتك ما زالت هنا؛ أعد المحاولة بعد قليل.', true, reference)
  }

  return emptyFailure('unknown', status, 'تعذّر قبول الطلب. راجع بياناتك وأعد المحاولة.', true, reference)
}

/** For the developer console while developing. Production never logs request or response bodies (they hold personal data). */
export function logSubmitFailure(failure: SubmitFailure, error: unknown): void {
  if (!import.meta.env.DEV) return
  const data = axios.isAxiosError(error) ? error.response?.data : undefined
  console.error('[volunteer-apply] submit failed', failure.kind, failure.reference, data)
}
