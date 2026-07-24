import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity,
  TrendingUp,
  CheckCircle2,
  BookOpen,
  X,
  AlertTriangle,
  Award,
  ClipboardList,
  MapPin,
} from 'lucide-react'
import { adminListProgress, adminFetchStudentDetail, type StudentDetail } from '@/api/adminLmsApi'
import { LmsEmptyState } from '@/components/lms'
import AdminLmsShell from '@/components/lms/AdminLmsShell'
import { LmsFilterBar, countActiveFilters, lmsSelectClass } from '@/components/lms/management'
import { fmtDate, normCourseTitle, normStatus, fmtNum } from '@/components/lms/lmsFormatters'
import EmcDatePicker from '@/components/ui/EmcDatePicker'

type ProgressRow = {
  id: number
  user_id?: number | null
  user_name?: string | null
  user_email?: string | null
  course_id?: number | null
  course_title?: string | null
  course_name?: string | null
  track_id?: number | null
  progress_percentage?: number | null
  completed_sessions?: number | null
  total_sessions?: number | null
  attendance_percentage?: number | null
  status?: string | null
  completed_at?: string | null
  last_activity_at?: string | null
  updated_at?: string | null
  label?: string | null
  subtitle?: string | null
  user?: { name?: string | null } | null
  course?: { title?: string | null } | null
}

function normRow(r: ProgressRow): ProgressRow {
  return {
    ...r,
    user_name:           r.user_name ?? r.user?.name ?? r.label ?? '—',
    course_title:        normCourseTitle(r.course_title ?? r.course_name ?? r.course?.title ?? r.subtitle),
    progress_percentage: r.progress_percentage ?? 0,
    status:              r.status ?? 'in_progress',
  }
}

function ProgressBar({ pct }: { pct: number }) {
  const clamped = Math.min(100, Math.max(0, pct))
  const fill = clamped >= 100 ? 'bg-emerald-400' : clamped >= 50 ? 'bg-customBlue' : 'bg-customOrange'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-deepBlue/[0.08]">
        <div className={`h-full rounded-full transition-all ${fill}`} style={{ width: `${clamped}%` }} />
      </div>
      <span className="font-latin text-xs font-black text-deepBlue/60">{clamped}%</span>
    </div>
  )
}

const statusBadge: Record<string, string> = {
  completed:   'bg-emerald-50 text-emerald-700 ring-emerald-100',
  in_progress: 'bg-customBlue/[0.07] text-customBlue ring-customBlue/10',
  not_started: 'bg-slate-50 text-slate-500 ring-slate-100',
}

const riskColors: Record<string, { bg: string; text: string; label: string }> = {
  on_track: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'على المسار' },
  watch:    { bg: 'bg-amber-50',   text: 'text-amber-700',   label: 'متابعة'    },
  at_risk:  { bg: 'bg-rose-50',    text: 'text-rose-700',    label: 'في خطر'    },
}

// ─── Student Detail Drawer ────────────────────────────────────────────────────

const TABS = [
  { id: 'overview',    label: 'نظرة عامة'           },
  { id: 'courses',     label: 'الدورات'              },
  { id: 'paths',       label: 'المسارات التعليمية'   },
  { id: 'attendance',  label: 'الجلسات والحضور'      },
  { id: 'assignments', label: 'الواجبات'             },
  { id: 'evaluations', label: 'التقييمات'            },
  { id: 'activity',    label: 'النشاط'               },
] as const

type TabId = typeof TABS[number]['id']

function SkeletonLine({ w = 'w-full' }: { w?: string }) {
  return <div className={`h-3.5 animate-pulse rounded-full bg-deepBlue/[0.06] ${w}`} />
}

function DrawerSkeleton() {
  return (
    <div className="space-y-4 p-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonLine key={i} w={i % 3 === 0 ? 'w-1/2' : i % 3 === 1 ? 'w-3/4' : 'w-full'} />
      ))}
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-deepBlue/[0.07] bg-white p-4 shadow-sm">
      <p className="text-[11px] font-black uppercase tracking-wide text-deepBlue/40">{label}</p>
      <p className="mt-1 font-latin text-2xl font-black text-deepBlue">{value}</p>
      {sub ? <p className="mt-0.5 text-[11px] font-semibold text-deepBlue/35">{sub}</p> : null}
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-deepBlue/30">
      <ClipboardList size={32} className="opacity-40" />
      <p className="text-sm font-semibold">{label}</p>
    </div>
  )
}

