import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Minus,
  RefreshCw,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { DashboardHero } from '@/components/dashboard'
import type {
  ActivityItem,
  ProgramAlert,
  ProgramsManagerAnalytics,
  ProgramsManagerDashboardPayload,
  UpcomingSession,
} from '@/api/programsManagerApi'
import {
  buildActionQueue,
  buildExecutiveBrief,
  buildTrendInsight,
  findRegistrationBottleneck,
  getDecliningTrends,
  getGrowingTrends,
  getLearningHealthInsight,
  getSessionsNeedingAction,
  hasAnalyticsData,
  priorityLabel,
  type ActionItem,
  type ExecutiveBrief,
  type TrendDirection,
  type TrendInsight,
} from '@/utils/programsManagerInsights'

function fmt(n: number | string): string {
  if (typeof n === 'string') return n
  return n.toLocaleString('en-US')
}

function tooltipCount(value: unknown): string {
  return fmt(Number(value ?? 0))
}

function hourGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'صباح الخير'
  if (h < 18) return 'مساء الخير'
  return 'مساء النور'
}

function todayLabel(): string {
  return new Date().toLocaleDateString('ar-EG-u-nu-latn', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('ar-EG-u-nu-latn', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return dateStr
  }
}

function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-[#0C2A4B]/6 bg-white p-5 shadow-[0_1px_3px_rgba(12,42,75,0.06),0_8px_24px_-8px_rgba(12,42,75,0.08)] ${className}`}>
      {children}
    </section>
  )
}

function PanelHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string
  title: string
  action?: ReactNode
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#0077B6]">{eyebrow}</p>
        <h2 className="mt-1 text-base font-black text-[#0C2A4B]">{title}</h2>
      </div>
      {action}
    </div>
  )
}

