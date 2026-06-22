import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Search,
  Users,
  X,
  ClipboardList,
  HeartHandshake,
  UserCheck,
  BookOpen,
  Info,
} from 'lucide-react'
import { fetchWorkspaceDepartmentsForSuperAdmin } from '@/api/superAdminOpsApi'
import { getApiErrorMessage } from '@/api/apiErrors'
import type { WorkspaceDepartment } from '@/types/operations'
import { computeDeptHealth, getDepartmentName } from '@/utils/workspaceDepartment'
import { errorToast } from '@/lib/toast'
import { SaPageRoot } from '@/pages/super-admin/crud/shared/SuperAdminPrimitives'
import { EmptyPanel, ErrorPanel } from '@/pages/super-admin/crud/shared/States'

/* ── Status helpers ──────────────────────────────────────────────────────── */

function statusLabel(s: WorkspaceDepartment['status']) {
  if (s === 'healthy') return 'سليم'
  if (s === 'risk') return 'خطر'
  return 'انتباه'
}

function StatusBadge({ status }: { status: WorkspaceDepartment['status'] }) {
  const cls =
    status === 'healthy'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
      : status === 'risk'
        ? 'bg-rose-50 text-rose-700 ring-rose-200'
        : 'bg-amber-50 text-amber-700 ring-amber-200'
  const Icon =
    status === 'healthy' ? CheckCircle2 : status === 'risk' ? AlertCircle : AlertTriangle
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${cls}`}>
      <Icon className="h-3 w-3" aria-hidden />
      {statusLabel(status)}
    </span>
  )
}

/* ── KPI tile ────────────────────────────────────────────────────────────── */

function KpiTile({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string
  value: number | string
  icon: React.ElementType
  accent: 'blue' | 'orange' | 'success' | 'danger'
}) {
  const colorMap = {
    blue: 'from-[#0077B6]/10 to-transparent text-[#0077B6] ring-[#0077B6]/20',
    orange: 'from-[#F28C00]/10 to-transparent text-[#F28C00] ring-[#F28C00]/20',
    success: 'from-emerald-100/70 to-transparent text-emerald-700 ring-emerald-200',
    danger: 'from-rose-100/70 to-transparent text-rose-700 ring-rose-200',
  }
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-white/70 bg-white/80 px-5 py-4 shadow-sm backdrop-blur-sm ring-1 ring-black/[0.04]">
      <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br ring-1 ${colorMap[accent]}`}>
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
        <p className="mt-0.5 text-2xl font-black tracking-tight text-[#0C2A4B]">{value}</p>
      </div>
    </div>
  )
}

/* ── Department card ─────────────────────────────────────────────────────── */

