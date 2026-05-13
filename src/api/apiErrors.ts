import axios from 'axios'

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
    if (first) return first
    return STATUS_MESSAGES[422] ?? FALLBACK
  }

  if (status && STATUS_MESSAGES[status]) {
    return STATUS_MESSAGES[status]
  }

  return FALLBACK
}
