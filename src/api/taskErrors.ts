import axios from 'axios'

const HAS_ARABIC = /[\u0600-\u06FF]/

/** A failed task call, with a message that is already Arabic and specific (the status is kept for callers that care). */
export class TaskApiError extends Error {
  readonly status: number | null

  constructor(message: string, status: number | null) {
    super(message)
    this.name = 'TaskApiError'
    this.status = status
  }
}

/**
 * The Arabic message for a failed task call. The server's own message wins when it is Arabic (it knows the exact
 * reason: «locked», «accept it first»...). Otherwise 403 / 404 / 409 / 423 are mapped here (never the framework's
 * English «Forbidden» / «Not Found»), a validation error shows its first Arabic field message (never the English
 * top-level «Validation failed.»), and anything else is the caller's fallback. `on409` is the call-specific wording
 * for a conflict.
 */
export function taskApiMessage(err: unknown, fallback: string, on409?: string): string {
  if (err instanceof TaskApiError) return err.message
  if (!axios.isAxiosError(err)) return fallback
  if (!err.response) return 'تعذّر الاتصال بالخادم. تحقق من الاتصال ثم حاول مجددًا.'
  const status = err.response.status
  const data = err.response.data as { message?: unknown; errors?: Record<string, unknown> } | undefined
  if (status === 422 && data?.errors) {
    const first = Object.values(data.errors).flatMap((v) => (Array.isArray(v) ? v : [v])).find((v) => typeof v === 'string' && HAS_ARABIC.test(v))
    if (typeof first === 'string') return first
  }
  const serverText = typeof data?.message === 'string' && HAS_ARABIC.test(data.message) ? data.message : null
  if (serverText) return serverText
  if (status === 403) return 'ليست لديك صلاحية لهذا الإجراء على هذه المهمة.'
  if (status === 404) return 'هذه المهمة غير موجودة أو لم تعد مسندة إليك.'
  if (status === 409) return on409 ?? 'تغيّرت حالة المهمة في الأثناء. حدّث الصفحة ثم حاول مجددًا.'
  if (status === 423) return 'هذه المهمة مقفلة ولا يمكن تحريكها.'

  return fallback
}