function EmptyInsight({ message, hint, href, label }: { message: string; hint: string; href?: string; label?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[#0C2A4B]/12 bg-[#f8fafc]/80 px-5 py-8 text-center">
      <p className="text-sm font-black text-[#0C2A4B]/75">{message}</p>
      <p className="mx-auto mt-2 max-w-sm text-[12px] font-medium leading-relaxed text-[#0C2A4B]/50">{hint}</p>
      {href && label ?
        <Link to={href} className="mt-4 inline-flex items-center gap-1 rounded-lg bg-[#0C2A4B] px-4 py-2 text-[11px] font-black text-white transition hover:bg-[#1a2838]">
          {label} <ArrowRight size={12} />
        </Link>
      : null}
    </div>
  )
}

function TrendIcon({ direction }: { direction: TrendDirection }) {
  if (direction === 'up') return <ArrowUpRight size={16} className="text-emerald-600" />
  if (direction === 'down') return <ArrowDownRight size={16} className="text-rose-600" />
  if (direction === 'flat') return <Minus size={16} className="text-[#0C2A4B]/45" />
  return <Minus size={16} className="text-[#0C2A4B]/30" />
}

function PulseCard({ insight }: { insight: TrendInsight }) {
  const bg =
    insight.direction === 'up' ? 'from-emerald-50/90 to-white border-emerald-100'
    : insight.direction === 'down' ? 'from-rose-50/90 to-white border-rose-100'
    : 'from-[#f8fafc] to-white border-[#0C2A4B]/8'

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`rounded-2xl border bg-gradient-to-br p-4 ${bg}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-black text-[#0C2A4B]/55">{insight.domain}</p>
        <TrendIcon direction={insight.direction} />
      </div>
      <p className="mt-2 text-xl font-black tabular-nums text-[#0C2A4B]">
        {insight.recentValue}
        {insight.changePercent != null && insight.direction !== 'unknown' ?
          <span className={`ms-2 text-[12px] font-bold ${insight.direction === 'up' ? 'text-emerald-600' : insight.direction === 'down' ? 'text-rose-600' : 'text-[#0C2A4B]/45'}`}>
            {insight.changePercent > 0 ? '+' : ''}{insight.changePercent}%
          </span>
        : null}
      </p>
      <p className="mt-2 text-[11px] font-medium leading-relaxed text-[#0C2A4B]/60">{insight.narrative}</p>
    </motion.div>
  )
}

function BriefBadge({ tone }: { tone: ExecutiveBrief['tone'] }) {
  const cls =
    tone === 'critical' ? 'bg-rose-500/20 text-rose-100 ring-rose-400/30'
    : tone === 'attention' ? 'bg-amber-500/20 text-amber-50 ring-amber-400/30'
    : 'bg-emerald-500/20 text-emerald-50 ring-emerald-400/30'
  const label = tone === 'critical' ? 'يتطلب قراراً' : tone === 'attention' ? 'متابعة مطلوبة' : 'مستقر'
  return <span className={`rounded-full px-3 py-1 text-[10px] font-black ring-1 ${cls}`}>{label}</span>
}

function OperationsChart({ analytics }: { analytics: ProgramsManagerAnalytics }) {
  if (!hasAnalyticsData(analytics)) {
    return (
      <EmptyInsight
        message="لا اتجاهات كافية بعد"
        hint="ستظهر منحنيات النمو عند تسجيل نشاط خلال الشهور الأخيرة — التسجيلات، الدورات، أو الجلسات."
        href="/dashboard/admin/programs"
        label="بدء إطلاق المحتوى"
      />
    )
  }

  const merged = analytics.registrations_monthly.map((p, i) => ({
    label: p.label,
    registrations: p.count,
    courses: analytics.courses_monthly[i]?.count ?? 0,
    sessions: analytics.sessions_monthly[i]?.count ?? 0,
  }))

  const regInsight = buildTrendInsight('reg', 'التسجيلات', analytics.registrations_monthly)
  const chartHint =
    regInsight.direction === 'up' ? 'التسجيلات في صعود — خطّط للسعة والمدربين.'
    : regInsight.direction === 'down' ? 'التسجيلات تتراجع — راجع التسويق وعروض البرامج.'
    : 'راقب تقاطع التسجيلات مع إطلاق الدورات والجلسات.'

  return (
    <div>
      <p className="mb-4 text-[12px] font-semibold text-[#0C2A4B]/65">{chartHint}</p>
      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={merged} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#0C2A4B10" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} interval={0} angle={-18} textAnchor="end" height={44} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} width={28} />
            <Tooltip
              formatter={(v, name) => [tooltipCount(v), name === 'registrations' ? 'تسجيلات' : name === 'courses' ? 'دورات' : 'جلسات']}
              contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e2e8f0' }}
            />
            <Line type="monotone" dataKey="registrations" stroke="#0077B6" strokeWidth={2.5} dot={{ r: 3 }} name="registrations" />
            <Line type="monotone" dataKey="courses" stroke="#F28C00" strokeWidth={2} dot={{ r: 2 }} strokeDasharray="4 4" name="courses" />
            <Line type="monotone" dataKey="sessions" stroke="#0C2A4B" strokeWidth={2} dot={{ r: 2 }} name="sessions" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function ActionQueue({ items }: { items: ActionItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyInsight
        message="لا إجراءات عاجلة"
        hint="كل المؤشرات التشغيلية مستقرة. راجع تحليلات KPI للتخطيط الاستراتيجي."
        href="/dashboard/admin/kpi"
        label="فتح مركز KPI"
      />
    )
  }

  const priorityStyle = {
    critical: 'border-r-rose-500 bg-rose-50/50',
    high: 'border-r-amber-500 bg-amber-50/40',
    medium: 'border-r-[#0077B6] bg-[#0077B6]/5',
  }

  return (
    <ol className="space-y-2">
      {items.map((item, idx) => (
        <li
          key={item.id}
          className={`rounded-xl border border-[#0C2A4B]/6 border-r-[3px] p-3.5 transition hover:shadow-sm ${priorityStyle[item.priority]}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="grid h-5 w-5 place-items-center rounded-md bg-[#0C2A4B] text-[10px] font-black text-white">{idx + 1}</span>
                <span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-black text-[#0C2A4B]/55 ring-1 ring-[#0C2A4B]/10">
                  {priorityLabel(item.priority)}
                </span>
              </div>
              <p className="mt-2 text-[13px] font-black text-[#0C2A4B]">{item.title}</p>
              <p className="mt-1 text-[11px] font-medium leading-relaxed text-[#0C2A4B]/55">{item.reason}</p>
            </div>
          </div>
          <Link
            to={item.href}
            className="mt-3 inline-flex items-center gap-1 rounded-lg bg-[#0C2A4B] px-3 py-1.5 text-[10px] font-black text-white transition hover:bg-[#1a2838]"
          >
            {item.cta} <ArrowRight size={11} />
          </Link>
        </li>
      ))}
    </ol>
  )
}

