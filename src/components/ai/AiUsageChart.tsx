import type { AiUsageSnapshot } from '@/types/ai'

export default function AiUsageChart({ usage }: { usage: AiUsageSnapshot }) {
  const max = Math.max(...usage.models.map((x) => x.requests), 1)
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-black text-deepBlue">استهلاك النماذج</h3>
      <div className="mt-4 space-y-3">
        {usage.models.map((model) => (
          <div key={model.name}>
            <div className="mb-1 flex items-center justify-between text-xs font-bold text-slate-500">
              <span dir="ltr">{model.name}</span>
              <span>{model.requests.toLocaleString('en-US')}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div className="h-2 rounded-full bg-customBlue" style={{ width: `${(model.requests / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
