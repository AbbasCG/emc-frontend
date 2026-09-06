export type TransactionStatusVariant =
  | 'amber'
  | 'green'
  | 'red'
  | 'purple'
  | 'gray'

export const transactionStatusLabels: Record<string, string> = {
  pending_payment: 'بانتظار الدفع',
  payment_pending: 'بانتظار الدفع',
  pending: 'قيد الانتظار',
  pending_review: 'قيد المراجعة',

  payment_confirmed: 'تم تأكيد الدفع',
  confirmed: 'مؤكدة',
  completed: 'مكتملة',
  paid: 'مدفوعة',

  payment_failed: 'فشل الدفع',
  failed: 'فاشلة',

  refunded: 'تم الاسترداد',
  partially_refunded: 'استرداد جزئي',

  cancelled: 'ملغاة',
  rejected: 'مرفوضة',

  expired: 'منتهية',
}

const VARIANT_STYLES: Record<
  TransactionStatusVariant,
  { label: string; cls: string; dot: string }
> = {
  amber: {
    label: '',
    cls: 'bg-amber-50 text-amber-700 ring-amber-200',
    dot: 'bg-amber-500',
  },
  green: {
    label: '',
    cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    dot: 'bg-emerald-500',
  },
  red: {
    label: '',
    cls: 'bg-rose-50 text-rose-700 ring-rose-200',
    dot: 'bg-rose-500',
  },
  purple: {
    label: '',
    cls: 'bg-violet-50 text-violet-700 ring-violet-200',
    dot: 'bg-violet-500',
  },
  gray: {
    label: '',
    cls: 'bg-slate-100 text-slate-600 ring-slate-200',
    dot: 'bg-slate-400',
  },
}

const STATUS_VARIANT: Record<string, TransactionStatusVariant> = {
  pending_payment: 'amber',
  payment_pending: 'amber',
  pending: 'amber',
  pending_review: 'amber',

  payment_confirmed: 'green',
  confirmed: 'green',
  completed: 'green',
  paid: 'green',

  payment_failed: 'red',
  failed: 'red',
  rejected: 'red',

  refunded: 'purple',
  partially_refunded: 'purple',

  cancelled: 'gray',
  expired: 'gray',
}

export function getTransactionStatusLabel(status: string | null | undefined): string {
  if (!status?.trim()) return 'غير معروف'
  const key = status.trim().toLowerCase()
  return transactionStatusLabels[key] ?? 'غير معروف'
}

export function getTransactionStatusVariant(
  status: string | null | undefined,
): TransactionStatusVariant {
  if (!status?.trim()) return 'gray'
  const key = status.trim().toLowerCase()
  return STATUS_VARIANT[key] ?? 'gray'
}

export function getTransactionStatusBadgeStyle(status: string | null | undefined): {
  label: string
  cls: string
  dot: string
} {
  const variant = getTransactionStatusVariant(status)
  const style = VARIANT_STYLES[variant]
  return {
    label: getTransactionStatusLabel(status),
    cls: style.cls,
    dot: style.dot,
  }
}

/** Map financial-transaction status + type to a filter/display key. */
export function mapTransactionStatusKey(
  status: string,
  type?: string,
): string {
  if (type === 'refund') return 'refunded'
  return status.trim().toLowerCase()
}