function OverviewTab({ d }: { d: StudentDetail }) {
  const { summary } = d
  const risk = riskColors[summary.risk_level] ?? riskColors.on_track
  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center gap-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-customBlue/10 text-xl font-black text-customBlue">
          {d.student.name.charAt(0)}
        </div>
        <div>
          <p className="text-lg font-black text-deepBlue">{d.student.name}</p>
          <p className="font-latin text-sm font-semibold text-deepBlue/45">{d.student.email}</p>
          {summary.last_activity_at ?
            <p className="mt-0.5 text-[11px] font-semibold text-deepBlue/30">آخر نشاط: {fmtDate(summary.last_activity_at)}</p>
          : null}
        </div>
        <span className={`mr-auto rounded-full px-3 py-1 text-[11px] font-black ${risk.bg} ${risk.text}`}>
          {risk.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="الدورات" value={fmtNum(summary.total_courses)} sub={`${fmtNum(summary.completed_courses)} مكتملة`} />
        <StatCard label="متوسط التقدم" value={`${fmtNum(summary.avg_progress)}%`} />
        <StatCard label="الحضور" value={`${fmtNum(summary.attendance_pct)}%`} sub={`${fmtNum(summary.attended_sessions)} جلسة`} />
        <StatCard label="الشهادات" value={fmtNum(summary.certificates_count)} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="واجبات مُسلَّمة" value={fmtNum(summary.assignments_submitted)} />
        <StatCard label="واجبات معلقة" value={fmtNum(summary.assignments_pending)} />
        {summary.avg_assignment_score !== null ?
          <StatCard label="متوسط الدرجات" value={`${summary.avg_assignment_score}%`} />
        : null}
      </div>
    </div>
  )
}

function CoursesTab({ d }: { d: StudentDetail }) {
  if (!d.courses.length) return <EmptyState label="لم يُسجَّل تقدم في أي دورة" />
  return (
    <div className="divide-y divide-deepBlue/[0.04] p-4">
      {d.courses.map((c, i) => {
        const st = c.status ?? 'in_progress'
        const bdg = statusBadge[st] ?? 'bg-slate-50 text-slate-500 ring-slate-100'
        return (
          <div key={i} className="flex items-center gap-4 py-3.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold text-deepBlue">{c.title}</p>
              {c.last_activity_at ?
                <p className="mt-0.5 text-[11px] font-semibold text-deepBlue/35">{fmtDate(c.last_activity_at)}</p>
              : null}
            </div>
            <div className="shrink-0 text-left">
              <ProgressBar pct={c.progress} />
              {(c.total_sessions ?? 0) > 0 ?
                <p className="mt-1 font-latin text-[10px] font-bold text-deepBlue/40 text-center">
                  {c.completed_sessions ?? 0}/{c.total_sessions}
                </p>
              : null}
            </div>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ring-1 ${bdg}`}>
              {normStatus(st)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function PathsTab({ d }: { d: StudentDetail }) {
  if (!d.learning_paths.length) return <EmptyState label="لا يوجد تسجيل في مسارات تعليمية" />
  return (
    <div className="divide-y divide-deepBlue/[0.04] p-4">
      {d.learning_paths.map((p, i) => (
        <div key={i} className="flex items-center gap-4 py-3.5">
          <MapPin size={16} className="shrink-0 text-customOrange opacity-60" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-bold text-deepBlue">{p.title}</p>
            {p.enrolled_at ?
              <p className="mt-0.5 text-[11px] font-semibold text-deepBlue/35">تسجيل: {fmtDate(p.enrolled_at)}</p>
            : null}
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-black ring-1 ${
            p.status === 'completed' ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
            : 'bg-customBlue/[0.07] text-customBlue ring-customBlue/10'
          }`}>
            {normStatus(p.status)}
          </span>
        </div>
      ))}
    </div>
  )
}

