import axios from 'axios'
import { formatMegabytes, tooManyFilesMessage } from '@/lib/assignmentUploadRules'

/**
 * Turns whatever a failed assignment submission threw into something a student can read and act on.
 *
 * Rule: an English server string never reaches the screen. A server message is shown only when it
 * contains Arabic letters; otherwise it is replaced by a message mapped from the status / code.
 * Pure on purpose — unit-tested without a network — and local to uploads, so `getApiErrorMessage`
 * keeps its behaviour for every other caller.
 */

export type UploadErrorKind =
  | 'aborted'
  | 'network'
  | 'too_large'
  | 'validation'
  | 'upload_failed'
  | 'auth'
  | 'forbidden'
  | 'not_found'
  | 'rate_limited'
  | 'server'
  | 'unknown'

export type UploadErrorDetail = {
  /** Set when the message is about one picked file (`files.N`). */
  fileName: string | null
  message: string
}

export type UploadErrorInfo = {
  kind: UploadErrorKind
  message: string
  details: UploadErrorDetail[]
  /** Resending the very same files can succeed (connection / server trouble). */
  retryable: boolean
  status: number | null
}

export const UPLOAD_ERROR_MESSAGES = {
  network: 'انقطع الاتصال أثناء الرفع. تحقق من الإنترنت ثم اضغط «إعادة المحاولة».',
  tooLarge: 'حجم الملفات أكبر مما يقبله الخادم. قلّل عدد الملفات أو حجمها وحاول مرة أخرى.',
  uploadFailed: 'تعذّر رفع الملف. قد يكون حجمه أكبر مما يقبله الخادم. قلّل حجم الملف أو تواصل مع الدعم.',
  validation: 'تعذّر قبول التسليم. صحّح الملاحظات التالية ثم أعد الإرسال.',
  validationFallback: 'تعذّر قبول التسليم. راجع البيانات المُدخلة وحاول مرة أخرى.',
  fileInvalid: 'الملف غير مقبول. تحقق من نوعه وحجمه.',
  fieldInvalid: 'القيمة المُدخلة غير صالحة.',
  auth: 'انتهت جلسة الدخول. سجّل الدخول مجدداً ثم أعد المحاولة.',
  forbidden: 'ليس لديك صلاحية تسليم هذا الواجب.',
  notFound: 'تعذّر العثور على الواجب. حدّث الصفحة وحاول مرة أخرى.',
  rateLimited: 'عدد المحاولات كبير. انتظر قليلاً ثم أعد المحاولة.',
  server: 'تعذّر على الخادم استلام التسليم الآن. حاول مرة أخرى بعد قليل.',
  generic: 'تعذّر إرسال التسليم. حاول مرة أخرى.',
  aborted: 'تم إيقاف الرفع. نصك وملفاتك ما زالت محفوظة، يمكنك الإرسال مرة أخرى.',
} as const

const ARABIC_LETTER = /[؀-ۿݐ-ݿࢠ-ࣿ]/
const FAILED_TO_UPLOAD = /failed to upload/i

