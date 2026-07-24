import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertCircle, AlertTriangle, BarChart3, BookOpen, Calendar,
  CheckCircle2, ChevronLeft, Clock, Info, MapPin, RefreshCw,
  ShieldAlert, Star, Users, Video, X, Zap,
} from 'lucide-react'
import { fetchQualityDashboard } from '@/api/qualityApi'
import { QualityDrawer } from '@/components/quality/QualityDrawer'

// ─── API payload types ────────────────────────────────────────────────────────
interface QualityStats {
  quality_score?: number
  active_programs?: number
  completed_programs?: number
  pending_evaluations?: number
  critical_alerts?: number
  total_participants?: number
  attendance_rate?: number
  average_rating?: number
  total_evaluations?: number
  open_incidents?: number
}

interface QualityAlertItem {
  type: string
  title?: string | null
  message?: string | null
}

interface ProgramInstructor {
  name?: string | null
  title?: string | null
}

interface UpcomingProgram {
  id?: number
  type: string
  title?: string | null
  instructor?: ProgramInstructor | null
  starts_at?: string | null
  ends_at?: string | null
  participants_count?: number
  location?: string | null
  location_type?: string | null
  meeting_url_exists?: boolean
}

interface CompletedProgram {
  id?: number
  type: string
  title?: string | null
  instructor?: ProgramInstructor | null
  quality_status?: string
  participants_count?: number
  evaluations_count?: number
  average_rating?: number | null
  completed_at?: string | null
}

interface EvaluationReadinessItem {
  id: number
  type: string
  reason: string
  title?: string | null
  instructor?: string | null
  completed_at?: string | null
  participants_count?: number
  evaluations_count?: number
}

interface InstructorQualityItem {
  id: number
  name?: string
  image?: string | null
  active_courses?: number
  completed_courses?: number
  average_rating?: number | null
}

interface RatingCommentItem {
  rating?: number | null
  comment?: string | null
}

interface RatingAnalytics {
  average?: number | null
  total_count?: number
  distribution?: Record<number, number>
  latest_comments?: RatingCommentItem[]
}

interface RecentActivityItem {
  description?: string | null
  action?: string | null
  user?: { name?: string | null } | null
  created_at?: string | null
}

interface QualityDashboardData {
  stats?: QualityStats
  alerts?: QualityAlertItem[]
  recent_activities?: RecentActivityItem[]
  upcoming_program?: UpcomingProgram | null
  latest_completed_program?: CompletedProgram | null
  evaluation_readiness?: EvaluationReadinessItem[]
  instructor_quality?: InstructorQualityItem[]
  rating_analytics?: RatingAnalytics
}

/** Item shown in the program drawer — any program shape plus the `_section` marker. */
interface ProgramDrawerItem {
  _section: string
  type: string
  title?: string | null
  quality_status?: string
  instructor?: ProgramInstructor | string | null
  starts_at?: string | null
  ends_at?: string | null
  completed_at?: string | null
  location?: string | null
  participants_count?: number
  attended_count?: number
  attendance_rate?: number
  evaluations_count?: number
  average_rating?: number | null
}

// ─── Utility helpers ──────────────────────────────────────────────────────────
function n(v: number | null | undefined, decimals = 0) {
  const num = Number(v ?? 0)
  return isNaN(num) ? '0' : num.toLocaleString('en-US', { maximumFractionDigits: decimals })
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function timeAgo(d: string | null | undefined) {
  if (!d) return ''
  const ms = Date.now() - new Date(d).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return 'الآن'
  if (mins < 60) return `منذ ${mins} دق`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `منذ ${hrs} س`
  return `منذ ${Math.floor(hrs / 24)} ي`
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-slate-200 animate-pulse rounded-xl ${className}`} />
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${type === 'course' ? 'bg-blue-100 text-blue-700' : 'bg-violet-100 text-violet-700'}`}>
      {type === 'course' ? 'دورة' : 'ورشة'}
    </span>
  )
}

function QualityStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved: 'bg-emerald-100 text-emerald-700',
    submitted: 'bg-blue-100 text-blue-700',
    draft: 'bg-slate-100 text-slate-600',
    not_reviewed: 'bg-amber-100 text-amber-700',
  }
  const labels: Record<string, string> = {
    approved: 'تم التقييم',
    submitted: 'مرسل',
    draft: 'مسودة',
    not_reviewed: 'لم يُقيَّم',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${map[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {labels[status] ?? status}
    </span>
  )
}

function StarRating({ rating }: { rating: number | null | undefined }) {
  const r = Number(rating ?? 0)
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`w-3 h-3 ${i <= Math.round(r) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`}
        />
      ))}
      <span className="text-xs text-slate-500 mr-1">{r > 0 ? n(r, 1) : '—'}</span>
    </div>
  )
}

// SVG ring for quality score
function QualityRing({ score, size = 120 }: { score: number; size?: number }) {
  const r = 44
  const circ = 2 * Math.PI * r
  const pct = Math.min(100, Math.max(0, score))
  const stroke = circ - (pct / 100) * circ
  const color = pct >= 70 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444'

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="rotate-[-90deg]">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
      <motion.circle
        cx="50" cy="50" r={r} fill="none"
        stroke={color} strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: stroke }}
        transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
      />
    </svg>
  )
}

// Alert icon by type
function AlertIcon({ type }: { type: string }) {
  if (type === 'critical') return <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
  if (type === 'warning') return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
  return <Info className="w-4 h-4 text-blue-500 shrink-0" />
}

function alertBg(type: string) {
  if (type === 'critical') return 'bg-rose-50 border-rose-200'
  if (type === 'warning') return 'bg-amber-50 border-amber-200'
  return 'bg-blue-50 border-blue-200'
}

