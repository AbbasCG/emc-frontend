import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  BookOpen,
  Check,
  CheckCircle2,
  ClipboardList,
  Download,
  GraduationCap,
  Loader2,
  Mail,
  RefreshCw,
  Search,
  TrendingUp,
  User,
  UserCheck,
  UserX,
  X,
  XCircle,
} from 'lucide-react'
import {
  fetchAdminRegistrations,
  fetchAdminRegistrationDetail,
  updateRegistrationStatus,
  type AdminRegistrationListFilters,
  type AdminRegistrationListRow,
  type RegistrationDetail,
} from '@/api/adminRegistrationsApi'
import { useAuth } from '@/contexts/AuthContext'
import toast from '@/lib/toast'
import { Link } from 'react-router-dom'

// ── Formatters ────────────────────────────────────────────────────────────────

const _arDate = new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
  year: 'numeric', month: 'short', day: 'numeric',
})
function fmtDate(iso: string | null | undefined): string {
  if (!iso?.trim()) return '—'
  try { return _arDate.format(new Date(iso)) } catch { return iso.slice(0, 10) }
}
function fmtNum(n: number): string {
  return new Intl.NumberFormat('en-US').format(n)
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; ring: string; dot: string; text: string }> = {
  pending:           { label: 'قيد الانتظار', ring: 'bg-amber-50 ring-1 ring-amber-200',   dot: 'bg-amber-400', text: 'text-amber-800' },
  pending_payment:   { label: 'بانتظار الدفع',ring: 'bg-orange-50 ring-1 ring-orange-200', dot: 'bg-orange-400',text: 'text-orange-800'},
  approved:          { label: 'مقبول',         ring: 'bg-emerald-50 ring-1 ring-emerald-200',dot:'bg-emerald-500',text: 'text-emerald-800'},
  confirmed:         { label: 'مؤكد',          ring: 'bg-emerald-50 ring-1 ring-emerald-200',dot:'bg-emerald-500',text: 'text-emerald-800'},
  registered:        { label: 'مسجّل',         ring: 'bg-blue-50 ring-1 ring-blue-200',    dot: 'bg-blue-500',  text: 'text-blue-800'  },
  payment_confirmed: { label: 'مدفوع',         ring: 'bg-blue-50 ring-1 ring-blue-200',    dot: 'bg-blue-500',  text: 'text-blue-800'  },
  rejected:          { label: 'مرفوض',         ring: 'bg-red-50 ring-1 ring-red-200',      dot: 'bg-red-500',   text: 'text-red-800'   },
  cancelled:         { label: 'ملغي',           ring: 'bg-slate-100 ring-1 ring-slate-200', dot: 'bg-slate-400', text: 'text-slate-600'  },
}