function AlertRow({ alert }: { alert: ProgramAlert }) {
  const isCritical = alert.severity === 'action'
  return (
    <div className={`flex gap-3 rounded-xl border px-3.5 py-3 ${isCritical ? 'border-orange-200 bg-orange-50/80' : 'border-amber-200 bg-amber-50/60'}`}>
      <AlertTriangle size={15} className={`mt-0.5 shrink-0 ${isCritical ? 'text-orange-600' : 'text-amber-600'}`} />
      <p className="text-[12px] font-semibold leading-relaxed text-[#0C2A4B]">{alert.message}</p>
    </div>
  )
}

function SessionActionRow({ session }: { session: UpcomingSession }) {
  const issue = !session.meeting_url ? 'بدون رابط اجتماع' : 'تبدأ قريباً'
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#0C2A4B]/8 px-3.5 py-3">
      <div className="min-w-0">
        <p className="text-[12px] font-black text-[#0C2A4B]">{session.title || session.course_title || 'جلسة'}</p>
        <p className="mt-0.5 text-[10px] text-[#0C2A4B]/50">
          {formatDate(session.session_date)}
          {session.start_time ? ` · ${session.start_time}` : ''}
          {session.instructor_name ? ` · ${session.instructor_name}` : ''}
        </p>
      </div>
      <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-black text-rose-800">{issue}</span>
    </div>
  )
}

type Props = {
  data: ProgramsManagerDashboardPayload
  userName?: string | null
  onRefresh: () => void
  loading?: boolean
}

