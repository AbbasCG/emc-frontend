/**
 * Assignment upload rules — the ONE place the frontend knows the limits.
 *
 * The server is the authority: it publishes the rules at
 * `GET /student/assignment-upload-rules` and enforces them on submit. This module
 * (a) parses that payload, (b) ships an identical built-in fallback that is used when
 * the call fails, and (c) mirrors the rules on the client so a student gets an instant,
 * file-specific Arabic reason instead of waiting for a rejected upload.
 */

/** `image` · `document` · `text` · `spreadsheet` · `archive` · `presentation` (the server may add more). */
export type UploadGroupKey = string

export type UploadGroup = {
  key: UploadGroupKey
  label_ar: string
  /** Lower-case extensions without the dot. */
  extensions: string[]
  max_bytes: number
}

export type AssignmentUploadRules = {
  max_files: number
  max_total_bytes: number
  groups: UploadGroup[]
  /** Value for `<input accept>`. */
  accept: string
}

const MB = 1024 * 1024

export const FALLBACK_UPLOAD_GROUPS: UploadGroup[] = [
  { key: 'image', label_ar: 'الصور', extensions: ['jpg', 'jpeg', 'png', 'webp'], max_bytes: 5 * MB },
  { key: 'document', label_ar: 'المستندات', extensions: ['pdf', 'doc', 'docx'], max_bytes: 10 * MB },
  { key: 'text', label_ar: 'الملفات النصية', extensions: ['txt'], max_bytes: 2 * MB },
  { key: 'spreadsheet', label_ar: 'جداول البيانات', extensions: ['xls', 'xlsx', 'csv'], max_bytes: 10 * MB },
  { key: 'archive', label_ar: 'الملفات المضغوطة', extensions: ['zip', 'rar', '7z'], max_bytes: 10 * MB },
  { key: 'presentation', label_ar: 'العروض التقديمية', extensions: ['ppt', 'pptx'], max_bytes: 10 * MB },
]

export function buildAcceptAttribute(groups: UploadGroup[]): string {
  return groups.flatMap((g) => g.extensions.map((e) => `.${e}`)).join(',')
}

/** Used until (or instead of) the server's answer. Keep in lockstep with the backend rules. */
export const FALLBACK_UPLOAD_RULES: AssignmentUploadRules = {
  max_files: 5,
  max_total_bytes: 25 * MB,
  groups: FALLBACK_UPLOAD_GROUPS,
  accept: buildAcceptAttribute(FALLBACK_UPLOAD_GROUPS),
}

function positiveNumber(v: unknown): number | null {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : null
}

/**
 * Parses the `GET /student/assignment-upload-rules` body (with or without the `data` envelope).
 * Returns null for anything unusable so the caller falls back to the built-in rules.
 */
export function parseAssignmentUploadRules(raw: unknown): AssignmentUploadRules | null {
  if (!raw || typeof raw !== 'object') return null
  const top = raw as Record<string, unknown>
  const body = top.data && typeof top.data === 'object' && !Array.isArray(top.data) ? (top.data as Record<string, unknown>) : top

  const maxFiles = positiveNumber(body.max_files)
  const maxTotal = positiveNumber(body.max_total_bytes)
  if (maxFiles == null || maxTotal == null || !Array.isArray(body.groups)) return null

  const groups: UploadGroup[] = []
  for (const g of body.groups) {
    if (!g || typeof g !== 'object') return null
    const o = g as Record<string, unknown>
    const key = typeof o.key === 'string' ? o.key.trim() : ''
    const maxBytes = positiveNumber(o.max_bytes)
    const exts =
      Array.isArray(o.extensions) ?
        o.extensions
          .filter((e): e is string => typeof e === 'string')
          .map((e) => e.trim().replace(/^\./, '').toLowerCase())
          .filter(Boolean)
      : []
    if (!key || maxBytes == null || exts.length === 0) return null
    const fallbackLabel = FALLBACK_UPLOAD_GROUPS.find((f) => f.key === key)?.label_ar
    const label = typeof o.label_ar === 'string' && o.label_ar.trim() ? o.label_ar.trim() : (fallbackLabel ?? key)
    groups.push({ key, label_ar: label, extensions: exts, max_bytes: maxBytes })
  }
  if (groups.length === 0) return null

  const accept = typeof body.accept === 'string' && body.accept.trim() ? body.accept.trim() : buildAcceptAttribute(groups)
  return { max_files: Math.floor(maxFiles), max_total_bytes: maxTotal, groups, accept }
}

// ── formatting ───────────────────────────────────────────────────────────────

