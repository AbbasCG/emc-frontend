import type { PaymentStatus } from '@/types/intelligence'

const MAP: Record<PaymentStatus, { ar: string; cls: string }> = {
  confirmed: { ar: 'مؤكدة', cls: 'bg-emerald-50 text-emerald-800 ring-emerald-100' },
  pending: { ar: 'معلقة', cls: 'bg-amber-50 text-amber-900 ring-amber-100' },
  failed: { ar: 'فاشلة', cls: 'bg-red-50 text-red-800 ring-red-100' },
  refunded: { ar: 'مستردة', cls: 'bg-slate-100 text-slate-700 ring-slate-200' },
}

export default function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const x = MAP[status] ?? { ar: status, cls: 'bg-slate-50 text-slate-600 ring-slate-100' }
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black ring-1 ${x.cls}`}>{x.ar}</span>
  )
}