export default function ProgramsManagerDashboardView({ data, userName, onRefresh, loading }: Props) {
  const { summary, analytics, program_alerts, recent_activity, registration_pipeline, upcoming_sessions } = data

  const actionQueue = useMemo(() => buildActionQueue(data), [data])
  const brief = useMemo(() => buildExecutiveBrief(data, actionQueue), [data, actionQueue])
  const growing = useMemo(() => getGrowingTrends(analytics), [analytics])
  const declining = useMemo(() => getDecliningTrends(analytics), [analytics])
  const bottleneck = useMemo(() => findRegistrationBottleneck(registration_pipeline), [registration_pipeline])
  const learningHealth = useMemo(() => getLearningHealthInsight(summary), [summary])
  const sessionsAction = useMemo(() => getSessionsNeedingAction(upcoming_sessions), [upcoming_sessions])

  const pulseTrends = useMemo(() => {
    const core = [
      buildTrendInsight('registrations', 'التسجيلات', analytics.registrations_monthly),
      buildTrendInsight('courses', 'إطلاق الدورات', analytics.courses_monthly),
      buildTrendInsight('sessions', 'تشغيل الجلسات', analytics.sessions_monthly),
    ]
    return core.filter((t) => t.direction !== 'unknown' || t.recentValue > 0)
  }, [analytics])

  const signals = recent_activity.slice(0, 5)

  return (
    <div dir="rtl" className="space-y-6 text-right">
      <DashboardHero
        greeting={hourGreeting()}
        name={userName ?? 'مدير البرامج والمسارات'}
        role="لوحة القرار التشغيلية"
        subtitle={
          <span className="flex flex-col gap-2">
            <span className="flex flex-wrap items-center gap-2">
              <BriefBadge tone={brief.tone} />
              <span className="text-white/55">{todayLabel()}</span>
            </span>
            <span className="text-base font-black text-white">{brief.headline}</span>
            <span className="text-[13px] font-medium text-white/70">{brief.subline}</span>
          </span>
        }
        actions={
          <>
            <Link to="/dashboard/admin/kpi" className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-[11px] font-black text-white backdrop-blur-sm transition hover:bg-white/18">
              تحليلات KPI
            </Link>
            <button type="button" onClick={onRefresh} disabled={loading} className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-[11px] font-black text-white backdrop-blur-sm transition hover:bg-white/18 disabled:opacity-60">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> تحديث
            </button>
          </>
        }
      />

      {/* Decision question: What is growing / declining? */}
      {(growing.length > 0 || declining.length > 0 || pulseTrends.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel>
            <PanelHeader eyebrow="ما الذي ينمو؟" title="زخم إيجابي" action={<TrendingUp size={18} className="text-emerald-600" />} />
            {growing.length === 0 ?
              <EmptyInsight message="لا نمو ملحوظ هذا الشهر" hint="عند زيادة التسجيلات أو إطلاق دورات جديدة ستظهر هنا." />
            : (
              <div className="grid gap-3 sm:grid-cols-2">
                {growing.map((t) => <PulseCard key={t.id} insight={t} />)}
              </div>
            )}
          </Panel>
          <Panel>
            <PanelHeader eyebrow="ما الذي يتراجع؟" title="يحتاج تدخلاً" action={<TrendingDown size={18} className="text-rose-600" />} />
            {declining.length === 0 ?
              <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-5">
                <CheckCircle2 size={20} className="text-emerald-600" />
                <p className="text-[12px] font-semibold text-emerald-900">لا مؤشرات تراجع — استمر في المراقبة الشهرية.</p>
              </div>
            : (
              <div className="grid gap-3 sm:grid-cols-2">
                {declining.map((t) => <PulseCard key={t.id} insight={t} />)}
              </div>
            )}
          </Panel>
        </div>
      )}

      {/* Core: trends + next actions */}
      <div className="grid gap-6 xl:grid-cols-[1.65fr_1fr]">
        <Panel>
          <PanelHeader
            eyebrow="اتجاه العمليات"
            title="هل مسار التعلّم ينمو؟"
            action={
              <Link to="/dashboard/admin/kpi" className="text-[11px] font-black text-[#0077B6] hover:underline">
                تفاصيل KPI
              </Link>
            }
          />
          <OperationsChart analytics={analytics} />
        </Panel>

        <Panel className="xl:sticky xl:top-4 xl:self-start">
          <PanelHeader
            eyebrow="ماذا تفعل الآن؟"
            title={`${actionQueue.length} إجراء${actionQueue.length !== 1 ? 'ات' : ''} مقترحة`}
            action={<Target size={18} className="text-[#0077B6]" />}
          />
          <ActionQueue items={actionQueue} />
        </Panel>
      </div>

      {/* Attention: bottleneck, risks, learning quality */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel>
          <PanelHeader eyebrow="أين الاختناق؟" title="مسار التسجيلات" />
          {bottleneck ?
            <>
              <p className="text-[13px] font-black text-[#0C2A4B]">{bottleneck.narrative}</p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#0C2A4B]/8">
                <div className="h-full rounded-full bg-[#F28C00]" style={{ width: `${Math.min(bottleneck.sharePercent, 100)}%` }} />
              </div>
              <Link to={bottleneck.href} className="mt-4 inline-flex items-center gap-1 text-[11px] font-black text-[#0077B6] hover:underline">
                تسريع المراجعة <ArrowRight size={12} />
              </Link>
            </>
          : registration_pipeline.every((p) => p.count === 0) ?
            <EmptyInsight message="لا تسجيلات بعد" hint="عند بدء استقبال الطلبات ستُحدّد هنا أكبر مرحلة تعطّل القبول." href="/dashboard/admin/registrations" label="إعداد التسجيلات" />
          : (
            <p className="text-[12px] font-semibold text-emerald-800">لا عنق زجاجة حرج — التسجيلات تتدفق بسلاسة.</p>
          )}
        </Panel>

        <Panel>
          <PanelHeader eyebrow="ما الذي يحتاج انتباه؟" title="تنبيهات تشغيلية" />
          {program_alerts.length === 0 ?
            <div className="flex items-center gap-3 rounded-xl bg-[#f8fafc] px-4 py-5">
              <Sparkles size={18} className="text-[#0077B6]" />
              <p className="text-[12px] font-semibold text-[#0C2A4B]/65">لا تنبيهات نشطة — الوضع التشغيلي مستقر.</p>
            </div>
          : (
            <div className="space-y-2">{program_alerts.map((a) => <AlertRow key={a.type} alert={a} />)}</div>
          )}
        </Panel>

        <Panel>
          <PanelHeader eyebrow="جودة التعلم" title="هل التسليم فعّال؟" />
          <p className="text-[12px] font-semibold leading-relaxed text-[#0C2A4B]/75">{learningHealth.combinedInsight}</p>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-[#0C2A4B]/8 bg-[#f8fafc] px-3 py-2.5">
              <span className="text-[11px] font-black text-[#0C2A4B]/55">الدورات المنتهية</span>
              <span className="text-lg font-black tabular-nums text-[#0C2A4B]">{summary.ended_courses ?? 0}</span>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-[10px] font-black text-[#0C2A4B]/50">
                <span>الحضور</span>
                <span>{summary.attendance_average > 0 ? `${summary.attendance_average}%` : '—'}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[#0C2A4B]/8">
                <div className="h-full rounded-full bg-[#0077B6]" style={{ width: `${Math.min(summary.attendance_average, 100)}%` }} />
              </div>
              <p className="mt-1 text-[10px] text-[#0C2A4B]/50">{learningHealth.attendanceNarrative}</p>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-[10px] font-black text-[#0C2A4B]/50">
                <span>إكمال المحتوى</span>
                <span>{summary.completion_average > 0 ? `${summary.completion_average}%` : '—'}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[#0C2A4B]/8">
                <div className="h-full rounded-full bg-[#F28C00]" style={{ width: `${Math.min(summary.completion_average, 100)}%` }} />
              </div>
              <p className="mt-1 text-[10px] text-[#0C2A4B]/50">{learningHealth.completionNarrative}</p>
            </div>
          </div>
        </Panel>
      </div>

      {/* Sessions requiring action */}
      {sessionsAction.length > 0 && (
        <Panel>
          <PanelHeader
            eyebrow="يتطلب إجراء"
            title="جلسات تحتاج تدخلك"
            action={
              <Link to="/dashboard/admin/lms/sessions" className="text-[11px] font-black text-[#0077B6] hover:underline">
                كل الجلسات
              </Link>
            }
          />
          <div className="grid gap-2 md:grid-cols-2">
            {sessionsAction.slice(0, 6).map((s) => <SessionActionRow key={s.id} session={s} />)}
          </div>
        </Panel>
      )}

      {/* Recent signals — only if meaningful change */}
      {signals.length > 0 && (
        <Panel>
          <PanelHeader eyebrow="ماذا تغيّر مؤخراً؟" title="إشارات النشاط" action={<BarChart3 size={18} className="text-[#0C2A4B]/35" />} />
          <ul className="divide-y divide-[#0C2A4B]/6">
            {signals.map((item: ActivityItem) => (
              <li key={item.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3 first:pt-0 last:pb-0">
                <p className="text-[12px] font-bold text-[#0C2A4B]">
                  {item.action_label}
                  {item.entity_name ? ` — ${item.entity_name}` : ''}
                </p>
                <p className="text-[10px] font-medium text-[#0C2A4B]/45">
                  {item.user_name ?? 'النظام'} · {formatDate(item.created_at)}
                </p>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {/* Footer strip: deep link to CRUD — not the focus */}
      <div className="flex flex-wrap items-center justify-center gap-4 rounded-xl border border-[#0C2A4B]/6 bg-[#f8fafc]/80 px-4 py-3">
        <span className="text-[10px] font-bold text-[#0C2A4B]/45">إدارة تفصيلية:</span>
        {[
          { href: '/dashboard/admin/programs', label: 'البرامج والدورات' },
          { href: '/dashboard/admin/registrations', label: 'التسجيلات' },
          { href: '/dashboard/admin/lms/sessions', label: 'الجلسات' },
          { href: '/dashboard/admin/reports', label: 'التقارير' },
        ].map((link) => (
          <Link key={link.href} to={link.href} className="text-[10px] font-black text-[#0077B6] hover:underline">
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
