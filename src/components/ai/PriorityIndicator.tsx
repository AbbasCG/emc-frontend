import type { AiRecommendationPriority } from '@/types/ai'

const color: Record<AiRecommendationPriority, string> = {
  low: 'bg-emerald-500',
  medium: 'bg-sky-500',
  high: 'bg-amber-500',
  critical: 'bg-red-500',
}

const label: Record<AiRecommendationPriority, string> = {
  low: 'منخفض',
  medium: 'متوسط',
  high: 'عالٍ',
  critical: 'حرج',
}

export default function PriorityIndicator({ priority }: { priority: AiRecommendationPriority }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-700">
      <span className={['h-2.5 w-2.5 rounded-full', color[priority]].join(' ')} />
      {label[priority]}
    </span>
  )
}