/** `10` / `2.5` — megabytes without trailing zeros, for the limit messages. */
export function formatMegabytes(bytes: number): string {
  const n = bytes / MB
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10)
}

/** Human size for a picked file: «350 كيلوبايت» / «1.4 ميجابايت». */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return ''
  if (bytes < 1024) return `${bytes} بايت`
  if (bytes < MB) return `${Math.max(1, Math.round(bytes / 1024))} كيلوبايت`
  return `${formatMegabytes(bytes)} ميجابايت`
}

// ── validation ───────────────────────────────────────────────────────────────

export function fileExtension(name: string): string {
  const i = name.lastIndexOf('.')
  if (i < 0 || i === name.length - 1) return ''
  return name.slice(i + 1).trim().toLowerCase()
}

export function findUploadGroup(name: string, rules: AssignmentUploadRules): UploadGroup | null {
  const ext = fileExtension(name)
  if (!ext) return null
  return rules.groups.find((g) => g.extensions.includes(ext)) ?? null
}

export const UNSUPPORTED_TYPE_MESSAGE = 'نوع الملف غير مدعوم. يمكنك رفع الصور وPDF وWord وExcel والملفات المضغوطة.'
export const DUPLICATE_FILE_MESSAGE = 'هذا الملف مضاف مسبقاً.'

export function tooLargeMessage(group: UploadGroup): string {
  return `حجم الملف أكبر من المسموح. الحد الأقصى ${formatMegabytes(group.max_bytes)} ميجابايت.`
}

function filesCountPhrase(n: number): string {
  if (n === 1) return 'ملف واحد'
  if (n === 2) return 'ملفين'
  if (n >= 3 && n <= 10) return `${n} ملفات`
  return `${n} ملفاً`
}

export function tooManyFilesMessage(max: number): string {
  return `الحد الأقصى ${filesCountPhrase(max)} لكل تسليم.`
}

export function totalTooLargeMessage(maxTotalBytes: number): string {
  return `المجموع الكلي للمرفقات أكبر من ${formatMegabytes(maxTotalBytes)} ميجابايت.`
}

export type PickedFile = {
  /** Stable key for React lists and removal. */
  id: string
  file: File
  groupKey: UploadGroupKey
  groupLabel: string
}

export type RejectionReason = 'type' | 'size' | 'duplicate' | 'count' | 'total'

export type FileRejection = {
  name: string
  reason: RejectionReason
  message: string
}

export type AddFilesResult = {
  accepted: PickedFile[]
  rejected: FileRejection[]
}

function duplicateKey(f: File): string {
  return `${f.name}|${f.size}|${f.lastModified}`
}

let pickedSeq = 0

/**
 * Mirrors the server rules for files the student just picked. Candidates are judged in the order
 * given; a rejected file is skipped and never blocks the next ones.
 */
export function addFilesToSelection(
  current: readonly PickedFile[],
  incoming: readonly File[],
  rules: AssignmentUploadRules,
): AddFilesResult {
  const accepted: PickedFile[] = []
  const rejected: FileRejection[] = []
  const seen = new Set(current.map((p) => duplicateKey(p.file)))
  let count = current.length
  let total = current.reduce((sum, p) => sum + p.file.size, 0)

  for (const file of incoming) {
    const group = findUploadGroup(file.name, rules)
    if (!group) {
      rejected.push({ name: file.name, reason: 'type', message: UNSUPPORTED_TYPE_MESSAGE })
      continue
    }
    if (file.size > group.max_bytes) {
      rejected.push({ name: file.name, reason: 'size', message: tooLargeMessage(group) })
      continue
    }
    if (seen.has(duplicateKey(file))) {
      rejected.push({ name: file.name, reason: 'duplicate', message: DUPLICATE_FILE_MESSAGE })
      continue
    }
    if (count + 1 > rules.max_files) {
      rejected.push({ name: file.name, reason: 'count', message: tooManyFilesMessage(rules.max_files) })
      continue
    }
    if (total + file.size > rules.max_total_bytes) {
      rejected.push({ name: file.name, reason: 'total', message: totalTooLargeMessage(rules.max_total_bytes) })
      continue
    }
    pickedSeq += 1
    accepted.push({ id: `picked-${pickedSeq}`, file, groupKey: group.key, groupLabel: group.label_ar })
    seen.add(duplicateKey(file))
    count += 1
    total += file.size
  }

  return { accepted, rejected }
}

export function totalSelectionBytes(files: readonly PickedFile[]): number {
  return files.reduce((sum, p) => sum + p.file.size, 0)
}
