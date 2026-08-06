import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Clock,
  RefreshCw,
  Search,
  Star,
} from 'lucide-react'
import type { StudentAssignment } from '@/types/lms'
import { LmsEmptyState, LmsPageSkeleton } from '@/components/lms'
import { notifyStudentScopeRefresh } from '@/api/studentApi'
import { useStudentDashboardData } from '@/hooks/useStudentDashboardData'
import { formatLmsDateTime } from '@/components/lms/lmsFormatters'
import { AssignmentSubmitModal } from '@/components/lms'
import { StudentBackButton } from '@/components/shared/StudentBackButton'

// ── Status helpers ────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  submitted:          'بانتظار التقييم',
  graded:             'تم التقييم',
  revision:           'إعادة تسليم مطلوب',
  needs_resubmission: 'إعادة تسليم مطلوب',
  late:               'متأخر',
  pending:            'قيد المعالجة',
}

const STATUS_COLORS: Record<string, string> = {
  graded:             'bg-blue-50 text-blue-700 border-blue-200',
  submitted:          'bg-purple-50 text-purple-700 border-purple-200',
  revision:           'bg-amber-50 text-amber-700 border-amber-200',
  needs_resubmission: 'bg-amber-50 text-amber-700 border-amber-200',
  late:               'bg-red-50 text-red-700 border-red-200',
  pending:            'bg-slate-50 text-slate-600 border-slate-200',
}

function statusLabel(s: string | undefined): string {
  if (!s) return 'قيد المعالجة'
  return STATUS_LABEL[s] ?? s
}

function statusColor(s: string | undefined): string {
  if (!s) return STATUS_COLORS.pending
  return STATUS_COLORS[s] ?? STATUS_COLORS.pending
}

function isGraded(s: StudentAssignment['status']): boolean {
  return s === 'graded'
}

function isPendingReview(s: StudentAssignment['status']): boolean {
  return s === 'submitted'
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  colorClass,
}: {
  label: string
  value: string | number
  sub?: string
  colorClass: string
}) {
  return (
    <div className={`rounded-2xl border p-4 ${colorClass}`}>
      <p className="text-[11px] font-black uppercase tracking-wide opacity-60">{label}</p>
      <p className="mt-1.5 text-2xl font-black tabular-nums leading-none">{value}</p>
      {sub && <p className="mt-1 text-[11px] font-semibold opacity-60">{sub}</p>}
    </div>
  )
}

// ── Submission Card ───────────────────────────────────────────────────────────

