import { getTransactionStatusBadgeStyle } from '@/utils/transactionStatusLabels'

export default function PaymentStatusBadge({ status }: { status: string }) {
  const s = getTransactionStatusBadgeStyle(status)
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black ring-1 ${s.cls}`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.dot}`} aria-hidden />
      {s.label}
    </span>
  )
}
