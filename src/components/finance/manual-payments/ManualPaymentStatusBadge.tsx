import type { ManualPaymentStatus } from '@/types/intelligence'
import { STATUS_AR } from './constants'

export default function ManualPaymentStatusBadge({ status }: { status: ManualPaymentStatus }) {
  const meta = STATUS_AR[status] ?? { label: status, cls: 'bg-slate-100 text-slate-600 ring-slate-200', dot: 'bg-slate-400' }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black ring-1 ring-inset ${meta.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} aria-hidden />
      {meta.label}
    </span>
  )
}

export function EntityTypeBadge({ type }: { type: string }) {
  const cls =
    type === 'course'
      ? 'bg-[#0077B6]/10 text-[#1e6f96] ring-[#0077B6]/15'
      : type === 'workshop'
        ? 'bg-[#F28C00]/12 text-[#b86a1f] ring-[#F28C00]/20'
        : 'bg-violet-50 text-violet-700 ring-violet-200'
  const label =
    type === 'course' ? 'دورة' : type === 'workshop' ? 'ورشة' : type === 'learning_path' ? 'مسار' : type
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-black ring-1 ring-inset ${cls}`}>
      {label}
    </span>
  )
}