function SubmissionCard({
  assignment,
  onResubmit,
}: {
  assignment: StudentAssignment
  onResubmit?: () => void
}) {
  const graded   = isGraded(assignment.status)
  const pending  = isPendingReview(assignment.status)
  const overdue  = assignment.status === 'late'
  const needsRev = assignment.status === 'needs_resubmission' || assignment.status === 'revision'

  const pct =
    graded && assignment.score != null && assignment.max_score
      ? Math.round((assignment.score / assignment.max_score) * 100)
      : null

  const dueLabel       = formatLmsDateTime(assignment.due_at)
  const submittedLabel = formatLmsDateTime(assignment.submitted_at)

  return (
    <article className={`flex flex-col gap-4 rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md ${
      overdue ? 'border-red-200/80' : needsRev ? 'border-amber-200/80' : 'border-[#22334A]/[0.07]'
    }`}>
      {/* Row 1: status + course */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black ${statusColor(assignment.status)}`}>
          {graded
            ? <Star className="h-3 w-3" />
            : pending
              ? <Clock className="h-3 w-3" />
              : overdue
                ? <AlertCircle className="h-3 w-3" />
                : <CheckCircle2 className="h-3 w-3" />}
          {statusLabel(assignment.status)}
        </span>
        {assignment.course_name && (
          <span className="inline-flex items-center gap-1 rounded-full border border-[#2691C2]/20 bg-[#2691C2]/[0.06] px-2.5 py-1 text-[11px] font-bold text-[#1a6fa0]">
            <BookOpen className="h-3 w-3" />
            {assignment.course_name}
          </span>
        )}
      </div>

      {/* Row 2: title */}
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-[#EC943C]/12 text-[#EC943C]">
          <ClipboardList className="h-4 w-4" />
        </span>
        <h3 className="flex-1 text-[15px] font-black leading-snug text-[#0F172A]">{assignment.title}</h3>
      </div>

      {/* Row 3: Deadline + submission date */}
      <div className="grid gap-2 sm:grid-cols-2">
        {dueLabel !== '—' && (
          <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
            overdue ? 'border-red-200/60 bg-red-50/60' : 'border-[#22334A]/[0.07] bg-slate-50/70'
          }`}>
            <Clock className={`h-3.5 w-3.5 shrink-0 ${overdue ? 'text-red-500' : 'text-[#22334A]/40'}`} />
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-wide text-[#22334A]/50">موعد التسليم النهائي</p>
              <p className={`text-[12px] font-black tabular-nums ${overdue ? 'text-red-700' : 'text-[#22334A]'}`}>
                {dueLabel}
              </p>
            </div>
          </div>
        )}

        {submittedLabel !== '—' && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200/60 bg-emerald-50/60 px-3 py-2">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-wide text-emerald-600/70">تاريخ التسليم</p>
              <p className="text-[12px] font-black tabular-nums text-emerald-800">{submittedLabel}</p>
            </div>
          </div>
        )}
      </div>

      {/* Row 4: Score */}
      {graded && assignment.score != null && (
        <div className="flex items-center gap-3 rounded-2xl border border-blue-200/60 bg-gradient-to-bl from-blue-50 to-indigo-50/40 px-4 py-3">
          <Star className="h-5 w-5 shrink-0 text-blue-500" />
          <div className="flex-1">
            <p className="text-[10px] font-black uppercase tracking-wide text-blue-600/70">الدرجة</p>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span className="text-2xl font-black tabular-nums text-blue-700">{assignment.score}</span>
              {assignment.max_score != null && (
                <span className="text-[13px] font-bold text-blue-500">/ {assignment.max_score}</span>
              )}
              {pct != null && (
                <span className={`mr-auto rounded-full px-2.5 py-0.5 text-[11px] font-black ${
                  pct >= 80 ? 'bg-emerald-100 text-emerald-700'
                  : pct >= 60 ? 'bg-amber-100 text-amber-700'
                  : 'bg-red-100 text-red-700'
                }`}>{pct}%</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Row 5: Pending review badge */}
      {pending && (
        <div className="flex items-center gap-2.5 rounded-xl border border-purple-200/60 bg-purple-50/60 px-3.5 py-2.5">
          <Clock className="h-4 w-4 shrink-0 text-purple-500" />
          <p className="text-[12px] font-black text-purple-700">بانتظار تقييم المدرّب</p>
        </div>
      )}

      {/* Row 6: Feedback */}
      {graded && assignment.feedback && (
        <div className="rounded-xl border border-blue-200/50 bg-blue-50/50 px-4 py-3">
          <p className="mb-1.5 text-[10px] font-black uppercase tracking-wide text-blue-600/80">ملاحظات المدرّب</p>
          <p className="text-[13px] font-medium leading-relaxed text-[#0F172A]/80">{assignment.feedback}</p>
        </div>
      )}

      {/* Row 7: Resubmit button */}
      {needsRev && onResubmit && (
        <button
          type="button"
          onClick={onResubmit}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-[12px] font-black text-white shadow-sm transition hover:brightness-105"
        >
          <RefreshCw className="h-4 w-4" />
          إعادة تسليم الواجب
        </button>
      )}
    </article>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function StudentAssignmentsPage() {
  const {
    loading,
    refreshing,
    loadError,
    refresh,
    assignmentsScoped,
  } = useStudentDashboardData()

  const [search, setSearch]           = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [active, setActive]           = useState<StudentAssignment | null>(null)

  // Only show submitted assignments (status != pending without submission)
  const submitted = useMemo(
    () => assignmentsScoped.filter((a) => a.submitted_at != null || ['submitted', 'graded', 'late', 'revision', 'needs_resubmission'].includes(String(a.status))),
    [assignmentsScoped],
  )

  const filtered = useMemo(() => {
    let list = submitted
    if (filterStatus !== 'all') {
      list = list.filter((a) => {
        if (filterStatus === 'graded')   return isGraded(a.status)
        if (filterStatus === 'pending')  return isPendingReview(a.status)
        if (filterStatus === 'revision') return a.status === 'needs_resubmission' || a.status === 'revision'
        return true
      })
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((a) =>
        a.title.toLowerCase().includes(q) ||
        (a.course_name ?? '').toLowerCase().includes(q),
      )
    }
    return list
  }, [submitted, filterStatus, search])

  const stats = useMemo(() => {
    const total    = submitted.length
    const graded   = submitted.filter((a) => isGraded(a.status)).length
    const pending  = submitted.filter((a) => isPendingReview(a.status)).length
    const revision = submitted.filter((a) => a.status === 'needs_resubmission' || a.status === 'revision').length
    const scores   = submitted.filter((a) => a.score != null && a.max_score != null)
    const avg =
      scores.length > 0
        ? Math.round(scores.reduce((s, a) => s + (a.score! / a.max_score!) * 100, 0) / scores.length)
        : null
    return { total, graded, pending, revision, avg }
  }, [submitted])

  if (loading && assignmentsScoped.length === 0) return <LmsPageSkeleton />

  return (
    <div className="space-y-6 pb-10 text-right" dir="rtl">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex flex-wrap items-start justify-between gap-4 rounded-3xl border border-[#22334A]/[0.06] bg-gradient-to-bl from-white/95 to-[#2691C2]/[0.03] p-6 shadow-sm ring-1 ring-[#22334A]/[0.04]">
        <div>
          <h1 className="text-2xl font-black text-[#22334A]">واجباتي وتسليماتي</h1>
          <p className="mt-1.5 text-[13px] font-semibold text-[#22334A]/55">
            متابعة الواجبات التي قمت بتسليمها ونتائج التقييم
          </p>
          {loadError && (
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-950">
              {loadError}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-2xl border border-[#22334A]/10 bg-[#22334A]/[0.04] px-4 py-2 text-[11px] font-black text-[#22334A] transition hover:bg-[#22334A]/[0.07] disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
          {refreshing ? 'جارٍ التحديث…' : 'تحديث'}
        </button>
      </header>

      <StudentBackButton fallback="/dashboard/student" label="العودة إلى لوحة الطالب" />

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard
          label="إجمالي التسليمات"
          value={stats.total}
          colorClass="border-[#22334A]/[0.07] bg-white text-[#22334A]"
        />
        <StatCard
          label="بانتظار التقييم"
          value={stats.pending}
          colorClass="border-purple-200/70 bg-purple-50/60 text-purple-700"
        />
        <StatCard
          label="تم تقييمها"
          value={stats.graded}
          colorClass="border-blue-200/70 bg-blue-50/60 text-blue-700"
        />
        <StatCard
          label="إعادة تسليم"
          value={stats.revision}
          colorClass="border-amber-200/70 bg-amber-50/60 text-amber-700"
        />
        <StatCard
          label="متوسط الدرجة"
          value={stats.avg != null ? `${stats.avg}%` : '—'}
          colorClass={
            stats.avg == null ? 'border-slate-200 bg-slate-50 text-slate-500'
            : stats.avg >= 80 ? 'border-emerald-200/70 bg-emerald-50/60 text-emerald-700'
            : stats.avg >= 60 ? 'border-amber-200/70 bg-amber-50/60 text-amber-700'
            : 'border-red-200/70 bg-red-50/60 text-red-700'
          }
        />
      </div>

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#22334A]/30" />
          <input
            type="text"
            dir="rtl"
            placeholder="بحث في الواجبات..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-[#22334A]/12 bg-white py-2.5 pr-9 pl-4 text-[13px] font-semibold text-[#22334A] outline-none ring-1 ring-transparent transition focus:border-[#2691C2]/30 focus:ring-[#2691C2]/15"
          />
        </div>

        {/* Status filter */}
        <div className="flex rounded-2xl border border-[#22334A]/12 bg-white p-1 gap-1">
          {[
            { key: 'all',      label: 'الكل' },
            { key: 'pending',  label: 'بانتظار التقييم' },
            { key: 'graded',   label: 'مُقيَّمة' },
            { key: 'revision', label: 'إعادة تسليم' },
          ].map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilterStatus(key)}
              className={`rounded-xl px-3 py-1.5 text-[11px] font-black transition ${
                filterStatus === key
                  ? 'bg-[#22334A] text-white shadow-sm'
                  : 'text-[#22334A]/60 hover:bg-slate-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── List ───────────────────────────────────────────────────────────── */}
      {submitted.length === 0 ? (
        <div className="rounded-3xl bg-white/80 ring-1 ring-[#22334A]/[0.06]">
          <LmsEmptyState
            icon={ClipboardList}
            title="لا تسليمات بعد"
            description="عندما تسلّم واجباتك ستظهر هنا مع نتائج التقييم والملاحظات."
          />
          <div className="p-6 text-center">
            <Link
              to="/dashboard/student"
              className="inline-flex items-center gap-2 rounded-2xl bg-[#22334A] px-5 py-2.5 text-[12px] font-black text-white transition hover:opacity-90"
            >
              العودة إلى لوحتي
            </Link>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-[#22334A]/[0.06] bg-white/80 p-10 text-center">
          <p className="text-[14px] font-black text-[#22334A]/60">لا نتائج تطابق البحث أو التصفية</p>
          <button type="button" onClick={() => { setSearch(''); setFilterStatus('all') }} className="mt-4 text-[12px] font-black text-[#2691C2] hover:underline">
            إعادة تعيين
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((a) => (
            <SubmissionCard
              key={`${a.id}-${a.assignment_id}`}
              assignment={a}
              onResubmit={(a.status === 'needs_resubmission' || a.status === 'revision') ? () => setActive(a) : undefined}
            />
          ))}
        </div>
      )}

      <AssignmentSubmitModal
        assignment={active}
        onClose={() => setActive(null)}
        onSuccess={async () => {
          notifyStudentScopeRefresh()
          await refresh()
          setActive(null)
        }}
      />
    </div>
  )
}