function AttendanceTab({ d }: { d: StudentDetail }) {
  if (!d.attendance.length) return <EmptyState label="لا توجد سجلات حضور" />
  return (
    <div className="divide-y divide-deepBlue/[0.04] p-4">
      {d.attendance.map((a, i) => (
        <div key={i} className="flex items-center gap-4 py-3">
          <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${
            a.status === 'present' || a.status === 'attended' ? 'bg-emerald-400' : 'bg-rose-400'
          }`} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-bold text-deepBlue">{a.session_title}</p>
          </div>
          <p className="shrink-0 text-[11px] font-semibold text-deepBlue/40">{fmtDate(a.date)}</p>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ring-1 ${
            a.status === 'present' || a.status === 'attended'
              ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
              : 'bg-rose-50 text-rose-600 ring-rose-100'
          }`}>
            {a.status === 'present' || a.status === 'attended' ? 'حاضر' : 'غائب'}
          </span>
        </div>
      ))}
    </div>
  )
}

function AssignmentsTab({ d }: { d: StudentDetail }) {
  if (!d.assignments.length) return <EmptyState label="لا توجد واجبات مُسلَّمة" />
  return (
    <div className="divide-y divide-deepBlue/[0.04] p-4">
      {d.assignments.map((a, i) => (
        <div key={i} className="flex items-center gap-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-bold text-deepBlue">{a.title}</p>
            {a.submitted_at ?
              <p className="mt-0.5 text-[11px] font-semibold text-deepBlue/35">{fmtDate(a.submitted_at)}</p>
            : null}
          </div>
          {a.score !== null ?
            <span className="font-latin text-sm font-black text-customBlue">{a.score}%</span>
          : null}
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ring-1 ${
            a.status === 'graded' ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
            : a.status === 'submitted' ? 'bg-customBlue/[0.07] text-customBlue ring-customBlue/10'
            : 'bg-slate-50 text-slate-500 ring-slate-100'
          }`}>
            {a.status === 'graded' ? 'مصحَّح' : a.status === 'submitted' ? 'مُسلَّم' : 'معلق'}
          </span>
        </div>
      ))}
    </div>
  )
}

function EvaluationsTab({ d }: { d: StudentDetail }) {
  if (!d.evaluations.length) return <EmptyState label="لا توجد شهادات أو تقييمات" />
  return (
    <div className="divide-y divide-deepBlue/[0.04] p-4">
      {d.evaluations.map((e) => (
        <div key={e.id} className="flex items-center gap-4 py-3">
          <Award size={16} className="shrink-0 text-amber-500" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-bold text-deepBlue">{e.title}</p>
            {e.issued_at ?
              <p className="mt-0.5 text-[11px] font-semibold text-deepBlue/35">{fmtDate(e.issued_at)}</p>
            : null}
          </div>
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700 ring-1 ring-amber-100">
            {e.type === 'completion' ? 'إتمام' : 'تميز'}
          </span>
        </div>
      ))}
    </div>
  )
}

function ActivityTab({ d }: { d: StudentDetail }) {
  if (!d.activity.length) return <EmptyState label="لا يوجد نشاط مسجَّل" />
  return (
    <div className="space-y-1 p-4">
      {d.activity.map((a, i) => (
        <div key={i} className="flex items-start gap-3 rounded-xl px-3 py-2.5 hover:bg-deepBlue/[0.02]">
          <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-customBlue/40" />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-deepBlue/70">{a.description}</p>
          </div>
          <p className="shrink-0 text-[11px] font-semibold text-deepBlue/30">{fmtDate(a.date)}</p>
        </div>
      ))}
    </div>
  )
}

function StudentDrawer({
  userId,
  userName,
  onClose,
}: {
  userId: number
  userName: string
  onClose: () => void
}) {
  const [tab, setTab] = useState<TabId>('overview')
  const [detail, setDetail] = useState<StudentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [drawerError, setDrawerError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setDrawerError(null)
    adminFetchStudentDetail(userId)
      .then(setDetail)
      .catch(() => setDrawerError('تعذّر تحميل بيانات الطالب.'))
      .finally(() => setLoading(false))
  }, [userId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="drawer-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[150] bg-[#0F172A]/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.aside
        key="drawer"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="fixed bottom-0 right-0 top-0 z-[160] flex w-full max-w-2xl flex-col bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`تفاصيل المتعلم: ${userName}`}
        aria-modal
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-deepBlue/[0.07] bg-gradient-to-l from-deepBlue/5 to-white px-5 py-4">
          <div>
            <p className="text-sm font-black text-deepBlue">{userName}</p>
            <p className="text-[11px] font-semibold text-deepBlue/40">تفاصيل التقدم والأداء</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl border border-deepBlue/10 text-deepBlue/50 transition hover:bg-deepBlue/5"
            aria-label="إغلاق"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="overflow-x-auto border-b border-deepBlue/[0.06] bg-deepBlue/[0.01]">
          <div className="flex min-w-max gap-0 px-4">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`whitespace-nowrap border-b-2 px-3 py-3 text-[12px] font-black transition ${
                  tab === t.id
                    ? 'border-customBlue text-customBlue'
                    : 'border-transparent text-deepBlue/45 hover:text-deepBlue/70'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? <DrawerSkeleton /> :
           drawerError ? (
            <div className="flex flex-col items-center justify-center gap-3 p-12 text-rose-600">
              <AlertTriangle size={32} className="opacity-60" />
              <p className="text-sm font-semibold">{drawerError}</p>
            </div>
          ) : detail ? (
            <>
              {tab === 'overview'    && <OverviewTab d={detail} />}
              {tab === 'courses'     && <CoursesTab d={detail} />}
              {tab === 'paths'       && <PathsTab d={detail} />}
              {tab === 'attendance'  && <AttendanceTab d={detail} />}
              {tab === 'assignments' && <AssignmentsTab d={detail} />}
              {tab === 'evaluations' && <EvaluationsTab d={detail} />}
              {tab === 'activity'    && <ActivityTab d={detail} />}
            </>
          ) : null}
        </div>
      </motion.aside>
    </AnimatePresence>,
    document.body,
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminLmsProgressPage() {
  const [rows, setRows] = useState<ProgressRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCourse, setFilterCourse] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [selectedUserName, setSelectedUserName] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    adminListProgress()
      .then((list) => setRows((list as ProgressRow[]).map(normRow)))
      .catch(() => setError('تعذّر تحميل بيانات التقدم. تحقق من الاتصال وأعد المحاولة.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const courseOptions = useMemo(() => {
    const seen = new Set<string>()
    const opts: { value: string; label: string }[] = [{ value: '', label: 'كل الدورات' }]
    for (const r of rows) {
      const key = String(r.course_id ?? '')
      const label = r.course_title ?? ''
      if (key && label && label !== 'دورة غير مرتبطة' && !seen.has(key)) {
        seen.add(key)
        opts.push({ value: key, label })
      }
    }
    return opts
  }, [rows])

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase()
    const matchSearch = !q
      || (r.user_name ?? '').toLowerCase().includes(q)
      || (r.course_title ?? '').toLowerCase().includes(q)
    const matchStatus = !filterStatus || r.status === filterStatus
    const matchCourse = !filterCourse || String(r.course_id ?? '') === filterCourse
    const lastActivity = (r.last_activity_at ?? r.updated_at ?? '').slice(0, 10)
    const matchDateFrom = !dateFrom || lastActivity >= dateFrom
    const matchDateTo = !dateTo || lastActivity <= dateTo
    return matchSearch && matchStatus && matchCourse && matchDateFrom && matchDateTo
  })

  const total      = rows.length
  const completed  = rows.filter((r) => r.status === 'completed').length
  const inProgress = rows.filter((r) => r.status === 'in_progress').length
  const avgPct     = rows.length
    ? Math.round(rows.reduce((s, r) => s + (r.progress_percentage ?? 0), 0) / rows.length)
    : 0

  const activeCount = countActiveFilters([search, filterStatus, filterCourse, dateFrom, dateTo])

  function clearFilters() {
    setSearch('')
    setFilterStatus('')
    setFilterCourse('')
    setDateFrom('')
    setDateTo('')
  }

  function openDrawer(r: ProgressRow) {
    const uid = r.user_id ?? null
    if (!uid) return
    setSelectedUserId(uid)
    setSelectedUserName(r.user_name ?? '—')
  }

  return (
    <>
      {selectedUserId !== null ?
        <StudentDrawer
          userId={selectedUserId}
          userName={selectedUserName}
          onClose={() => setSelectedUserId(null)}
        />
      : null}

      <AdminLmsShell
        title="إدارة التقدم"
        description="متابعة تقدم المتعلمين عبر الدورات والمسارات — انقر على صف للاطلاع على التفاصيل"
        breadcrumb="التقدم"
        kpis={[
          { label: 'إجمالي السجلات', value: fmtNum(total),       icon: Activity,    variant: 'brand'   },
          { label: 'جارٍ',           value: fmtNum(inProgress),  icon: TrendingUp,  variant: 'accent'  },
          { label: 'مكتمل',          value: fmtNum(completed),   icon: CheckCircle2, variant: 'success' },
          { label: 'متوسط التقدم %', value: `${avgPct}%`,        icon: BookOpen,    variant: 'muted'   },
        ]}
        loading={loading}
        error={error}
        onRetry={load}
        onRefresh={load}
      >
        <LmsFilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="بحث عن متعلم أو دورة…"
          activeFilterCount={activeCount}
          resultCount={filtered.length}
          totalCount={total}
          onReset={clearFilters}
          primary={
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={lmsSelectClass()}>
              <option value="">كل الحالات</option>
              <option value="in_progress">جارٍ</option>
              <option value="completed">مكتمل</option>
              <option value="not_started">لم يبدأ</option>
            </select>
          }
          secondary={
            <>
              {courseOptions.length > 1 ?
                <select value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)} className={lmsSelectClass()}>
                  {courseOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              : null}
              <EmcDatePicker label="من تاريخ" value={dateFrom} onChange={(v) => setDateFrom(v)} />
              <EmcDatePicker label="إلى تاريخ" value={dateTo} onChange={(v) => setDateTo(v)} />
            </>
          }
        />

        {!loading && (
          filtered.length === 0 ?
            <LmsEmptyState
              icon={Activity}
              title="لا توجد بيانات تقدم"
              description={activeCount > 0 ? 'جرّب تغيير معايير البحث.' : 'لم يُسجَّل تقدم أي متعلم بعد.'}
            />
          : (
            <>
              <p className="text-right text-[12px] font-bold text-deepBlue/40">
                عرض {fmtNum(filtered.length)} من {fmtNum(total)} سجل
              </p>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((r) => {
                  const st = r.status ?? 'in_progress'
                  const bdg = statusBadge[st] ?? 'bg-slate-50 text-slate-500 ring-slate-100'
                  const lastActivity = r.last_activity_at ?? r.completed_at ?? r.updated_at
                  const sessionsLabel = (r.total_sessions ?? 0) > 0
                    ? `${fmtNum(r.completed_sessions ?? 0)} / ${fmtNum(r.total_sessions ?? 0)}`
                    : '—'
                  const pct = r.progress_percentage ?? 0
                  const clickable = r.user_id != null
                  return (
                    <motion.div
                      key={r.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => openDrawer(r)}
                      className={`group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-deepBlue/[0.07] bg-white p-5 shadow-sm transition hover:shadow-md hover:-translate-y-0.5 ${clickable ? 'cursor-pointer' : ''}`}
                    >
                      {/* Top accent bar based on status */}
                      <div className={`absolute top-0 left-0 right-0 h-[3px] ${st === 'completed' ? 'bg-emerald-400' : st === 'not_started' ? 'bg-slate-200' : 'bg-customBlue'}`} />

                      <div className="flex items-start justify-between gap-3 pt-1">
                        <div className="min-w-0 flex-1 text-right">
                          <p className="truncate font-black text-deepBlue group-hover:text-customBlue transition-colors">{r.user_name}</p>
                          {r.user_email && (
                            <p className="mt-0.5 truncate font-latin text-[11px] font-medium text-deepBlue/35">{r.user_email}</p>
                          )}
                        </div>
                        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-black ring-1 ${bdg}`}>
                          {normStatus(st)}
                        </span>
                      </div>

                      <p className="line-clamp-1 text-right text-[12px] font-semibold text-customBlue/70">{r.course_title}</p>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-bold text-deepBlue/50">
                          <span>{pct}%</span>
                          <span>التقدم</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-deepBlue/[0.06]">
                          <div
                            className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-emerald-400' : pct >= 50 ? 'bg-customBlue' : 'bg-customOrange'}`}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-deepBlue/[0.05] pt-3 text-[11px] font-bold text-deepBlue/50">
                        <span className="flex items-center gap-1">
                          <BookOpen size={11} />
                          {sessionsLabel} جلسة
                        </span>
                        <span>{fmtDate(lastActivity)}</span>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </>
          )
        )}
      </AdminLmsShell>
    </>
  )
}