// Reason label for evaluation readiness
function reasonBadge(reason: string) {
  const map: Record<string, { label: string; cls: string }> = {
    no_evaluation: { label: 'لا تقييمات', cls: 'bg-rose-100 text-rose-700' },
    no_review: { label: 'لا مراجعة جودة', cls: 'bg-amber-100 text-amber-700' },
    low_rating: { label: 'تقييم منخفض', cls: 'bg-orange-100 text-orange-700' },
    missing_attendance: { label: 'بيانات حضور ناقصة', cls: 'bg-slate-100 text-slate-600' },
  }
  const { label, cls } = map[reason] ?? { label: reason, cls: 'bg-slate-100 text-slate-600' }
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${cls}`}>{label}</span>
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function QualityDashboardPage() {
  const [data, setData]       = useState<QualityDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [drawerItem, setDrawerItem] = useState<ProgramDrawerItem | null>(null)
  const [dismissed, setDismissed]   = useState<Set<number>>(new Set())

  const load = useCallback(() => {
    setLoading(true)
    fetchQualityDashboard()
      .then(d => { setData(d); setError(null) })
      .catch(() => setError('تعذّر تحميل البيانات'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const stats: QualityStats = data?.stats ?? {}
  const alerts   = (data?.alerts  ?? []).filter((_, i) => !dismissed.has(i))
  const recent   = data?.recent_activities ?? []
  const upcoming = data?.upcoming_program
  const latest   = data?.latest_completed_program
  const evalList = data?.evaluation_readiness ?? []
  const instrList = data?.instructor_quality ?? []
  const ratingA: RatingAnalytics = data?.rating_analytics ?? {}

  return (
    <div dir="rtl" className="min-h-screen bg-[#f8f9fb] p-5 space-y-5">

      {/* ── Error banner ──────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="flex-1 text-sm">{error}</span>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-100 hover:bg-rose-200 rounded-xl text-xs font-semibold transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> إعادة المحاولة
          </button>
        </div>
      )}

      {/* ── Hero band ─────────────────────────────────────────────────────── */}
      <div className="bg-deepBlue rounded-3xl overflow-hidden">
        <div className="px-8 py-7 flex flex-col md:flex-row items-start md:items-center gap-6">
          {/* Quality ring */}
          <div className="relative shrink-0">
            {loading ? (
              <div className="w-24 h-24 rounded-full bg-white/10 animate-pulse" />
            ) : (
              <div className="relative w-24 h-24">
                <QualityRing score={stats.quality_score ?? 0} size={96} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-black text-white leading-none">{n(stats.quality_score ?? 0)}</span>
                  <span className="text-[9px] text-white/60 font-medium mt-0.5">جودة %</span>
                </div>
              </div>
            )}
          </div>

          {/* Title block */}
          <div className="flex-1 min-w-0">
            <p className="text-white/50 text-xs font-semibold tracking-widest uppercase mb-1">مركز قيادة الجودة</p>
            <h1 className="text-2xl font-black text-white leading-tight">لوحة الجودة والحوكمة</h1>
            <p className="text-white/60 text-sm mt-1">متابعة جودة البرامج، الحضور، التقييمات، وأداء المدربين</p>
          </div>

          {/* KPI pills */}
          <div className="flex flex-wrap gap-2 md:shrink-0">
            {loading ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 w-28 bg-white/10 rounded-2xl animate-pulse" />
            )) : [
              { label: 'برامج نشطة', value: stats.active_programs ?? 0, icon: Zap, accent: 'text-emerald-300' },
              { label: 'مكتملة', value: stats.completed_programs ?? 0, icon: CheckCircle2, accent: 'text-blue-300' },
              { label: 'تنتظر تقييم', value: stats.pending_evaluations ?? 0, icon: Clock, accent: 'text-amber-300' },
              { label: 'تنبيهات', value: stats.critical_alerts ?? 0, icon: AlertTriangle, accent: 'text-rose-300' },
              { label: 'مشاركون', value: stats.total_participants ?? 0, icon: Users, accent: 'text-violet-300' },
            ].map(kpi => (
              <div key={kpi.label} className="flex flex-col items-center bg-white/10 backdrop-blur rounded-2xl px-4 py-3 min-w-[90px]">
                <kpi.icon className={`w-4 h-4 ${kpi.accent} mb-1`} />
                <span className="text-xl font-black text-white">{n(kpi.value)}</span>
                <span className="text-[10px] text-white/50 font-medium">{kpi.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Attendance / rating strip */}
        <div className="border-t border-white/10 px-8 py-3 flex flex-wrap gap-6">
          {[
            { label: 'نسبة الحضور', value: `${n(stats.attendance_rate ?? 0, 1)}%`, good: (stats.attendance_rate ?? 0) >= 70 },
            { label: 'متوسط التقييم', value: `${n(stats.average_rating ?? 0, 1)}/5` },
            { label: 'إجمالي التقييمات', value: n(stats.total_evaluations ?? 0) },
            { label: 'حوادث مفتوحة', value: n(stats.open_incidents ?? 0) },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-2">
              <span className="text-white/40 text-xs">{s.label}</span>
              <span className={`text-sm font-bold ${s.good === false ? 'text-rose-300' : 'text-white'}`}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Alert dismissible banners ─────────────────────────────────────── */}
      <AnimatePresence>
        {!loading && alerts.slice(0, 4).map((alert, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className={`flex items-start gap-3 px-4 py-3 rounded-2xl border ${alertBg(alert.type)}`}
          >
            <AlertIcon type={alert.type} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800">{alert.title}</p>
              <p className="text-xs text-slate-500 mt-0.5">{alert.message}</p>
            </div>
            <button onClick={() => setDismissed(prev => new Set([...prev, i]))} className="text-slate-400 hover:text-slate-600 shrink-0">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* ── Program cards row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Upcoming */}
        <div className="bg-white rounded-3xl border border-deepBlue/[0.06] shadow-sm overflow-hidden">
          <div className="px-6 pt-5 pb-4 border-b border-slate-50">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">البرنامج القادم</span>
            </div>
          </div>
          {loading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : !upcoming ? (
            <div className="flex flex-col items-center justify-center py-14 text-slate-400">
              <Calendar className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">لا يوجد برنامج قادم</p>
              <p className="text-xs text-slate-400 mt-1">ستظهر البرامج المجدولة هنا</p>
            </div>
          ) : (
            <div className="p-6">
              <div className="flex items-start justify-between gap-2 mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <TypeBadge type={upcoming.type} />
                  </div>
                  <h3 className="font-black text-deepBlue text-base leading-snug">{upcoming.title}</h3>
                  {upcoming.instructor && (
                    <p className="text-sm text-slate-500 mt-1">{upcoming.instructor.name}{upcoming.instructor.title ? ` · ${upcoming.instructor.title}` : ''}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-slate-50 rounded-2xl p-3">
                  <p className="text-[10px] text-slate-400 font-semibold mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> الموعد</p>
                  <p className="text-sm font-bold text-deepBlue">{fmtDate(upcoming.starts_at)}</p>
                  {upcoming.ends_at && <p className="text-xs text-slate-400">{fmtDate(upcoming.ends_at)}</p>}
                </div>
                <div className="bg-slate-50 rounded-2xl p-3">
                  <p className="text-[10px] text-slate-400 font-semibold mb-1 flex items-center gap-1"><Users className="w-3 h-3" /> المشاركون</p>
                  <p className="text-2xl font-black text-deepBlue">{n(upcoming.participants_count)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-4">
                {upcoming.location_type === 'online' || upcoming.meeting_url_exists
                  ? <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full font-medium"><Video className="w-3 h-3" /> عبر الإنترنت</span>
                  : upcoming.location
                    ? <span className="flex items-center gap-1 text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full font-medium"><MapPin className="w-3 h-3" /> {upcoming.location}</span>
                    : null
                }
                <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full font-medium">
                  <Clock className="w-3 h-3" /> قائمة التحقق: معلقة
                </span>
              </div>
              <button
                onClick={() => setDrawerItem({ ...upcoming, _section: 'program' })}
                className="w-full bg-deepBlue hover:bg-blue-900 text-white py-2.5 rounded-2xl text-sm font-bold transition-colors"
              >
                عرض التفاصيل
              </button>
            </div>
          )}
        </div>

        {/* Latest completed */}
        <div className="bg-white rounded-3xl border border-deepBlue/[0.06] shadow-sm overflow-hidden">
          <div className="px-6 pt-5 pb-4 border-b border-slate-50">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-slate-400" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">آخر برنامج مكتمل</span>
            </div>
          </div>
          {loading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : !latest ? (
            <div className="flex flex-col items-center justify-center py-14 text-slate-400">
              <BookOpen className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">لا يوجد برنامج مكتمل</p>
            </div>
          ) : (
            <div className="p-6">
              <div className="flex items-start justify-between gap-2 mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <TypeBadge type={latest.type} />
                    <QualityStatusBadge status={latest.quality_status ?? ''} />
                  </div>
                  <h3 className="font-black text-deepBlue text-base leading-snug">{latest.title}</h3>
                  {latest.instructor && <p className="text-sm text-slate-500 mt-1">{latest.instructor.name}</p>}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-slate-50 rounded-2xl p-3 text-center">
                  <p className="text-2xl font-black text-deepBlue">{n(latest.participants_count)}</p>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">مشارك</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-3 text-center">
                  <p className="text-2xl font-black text-deepBlue">{n(latest.evaluations_count)}</p>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">تقييم</p>
                </div>
                <div className="bg-amber-50 rounded-2xl p-3 text-center">
                  <p className="text-2xl font-black text-amber-600">{latest.average_rating ? n(latest.average_rating, 1) : '—'}</p>
                  <p className="text-[10px] text-amber-500 font-semibold mt-0.5">متوسط</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-4">اكتمل في: {fmtDate(latest.completed_at)}</p>
              <button
                onClick={() => setDrawerItem({ ...latest, _section: 'program' })}
                className="w-full border border-deepBlue/20 hover:bg-deepBlue hover:text-white text-deepBlue py-2.5 rounded-2xl text-sm font-bold transition-colors"
              >
                فتح التقييم
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Evaluation readiness ─────────────────────────────────────────── */}
      {(loading || evalList.length > 0) && (
        <div className="bg-white rounded-3xl border border-deepBlue/[0.06] shadow-sm overflow-hidden">
          <div className="px-6 pt-5 pb-4 border-b border-slate-50 flex items-center justify-between">
            <div>
              <h2 className="font-black text-deepBlue text-sm">برامج تحتاج إلى تقييم</h2>
              <p className="text-xs text-slate-400 mt-0.5">مكتملة بدون مراجعة جودة أو تقييمات</p>
            </div>
            {!loading && <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full">{evalList.length}</span>}
          </div>
          {loading ? (
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {evalList.slice(0, 8).map((item, i) => (
                <motion.button
                  key={`${item.type}-${item.id}`}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => setDrawerItem({ ...item, _section: 'program' })}
                  className="w-full text-right flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <TypeBadge type={item.type} />
                      {reasonBadge(item.reason)}
                    </div>
                    <p className="text-sm font-bold text-deepBlue truncate">{item.title}</p>
                    {item.instructor && <p className="text-xs text-slate-400">{item.instructor}</p>}
                  </div>
                  <div className="text-left shrink-0 space-y-0.5">
                    <p className="text-xs text-slate-400">{fmtDate(item.completed_at)}</p>
                    <p className="text-xs text-slate-500">{n(item.participants_count)} مشارك · {n(item.evaluations_count)} تقييم</p>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-slate-300 shrink-0" />
                </motion.button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Bottom grid: rating analytics + instructors + alerts + activity ─ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Rating analytics (spans 1 col) */}
        <div className="bg-white rounded-3xl border border-deepBlue/[0.06] shadow-sm p-6">
          <h2 className="font-black text-deepBlue text-sm mb-4 flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400" /> تحليلات التقييم
          </h2>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4 mb-5">
                <div className="text-center">
                  <p className="text-4xl font-black text-amber-500">{n(ratingA.average ?? 0, 1)}</p>
                  <p className="text-xs text-slate-400 mt-0.5">من 5</p>
                </div>
                <div className="flex-1">
                  <StarRating rating={ratingA.average} />
                  <p className="text-xs text-slate-400 mt-1">{n(ratingA.total_count ?? 0)} تقييم إجمالي</p>
                </div>
              </div>
              {/* Distribution bars */}
              {[5, 4, 3, 2, 1].map(score => {
                const cnt = ratingA.distribution?.[score] ?? 0
                const total = ratingA.total_count ?? 1
                const pct = total > 0 ? Math.round((cnt / total) * 100) : 0
                return (
                  <div key={score} className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] text-slate-400 w-3 shrink-0">{score}</span>
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] text-slate-400 w-6 text-left">{cnt}</span>
                  </div>
                )
              })}
              {/* Latest comments */}
              {(ratingA.latest_comments ?? []).length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">أحدث التعليقات</p>
                  {(ratingA.latest_comments ?? []).slice(0, 3).map((c, i) => (
                    <div key={i} className="bg-slate-50 rounded-xl p-2.5">
                      <StarRating rating={c.rating} />
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">{c.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Instructor quality (spans 1 col) */}
        <div className="bg-white rounded-3xl border border-deepBlue/[0.06] shadow-sm p-6">
          <h2 className="font-black text-deepBlue text-sm mb-4 flex items-center gap-2">
            <Users className="w-4 h-4" /> أداء المدربين
          </h2>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : instrList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <Users className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">لا يوجد مدربون نشطون</p>
            </div>
          ) : (
            <div className="space-y-2">
              {instrList.slice(0, 6).map((inst) => (
                <div key={inst.id} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 transition-colors">
                  {inst.image ? (
                    <img src={inst.image} alt={inst.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-deepBlue/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-black text-deepBlue">{(inst.name ?? '?')[0]}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-deepBlue truncate">{inst.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-400">{n(inst.active_courses)} نشط</span>
                      <span className="text-[10px] text-slate-300">·</span>
                      <span className="text-[10px] text-slate-400">{n(inst.completed_courses)} مكتمل</span>
                    </div>
                  </div>
                  <div className="text-left shrink-0">
                    {inst.average_rating != null ? (
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span className="text-xs font-bold text-slate-700">{n(inst.average_rating, 1)}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alerts + Recent activity (spans 1 col) */}
        <div className="space-y-5">
          {/* Alerts panel */}
          <div className="bg-white rounded-3xl border border-deepBlue/[0.06] shadow-sm p-6">
            <h2 className="font-black text-deepBlue text-sm mb-4 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500" /> تنبيهات الجودة
            </h2>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : (data?.alerts ?? []).length === 0 ? (
              <div className="flex items-center gap-2 py-4 text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-medium">لا توجد تنبيهات</span>
              </div>
            ) : (
              <div className="space-y-2">
                {(data?.alerts ?? []).slice(0, 5).map((alert, i) => (
                  <div key={i} className={`flex items-start gap-2.5 p-3 rounded-xl border ${alertBg(alert.type)}`}>
                    <AlertIcon type={alert.type} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-700">{alert.title}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{alert.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent activity */}
          <div className="bg-white rounded-3xl border border-deepBlue/[0.06] shadow-sm p-6">
            <h2 className="font-black text-deepBlue text-sm mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> النشاط الأخير
            </h2>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9" />)}
              </div>
            ) : recent.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-sm">لا يوجد نشاط حديث</div>
            ) : (
              <div className="space-y-1">
                {recent.slice(0, 7).map((act, i) => (
                  <div key={i} className="flex items-start gap-2.5 py-2 border-b border-slate-50 last:border-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-700 truncate">{act.description ?? act.action}</p>
                      <p className="text-[10px] text-slate-400">{act.user?.name ?? '—'} · {timeAgo(act.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Program detail drawer ─────────────────────────────────────────── */}
      <QualityDrawer
        open={!!drawerItem}
        onClose={() => setDrawerItem(null)}
        title={drawerItem?.title ?? 'تفاصيل البرنامج'}
        width="max-w-xl"
      >
        {drawerItem && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 flex-wrap">
              <TypeBadge type={drawerItem.type} />
              {drawerItem.quality_status && <QualityStatusBadge status={drawerItem.quality_status} />}
            </div>

            {/* Program info */}
            <section>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">معلومات البرنامج</h3>
              <div className="bg-slate-50 rounded-2xl p-4 space-y-2 text-sm">
                {drawerItem.instructor && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">المدرب</span>
                    <span className="font-semibold text-deepBlue">{typeof drawerItem.instructor === 'string' ? drawerItem.instructor : drawerItem.instructor.name}</span>
                  </div>
                )}
                {drawerItem.starts_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">تاريخ البدء</span>
                    <span className="font-medium">{fmtDate(drawerItem.starts_at)}</span>
                  </div>
                )}
                {(drawerItem.ends_at ?? drawerItem.completed_at) && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">تاريخ الانتهاء</span>
                    <span className="font-medium">{fmtDate(drawerItem.ends_at ?? drawerItem.completed_at)}</span>
                  </div>
                )}
                {drawerItem.location && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">الموقع</span>
                    <span className="font-medium">{drawerItem.location}</span>
                  </div>
                )}
              </div>
            </section>

            {/* Participants */}
            <section>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">المشاركون</h3>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-blue-50 rounded-2xl p-3 text-center">
                  <p className="text-2xl font-black text-blue-700">{n(drawerItem.participants_count ?? 0)}</p>
                  <p className="text-[10px] text-blue-500 font-semibold mt-0.5">مسجل</p>
                </div>
                <div className="bg-emerald-50 rounded-2xl p-3 text-center">
                  <p className="text-2xl font-black text-emerald-700">{n(drawerItem.attended_count ?? 0)}</p>
                  <p className="text-[10px] text-emerald-500 font-semibold mt-0.5">حضر</p>
                </div>
                <div className="bg-amber-50 rounded-2xl p-3 text-center">
                  <p className="text-2xl font-black text-amber-700">{n(drawerItem.attendance_rate ?? 0, 1)}%</p>
                  <p className="text-[10px] text-amber-500 font-semibold mt-0.5">نسبة الحضور</p>
                </div>
              </div>
            </section>

            {/* Evaluations */}
            <section>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">التقييمات</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 rounded-2xl p-3 text-center">
                  <p className="text-2xl font-black text-deepBlue">{n(drawerItem.evaluations_count ?? 0)}</p>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">تقييم مستلم</p>
                </div>
                <div className="bg-amber-50 rounded-2xl p-3 text-center">
                  <p className="text-2xl font-black text-amber-600">{drawerItem.average_rating ? n(drawerItem.average_rating, 1) : '—'}</p>
                  <p className="text-[10px] text-amber-500 font-semibold mt-0.5">متوسط التقييم</p>
                </div>
              </div>
            </section>

            {/* Action buttons */}
            <section className="space-y-2 pt-2">
              <button className="w-full bg-deepBlue hover:bg-blue-900 text-white py-3 rounded-2xl text-sm font-bold transition-colors">
                بدء مراجعة الجودة
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button className="border border-deepBlue/20 text-deepBlue hover:bg-slate-50 py-2.5 rounded-2xl text-xs font-bold transition-colors">
                  إنشاء حادثة
                </button>
                <button className="border border-deepBlue/20 text-deepBlue hover:bg-slate-50 py-2.5 rounded-2xl text-xs font-bold transition-colors">
                  تصدير تقرير
                </button>
              </div>
            </section>
          </div>
        )}
      </QualityDrawer>
    </div>
  )
}
