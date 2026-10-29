import { Crown, Medal } from 'lucide-react'
import type { PointsLevel } from '@/api/volunteerPointsApi'
import { formatNumber } from './impactPointsUi'

/**
 * The six-level journey with progress toward the next level.
 * Duration gives eligibility and points prove it; "رائد أثر EMC" also needs a
 * qualitative sign-off from management, which this page never implies.
 */
export default function LevelLadder({
  levels,
  currentId,
  lifetimePoints,
}: {
  levels: PointsLevel[]
  currentId: string
  lifetimePoints: number
}) {
  const currentIndex = Math.max(0, levels.findIndex((l) => l.id === currentId))
  const next = levels[currentIndex + 1]
  const base = levels[currentIndex]?.points ?? 0
  const progress = next ? Math.min(100, Math.max(0, ((lifetimePoints - base) / Math.max(1, next.points - base)) * 100)) : 100

  return (
    <div>
      {next && (
        <div className="mb-4 rounded-xl bg-slate-50 p-3">
          <div className="flex items-center justify-between text-[11px] font-bold text-muted-500">
            <span>التقدم نحو «{next.title}»</span>
            <span className="tabular-nums text-navy">{Math.round(progress)}%</span>
          </div>
          <div
            role="progressbar"
            aria-label="التقدم نحو المستوى التالي"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
            className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"
          >
            <div className="h-full rounded-full bg-brand-500 transition-[width]" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      <ol className="space-y-1.5">
        {levels.map((level, i) => {
          const isCurrent = level.id === currentId
          const reached = i <= currentIndex
          return (
            <li
              key={level.id}
              aria-current={isCurrent ? 'step' : undefined}
              className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 ${
                isCurrent ? 'border-brand-500 bg-brand-50/70' : 'border-slate-100 bg-white'
              }`}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                {level.id === 'impact_leader' ? (
                  <Crown size={15} className="shrink-0 text-accent-600" aria-hidden="true" />
                ) : (
                  <Medal size={15} className={`shrink-0 ${reached ? 'text-brand-500' : 'text-slate-300'}`} aria-hidden="true" />
                )}
                <div className="min-w-0">
                  <p className={`truncate text-[13px] font-black ${isCurrent ? 'text-navy' : 'text-muted-600'}`}>{level.title}</p>
                  <p className="text-[10.5px] font-semibold text-muted-500">
                    {level.months > 0 ? `بعد ${level.months} شهراً · ` : 'من البداية · '}
                    {formatNumber(level.points)} نقطة
                  </p>
                </div>
              </div>
              <span className="shrink-0 rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-black text-muted-600">سديم {level.sadeem}</span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