function DeptCard({ dept }: { dept: WorkspaceDepartment }) {
  const navigate = useNavigate()
  const name = getDepartmentName(dept)
  const initial = name.charAt(0) || 'إ'
  const health = computeDeptHealth(dept)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="group flex flex-col rounded-3xl border border-white/60 bg-white shadow-[0_8px_40px_rgba(12,42,75,0.07)] transition hover:shadow-[0_12px_48px_rgba(12,42,75,0.12)]"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 rounded-t-3xl bg-gradient-to-bl from-[#0C2A4B]/[0.03] to-transparent px-5 pt-5 pb-4">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#0077B6] to-[#0C2A4B] text-base font-black text-white shadow ring-2 ring-white">
            {initial}
          </span>
          <div className="min-w-0">
            <h3 className="truncate font-black text-[#0C2A4B] text-[15px] leading-snug">{name}</h3>
            {dept.name_en ? (
              <p className="text-[11px] font-semibold text-slate-400">{dept.name_en}</p>
            ) : (
              <p className="text-[11px] font-semibold text-slate-400">#{dept.id}</p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusBadge status={health.status} />
        </div>
      </div>

      {/* Status reason */}
      <div className="mx-5 mb-3">
        {health.reasons.length > 0 && health.status !== 'healthy' ? (
          <div className="flex items-start gap-1.5 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
            <Info className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" aria-hidden />
            <p className="text-[11px] font-semibold leading-relaxed text-slate-500">
              {health.reasons[0]}
              {health.reasons.length > 1 ? ` · ${health.reasons[1]}` : ''}
            </p>
          </div>
        ) : health.status === 'healthy' ? (
          <div className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 ring-1 ring-emerald-100">
            <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600" aria-hidden />
            <p className="text-[11px] font-semibold text-emerald-700">جميع المؤشرات سليمة</p>
          </div>
        ) : null}
      </div>

      {/* Description */}
      {dept.description ? (
        <p className="px-5 pb-3 text-[12px] font-semibold leading-relaxed text-slate-500 line-clamp-2">
          {dept.description}
        </p>
      ) : null}

      {/* Stats chips */}
      <div className="mx-5 mb-4 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 text-[11px] font-black text-[#0C2A4B] ring-1 ring-slate-200">
          <Users className="h-3.5 w-3.5 text-[#0077B6]" aria-hidden />
          {dept.members_count} عضو
        </span>
        {(dept.leaders_count ?? 0) > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-black text-emerald-700 ring-1 ring-emerald-200">
            <UserCheck className="h-3.5 w-3.5" aria-hidden />
            {dept.leaders_count} قائد
          </span>
        ) : dept.leader_name ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 text-[11px] font-black text-[#0C2A4B] ring-1 ring-slate-200">
            <UserCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
            {dept.leader_name}
          </span>
        ) : null}
        {(dept.courses_count ?? 0) > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1.5 text-[11px] font-black text-sky-700 ring-1 ring-sky-200">
            <BookOpen className="h-3.5 w-3.5" aria-hidden />
            {dept.courses_count} دورة
          </span>
        ) : null}
        {dept.open_tasks_count !== null && (dept.open_tasks_count ?? 0) > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-black text-amber-700 ring-1 ring-amber-200">
            <ClipboardList className="h-3.5 w-3.5" aria-hidden />
            {dept.open_tasks_count} مهمة
          </span>
        ) : null}
      </div>

      {/* Divider */}
      <div className="mx-5 border-t border-slate-100" />

      {/* Actions */}
      <div className="flex flex-wrap gap-2 px-5 py-4">
        <button
          type="button"
          onClick={() => navigate(`/dashboard/admin/departments/${dept.id}`)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#0C2A4B]/10 bg-[#0C2A4B]/[0.04] px-3 py-2 text-[11px] font-black text-[#0C2A4B] transition hover:bg-[#0C2A4B]/[0.08]"
        >
          التفاصيل
        </button>
        <Link
          to={`/dashboard/super-admin/crud/team?department=${dept.id}`}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#0077B6]/15 bg-[#0077B6]/[0.06] px-3 py-2 text-[11px] font-black text-[#0077B6] transition hover:bg-[#0077B6]/[0.12]"
        >
          <Users className="h-3.5 w-3.5" aria-hidden />
          الفريق
        </Link>
        <Link
          to={`/dashboard/super-admin/volunteer-requests?department=${encodeURIComponent(getDepartmentName(dept))}`}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#F28C00]/15 bg-[#F28C00]/[0.06] px-3 py-2 text-[11px] font-black text-[#F28C00] transition hover:bg-[#F28C00]/[0.12]"
        >
          <HeartHandshake className="h-3.5 w-3.5" aria-hidden />
          متطوعون
        </Link>
        {(dept.courses_count ?? 0) > 0 ? (
          <Link
            to={`/dashboard/super-admin/crud/programs?department=${dept.id}`}
            className="inline-flex items-center justify-center gap-1 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-[11px] font-black text-sky-700 transition hover:bg-sky-100"
            title="البرامج والدورات"
          >
            <BookOpen className="h-3.5 w-3.5" aria-hidden />
          </Link>
        ) : null}
      </div>
    </motion.div>
  )
}

/* ── Detail drawer ───────────────────────────────────────────────────────── */

