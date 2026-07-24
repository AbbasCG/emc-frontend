import type { FinancialTransaction } from '@/types/intelligence'
import { downloadCsv } from '@/components/finance/financeTablesShared'
import { formatFinanceDateTime, formatMoney } from '@/utils/financeFormatters'
import { getTransactionStatusLabel } from '@/utils/transactionStatusLabels'
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
    formatMoney(t.amount, t.currency),
    t.currency,
    getTransactionStatusLabel(mapStatusForFilter(t.status, t.type)),
    t.user?.name ?? '',
    t.user?.email ?? '',
    formatFinanceDateTime(t.occurred_at || t.created_at),
    t.payment_id ?? '',
    t.registration_id ?? '',
  ])
  downloadCsv(filename, headers, data)
}
