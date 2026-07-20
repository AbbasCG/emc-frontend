import { useMemo } from 'react'
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import {
  Award,
  BarChart3,
  GitCompare,
  Layers,
  Lightbulb,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react'
import type { PlacementStudentRow } from '@/api/placementApi'
import {
  ASSESSMENT_STATUS_LABELS,
  cefrBadge,
} from '@/components/instructor/placement/constants'
import {
  buildPlacementSummary,
  buildRadarSkills,
  buildTimeline,
} from '@/utils/placementAssessmentSummary'
import { toDMY } from '@/components/instructor/InstructorStudentDrawer'
import type { OralForm } from '@/components/instructor/placement/constants'
import { emcTooltipItemStyle, emcTooltipLabelStyle, emcTooltipStyle } from '@/pages/super-admin/crud/shared/enterprise/charts'

type Props = {
  row: PlacementStudentRow
  oralForm?: OralForm
}

function ProgressCard({ label, pct, color }: { label: string; pct: number | null; color: string }) {
  const v = pct ?? 0
  return (
    <div className="rounded-2xl border border-[#22334A]/[0.06] bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[12px] font-black text-deepBlue">{label}</p>
        <span className="font-mono text-[13px] font-black tabular-nums text-deepBlue">{pct != null ? `${pct}%` : '—'}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(100, v)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

export function PlacementSummaryTab({ row, oralForm }: Props) {
  const summary = useMemo(() => buildPlacementSummary(row), [row])
  const timeline = useMemo(() => buildTimeline(row), [row])
  const radarData = useMemo(() => buildRadarSkills(row, oralForm), [row, oralForm])
  const statusMeta = ASSESSMENT_STATUS_LABELS[summary.assessmentStatus]
  const levelBadge = cefrBadge(summary.finalLevel ?? summary.recommendedLevel)

  return (
    <div className="space-y-5">
      {/* KPI cards — row 1 */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={BarChart3} label="الاختبار الكتابي" value={`${summary.writtenScore ?? '—'}/${summary.writtenMax}`} sub={summary.writtenPct != null ? `${summary.writtenPct}%` : undefined} accent="#2691C2" />
        <KpiCard icon={TrendingUp} label="المقابلة الشفوية" value={summary.oralScore != null ? `${summary.oralScore}/100` : '—'} accent="#7c3aed" />
        <KpiCard icon={Award} label="المستوى النهائي" value={levelBadge?.cefr ?? summary.finalLevelCefr ?? '—'} sub={levelBadge?.arabic} accent="#EC943C" />
        <KpiCard icon={Lightbulb} label="الدرجة الإجمالية" value={summary.overallScore != null ? `${summary.overallScore}%` : '—'} sub={`ثقة ${summary.confidenceScore ?? '—'}%`} accent="#10b981" />
      </div>

      {/* KPI cards — row 2 */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Layers} label="الصف المقترح" value={summary.recommendedClass ?? '—'} accent="#2691C2" />
        <KpiCard icon={Layers} label="المسار الموصى به" value={summary.recommendedTrack ?? '—'} accent="#22334A" />
        <KpiCard icon={ShieldCheck} label="حالة الطالب" value={statusMeta.label} accent="#10b981" />
        <KpiCard
          icon={Award}
          label="حالة الإسناد"
          value={summary.assignmentStatus === 'assigned' ? 'مُسند' : summary.assignmentStatus === 'ready' ? 'جاهز' : 'بانتظار'}
          accent="#EC943C"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-[16px] border border-[#22334A]/[0.06] bg-white p-4 shadow-sm">
            <p className="mb-3 text-[12px] font-black text-deepBlue">تفصيل الأداء</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <ProgressCard label="الاختبار الكتابي" pct={summary.writtenPct} color="#2691C2" />
              <ProgressCard label="المقابلة الشفوية" pct={summary.oralScore} color="#7c3aed" />
              <ProgressCard label="الإجمالي المركّب" pct={summary.overallScore} color="#EC943C" />
            </div>
          </div>

          <div className="rounded-[16px] border border-[#22334A]/[0.06] bg-white p-4 shadow-sm">
            <p className="mb-3 text-[12px] font-black text-deepBlue">خريطة المهارات</p>
            <div dir="ltr" className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="72%">
                  <PolarGrid stroke="rgba(15,23,42,0.08)" />
                  <PolarAngleAxis dataKey="skill" tick={{ fill: '#64748B', fontSize: 11, fontWeight: 700 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                  <Tooltip contentStyle={emcTooltipStyle} labelStyle={emcTooltipLabelStyle} itemStyle={emcTooltipItemStyle} />
                  <Radar name="الأداء" dataKey="value" stroke="#2691C2" fill="#2691C2" fillOpacity={0.28} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[16px] border border-[#22334A]/[0.06] bg-white p-4 shadow-sm">
            <p className="mb-3 text-[12px] font-black text-deepBlue">حالة التقييم</p>
            <div className="space-y-2">
              <StatusRow label="حالة الطالب" value={statusMeta.label} className={`${statusMeta.bg} ${statusMeta.text}`} />
              <StatusRow label="المستوى الموصى به" value={summary.recommendedLevel ?? '—'} />
              <StatusRow label="الصف المقترح" value={summary.recommendedClass ?? '—'} />
              <StatusRow label="حالة الإسناد" value={
                summary.assignmentStatus === 'assigned' ? 'مُسند إلى صف'
                : summary.assignmentStatus === 'ready' ? 'جاهز للإسناد' : 'بانتظار'
              } />
            </div>
          </div>

          <div className="rounded-[16px] border border-[#22334A]/[0.06] bg-white p-4 shadow-sm">
            <p className="mb-3 flex items-center gap-2 text-[12px] font-black text-deepBlue">
              <GitCompare className="h-4 w-4 text-[#2691C2]" />
              مقارنة الكتابي vs الشفوي
            </p>
            <dl className="space-y-2 text-[12px]">
              <CompareRow label="الكتابي" value={summary.writtenPct != null ? `${summary.writtenPct}%` : '—'} />
              <CompareRow label="الشفوي" value={summary.oralScore != null ? `${summary.oralScore}%` : '—'} />
              <CompareRow label="الفرق" value={summary.scoreDifference != null ? `${summary.scoreDifference > 0 ? '+' : ''}${summary.scoreDifference}%` : '—'} highlight />
              <CompareRow label="نقطة القوة" value={summary.strength ?? '—'} />
              <CompareRow label="نقطة الضعف" value={summary.weakness ?? '—'} />
              <CompareRow label="التوصية النهائية" value={summary.recommendationText ?? '—'} highlight />
            </dl>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[16px] border border-[#22334A]/[0.06] bg-white p-4 shadow-sm">
          <p className="mb-4 text-[12px] font-black text-deepBlue">الخط الزمني للتقييم</p>
          <ol className="relative space-y-0 border-r-2 border-slate-100 pr-4">
            {timeline.map((ev, i) => (
              <li key={ev.id} className="relative pb-5 last:pb-0">
                <span
                  className={`absolute -right-[9px] top-1 h-4 w-4 rounded-full ring-4 ring-white ${
                    ev.done ? 'bg-emerald-500' : ev.current ? 'bg-[#EC943C] animate-pulse' : 'bg-slate-200'
                  }`}
                />
                <p className={`text-[12px] font-black ${ev.done ? 'text-deepBlue' : 'text-deepBlue/45'}`}>{ev.label}</p>
                {ev.date && (
                  <p className="mt-0.5 font-mono text-[10px] font-semibold text-deepBlue/40">{toDMY(ev.date)}</p>
                )}
                {i < timeline.length - 1 && <span className="sr-only">→</span>}
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-[16px] border border-[#EC943C]/20 bg-gradient-to-l from-[#EC943C]/5 to-white p-4 shadow-sm">
          <p className="mb-3 flex items-center gap-2 text-[12px] font-black text-deepBlue">
            <Lightbulb className="h-4 w-4 text-[#EC943C]" />
            التوصية النهائية
          </p>
          {levelBadge && (
            <span className={`inline-flex rounded-xl px-3 py-1.5 text-[13px] font-black ${levelBadge.bg} ${levelBadge.text}`}>
              {levelBadge.cefr} · {levelBadge.arabic}
            </span>
          )}
          <p className="mt-3 text-[12px] font-semibold leading-relaxed text-deepBlue/70">
            <span className="font-black text-deepBlue">السبب: </span>
            {summary.recommendationReason ?? '—'}
          </p>
          <p className="mt-2 text-[12px] font-semibold leading-relaxed text-deepBlue/70">
            <span className="font-black text-deepBlue">التوصية: </span>
            {summary.recommendationText ?? '—'}
          </p>
        </div>
      </div>
    </div>
  )
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: typeof BarChart3
  label: string
  value: string
  sub?: string
  accent: string
}) {
  return (
    <div className="rounded-2xl border border-[#22334A]/[0.06] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wide text-deepBlue/40">{label}</p>
          <p className="mt-1 font-mono text-lg font-black tabular-nums text-deepBlue">{value}</p>
          {sub && <p className="mt-0.5 text-[11px] font-bold text-deepBlue/50">{sub}</p>}
        </div>
        <div className="grid h-9 w-9 place-items-center rounded-xl" style={{ backgroundColor: `${accent}18`, color: accent }}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  )
}

function StatusRow({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50/80 px-3 py-2">
      <span className="text-[11px] font-semibold text-deepBlue/50">{label}</span>
      <span className={`text-[11px] font-black ${className ?? 'text-deepBlue'}`}>{value}</span>
    </div>
  )
}

function CompareRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between gap-3 border-b border-slate-50 pb-2 last:border-0">
      <dt className="font-semibold text-deepBlue/50">{label}</dt>
      <dd className={`font-black text-deepBlue ${highlight ? 'text-[#EC943C]' : ''}`}>{value}</dd>
    </div>
  )
}