function StatusBadge({ status }: { status: string | null }) {
  const key = (status ?? 'pending').toLowerCase().replace(/-/g, '_')
  const cfg = STATUS_CFG[key] ?? { label: status ?? '—', ring: 'bg-slate-100', dot: 'bg-slate-400', text: 'text-slate-600' }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-black ${cfg.ring} ${cfg.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-slate-100 ${className}`} />
}

function RowSkeleton() {
  return (
    <tr className="border-b border-slate-100">
      {[150, 120, 100, 80, 70, 60].map((w, i) => (
        <td key={i} className="px-4 py-3.5">
          <Skeleton className={`h-3 w-[${w}px]`} />
        </td>
      ))}
    </tr>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, cls }: {
  label: string; value: number; icon: React.ElementType; cls: string
}) {
  return (
    <div className={`flex items-center gap-4 rounded-2xl border p-5 ${cls}`}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/60">
        <Icon size={18} className="text-current opacity-70" />
      </div>
      <div>
        <p className="text-[11px] font-black uppercase tracking-wider opacity-60">{label}</p>
        <p className="mt-0.5 text-2xl font-black tabular-nums">{fmtNum(value)}</p>
      </div>
    </div>
  )
}

// ── Detail drawer ─────────────────────────────────────────────────────────────

function DetailDrawer({
  open,
  registrationId,
  onClose,
  isAdmin,
  onStatusChange,
}: {
  open: boolean
  registrationId: number | null
  onClose: () => void
  isAdmin: boolean
  onStatusChange: (id: number, status: string) => void
}) {
  const [detail, setDetail] = useState<RegistrationDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  // Clear the previous record and arm the loading state during render when the drawer
  // opens on a different registration, so the effect below only commits from callbacks.
  // `null` seed keeps the first pass live, matching the mount run of the effect.
  const [seenTarget, setSeenTarget] = useState<{ open: boolean; id: number | null } | null>(null)
  if (!seenTarget || seenTarget.open !== open || seenTarget.id !== registrationId) {
    setSeenTarget({ open, id: registrationId })
    if (open && registrationId) {
      setDetail(null)
      setLoading(true)
    }
  }

  useEffect(() => {
    if (!open || !registrationId) return
    fetchAdminRegistrationDetail(registrationId)
      .then(setDetail)
      .catch(() => {/* ignore — show whatever we have */})
      .finally(() => setLoading(false))
  }, [open, registrationId])

  useEffect(() => {
    if (!open) return
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [open, onClose])

  async function changeStatus(status: string) {
    if (!detail) return
    setUpdating(true)
    try {
      await updateRegistrationStatus(detail.id, status)
      onStatusChange(detail.id, status)
      setDetail((d) => d ? { ...d, status } : d)
      toast.success(status === 'approved' ? 'تمت الموافقة على التسجيل' : 'تم رفض التسجيل')
    } catch {
      toast.error('تعذّر تحديث حالة التسجيل')
    } finally {
      setUpdating(false)
    }
  }

  if (!open) return null

  const name   = detail?.student_name ?? detail?.full_name ?? '—'
  const initials = name.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase() || '؟'

  return (
    <>
      {/* Overlay */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        style={{ animation: 'fadeIn 0.2s ease-out' }}
      />
      {/* Drawer — right side */}
      <div
        className="fixed bottom-0 right-0 top-0 z-50 flex w-full flex-col bg-white shadow-2xl sm:w-[480px] overflow-hidden"
        style={{ animation: 'slideInDrawer 0.25s cubic-bezier(0.25,0.46,0.45,0.94)' }}
        dir="rtl"
      >
        {/* Header */}
        <div className="border-b border-slate-100 bg-gradient-to-l from-[#1E2D40] to-[#0077B6] px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-black uppercase tracking-wider text-white/50">تفاصيل التسجيل</p>
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 transition hover:bg-white/20"
            >
              <X size={14} />
            </button>
          </div>
          {loading ? (
            <div className="mt-4 flex items-center gap-3">
              <div className="h-12 w-12 animate-pulse rounded-xl bg-white/20" />
              <div className="space-y-2">
                <div className="h-3 w-32 animate-pulse rounded bg-white/20" />
                <div className="h-2.5 w-24 animate-pulse rounded bg-white/15" />
              </div>
            </div>
          ) : (
            <div className="mt-4 flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 text-[16px] font-black">
                {initials}
              </div>
              <div>
                <p className="font-black text-[15px]">{name}</p>
                <p className="text-[12px] text-white/60">{detail?.email ?? '—'}</p>
              </div>
              <div className="mr-auto">
                <StatusBadge status={detail?.status ?? null} />
              </div>
            </div>
          )}
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={28} className="animate-spin text-[#0077B6]" />
            </div>
          ) : !detail ? (
            <div className="py-16 text-center text-[13px] text-slate-400">تعذّر تحميل تفاصيل التسجيل</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {/* Student info */}
              <Section title="معلومات الطالب" icon={<User size={14} />}>
                <Field label="الاسم الكامل"    value={detail.student_name ?? detail.full_name ?? '—'} />
                <Field label="البريد"           value={<a href={`mailto:${detail.email}`} className="text-[#0077B6] hover:underline">{detail.email ?? '—'}</a>} />
                <Field label="الجوال"           value={detail.phone ?? '—'} />
                {detail.city && <Field label="المدينة" value={detail.city} />}
                {detail.country && <Field label="الدولة" value={detail.country} />}
                {detail.gender && <Field label="الجنس" value={detail.gender === 'male' ? 'ذكر' : detail.gender === 'female' ? 'أنثى' : detail.gender} />}
              </Section>

              {/* Registration info */}
              <Section title="معلومات التسجيل" icon={<ClipboardList size={14} />}>
                <Field label="رقم التسجيل"   value={`#${detail.id}`} mono />
                <Field label="تاريخ التسجيل" value={fmtDate(detail.created_at)} />
                <Field label="الحالة"         value={<StatusBadge status={detail.status} />} />
                {detail.source && <Field label="المصدر" value={detail.source} />}
                {detail.notes && <Field label="ملاحظات" value={detail.notes} />}
              </Section>

              {/* Course info */}
              {detail.course && (
                <Section title="معلومات الدورة" icon={<BookOpen size={14} />}>
                  <Field label="اسم الدورة"  value={detail.course.title} />
                  {detail.course.type && <Field label="النوع" value={detail.course.type} />}
                  {detail.course.instructor && <Field label="المدرب" value={detail.course.instructor} />}
                  {detail.course.start_date && <Field label="تاريخ البداية" value={fmtDate(detail.course.start_date)} />}
                  {detail.course.end_date && <Field label="تاريخ النهاية" value={fmtDate(detail.course.end_date)} />}
                  {detail.course.status && <Field label="حالة الدورة" value={detail.course.status} />}
                  {detail.course.location_type && <Field label="نوع التسليم" value={detail.course.location_type} />}
                </Section>
              )}

              {/* Progress */}
              {detail.progress && (
                <Section title="تقدم الطالب" icon={<TrendingUp size={14} />}>
                  <ProgressBar label="التقدم العام"      pct={detail.progress.percentage} color="bg-[#0077B6]" />
                  <ProgressBar label="الحضور"            pct={detail.progress.attendance_percentage} color="bg-emerald-500" />
                  <ProgressBar label="الواجبات"         pct={detail.progress.assignments_completed} color="bg-amber-500" />
                  {detail.progress.certificate_status && (
                    <Field label="الشهادة" value={
                      detail.progress.certificate_status === 'issued'
                        ? <span className="text-emerald-700 font-black">✓ صادرة</span>
                        : detail.progress.certificate_status
                    } />
                  )}
                </Section>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="border-t border-slate-100 bg-slate-50 px-6 py-4">
          <div className="flex flex-wrap items-center gap-2">
            {/* Admin-only approve/reject */}
            {isAdmin && detail && (
              <>
                {!['approved', 'confirmed', 'registered'].includes(detail.status ?? '') && (
                  <button
                    type="button"
                    onClick={() => changeStatus('approved')}
                    disabled={updating}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-[12px] font-black text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {updating ? <Loader2 size={12} className="animate-spin" /> : <UserCheck size={12} />}
                    قبول
                  </button>
                )}
                {detail.status !== 'rejected' && detail.status !== 'cancelled' && (
                  <button
                    type="button"
                    onClick={() => changeStatus('rejected')}
                    disabled={updating}
                    className="flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-[12px] font-black text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
                  >
                    {updating ? <Loader2 size={12} className="animate-spin" /> : <UserX size={12} />}
                    رفض
                  </button>
                )}
              </>
            )}

            {/* Common actions */}
            {detail?.course?.slug && (
              <Link
                to={`/dashboard/admin/programs?course=${detail.course_id}`}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[12px] font-black text-[#1E2D40] hover:bg-slate-50"
              >
                <BookOpen size={12} /> عرض الدورة
              </Link>
            )}
            {detail?.user_id && (
              <Link
                to={`/dashboard/admin/lms/progress?user=${detail.user_id}`}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[12px] font-black text-[#1E2D40] hover:bg-slate-50"
              >
                <GraduationCap size={12} /> ملف الطالب
              </Link>
            )}
            <button
              type="button"
              onClick={() => {
                if (!detail) return
                const lines = [
                  `رقم التسجيل: #${detail.id}`,
                  `الطالب: ${detail.student_name ?? '—'}`,
                  `البريد: ${detail.email ?? '—'}`,
                  `الدورة: ${detail.course_title}`,
                  `الحالة: ${detail.status ?? '—'}`,
                  `التاريخ: ${fmtDate(detail.created_at)}`,
                ]
                const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
                const a = document.createElement('a')
                a.href = URL.createObjectURL(blob)
                a.download = `registration-${detail.id}.txt`
                a.click()
              }}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[12px] font-black text-[#1E2D40] hover:bg-slate-50"
            >
              <Download size={12} /> تصدير
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn       { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInDrawer { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
    </>
  )
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="px-6 py-5">
      <div className="mb-3.5 flex items-center gap-2 text-[#1E2D40]">
        <span className="text-[#0077B6]">{icon}</span>
        <p className="text-[11px] font-black uppercase tracking-wider text-[#1E2D40]/60">{title}</p>
      </div>
      <dl className="space-y-2.5">{children}</dl>
    </div>
  )
}

function Field({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start gap-2 justify-between">
      <dt className="shrink-0 text-[11px] font-black text-slate-500 w-28">{label}</dt>
      <dd className={`text-right text-[12px] font-medium text-[#1E2D40] ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  )
}

function ProgressBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-black text-slate-500">{label}</span>
        <span className="text-[11px] font-black text-[#1E2D40] tabular-nums">{pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  )
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_FILTERS = [
  { value: '',          label: 'جميع الحالات' },
  { value: 'pending',   label: 'قيد الانتظار' },
  { value: 'registered',label: 'مسجّل' },
  { value: 'approved',  label: 'مقبول' },
  { value: 'rejected',  label: 'مرفوض' },
  { value: 'cancelled', label: 'ملغي' },
]

const STATUS_STRIPE: Record<string, string> = {
  pending:           'before:bg-amber-400',
  pending_payment:   'before:bg-orange-400',
  approved:          'before:bg-emerald-500',
  confirmed:         'before:bg-emerald-500',
  registered:        'before:bg-blue-500',
  payment_confirmed: 'before:bg-blue-500',
  rejected:          'before:bg-red-500',
  cancelled:         'before:bg-slate-300',
}

// ── Page ──────────────────────────────────────────────────────────────────────

/** Server-side query for the registrations list. */
type RegistrationsQuery = {
  search: string
  status: string
  dateFrom: string
  dateTo: string
  courseId: number | undefined
}

/**
 * Pure I/O — no state plumbing, so both the fetch effect and the search / retry
 * handlers can call it and do their own `setState` around it.
 */
function requestAdminRegistrations(query: RegistrationsQuery) {
  const filters: AdminRegistrationListFilters = {}
  if (query.search.trim())    filters.search    = query.search.trim()
  if (query.status.trim())    filters.status    = query.status.trim()
  if (query.dateFrom.trim())  filters.date_from = query.dateFrom.trim()
  if (query.dateTo.trim())    filters.date_to   = query.dateTo.trim()
  if (query.courseId != null) filters.course_id = query.courseId
  return fetchAdminRegistrations(filters)
}

export default function AdminRegistrationsPage() {
  const { user } = useAuth()
  const isAdmin = ['admin', 'super_admin', 'tech_admin'].includes(user?.role ?? '')

  const [rows, setRows]       = useState<AdminRegistrationListRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const [search, setSearch]     = useState('')
  const [status, setStatus]     = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')
  const [courseId, setCourseId] = useState<number | undefined>(undefined)

  const [drawerOpen, setDrawerOpen]   = useState(false)
  const [activeId, setActiveId]       = useState<number | null>(null)

  const query = useMemo<RegistrationsQuery>(
    () => ({ search, status, dateFrom, dateTo, courseId }),
    [search, status, dateFrom, dateTo, courseId],
  )

  // Return to the loading state during render when the query changes, so the effect
  // below never has to set it synchronously (react.dev "adjusting state").
  const [seenQuery, setSeenQuery] = useState(query)
  if (seenQuery !== query) {
    setSeenQuery(query)
    setLoading(true)
    setError(null)
  }

  // Imperative re-run from the search / retry buttons — outside an effect, so it may
  // flip to the loading state synchronously.
  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await requestAdminRegistrations(query))
    } catch {
      setError('تعذّر تحميل التسجيلات. تحقق من الاتصال وأعد المحاولة.')
    } finally {
      setLoading(false)
    }
  }, [query])

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const data = await requestAdminRegistrations(query)
        if (!alive) return
        setRows(data)
      } catch {
        if (!alive) return
        setError('تعذّر تحميل التسجيلات. تحقق من الاتصال وأعد المحاولة.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [query])

  function resetFilters() {
    setSearch('')
    setStatus('')
    setDateFrom('')
    setDateTo('')
    setCourseId(undefined)
  }

  const hasFilters = !!(search || status || dateFrom || dateTo || courseId)

  const courseOptions = useMemo(() => {
    const seen = new Map<number, string>()
    for (const r of rows) {
      if (r.course_id && r.course_title && !seen.has(r.course_id)) seen.set(r.course_id, r.course_title)
    }
    return Array.from(seen.entries()).map(([id, title]) => ({ id, title }))
  }, [rows])

  const stats = {
    total:    rows.length,
    pending:  rows.filter((r) => ['pending', 'pending_payment'].includes((r.status ?? '').toLowerCase())).length,
    approved: rows.filter((r) => ['approved', 'confirmed', 'registered', 'payment_confirmed'].includes((r.status ?? '').toLowerCase())).length,
    rejected: rows.filter((r) => ['rejected', 'cancelled'].includes((r.status ?? '').toLowerCase())).length,
  }

  function openDrawer(id: number) {
    setActiveId(id)
    setDrawerOpen(true)
  }

  function handleStatusChange(id: number, newStatus: string) {
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, status: newStatus } : r))
  }

  function exportCsv() {
    const header = 'الرقم,الطالب,البريد,الجوال,الدورة,تاريخ التسجيل,الحالة'
    const lines = rows.map((r) =>
      [r.id, r.student_name ?? '', r.email ?? '', r.phone ?? '', r.course_title, fmtDate(r.created_at), r.status ?? ''].join(',')
    )
    const blob = new Blob([header + '\n' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `registrations-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  return (
    <div dir="rtl" className="space-y-5 text-right">
      {/* ── Header ── */}
      <div className="rounded-2xl bg-gradient-to-l from-[#1E2D40] via-[#1a3a54] to-[#0077B6] p-7 text-white shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-white/40">إدارة التسجيلات</p>
            <h1 className="text-[22px] font-black">التسجيلات</h1>
            <p className="mt-1 text-[13px] text-white/55">
              {isAdmin ? 'مراجعة وإدارة طلبات تسجيل المتعلمين' : 'استعراض وتحليل بيانات التسجيل'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void load()}
              className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-black text-white transition hover:bg-white/20"
            >
              <RefreshCw size={12} /> تحديث
            </button>
            <button
              type="button"
              onClick={exportCsv}
              className="flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-[11px] font-black text-[#1E2D40] shadow transition hover:bg-white/90"
            >
              <Download size={12} /> تصدير CSV
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="إجمالي التسجيلات" value={stats.total}    icon={ClipboardList} cls="border-slate-200 bg-white text-[#1E2D40]" />
        <StatCard label="قيد الانتظار"     value={stats.pending}  icon={UserCheck}     cls="border-amber-200 bg-amber-50 text-amber-800"  />
        <StatCard label="مقبولة / مسجّلة"  value={stats.approved} icon={CheckCircle2}  cls="border-emerald-200 bg-emerald-50 text-emerald-800" />
        <StatCard label="مرفوضة / ملغاة"   value={stats.rejected} icon={XCircle}       cls="border-red-200 bg-red-50 text-red-800" />
      </div>

      {/* ── Filters ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" dir="rtl">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1">
            <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void load()}
              placeholder="بحث بالاسم أو البريد أو الجوال..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pr-9 pl-3 text-[13px] outline-none focus:border-[#0077B6] focus:ring-2 focus:ring-[#0077B6]/10"
            />
          </div>

          {/* Status */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] outline-none focus:border-[#0077B6]"
          >
            {STATUS_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>

          {/* Course */}
          {courseOptions.length > 0 && (
            <select
              value={courseId ?? ''}
              onChange={(e) => setCourseId(e.target.value ? Number(e.target.value) : undefined)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] outline-none focus:border-[#0077B6]"
            >
              <option value="">كل الدورات</option>
              {courseOptions.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          )}

          {/* Date range */}
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] outline-none focus:border-[#0077B6]"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] outline-none focus:border-[#0077B6]"
          />

          {/* Search btn */}
          <button
            type="button"
            onClick={() => void load()}
            className="flex items-center gap-1.5 rounded-xl bg-[#0077B6] px-5 py-2.5 text-[12px] font-black text-white shadow-sm hover:bg-[#1E7FAD]"
          >
            <Search size={12} /> بحث
          </button>

          {/* Reset */}
          {hasFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-[12px] font-black text-slate-500 hover:bg-slate-50"
            >
              <X size={12} /> إعادة تعيين
            </button>
          )}
        </div>

        {/* Result count */}
        {!loading && (
          <p className="mt-3 text-[11px] text-slate-400">
            {hasFilters ? `نتائج البحث: ${fmtNum(rows.length)} تسجيل` : `إجمالي: ${fmtNum(rows.length)} تسجيل`}
          </p>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-[13px] font-black text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-[11px] font-black text-white"
          >
            <RefreshCw size={11} /> إعادة
          </button>
        </div>
      )}

      {/* ── Table ── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-wider text-slate-500">الطالب</th>
                <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-wider text-slate-500">الدورة</th>
                <th className="hidden px-5 py-3.5 text-[10px] font-black uppercase tracking-wider text-slate-500 sm:table-cell">التواصل</th>
                <th className="hidden px-5 py-3.5 text-[10px] font-black uppercase tracking-wider text-slate-500 md:table-cell">التاريخ</th>
                <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-wider text-slate-500">الحالة</th>
                {isAdmin && (
                  <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-wider text-slate-500">إجراءات</th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => <RowSkeleton key={i} />)
                : rows.length === 0
                ? (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="py-16 text-center">
                      <ClipboardList size={32} className="mx-auto mb-3 text-slate-200" />
                      <p className="text-[13px] font-black text-slate-400">لا توجد تسجيلات تطابق معايير البحث</p>
                      {hasFilters && (
                        <button type="button" onClick={resetFilters} className="mt-3 text-[12px] text-[#0077B6] hover:underline">
                          إعادة تعيين الفلاتر
                        </button>
                      )}
                    </td>
                  </tr>
                )
                : rows.map((r) => {
                  const statusKey = (r.status ?? 'pending').toLowerCase().replace(/-/g, '_')
                  const stripe    = STATUS_STRIPE[statusKey] ?? 'before:bg-slate-300'
                  return (
                    <tr
                      key={r.id}
                      onClick={() => openDrawer(r.id)}
                      className={[
                        'relative cursor-pointer border-b border-slate-100 transition-all duration-150',
                        'hover:bg-[#0077B6]/[0.025] hover:shadow-sm',
                        'before:absolute before:bottom-0 before:right-0 before:top-0 before:w-[3px] before:transition-all before:duration-200',
                        stripe,
                        'hover:before:opacity-100 before:opacity-0',
                      ].join(' ')}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#0077B6]/80 to-[#1E2D40] text-[11px] font-black text-white">
                            {(r.student_name ?? '؟').split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase()}
                          </div>
                          <div>
                            <p className="text-[13px] font-black text-[#1E2D40]">{r.student_name ?? '—'}</p>
                            {r.phone && <p className="text-[10px] text-slate-400">{r.phone}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="max-w-[180px] truncate px-5 py-3.5 text-[12px] font-medium text-[#1E2D40]/80">
                        {r.course_title}
                      </td>
                      <td className="hidden px-5 py-3.5 sm:table-cell">
                        <div className="flex flex-col gap-0.5">
                          {r.email && (
                            <span className="flex items-center gap-1 text-[11px] text-slate-400">
                              <Mail size={10} /> {r.email}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="hidden px-5 py-3.5 text-[11px] text-slate-400 md:table-cell">
                        {fmtDate(r.created_at)}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={r.status} />
                      </td>
                      {isAdmin && (
                        <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5">
                            {!['approved', 'confirmed', 'registered'].includes((r.status ?? '').toLowerCase()) && (
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation()
                                  try {
                                    await updateRegistrationStatus(r.id, 'approved')
                                    handleStatusChange(r.id, 'approved')
                                    toast.success('تمت الموافقة على التسجيل')
                                  } catch { toast.error('تعذّر تحديث الحالة') }
                                }}
                                className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[10px] font-black text-white hover:bg-emerald-700"
                              >
                                <Check size={10} strokeWidth={3} /> قبول
                              </button>
                            )}
                            {!['rejected', 'cancelled'].includes((r.status ?? '').toLowerCase()) && (
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation()
                                  try {
                                    await updateRegistrationStatus(r.id, 'rejected')
                                    handleStatusChange(r.id, 'rejected')
                                    toast.success('تم رفض التسجيل')
                                  } catch { toast.error('تعذّر تحديث الحالة') }
                                }}
                                className="flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1 text-[10px] font-black text-white hover:bg-red-700"
                              >
                                <X size={10} strokeWidth={3} /> رفض
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })
              }
            </tbody>
          </table>
        </div>

        {!loading && rows.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
            <p className="text-[11px] text-slate-400">
              {fmtNum(rows.length)} تسجيل
              {!isAdmin && <span className="mr-2 text-slate-300">· اضغط على أي صف لعرض التفاصيل</span>}
            </p>
            {isAdmin && (
              <p className="text-[11px] text-slate-300">اضغط على أي صف لعرض التفاصيل الكاملة</p>
            )}
          </div>
        )}
      </div>

      {/* ── Drawer ── */}
      <DetailDrawer
        open={drawerOpen}
        registrationId={activeId}
        onClose={() => { setDrawerOpen(false); setActiveId(null) }}
        isAdmin={isAdmin}
        onStatusChange={handleStatusChange}
      />
    </div>
  )
}
