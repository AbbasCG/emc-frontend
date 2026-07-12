import type { ManualPayment } from '@/types/intelligence'
import { ENTITY_AR, PAYMENT_METHOD_AR, STATUS_AR, paymentReference } from './constants'

function csvEscape(v: string): string {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`
  return v
}

export function exportManualPaymentsCsv(rows: ManualPayment[], filename: string): void {
  const headers = [
    'المرجع',
    'الحالة',
    'الطالب',
    'البريد',
    'العنصر',
    'نوع العنصر',
    'المبلغ المدفوع',
    'العملة',
    'طريقة الدفع',
    'الحساب',
    'تاريخ الدفع',
    'تاريخ الإنشاء',
  ]
  const lines = rows.map((p) => {
    const cols = [
      paymentReference(p),
      STATUS_AR[p.status]?.label ?? p.status,
      p.student?.name ?? '',
      p.student?.email ?? '',
      p.purchasable?.title ?? '',
      p.purchasable?.type ? (ENTITY_AR[p.purchasable.type] ?? p.purchasable.type) : '',
      String(p.paid_amount ?? ''),
      p.currency ?? '',
      p.payment_method ? (PAYMENT_METHOD_AR[p.payment_method] ?? p.payment_method) : '',
      p.account?.name ?? '',
      p.payment_date ?? '',
      p.created_at ?? '',
    ]
    return cols.map((c) => csvEscape(c)).join(',')
  })
  const bom = '\uFEFF'
  const blob = new Blob([bom + [headers.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
