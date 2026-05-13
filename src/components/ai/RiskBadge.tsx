import type { AiInsightSeverity } from '@/types/ai'

const styles: Record<AiInsightSeverity, string> = {
  info: 'bg-sky-50 text-sky-900 ring-sky-100',
  warning: 'bg-amber-50 text-amber-950 ring-amber-100',
  high: 'bg-orange-50 text-orange-900 ring-orange-100',
  critical: 'bg-red-50 text-red-900 ring-red-100',
}

const labels: Record<AiInsightSeverity, string> = {
  info: 'معلومة',
  warning: 'تنبيه',
  high: 'مرتفع',
  critical: 'حرج',
}

export default function RiskBadge({ level }: { level: AiInsightSeverity }) {
  return (
    <span className={['rounded-lg px-2.5 py-1 text-[11px] font-black ring-1 ring-inset', styles[level]].join(' ')}>
      {labels[level]}
    </span>
  )
}
