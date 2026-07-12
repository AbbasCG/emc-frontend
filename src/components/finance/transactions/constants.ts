import type { FinancialTransactionStatus, FinancialTransactionType } from '@/types/intelligence'

export const PAGE_SIZE = 20

export const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'الكل' },
  { value: 'confirmed', label: 'مكتملة' },
  { value: 'pending', label: 'معلقة' },
  { value: 'failed', label: 'فاشلة' },
  { value: 'refunded', label: 'مستردة' },
] as const

export const TYPE_FILTER_OPTIONS = [
  { value: 'all', label: 'الكل' },
  { value: 'revenue', label: 'إيراد / دفع' },
  { value: 'refund', label: 'استرداد' },
  { value: 'expense', label: 'مصروف' },
  { value: 'adjustment', label: 'تعديل يدوي' },
] as const

export const TREND_RANGE_OPTIONS = [
  { value: '7d', label: '7 أيام', days: 7 },
  { value: '30d', label: '30 يوم', days: 30 },
  { value: '90d', label: '3 أشهر', days: 90 },
  { value: '365d', label: 'السنة', days: 365 },
] as const

export type TrendRangeKey = (typeof TREND_RANGE_OPTIONS)[number]['value']

export const STATUS_AR: Record<string, { label: string; cls: string; dot: string }> = {
  confirmed: { label: 'مكتملة', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
  pending: { label: 'معلقة', cls: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500' },
  failed: { label: 'فاشلة', cls: 'bg-rose-50 text-rose-700 ring-rose-200', dot: 'bg-rose-500' },
  refunded: { label: 'مستردة', cls: 'bg-violet-50 text-violet-700 ring-violet-200', dot: 'bg-violet-500' },
  cancelled: { label: 'ملغاة', cls: 'bg-slate-100 text-slate-600 ring-slate-200', dot: 'bg-slate-400' },
}

export const TYPE_AR: Record<FinancialTransactionType, string> = {
  revenue: 'إيراد',
  refund: 'استرداد',
  expense: 'مصروف',
  adjustment: 'تعديل يدوي',
}

export function typeLabelAr(type: FinancialTransactionType): string {
  return TYPE_AR[type] ?? type
}

export function isRefundedTransaction(t: { type: string; status: string }): boolean {
  return t.type === 'refund' || t.status === 'refunded'
}

export function mapStatusForFilter(
  status: FinancialTransactionStatus,
  type: FinancialTransactionType,
): string {
  if (type === 'refund') return 'refunded'
  return status
}

export function defaultDateRange(): { from: string; to: string } {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return { from: `${y}-01-01`, to: `${y}-${m}-${d}` }
}
