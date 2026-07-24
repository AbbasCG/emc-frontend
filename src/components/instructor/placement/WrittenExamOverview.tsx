import type { ReactNode } from 'react'
import { Calendar, Clock, Target } from 'lucide-react'
import type { PlacementStudentRow } from '@/api/placementApi'
import { getLevelFromScore } from '@/api/placementApi'
import { cefrBadge } from '@/components/instructor/placement/constants'
import { writtenPercentage } from '@/utils/placementAssessmentSummary'
import { toDMY } from '@/components/instructor/InstructorStudentDrawer'

type Props = {
  row: PlacementStudentRow
  /** Live stats from fetched answers — overrides API pre-computed stats when present */
  liveStats?: { correct: number; wrong: number; skipped: number; total: number } | null
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || seconds <= 0) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m >= 60) {
    const h = Math.floor(m / 60)
    const rm = m % 60
    return `${h}س ${rm}د`
  }
  return m > 0 ? `${m}د ${s}ث` : `${s}ث`
}

export function WrittenExamOverview({ row, liveStats }: Props) {
  const pct = writtenPercentage(row)
  const levelKey = row.written_level ?? (
    row.written_score != null
      ? getLevelFromScore(row.written_score, row.total_questions ?? 70).level
      : null
  )
  const badge = cefrBadge(levelKey)

  const correct = liveStats?.correct ?? row.written_stats?.correct_answers
  const wrong   = liveStats?.wrong   ?? row.written_stats?.wrong_answers
  const skipped = liveStats?.skipped ?? row.written_stats?.skipped_answers

  return (
    <div className="shrink-0 border-b border-slate-100 bg-gradient-to-l from-sky-50/90 via-white to-white px-4 py-4 sm:px-6">
      <div className="mb-3 flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-xl bg-[#0077B6]/10 text-[#0077B6]">
          <Target className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[13px] font-black text-deepBlue">الاختبار الكتابي المكتمل</p>
          <p className="text-[10px] font-semibold text-deepBlue/45">عرض للقراءة فقط — لا يمكن تعديل الإجابات</p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        <Metric label="الدرجة" value={`${row.written_score ?? '—'}/${row.total_questions ?? '—'}`} accent="#0077B6" large />
        <Metric label="النسبة" value={pct != null ? `${pct}%` : '—'} accent="#F28C00" />
        <Metric label="صحيحة" value={correct ?? '—'} accent="#10b981" />
        <Metric label="خاطئة" value={wrong ?? '—'} accent="#f43f5e" />
        <Metric label="متروكة" value={skipped ?? '—'} accent="#64748b" />
        <Metric
          label="المستوى"
          value={badge ? badge.cefr : '—'}
          sub={badge?.arabic}
          accent="#0C2A4B"
        />
        <Metric
          label="المدة"
          value={formatDuration(row.time_spent_seconds)}
          icon={<Clock className="h-3 w-3" />}
          accent="#7c3aed"
        />
        <Metric
          label="تاريخ الإكمال"
          value={row.submitted_at ? toDMY(row.submitted_at) : '—'}
          icon={<Calendar className="h-3 w-3" />}
          accent="#0C2A4B"
        />
      </div>
    </div>
  )
}

function Metric({
  label,
  value,
  sub,
  accent,
  large,
  icon,
}: {
  label: string
  value: string | number
  sub?: string
  accent: string
  large?: boolean
  icon?: ReactNode
}) {
  return (
    <div className="rounded-xl border border-[#0C2A4B]/[0.06] bg-white/80 px-3 py-2.5 shadow-sm backdrop-blur-sm">
      <p className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wide text-deepBlue/40">
        {icon}
        {label}
      </p>
      <p
        className={`mt-0.5 font-mono font-black tabular-nums text-deepBlue ${large ? 'text-lg' : 'text-[13px]'}`}
        style={{ color: large ? accent : undefined }}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[9px] font-bold text-deepBlue/45">{sub}</p>}
    </div>
  )
}