function DetailDrawer({
  dept,
  onClose,
}: {
  dept: WorkspaceDepartment | null
  onClose: () => void
}) {
  const navigate = useNavigate()

  return (
    <AnimatePresence>
      {dept ? (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            key="drawer"
            dir="rtl"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed inset-y-0 start-0 z-[210] flex w-full max-w-sm flex-col bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-5">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#0077B6] to-[#0C2A4B] text-lg font-black text-white shadow">
                  <Building2 className="h-6 w-6" aria-hidden />
                </span>
                <div>
                  <h2 className="font-black text-[#0C2A4B] leading-snug">{getDepartmentName(dept)}</h2>
                  {dept.name_en ? (
                    <p className="text-[11px] text-slate-400">{dept.name_en}</p>
                  ) : (
                    <p className="text-[11px] text-slate-400">#{dept.id}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="grid h-8 w-8 place-items-center rounded-xl border border-slate-200 text-slate-400 transition hover:text-[#0C2A4B]"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {(() => {
                const health = computeDeptHealth(dept)
                return (
                  <div className="space-y-2">
                    <StatusBadge status={health.status} />
                    {health.reasons.map((r, i) => (
                      <div key={i} className="flex items-start gap-1.5 rounded-xl bg-slate-50 px-3 py-2">
                        <Info className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" aria-hidden />
                        <p className="text-[11px] font-semibold text-slate-600">{r}</p>
                      </div>
                    ))}
                  </div>
                )
              })()}

              {dept.description ? (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">الوصف</p>
                  <p className="text-[13px] font-semibold leading-relaxed text-slate-600">{dept.description}</p>
                </div>
              ) : null}

              <dl className="space-y-2">
                {[
                  { label: 'الأعضاء', value: dept.members_count },
                  { label: 'القادة', value: dept.leaders_count ?? '—' },
                  { label: 'القائد', value: dept.leader_name ?? '—' },
                  { label: 'الدورات', value: dept.courses_count ?? '—' },
                  { label: 'طلبات التطوع', value: dept.volunteer_requests_count ?? '—' },
                  { label: 'بنود قيد الانتظار', value: dept.pending_items_count ?? '—' },
                  ...(dept.open_tasks_count !== null
                    ? [{ label: 'مهام مفتوحة', value: dept.open_tasks_count ?? 0 }]
                    : [{ label: 'نظام المهام', value: 'غير مرتبط حالياً' }]),
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                    <dt className="text-[12px] font-black text-slate-500">{label}</dt>
                    <dd className="text-[13px] font-black text-[#0C2A4B]">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="border-t border-slate-100 px-6 py-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => { navigate(`/dashboard/admin/departments/${dept.id}`); onClose() }}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#0C2A4B] px-4 py-2.5 text-[12px] font-black text-white shadow transition hover:opacity-90"
              >
                التفاصيل الكاملة
              </button>
              <Link
                to={`/dashboard/super-admin/crud/team?department=${dept.id}`}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-[#0C2A4B]/15 bg-[#0C2A4B]/[0.05] px-4 py-2.5 text-[12px] font-black text-[#0C2A4B] transition hover:bg-[#0C2A4B]/[0.09]"
                onClick={onClose}
              >
                <Users className="h-4 w-4" aria-hidden />
                الفريق
              </Link>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  )
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function DepartmentsManagementPage() {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<WorkspaceDepartment[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | WorkspaceDepartment['status']>('all')
  const [detail, setDetail] = useState<WorkspaceDepartment | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const list = await fetchWorkspaceDepartmentsForSuperAdmin()
      setRows(Array.isArray(list) ? list : [])
    } catch (e) {
      setRows([])
      const msg = getApiErrorMessage(e)
      setLoadError(msg)
      errorToast('تعذر تحميل بيانات الإدارات')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  // Derive health for each row so filters use computed status
  const rowsWithHealth = useMemo(
    () => rows.map((r) => ({ dept: r, health: computeDeptHealth(r) })),
    [rows],
  )

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    return rowsWithHealth.filter(({ dept, health }) => {
      if (statusFilter !== 'all' && health.status !== statusFilter) return false
      if (!t) return true
      const hay = `${getDepartmentName(dept)} ${dept.leader_name ?? ''} ${dept.description ?? ''}`.toLowerCase()
      return hay.includes(t)
    })
  }, [rowsWithHealth, q, statusFilter])

  const totalMembers = rows.reduce((acc, r) => acc + r.members_count, 0)
  const statusMix = rowsWithHealth.reduce(
    (acc, { health }) => {
      if (health.status === 'healthy') acc.healthy++
      else if (health.status === 'risk') acc.risk++
      else acc.attention++
      return acc
    },
    { healthy: 0, attention: 0, risk: 0 },
  )

  return (
    <SaPageRoot className="space-y-8 pb-16">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-bl from-[#0C2A4B] to-[#1a2840] px-8 py-10 shadow-xl">
        <div className="pointer-events-none absolute -end-24 -top-24 h-72 w-72 rounded-full bg-[#0077B6]/20 blur-[80px]" aria-hidden />
        <div className="pointer-events-none absolute -start-16 bottom-0 h-48 w-48 rounded-full bg-[#F28C00]/15 blur-[60px]" aria-hidden />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#0077B6]">إدارة المنظومة التنظيمية</p>
            <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">الإدارات</h1>
            <p className="mt-2 max-w-lg text-[13px] font-semibold leading-relaxed text-white/60">
              استعرض الوحدات التنظيمية مع حالتها الفعلية وأسبابها، وانتقل إلى فريق أو طلبات تطوع كل إدارة.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-[12px] font-black text-white backdrop-blur transition hover:bg-white/15 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden />
              تحديث
            </button>
            <Link
              to="/dashboard/super-admin/crud/team"
              className="inline-flex items-center gap-2 rounded-2xl bg-[#0077B6] px-5 py-2.5 text-[12px] font-black text-white shadow-lg transition hover:opacity-90"
            >
              <Users className="h-4 w-4" aria-hidden />
              الفريق
            </Link>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile icon={Building2} label="إجمالي الإدارات" value={rows.length} accent="blue" />
        <KpiTile icon={Users} label="إجمالي الأعضاء" value={totalMembers} accent="orange" />
        <KpiTile icon={CheckCircle2} label="إدارات سليمة" value={statusMix.healthy} accent="success" />
        <KpiTile icon={AlertCircle} label="إدارات في خطر" value={statusMix.risk} accent="danger" />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="بحث باسم الإدارة أو القائد..."
            className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pe-4 ps-10 text-[13px] font-semibold text-[#0C2A4B] placeholder:text-slate-400 outline-none ring-[#0077B6]/30 transition focus:ring-2"
          />
          {q ? (
            <button type="button" onClick={() => setQ('')} className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0C2A4B]">
              <X className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
        </div>
        {(['all', 'healthy', 'attention', 'risk'] as const).map((s) => {
          const labels = { all: 'الجميع', healthy: 'سليم', attention: 'انتباه', risk: 'خطر' }
          const counts = { all: rows.length, ...statusMix }
          const active = statusFilter === s
          return (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={[
                'inline-flex items-center gap-1.5 rounded-2xl px-4 py-2 text-[12px] font-black transition ring-1',
                active ? 'bg-[#0C2A4B] text-white ring-[#0C2A4B]' : 'bg-white text-slate-500 ring-slate-200 hover:ring-[#0077B6]/40',
              ].join(' ')}
            >
              {labels[s]}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {counts[s]}
              </span>
            </button>
          )
        })}
        {!loading && rows.length > 0 ? (
          <span className="ms-auto text-[12px] font-black text-slate-400">{filtered.length} من {rows.length}</span>
        ) : null}
      </div>

      {/* States */}
      {loadError && !loading ? <ErrorPanel title="تعذر تحميل بيانات الإدارات" hint={loadError} /> : null}

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-3xl bg-slate-100" />
          ))}
        </div>
      ) : null}

      {!loading && !loadError && rows.length === 0 ? (
        <EmptyPanel title="لا توجد إدارات متاحة حاليًا" subtitle="لم تُرجع نقطة النهاية أي وحدة. جرّب التحديث أو تحقق من صلاحية GET /operations/departments." />
      ) : null}

      {!loading && !loadError && rows.length > 0 && filtered.length === 0 ? (
        <EmptyPanel title="لا نتائج للمرشح الحالي" subtitle="عدّل البحث أو غيّر فلتر الحالة لإظهار إدارات أخرى." />
      ) : null}

      {/* Cards grid */}
      {!loading && filtered.length > 0 ? (
        <motion.div layout className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filtered.map(({ dept }) => (
              <DeptCard key={dept.id} dept={dept} />
            ))}
          </AnimatePresence>
        </motion.div>
      ) : null}

      <DetailDrawer dept={detail} onClose={() => setDetail(null)} />
    </SaPageRoot>
  )
}
