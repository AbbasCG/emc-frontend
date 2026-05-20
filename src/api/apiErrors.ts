import axios from 'axios'

/** Laravel-style `errors` object: `{ field: ["msg"] }` → first message per field */
export function getLaravelFieldErrors(error: unknown): Record<string, string> {
  if (!axios.isAxiosError(error)) return {}
  const data = error.response?.data as { errors?: Record<string, string[] | string> } | undefined
  const errors = data?.errors
  if (!errors || typeof errors !== 'object') return {}
  const out: Record<string, string> = {}
  for (const [key, val] of Object.entries(errors)) {
    if (Array.isArray(val) && val[0]) out[key] = String(val[0])
    else if (typeof val === 'string' && val) out[key] = val
  }

  // Copy dotted errors (e.g. learning_outcomes.0) onto the base key for form display
  for (const [key, msg] of Object.entries(out)) {
    const base = key.split('.')[0]
    if (base && out[base] === undefined) out[base] = msg
  }
  return out
}

/** UI copy for common English / default Laravel validation messages */
export function translateLaravelFieldMessage(msg: string): string {
  const t = msg.trim()
  const lower = t.toLowerCase()
  if (!t) return t
  if (lower.includes('must be a string')) return 'نوع البيانات غير صحيح.'
  if (lower.includes('must be an array')) return 'نوع البيانات غير صحيح.'
  if (lower.includes('must be an image')) return 'الصورة غير صالحة.'
  if (lower.includes('image could not')) return 'الصورة غير صالحة.'
  if (lower.includes('field is required') || lower === 'the given data was invalid.') return 'الحقل مطلوب.'
  if (lower.includes('validation') && lower.includes('selected')) return 'القيمة المحدّدة غير صالحة.'
  if (lower.includes('status') && lower.includes('invalid')) return 'حالة النشر غير صحيحة.'
  return t
}

export function withArabicValidationMessages(errors: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(errors)) {
    out[k] = translateLaravelFieldMessage(v)
  }
  return out
}

const STATUS_MESSAGES: Record<number, string> = {
  400: 'تعذّر تنفيذ الطلب. يرجى التحقق من البيانات.',
  401: 'يجب تسجيل الدخول أولًا.',
  403: 'لا تملك صلاحية الوصول.',
  404: 'لم يتم العثور على البيانات.',
  422: 'يرجى مراجعة الحقول المطلوبة.',
  429: 'تم إرسال عدد كبير من الطلبات. حاول بعد قليل.',
  500: 'حدث خطأ غير متوقع في الخادم.',
  502: 'الخادم غير متاح مؤقتًا.',
  503: 'الخدمة غير متاحة حاليًا.',
}

const FALLBACK = 'حدث خطأ غير متوقع. حاول مرة أخرى.'

function firstValidationMessage(errors: unknown): string | null {
  if (!errors || typeof errors !== 'object') return null
  const record = errors as Record<string, string[] | string>
  for (const val of Object.values(record)) {
    if (Array.isArray(val) && val[0]) return String(val[0])
    if (typeof val === 'string' && val) return val
  }
  return null
}

/** Parses Laravel / common JSON error bodies into a single Arabic-oriented message. */
export function getApiErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    if (error instanceof Error && error.message) return error.message
    return FALLBACK
  }

  const status = error.response?.status
  const data = error.response?.data as Record<string, unknown> | undefined

  if (data && typeof data.message === 'string' && data.message.trim()) {
    return data.message
  }

  if (status === 422 && data?.errors) {
    const first = firstValidationMessage(data.errors)
    if (first) return translateLaravelFieldMessage(String(first))
    return STATUS_MESSAGES[422] ?? FALLBACK
  }

  if (status && STATUS_MESSAGES[status]) {
    return STATUS_MESSAGES[status]
  }

  return FALLBACK
}
