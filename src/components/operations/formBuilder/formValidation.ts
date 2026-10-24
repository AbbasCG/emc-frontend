import type { FormQuestion } from '@/types/operations'
import { isMultiChoice, isStructural } from './questionTypes'

/**
 * What the public form checks before sending, and what it starts with. Every rule here repeats a rule the server enforces
 * (FormSubmissionService); the browser check is only there to save a round trip, the server is the one that decides.
 */

export type AnswerValue = string | string[] | File | undefined

/** Mirrors the server's attachment rule so a wrong file is caught before it is uploaded. */
export const ACCEPT_FILE = '.pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt'
export const ACCEPT_IMAGE = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp'
export const MAX_FILE_BYTES = 5 * 1024 * 1024
export const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']

export const CHECKBOX_FALLBACK = ['نعم', 'لا']

export const starCount = (q: FormQuestion): number => q.config?.scale?.max ?? 5
export const scaleBounds = (q: FormQuestion): [number, number] => [q.config?.scale?.min ?? 1, q.config?.scale?.max ?? 5]

export const optionsOf = (q: FormQuestion): string[] => (q.options && q.options.length > 0 ? q.options : q.type === 'checkbox' ? CHECKBOX_FALLBACK : [])

export const isEmptyAnswer = (v: AnswerValue): boolean => v === undefined || v === '' || (Array.isArray(v) && v.length === 0)

/** The answers a form starts with: the default each question was given in the builder. */
export function initialValues(questions: FormQuestion[]): Record<number, AnswerValue> {
  const values: Record<number, AnswerValue> = {}
  for (const q of questions) {
    const d = q.config?.default_value
    if (d === undefined || d === null || d === '' || isStructural(q.type)) continue
    if (isMultiChoice(q.type)) values[q.id] = Array.isArray(d) ? d.map(String) : [String(d)]
    else values[q.id] = Array.isArray(d) ? d.join(', ') : String(d)
  }

  return values
}

/** The form's pages: split at every page break. Empty pages are dropped; a form without breaks is one page. */
export function splitPages(questions: FormQuestion[]): FormQuestion[][] {
  const pages: FormQuestion[][] = [[]]
  for (const q of questions) {
    if (q.type === 'page_break') pages.push([])
    else pages[pages.length - 1].push(q)
  }
  const kept = pages.filter((p) => p.length > 0)

  return kept.length > 0 ? kept : [[]]
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE = /^\+?[0-9\s().-]{6,30}$/
const URL_RE = /^https?:\/\/[^\s/$.?#][^\s]*$/i
const DATE = /^\d{4}-\d{2}-\d{2}$/
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

/** The message for one answer, or null when it is acceptable. */
export function validateAnswer(q: FormQuestion, v: AnswerValue): string | null {
  if (isStructural(q.type)) return null

  if (isEmptyAnswer(v)) {
    if (!q.required) return null

    return q.type === 'consent' ? 'يجب الموافقة للمتابعة.' : 'هذا الحقل مطلوب.'
  }

  const cfg = q.config?.validation ?? {}

  if (v instanceof File) {
    if (q.type !== 'file' && q.type !== 'image') return 'الإجابة غير صالحة.'
    if (v.size > MAX_FILE_BYTES) return 'حجم الملف يتجاوز 5 ميغابايت.'
    if (q.type === 'image' && !IMAGE_EXTENSIONS.includes(v.name.split('.').pop()?.toLowerCase() ?? '')) return 'المسموح صور بصيغة JPG أو PNG أو WebP فقط.'

    return null
  }

  if (Array.isArray(v)) {
    if (!isMultiChoice(q.type)) return 'الإجابة غير صالحة.'
    const allowed = optionsOf(q)
    if (v.some((x) => !allowed.includes(x))) return 'اختر من الخيارات المتاحة فقط.'
    const max = Math.min(allowed.length || v.length, cfg.max_choices ?? Infinity)
    if (v.length > max) return `اختر ${max} خيارات كحد أقصى.`
    if (cfg.min_choices && v.length < cfg.min_choices) return `اختر ${cfg.min_choices} من الخيارات على الأقل.`

    return null
  }

  const text = typeof v === 'string' ? v : ''
  switch (q.type) {
    case 'text':
    case 'textarea':
      if (cfg.min_length && text.length < cfg.min_length) return `الإجابة أقصر من المسموح (الحد الأدنى ${cfg.min_length} حرفاً).`
      if (cfg.max_length && text.length > cfg.max_length) return `الإجابة أطول من المسموح (الحد الأقصى ${cfg.max_length} حرفاً).`

      return null
    case 'email':
      return EMAIL.test(text) ? null : 'أدخل بريداً إلكترونياً صالحاً.'
    case 'phone':
      return PHONE.test(text) ? null : 'أدخل رقم هاتف صالحاً.'
    case 'url':
      return URL_RE.test(text) ? null : 'أدخل رابطاً صالحاً يبدأ بـ http:// أو https://.'
    case 'number': {
      const n = Number(text)
      if (text.trim() === '' || Number.isNaN(n)) return 'أدخل رقماً صالحاً.'
      if (cfg.integer_only && !Number.isInteger(n)) return 'أدخل رقماً صحيحاً (بلا كسور).'
      if ((cfg.min !== undefined && n < cfg.min) || (cfg.max !== undefined && n > cfg.max)) {
        return `الرقم يجب أن يكون بين ${cfg.min ?? 'أي رقم'} و${cfg.max ?? 'أي رقم'}.`
      }

      return null
    }
    case 'date':
      if (!DATE.test(text)) return 'أدخل تاريخاً صالحاً.'
      if (cfg.min_date && text < cfg.min_date) return `التاريخ يجب ألا يسبق ${cfg.min_date}.`
      if (cfg.max_date && text > cfg.max_date) return `التاريخ يجب ألا يتجاوز ${cfg.max_date}.`

      return null
    case 'time':
      return TIME.test(text) ? null : 'أدخل وقتاً صالحاً بصيغة HH:MM.'
    case 'select':
    case 'radio':
      return optionsOf(q).includes(text) ? null : 'اختر قيمة من الخيارات المتاحة.'
    case 'yes_no':
      return text === 'yes' || text === 'no' ? null : 'اختر نعم أو لا.'
    case 'consent':
      return text === 'yes' ? null : 'الموافقة غير صالحة.'
    case 'star_rating': {
      const n = Number(text)

      return Number.isInteger(n) && n >= 1 && n <= starCount(q) ? null : `اختر تقييماً من 1 إلى ${starCount(q)}.`
    }
    case 'linear_scale': {
      const [lo, hi] = scaleBounds(q)
      const n = Number(text)

      return Number.isInteger(n) && n >= lo && n <= hi ? null : `اختر رقماً من ${lo} إلى ${hi}.`
    }
    default:
      return null
  }
}

/** Errors for the questions on one page (or all of them), keyed by question id. */
export function validateAll(questions: FormQuestion[], values: Record<number, AnswerValue>): Record<number, string> {
  const errors: Record<number, string> = {}
  for (const q of questions) {
    const message = validateAnswer(q, values[q.id])
    if (message) errors[q.id] = message
  }

  return errors
}
