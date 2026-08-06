import { Mail, User } from 'lucide-react'
import { progressFromStatus, type PlacementStudentRow } from '@/api/placementApi'
import {
  ASSESSMENT_STATUS_LABELS,
  CEFR_MAP,
  STATUS_LABELS,
  cefrBadge,
} from '@/components/instructor/placement/constants'
import { buildPlacementSummary, writtenPercentage } from '@/utils/placementAssessmentSummary'
import { toDMY } from '@/components/instructor/InstructorStudentDrawer'

type Props = {
  row: PlacementStudentRow
}

export function PlacementAssessmentHeader({ row }: Props) {
  const summary = buildPlacementSummary(row)
  const progress = progressFromStatus(row.status)
  const writtenPct = writtenPercentage(row)
  const levelBadge = cefrBadge(summary.finalLevel ?? row.written_level)
  const statusMeta = ASSESSMENT_STATUS_LABELS[summary.assessmentStatus]

  return (
    <div className="relative overflow-hidden rounded-[20px] border border-[#22334A]/[0.06] bg-gradient-to-l from-[#22334A] to-[#1a2d44] p-5 text-white shadow-[0_16px_48px_-20px_rgba(15,23,42,0.45)] sm:p-6">
      <div className="pointer-events-none absolute -left-8 top-0 h-32 w-32 rounded-full bg-[#EC943C]/20 blur-[50px]" />
      <div className="pointer-events-none absolute -bottom-6 right-0 h-24 w-24 rounded-full bg-[#2691C2]/25 blur-[40px]" />

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          {row.avatar_url ? (
            <img
              src={row.avatar_url}
              alt={row.student_name}
              className="h-16 w-16 shrink-0 rounded-2xl border-2 border-white/20 object-cover shadow-lg"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-2 border-white/20 bg-white/10 text-xl font-black shadow-lg">
              {row.student_name.charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <h2 className="truncate text-lg font-black leading-tight sm:text-xl">{row.student_name}</h2>
            <p className="mt-1 flex items-center gap-1.5 truncate text-[12px] font-semibold text-white/55">
              <Mail className="h-3.5 w-3.5 shrink-0 text-white/40" />
              {row.email}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-[11px] font-bold text-white/45">
              <User className="h-3.5 w-3.5" />
              <span dir="ltr">#{row.student_id}</span>
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {levelBadge && (
                <span className={`rounded-xl px-2.5 py-1 text-[11px] font-black ${levelBadge.bg} ${levelBadge.text}`}>
                  {levelBadge.cefr} · {levelBadge.arabic}
                </span>
              )}
              <span className="rounded-xl bg-white/10 px-2.5 py-1 text-[11px] font-black text-white/80 ring-1 ring-white/15">
                {STATUS_LABELS[row.status] ?? row.status}
              </span>
              <span className={`rounded-xl px-2.5 py-1 text-[11px] font-black ${statusMeta.bg} ${statusMeta.text}`}>
                {statusMeta.label}
              </span>
            </div>
          </div>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4 lg:gap-3">
          <ScorePill label="الكتابي" value={row.written_score} suffix={`/${row.total_questions ?? '—'}`} sub={writtenPct != null ? `${writtenPct}%` : undefined} />
          <ScorePill label="الشفوي" value={row.oral_score} suffix="/100" />
          <ScorePill label="الإجمالي" value={summary.overallScore} suffix="%" highlight />
          <div className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2.5 backdrop-blur-sm">
            <p className="text-[10px] font-bold text-white/50">تاريخ الإكمال</p>
            <p className="mt-0.5 font-mono text-[13px] font-black tabular-nums">
              {row.submitted_at ? toDMY(row.submitted_at) : '—'}
            </p>
            <p className="mt-1 text-[10px] font-semibold text-white/40">
              {row.is_assigned ? 'مُسند إلى صف' : progress.level_approved ? 'جاهز للإسناد' : progress.oral_booked ? 'بانتظار التقييم' : 'قيد المراجعة'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function ScorePill({
  label,
  value,
  suffix,
  sub,
  highlight,
}: {
  label: string
  value: number | null
  suffix?: string
  sub?: string
  highlight?: boolean
}) {
  return (
    <div className={`rounded-2xl border px-3 py-2.5 backdrop-blur-sm ${highlight ? 'border-[#EC943C]/40 bg-[#EC943C]/15' : 'border-white/10 bg-white/10'}`}>
      <p className="text-[10px] font-bold text-white/50">{label}</p>
      <p className="mt-0.5 font-mono text-[15px] font-black tabular-nums leading-none">
        {value ?? '—'}
        {value != null && suffix && <span className="text-[10px] font-semibold text-white/45">{suffix}</span>}
      </p>
      {sub && <p className="mt-1 text-[10px] font-bold text-[#EC943C]">{sub}</p>}
    </div>
  )
}

/** Resolve CEFR display from internal key or CEFR code */
export function displayCefr(level: string | null | undefined) {
  if (!level) return null
  return CEFR_MAP[level] ?? Object.values(CEFR_MAP).find((v) => v.cefr === level) ?? null
}
