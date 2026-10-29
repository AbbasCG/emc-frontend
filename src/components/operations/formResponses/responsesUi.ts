import type { FormAnswerRow, FormQuestion } from '@/types/operations'
import type { AnswerValue } from '@/components/operations/formBuilder/formValidation'
import type { ExportFormat, ExportStatus, ResponseStatus } from '@/api/formsResponsesApi'

/** Words and colours the response screens share. */

export const STATUS_AR: Record<ResponseStatus, string> = {
  new: 'جديد',
  in_review: 'قيد المراجعة',
  needs_followup: 'يحتاج متابعة',
  completed: 'مكتمل',
  archived: 'مؤرشف',
}

export const STATUS_TONE: Record<ResponseStatus, string> = {
  new: 'bg-sky-50 text-sky-800 ring-sky-200',
  in_review: 'bg-amber-50 text-amber-800 ring-amber-200',
  needs_followup: 'bg-orange-50 text-orange-800 ring-orange-200',
  completed: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  archived: 'bg-slate-100 text-slate-600 ring-slate-200',
}

export const FORMAT_AR: Record<ExportFormat, string> = { xlsx: 'Excel (XLSX)', csv: 'CSV', pdf: 'PDF' }

export const FORMAT_HINT: Record<ExportFormat, string> = {
  xlsx: 'جدول بيانات للتحليل. مناسب حتى بضعة آلاف من الخلايا.',
  csv: 'ملف نصي خفيف. الأنسب للأعداد الكبيرة جداً.',
  pdf: 'نسخة للطباعة والمشاركة. حتى ٥٠٠ رد و١٢ عموداً.',
}

export const EXPORT_STATUS_AR: Record<ExportStatus, string> = {
  queued: 'في الانتظار',
  processing: 'جارٍ إنشاء الملف',
  ready: 'الملف جاهز',
  failed: 'تعذّر إنشاء الملف',
  expired: 'انتهت صلاحية الملف',
}

/** An answer as plain text for the table and the detail view: words for yes / no, the file's name for an attachment. */
export function answerText(a: FormAnswerRow): string {
  if (a.has_file) return a.file_name ?? 'مرفق'
  if (a.display_value) return a.display_value
  if (Array.isArray(a.value)) return a.value.join('، ')
  return a.value ?? ''
}

/** The question an answer was given to, as its published version froze it, in the shape the shared field component draws. */
export function questionOf(a: FormAnswerRow, order: number): FormQuestion {
  return {
    id: a.question_id,
    label: a.question_label ?? `سؤال ${a.question_id}`,
    type: a.question_type ?? 'text',
    required: Boolean(a.question_required),
    options: a.question_options ?? undefined,
    config: a.question_config ?? null,
    sort_order: order,
  }
}

/** The value a correction starts from. */
export function startValue(a: FormAnswerRow): AnswerValue {
  if (Array.isArray(a.value)) return a.value
  return a.value ?? ''
}

export const sameValue = (a: AnswerValue, b: AnswerValue): boolean => {
  if (Array.isArray(a) || Array.isArray(b)) {
    const x = Array.isArray(a) ? a : a ? [String(a)] : []
    const y = Array.isArray(b) ? b : b ? [String(b)] : []
    return x.length === y.length && x.every((v, i) => v === y[i])
  }
  return String(a ?? '') === String(b ?? '')
}

export function formatBytes(bytes: number | null): string {
  if (bytes === null) return ''
  if (bytes < 1024) return `${bytes} بايت`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} ك.ب`
  return `${(bytes / 1024 / 1024).toFixed(1)} م.ب`
}

/** Question types a correction cannot edit as text. */
export const NOT_CORRECTABLE = new Set(['file', 'image'])