export function hasArabicLetters(text: string): boolean {
  return ARABIC_LETTER.test(text)
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function nonEmptyString(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : null
}

/** The server's own wording, only when a student can read it. */
function arabicServerMessage(data: Record<string, unknown> | null): string | null {
  if (!data) return null
  for (const candidate of [data.message_ar, data.message]) {
    const s = nonEmptyString(candidate)
    if (s && hasArabicLetters(s)) return s
  }
  return null
}

function mentionsFailedUpload(data: Record<string, unknown> | null): boolean {
  if (!data) return false
  if (typeof data.message === 'string' && FAILED_TO_UPLOAD.test(data.message)) return true
  if (isRecord(data.errors)) {
    for (const v of Object.values(data.errors)) {
      const list = Array.isArray(v) ? v : [v]
      if (list.some((m) => typeof m === 'string' && FAILED_TO_UPLOAD.test(m))) return true
    }
  }
  return false
}

function limitsDetail(data: Record<string, unknown> | null): UploadErrorDetail | null {
  const limits = data && isRecord(data.limits) ? data.limits : null
  if (!limits) return null
  const maxFiles = Number(limits.max_files)
  const maxTotal = Number(limits.max_total_bytes)
  const parts: string[] = []
  if (Number.isFinite(maxFiles) && maxFiles > 0) parts.push(tooManyFilesMessage(maxFiles).replace(/\.$/, ''))
  if (Number.isFinite(maxTotal) && maxTotal > 0) parts.push(`المجموع الكلي ${formatMegabytes(maxTotal)} ميجابايت`)
  return parts.length ? { fileName: null, message: `${parts.join('، ')}.` } : null
}

function validationDetails(data: Record<string, unknown> | null, files: readonly { name: string }[]): UploadErrorDetail[] {
  const errors = data && isRecord(data.errors) ? data.errors : null
  if (!errors) return []
  const out: UploadErrorDetail[] = []
  const seen = new Set<string>()
  for (const [key, raw] of Object.entries(errors)) {
    const fileIndex = /^files\.(\d+)(?:\.|$)/.exec(key)
    const isFileField = fileIndex != null || key === 'files' || key === 'file'
    const fileName = fileIndex ? (files[Number(fileIndex[1])]?.name ?? null) : null
    const list = Array.isArray(raw) ? raw : [raw]
    for (const item of list) {
      const text = nonEmptyString(item)
      if (!text) continue
      const message =
        hasArabicLetters(text) ? text
        : FAILED_TO_UPLOAD.test(text) ? UPLOAD_ERROR_MESSAGES.uploadFailed
        : isFileField ? UPLOAD_ERROR_MESSAGES.fileInvalid
        : UPLOAD_ERROR_MESSAGES.fieldInvalid
      const dedupe = `${fileName ?? ''}|${message}`
      if (seen.has(dedupe)) continue
      seen.add(dedupe)
      out.push({ fileName, message })
    }
  }
  return out
}

function info(
  kind: UploadErrorKind,
  message: string,
  status: number | null,
  extra: { details?: UploadErrorDetail[]; retryable?: boolean } = {},
): UploadErrorInfo {
  return { kind, message, details: extra.details ?? [], retryable: extra.retryable ?? false, status }
}

/** `files` must be in the order they were appended to the request, so `files.N` names the right file. */
export function mapAssignmentUploadError(error: unknown, context: { files?: readonly { name: string }[] } = {}): UploadErrorInfo {
  const files = context.files ?? []

  if (axios.isCancel(error) || (axios.isAxiosError(error) && error.code === 'ERR_CANCELED')) {
    return info('aborted', UPLOAD_ERROR_MESSAGES.aborted, null)
  }

  if (!axios.isAxiosError(error)) {
    const own = error instanceof Error ? nonEmptyString(error.message) : null
    return info('unknown', own && hasArabicLetters(own) ? own : UPLOAD_ERROR_MESSAGES.generic, null)
  }

  // No response at all: offline, dropped connection, DNS, CORS-blocked proxy reply, or a timeout.
  if (!error.response) {
    return info('network', UPLOAD_ERROR_MESSAGES.network, null, { retryable: true })
  }

  const status = error.response.status
  const data = isRecord(error.response.data) ? error.response.data : null
  const serverArabic = arabicServerMessage(data)

  if (status === 413 || data?.code === 'payload_too_large') {
    // The server names the number that really stopped the upload (PHP post_max_size or the app limit),
    // so its Arabic text wins; the fixed text is for replies that never reached PHP (a bare nginx 413).
    // Limits are only listed next to the fixed text: printing 25 MB beside a server message saying 8 would contradict it.
    if (serverArabic) return info('too_large', serverArabic, status)
    const limits = limitsDetail(data)
    return info('too_large', UPLOAD_ERROR_MESSAGES.tooLarge, status, { details: limits ? [limits] : [] })
  }

  if (status === 422) {
    const details = validationDetails(data, files)
    if (details.length === 0 && mentionsFailedUpload(data)) return info('upload_failed', UPLOAD_ERROR_MESSAGES.uploadFailed, status)
    // The server's first Arabic error is also its top-level message. When a listed line already says it
    // (with the file name), the list carries it; otherwise (already submitted, attempts cap, empty submission) show it.
    const duplicatedInList = serverArabic != null && details.some((d) => d.message === serverArabic)
    if (serverArabic && !duplicatedInList) return info('validation', serverArabic, status, { details })
    if (details.length > 0) return info('validation', UPLOAD_ERROR_MESSAGES.validation, status, { details })
    return info('validation', UPLOAD_ERROR_MESSAGES.validationFallback, status)
  }

  if (mentionsFailedUpload(data)) {
    return info('upload_failed', UPLOAD_ERROR_MESSAGES.uploadFailed, status)
  }

  if (status === 401) return info('auth', serverArabic ?? UPLOAD_ERROR_MESSAGES.auth, status)
  if (status === 403) return info('forbidden', serverArabic ?? UPLOAD_ERROR_MESSAGES.forbidden, status)
  if (status === 404) return info('not_found', serverArabic ?? UPLOAD_ERROR_MESSAGES.notFound, status)
  if (status === 429) return info('rate_limited', serverArabic ?? UPLOAD_ERROR_MESSAGES.rateLimited, status, { retryable: true })
  if (status >= 500) return info('server', serverArabic ?? UPLOAD_ERROR_MESSAGES.server, status, { retryable: true })

  return info('unknown', serverArabic ?? UPLOAD_ERROR_MESSAGES.generic, status)
}
