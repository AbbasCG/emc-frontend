import axios from 'axios'

export type LoadErrorKind = 'forbidden' | 'network' | 'server' | 'other'

export interface DescribedLoadError {
  kind: LoadErrorKind
  /** Arabic text for the inline state. Never the server's (possibly English) message. */
  message_ar: string
  /** A retry can only help when the cause may be transient; a missing permission does not fix itself. */
  retryable: boolean
}

export const FORBIDDEN_MESSAGE_AR = 'لا تملك صلاحية عرض هذه البيانات. اطلب من مسؤول الوصول منحك الصلاحية المناسبة.'
export const NETWORK_MESSAGE_AR = 'تعذر الاتصال بالخادم. تحقّق من اتصالك بالإنترنت ثم أعد المحاولة.'
export const SERVER_MESSAGE_AR = 'حدث خطأ في الخادم أثناء التحميل. أعد المحاولة بعد قليل.'
export const OTHER_MESSAGE_AR = 'تعذر تحميل البيانات. أعد المحاولة.'

/**
 * Classify a failed read so a page can show the right inline state instead of an empty list.
 * `forbiddenMessage` names the exact permission the page needs (shown instead of the generic text).
 */
export function describeLoadError(error: unknown, options: { forbiddenMessage?: string } = {}): DescribedLoadError {
  const status = axios.isAxiosError(error) ? error.response?.status : undefined
  const hasResponse = axios.isAxiosError(error) && Boolean(error.response)

  if (status === 403) {
    return { kind: 'forbidden', message_ar: options.forbiddenMessage ?? FORBIDDEN_MESSAGE_AR, retryable: false }
  }
  if (axios.isAxiosError(error) && !hasResponse) {
    return { kind: 'network', message_ar: NETWORK_MESSAGE_AR, retryable: true }
  }
  if (typeof status === 'number' && status >= 500) {
    return { kind: 'server', message_ar: SERVER_MESSAGE_AR, retryable: true }
  }
  return { kind: 'other', message_ar: OTHER_MESSAGE_AR, retryable: true }
}
