import type { AiInsight } from '@/types/ai'
import RiskBadge from './RiskBadge'

export default function AiInsightCard({ insight }: { insight: AiInsight }) {
  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-black text-deepBlue">{insight.title}</h3>
        <RiskBadge level={insight.severity} />
      </div>
      <p className="mt-2 text-sm font-medium leading-7 text-slate-600">{insight.description}</p>
      {(insight.metric_label || insight.score != null) && (
        <p className="mt-3 text-xs font-black text-slate-400">
          {insight.metric_label ?? 'Score'}: <span className="text-deepBlue">{insight.score ?? '-'}</span>
        </p>
      )}
    </article>
  )
}
