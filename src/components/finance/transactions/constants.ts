import type { FinancialTransactionStatus, FinancialTransactionType } from '@/types/intelligence'
import { mapTransactionStatusKey } from '@/utils/transactionStatusLabels'

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
  return mapTransactionStatusKey(status, type)
}

export function defaultDateRange(): { from: string; to: string } {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return { from: `${y}-01-01`, to: `${y}-${m}-${d}` }
}
