import type { FinancialTransaction } from '@/types/intelligence'
import { downloadCsv, formatFinanceCurrency } from '@/components/finance/financeTablesShared'
import { mapStatusForFilter, typeLabelAr } from './constants'

export function exportTransactionsCsv(rows: FinancialTransaction[], filename: string) {
  const headers = [
    'رقم المعاملة',
    'النوع',
    'البيان',
    'المبلغ',
    'العملة',
    'الحالة',
    'المستخدم',
    'البريد',
    'تاريخ التنفيذ',
    'مرجع الدفع',
    'مرجع التسجيل',
  ]
  const data = rows.map((t) => [
    t.id,
    typeLabelAr(t.type),
    t.description ?? '',
    formatFinanceCurrency(t.amount),
    t.currency,
    mapStatusForFilter(t.status, t.type),
    t.user?.name ?? '',
    t.user?.email ?? '',
    t.occurred_at || t.created_at,
    t.payment_id ?? '',
    t.registration_id ?? '',
  ])
  downloadCsv(filename, headers, data)
}
