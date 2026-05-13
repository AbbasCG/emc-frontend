import type { IntegrationStatus } from '@/types/phase7'
import { cn } from '@/lib/utils'

const map: Record<
  IntegrationStatus,
  { label: string; className: string }
> = {
  connected: {
    label: 'متصل',
    className: 'bg-emerald-50 text-emerald-900 ring-emerald-100',
  },
  not_configured: {
    label: 'غير مفعّل',
    className: 'bg-slate-50 text-slate-600 ring-slate-100',
  },
  needs_setup: {
    label: 'يحتاج إعداد',
    className: 'bg-amber-50 text-amber-950 ring-amber-100',
  },
}

export default function IntegrationStatusBadge({ status }: { status: IntegrationStatus }) {
  const cfg = map[status]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-black ring-1 ring-inset',
        cfg.className,
      )}
    >
      {cfg.label}
    </span>
  )
}
