import type { ManualPaymentPurchasableType, ManualPaymentStatus } from '@/types/intelligence'

export const PAGE_SIZE = 20

export const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'الكل' },
  { value: 'pending_review', label: 'بانتظار المراجعة' },
  { value: 'confirmed', label: 'معتمدة' },
  { value: 'rejected', label: 'مرفوضة' },
  { value: 'cancelled', label: 'ملغاة' },
  { value: 'refunded', label: 'مستردة' },
] as const

export const PAYMENT_METHOD_OPTIONS = [
  { value: 'all', label: 'الكل' },
  { value: 'bank_transfer', label: 'تحويل بنكي' },
  { value: 'cash', label: 'نقدي' },
  { value: 'wise', label: 'Wise' },
  { value: 'other', label: 'أخرى' },
] as const

export const ENTITY_FILTER_OPTIONS = [
  { value: 'all', label: 'الكل' },
  { value: 'course', label: 'دورة' },
  { value: 'workshop', label: 'ورشة' },
  { value: 'learning_path', label: 'مسار تعليمي' },
] as const

export const STATUS_AR: Record<ManualPaymentStatus, { label: string; cls: string; dot: string }> = {
  pending_review: { label: 'بانتظار المراجعة', cls: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500' },
  confirmed: { label: 'معتمدة', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
  rejected: { label: 'مرفوضة', cls: 'bg-rose-50 text-rose-700 ring-rose-200', dot: 'bg-rose-500' },
  cancelled: { label: 'ملغاة', cls: 'bg-slate-100 text-slate-600 ring-slate-200', dot: 'bg-slate-400' },
  refunded: { label: 'مستردة', cls: 'bg-violet-50 text-violet-700 ring-violet-200', dot: 'bg-violet-500' },
}

export const ENTITY_AR: Record<ManualPaymentPurchasableType, string> = {
  course: 'دورة',
  workshop: 'ورشة',
  learning_path: 'مسار تعليمي',
}

export const PAYMENT_METHOD_AR: Record<string, string> = {
  bank_transfer: 'تحويل بنكي',
  cash: 'نقدي',
  wise: 'Wise',
  other: 'أخرى',
}

export const PURCHASABLE_MODEL: Record<ManualPaymentPurchasableType, string> = {
  course: 'App\\Models\\Course',
  workshop: 'App\\Models\\Workshop',
  learning_path: 'App\\Models\\LearningPath',
}

export const PROOF_MAX_BYTES = 5 * 1024 * 1024
export const PROOF_ACCEPT = '.pdf,.png,.jpg,.jpeg'

export function defaultDateRange(): { from: string; to: string } {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return { from: `${y}-01-01`, to: `${y}-${m}-${d}` }
}

export function paymentReference(p: { id: number; external_reference?: string | null; internal_reference?: string | null; reference?: string | null }): string {
  return p.external_reference?.trim() || p.internal_reference?.trim() || p.reference?.trim() || `MP-${String(p.id).padStart(5, '0')}`
}
