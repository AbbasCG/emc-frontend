import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { motion } from 'framer-motion'
import {
  AlertCircle,
  BookOpen,
  Building2,
  Calendar,
  ChevronLeft,
  ClipboardList,
  Clock,
  Copy,
  HeartHandshake,
  Info,
  KeyRound,
  LineChart,
  Mail,
  Pencil,
  Phone,
  Power,
  RefreshCw,
  Send,
  Settings2,
  Trash2,
  Users,
  UserCheck,
} from 'lucide-react'
import { fetchDepartmentOverview, type DepartmentOverview, type DepartmentOverviewMember } from '@/api/departmentOverviewApi'
import { deleteVmsDepartment, updateVmsDepartment } from '@/api/vmsApi'
import { useAuth } from '@/contexts/AuthContext'
import toast, { errorToast } from '@/lib/toast'
import { formatDate, formatDateTime } from '@/utils/dateTime'

const LOAD_ERROR = 'تعذّر تحميل بيانات الإدارة. تحقق من الاتصال وأعد المحاولة.'
const LOAD_TOAST = 'تعذّر تحميل بيانات الإدارة'

/* ── Tokens ─────────────────────────────────────────────────────────────── */

const CARD =
  'rounded-[14px] border border-[#E8EEF4] bg-white shadow-[0_8px_24px_-16px_rgba(12,42,75,0.28)]'
const PAGE_GAP = 'gap-6' // 24px
const MANAGE_ROLES = ['super_admin', 'tech_admin', 'admin', 'operations_manager', 'department_manager']

/* ── Helpers ────────────────────────────────────────────────────────────── */

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
}

function StatusPill({ status }: { status: string }) {
  const active = status === 'active' || status === 'healthy'
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-black ${
        active
          ? 'bg-emerald-500 text-white'
          : status === 'archived'
            ? 'bg-slate-400 text-white'
            : 'bg-amber-500 text-white'
      }`}
    >
      {active ? 'نشط' : status === 'archived' ? 'مؤرشف' : 'غير نشط'}
    </span>
  )
}

function InfoRow({
  label,
  value,
  last,
}: {
  label: string
  value: React.ReactNode
  last?: boolean
}) {
  const empty = value == null || value === ''
  return (
    <div
      className={`detail-row grid grid-cols-1 items-start gap-1 py-3.5 sm:grid-cols-[minmax(110px,150px)_minmax(0,1fr)] sm:items-center sm:gap-x-5 ${
        last ? '' : 'border-b border-[#E8EEF4]'
      }`}
    >
      <span className="text-[12px] font-semibold text-slate-400">{label}</span>
      <div className="min-w-0 text-[13px] font-bold text-[#0C2A4B] [overflow-wrap:anywhere]" dir="auto">
        {empty ? <span className="font-semibold text-slate-300">غير متوفر</span> : value}
      </div>
    </div>
  )
}

function CardShell({
  title,
  icon: Icon,
  children,
  className = '',
}: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={`${CARD} p-6 ${className}`}>
      <h2 className="mb-5 flex items-center gap-2.5 text-[14px] font-black text-[#0C2A4B]">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#0077B6]/10 text-[#0077B6]">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        {title}
      </h2>
      {children}
    </section>
  )
}

function KpiCard({
  icon: Icon,
  label,
  value,
  accent,
  linkTo,
  linkLabel,
}: {
  icon: React.ElementType
  label: string
  value: number | string
  accent: string
  linkTo?: string
  linkLabel?: string
}) {
  return (
    <div
      className={`${CARD} flex h-full flex-col items-center px-4 py-5 text-center transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-18px_rgba(12,42,75,0.35)]`}
    >
      <span className={`mb-3 grid h-11 w-11 place-items-center rounded-full ${accent}`}>
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <p className="text-[12px] font-bold text-slate-500">{label}</p>
      <p className="mt-2 text-[28px] font-black leading-none tabular-nums text-[#0C2A4B]">{value}</p>
      {linkTo && linkLabel ? (
        <Link
          to={linkTo}
          className="mt-3 inline-flex items-center gap-0.5 text-[11px] font-black text-[#0077B6] transition hover:text-[#0E5A8A]"
        >
          {linkLabel}
          <ChevronLeft className="h-3 w-3" aria-hidden />
        </Link>
      ) : (
        <span className="mt-3 h-[17px]" aria-hidden />
      )}
    </div>
  )
}

function ActivityMiniCard({
  icon: Icon,
  title,
  count,
  accent,
  linkTo,
  linkLabel,
  emptyText,
}: {
  icon: React.ElementType
  title: string
  count: number
  accent: string
  linkTo: string
  linkLabel: string
  emptyText: string
}) {
  return (
    <section className={`${CARD} flex h-full flex-col p-6`}>
      <h3 className="mb-5 flex items-center gap-2.5 text-[13px] font-black text-[#0C2A4B]">
        <span className={`grid h-8 w-8 place-items-center rounded-lg ${accent}`}>
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        {title}
      </h3>
      <div className="flex flex-1 flex-col items-center justify-center py-2 text-center">
        <p className="text-[32px] font-black tabular-nums leading-none text-[#0C2A4B]">{count}</p>
        <p className="mt-2 text-[12px] font-semibold text-slate-400">{emptyText}</p>
        <Link
          to={linkTo}
          className="mt-4 inline-flex items-center gap-1 text-[12px] font-black text-[#0077B6] hover:underline"
        >
          {linkLabel}
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
    </section>
  )
}

function MemberAvatar({ member }: { member: DepartmentOverviewMember }) {
  if (member.image) {
    return (
      <img
        src={member.image}
        alt={member.name}
        className="h-10 w-10 rounded-full object-cover ring-2 ring-white"
        title={member.name}
      />
    )
  }
  return (
    <span
      className="grid h-10 w-10 place-items-center rounded-full bg-[#0077B6]/10 text-[11px] font-black text-[#0077B6] ring-2 ring-white"
      title={member.name}
    >
      {initials(member.name)}
    </span>
  )
}

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function OpsDepartmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const canManage = !!user?.role && MANAGE_ROLES.includes(user.role)

  const [overview, setOverview] = useState<DepartmentOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [busyAction, setBusyAction] = useState<'deactivate' | 'delete' | null>(null)

  // Re-arm the loading state during render when the route id changes (react.dev
  // "adjusting state when a prop changes"), so the fetch effect below never has to
  // touch state synchronously — and the new department never paints the old one's
  // data as if it were settled.
  const [seenId, setSeenId] = useState(id)
  if (seenId !== id) {
    setSeenId(id)
    setLoading(true)
    setLoadError(null)
  }

  useEffect(() => {
    if (!id) return
    let cancelled = false
    void (async () => {
      try {
        const data = await fetchDepartmentOverview(id)
        if (!cancelled) setOverview(data)
      } catch {
        if (cancelled) return
        setLoadError(LOAD_ERROR)
        errorToast(LOAD_TOAST)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [id])

  // Retry/refresh lives outside the effect, so the synchronous reset here is legitimate.
  const retry = useCallback(async () => {
    if (!id) return
    setLoadError(null)
    setLoading(true)
    try {
      const data = await fetchDepartmentOverview(id)
      setOverview(data)
    } catch {
      setLoadError(LOAD_ERROR)
      errorToast(LOAD_TOAST)
    } finally {
      setLoading(false)
    }
  }, [id])

  async function copyText(value: string, okMsg: string) {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(okMsg)
    } catch {
      errorToast('تعذر النسخ')
    }
  }

  async function handleDeactivate() {
    if (!overview || !canManage) return
    const nextActive = !(overview.department.is_active ?? overview.department.status === 'active')
    const label = nextActive ? 'تفعيل' : 'إلغاء تفعيل'
    if (!window.confirm(`هل تريد ${label} قسم «${overview.department.name_ar}»؟`)) return
    setBusyAction('deactivate')
    try {
      await updateVmsDepartment(overview.department.id, { is_active: nextActive })
      toast.success(nextActive ? 'تم تفعيل القسم' : 'تم إلغاء تفعيل القسم')
      await retry()
    } catch {
      errorToast(`تعذّر ${label} القسم`)
    } finally {
      setBusyAction(null)
    }
  }

  async function handleDelete() {
    if (!overview || !canManage) return
    if (!window.confirm(`حذف قسم «${overview.department.name_ar}» نهائيًا؟ لا يمكن التراجع.`)) return
    setBusyAction('delete')
    try {
      await deleteVmsDepartment(overview.department.id)
      toast.success('تم حذف القسم')
      navigate('/dashboard/admin/departments')
    } catch {
      errorToast('تعذّر حذف القسم')
      setBusyAction(null)
    }
  }

  if (loading) {
    return (
      <div dir="rtl" className={`mx-auto max-w-[1280px] space-y-6 px-2 sm:px-0`}>
        <div className="h-44 animate-pulse rounded-[18px] bg-slate-100" />
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-[14px] bg-slate-100" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-80 animate-pulse rounded-[14px] bg-slate-100" />
          <div className="h-80 animate-pulse rounded-[14px] bg-slate-100" />
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div dir="rtl" className="rounded-[14px] border border-rose-200 bg-rose-50 p-10 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-rose-500" aria-hidden />
        <p className="mt-3 font-black text-rose-800">{loadError}</p>
        <button
          type="button"
          onClick={() => void retry()}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0C2A4B] px-6 py-2.5 text-sm font-black text-white"
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          إعادة المحاولة
        </button>
      </div>
    )
  }

  if (!overview) {
    return (
      <div dir="rtl" className={`${CARD} p-10 text-center font-black text-[#0C2A4B]`}>
        لم يتم العثور على الإدارة.
      </div>
    )
  }

  const { department: dept, kpis, leadership, members, volunteer_applications, recent_activity } = overview

  const manager = leadership.manager
  const teamsCount = 0
  const pendingCount = kpis.pending_applications
  const lastActivity = recent_activity[0] ?? null
  const isActive = dept.is_active ?? dept.status === 'active'
  const membersHref = `/dashboard/members?department_id=${dept.id}`
  const volunteersHref = `/dashboard/hr/volunteers?department_id=${dept.id}`
  const tasksHref = `/dashboard/admin/tasks?department_id=${dept.id}`
  const editHref = '/dashboard/super-admin/crud/departments'

  const quickStats: { label: string; value: number }[] = [
    { label: 'إجمالي الأعضاء', value: kpis.total_members },
    { label: 'القادة', value: kpis.leadership_count },
    { label: 'الفرق', value: teamsCount },
    { label: 'المهام النشطة', value: kpis.open_tasks },
    { label: 'طلبات التدريب', value: 0 },
    { label: 'بلاغات الدعم', value: 0 },
  ]

  return (
    <div dir="rtl" className={`mx-auto flex max-w-[1280px] flex-col ${PAGE_GAP}`}>
      {/* Breadcrumb */}
      <nav className="flex flex-wrap items-center gap-1.5 text-[12px] font-bold text-[#0077B6]" aria-label="مسار التنقل">
        <Link to="/dashboard/admin/departments" className="transition hover:text-[#0C2A4B]">
          الإدارات
        </Link>
        <span className="text-slate-300" aria-hidden>
          &gt;
        </span>
        <span className="text-slate-500">تفاصيل القسم</span>
      </nav>

      {/* Hero */}
      <motion.header
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-[18px] bg-[#0C2A4B] px-6 py-7 text-white shadow-[0_20px_40px_-24px_rgba(6,24,44,0.55)] sm:px-8"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(0,119,182,0.22),transparent_45%)]" aria-hidden />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-white/25 bg-white/5">
              <Building2 className="h-7 w-7 text-white" aria-hidden />
            </span>
            <div>
              <h1 className="text-[28px] font-black leading-tight text-white text-balance">{dept.name_ar}</h1>
              {dept.name_en ? (
                <p className="mt-1 text-[14px] font-semibold text-white/70">{dept.name_en}</p>
              ) : null}
              <div className="mt-3">
                <StatusPill status={dept.status} />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 sm:items-end">
            <div className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3.5 py-2 text-[12px] font-bold text-white/90 ring-1 ring-white/10">
              <Calendar className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
              <span>تاريخ الإنشاء</span>
              <span className="font-black tabular-nums">
                {dept.created_at ? formatDate(dept.created_at) : '—'}
              </span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3.5 py-2 text-[12px] font-bold text-white/90 ring-1 ring-white/10">
              <KeyRound className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
              <span>معرف القسم</span>
              <span className="font-black tabular-nums">#{dept.id}</span>
            </div>
          </div>
        </div>
      </motion.header>

      {/* KPI row fixed 6-column grid */}
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          icon={Users}
          label="إجمالي الأعضاء"
          value={kpis.total_members}
          accent="bg-[#0077B6]/10 text-[#0077B6]"
          linkTo={membersHref}
          linkLabel="عرض الأعضاء"
        />
        <KpiCard
          icon={UserCheck}
          label="القادة"
          value={kpis.leadership_count}
          accent="bg-emerald-50 text-emerald-600"
        />
        <KpiCard
          icon={BookOpen}
          label="الفرق"
          value={teamsCount}
          accent="bg-[#0E5A8A]/10 text-[#0E5A8A]"
        />
        <KpiCard
          icon={Calendar}
          label="برامج ودورات"
          value={kpis.courses_linked}
          accent="bg-teal-50 text-teal-600"
        />
        <KpiCard
          icon={HeartHandshake}
          label="طلبات التطوع"
          value={volunteer_applications.stats.total}
          accent="bg-[#F28C00] text-white"
          linkTo={volunteersHref}
          linkLabel="عرض الطلبات"
        />
        <KpiCard
          icon={Clock}
          label="بانتظار الانتظار"
          value={pendingCount}
          accent="bg-[#0C2A4B]/10 text-[#0C2A4B]"
        />
      </div>

      {/* Main two-column grid */}
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
        {/* Right column (RTL first) */}
        <div className="flex flex-col gap-6">
          <CardShell title="معلومات القسم" icon={Info}>
            <InfoRow label="اسم القسم" value={dept.name_ar} />
            <InfoRow label="الاسم الإنجليزي" value={dept.name_en} />
            <InfoRow label="الوصف" value={dept.description_ar || dept.description} />
            <InfoRow
              label="تاريخ الإنشاء"
              value={dept.created_at ? formatDate(dept.created_at) : null}
            />
            <InfoRow
              label="آخر تحديث"
              value={lastActivity ? formatDateTime(lastActivity.created_at) : null}
            />
            <InfoRow label="الحالة" value={<StatusPill status={dept.status} />} last />
          </CardShell>

          <CardShell title="القيادة" icon={Users}>
            {manager ? (
              <div className="rounded-[14px] border border-[#E8EEF4] bg-[#FBFAF7] p-5">
                <div className="flex flex-col items-center text-center">
                  <div className="relative">
                    <span className="grid h-[72px] w-[72px] place-items-center overflow-hidden rounded-full bg-[#0077B6]/10 text-lg font-black text-[#0077B6] ring-4 ring-white">
                      {initials(manager.name)}
                    </span>
                    <span className="absolute -bottom-1 start-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-black text-white shadow-sm">
                      قائد القسم
                    </span>
                  </div>
                  <p className="mt-5 text-[16px] font-black text-[#0C2A4B]">{manager.name}</p>
                  <p className="mt-1 text-[12px] font-semibold text-slate-500" dir="ltr">
                    {manager.email}
                  </p>
                </div>
                <div className="mt-5 grid grid-cols-1 gap-3 border-t border-[#E8EEF4] pt-4 sm:grid-cols-2">
                  <div className="flex items-center justify-center gap-2 text-[12px] font-bold text-[#0C2A4B]">
                    <Phone className="h-3.5 w-3.5 text-[#0077B6]" aria-hidden />
                    <span dir="ltr">{manager.phone || 'غير متوفر'}</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-[12px] font-bold text-[#0C2A4B]">
                    <Mail className="h-3.5 w-3.5 text-[#0077B6]" aria-hidden />
                    <span className="truncate" dir="ltr">
                      {manager.email}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center py-6 text-center">
                <UserCheck className="h-8 w-8 text-slate-300" aria-hidden />
                <p className="mt-3 text-[13px] font-semibold text-slate-400">لا يوجد مدير معين بعد</p>
                {canManage ? (
                  <Link
                    to={editHref}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#0077B6]/10 px-4 py-2 text-[12px] font-black text-[#0077B6] hover:bg-[#0077B6]/15"
                  >
                    تعيين مدير
                  </Link>
                ) : null}
              </div>
            )}
          </CardShell>

          <CardShell title="الفريق المرتبط" icon={Users}>
            {members.length > 0 ? (
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[12px] font-semibold text-slate-400">إجمالي أعضاء الفريق</p>
                  <p className="mt-1 text-[18px] font-black text-[#0C2A4B]">
                    {kpis.total_members}{' '}
                    <span className="text-[13px] font-bold text-emerald-600">عضو نشط</span>
                  </p>
                </div>
                <div className="flex flex-col items-start gap-3 sm:items-end">
                  <div className="flex flex-row-reverse -space-x-2 space-x-reverse">
                    {members.slice(0, 5).map((m) => (
                      <MemberAvatar key={m.id} member={m} />
                    ))}
                  </div>
                  <Link
                    to={membersHref}
                    className="inline-flex items-center gap-1 rounded-xl border border-[#0077B6]/30 bg-[#0077B6]/5 px-3.5 py-2 text-[12px] font-black text-[#0077B6] transition hover:bg-[#0077B6]/10"
                  >
                    عرض جميع الأعضاء
                    <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center py-6 text-center">
                <Users className="h-8 w-8 text-slate-300" aria-hidden />
                <p className="mt-3 text-[13px] font-semibold text-slate-400">لا يوجد أعضاء مرتبطون بهذا القسم</p>
                <Link
                  to={membersHref}
                  className="mt-4 text-[12px] font-black text-[#0077B6] hover:underline"
                >
                  عرض جميع الأعضاء
                </Link>
              </div>
            )}
          </CardShell>
        </div>

        {/* Left column */}
        <div className="flex flex-col gap-6">
          <CardShell title="إحصائيات سريعة" icon={LineChart}>
            <ul className="divide-y divide-[#E8EEF4]">
              {quickStats.map((row) => (
                <li key={row.label} className="flex items-center justify-between gap-4 py-3.5">
                  <span className="text-[13px] font-semibold text-slate-500">{row.label}</span>
                  <span className="text-[15px] font-black tabular-nums text-[#0C2A4B]">{row.value}</span>
                </li>
              ))}
            </ul>
          </CardShell>

          <CardShell title="معلومات القسم الإدارية" icon={Settings2}>
            <InfoRow label="مدير القسم" value={manager?.name} />
            <InfoRow
              label="البريد الإلكتروني"
              value={manager?.email ? <span dir="ltr">{manager.email}</span> : null}
            />
            <InfoRow
              label="رقم الهاتف"
              value={
                manager?.phone ? (
                  <span className="inline-flex items-center gap-2">
                    <span dir="ltr">{manager.phone}</span>
                    <button
                      type="button"
                      onClick={() => void copyText(manager.phone!, 'تم نسخ الرقم')}
                      className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-[#0077B6]"
                      aria-label="نسخ الرقم"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ) : null
              }
            />
            <InfoRow label="الدولة" value={null} />
            <InfoRow label="المدينة" value={null} />
            <InfoRow
              label="تاريخ التأسيس"
              value={dept.created_at ? formatDate(dept.created_at) : null}
              last
            />
          </CardShell>
        </div>
      </div>

      {/* Bottom activity cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <ActivityMiniCard
          icon={HeartHandshake}
          title="طلبات التطوع المرتبطة"
          count={volunteer_applications.stats.total}
          accent="bg-rose-50 text-rose-500"
          linkTo={volunteersHref}
          linkLabel="عرض جميع الطلبات"
          emptyText={volunteer_applications.stats.total === 0 ? 'لا توجد طلبات' : 'طلب مرتبط'}
        />
        <ActivityMiniCard
          icon={BookOpen}
          title="البرامج والدورات المرتبطة"
          count={kpis.courses_linked}
          accent="bg-[#0E5A8A]/10 text-[#0E5A8A]"
          linkTo="/dashboard/admin/courses"
          linkLabel="عرض جميع البرامج"
          emptyText={kpis.courses_linked === 0 ? 'لا توجد برامج' : 'برنامج مرتبط'}
        />
        <ActivityMiniCard
          icon={ClipboardList}
          title="المهام المفتوحة"
          count={kpis.open_tasks}
          accent="bg-amber-50 text-amber-600"
          linkTo={tasksHref}
          linkLabel="عرض جميع المهام"
          emptyText={kpis.open_tasks === 0 ? 'لا توجد مهام مفتوحة' : 'مهمة مفتوحة'}
        />
        <ActivityMiniCard
          icon={Clock}
          title="حضور قيد الانتظار"
          count={0}
          accent="bg-[#F28C00] text-white"
          linkTo={volunteersHref}
          linkLabel="عرض جميع الطلبات"
          emptyText="لا توجد طلبات"
        />
      </div>

      {/* Last update */}
      <section className={`${CARD} grid grid-cols-1 gap-6 p-6 sm:grid-cols-3`}>
        <div className="text-center sm:text-start">
          <p className="text-[12px] font-semibold text-slate-400">آخر تحديث</p>
          <p className="mt-1.5 text-[13px] font-black tabular-nums text-[#0C2A4B]">
            {lastActivity ? formatDateTime(lastActivity.created_at) : 'غير متوفر'}
          </p>
        </div>
        <div className="text-center sm:text-start">
          <p className="text-[12px] font-semibold text-slate-400">تم التحديث بواسطة</p>
          <p className="mt-1.5 text-[13px] font-black text-[#0C2A4B]">
            {lastActivity?.user_name || 'غير متوفر'}
          </p>
        </div>
        <div className="text-center sm:text-start">
          <p className="text-[12px] font-semibold text-slate-400">ملاحظات التحديث</p>
          <p className="mt-1.5 text-[13px] font-black text-[#0C2A4B]">
            {lastActivity?.description || 'لا توجد ملاحظات'}
          </p>
        </div>
      </section>

      {/* Footer actions */}
      {canManage ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          {/* RTL: first group sits on the right Edit + Message */}
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            <Link
              to={editHref}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0077B6] px-5 py-3 text-[13px] font-black text-white transition hover:bg-[#0E5A8A]"
            >
              <Pencil className="h-4 w-4" aria-hidden />
              تعديل معلومات القسم
            </Link>
            {manager?.email ? (
              <a
                href={`mailto:${manager.email}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#0077B6]/40 bg-white px-5 py-3 text-[13px] font-black text-[#0077B6] transition hover:bg-[#0077B6]/5"
              >
                <Send className="h-4 w-4" aria-hidden />
                إرسال رسالة
              </a>
            ) : (
              <button
                type="button"
                onClick={() => toast.warning('لا يوجد بريد لمدير القسم')}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#0077B6]/40 bg-white px-5 py-3 text-[13px] font-black text-[#0077B6]"
              >
                <Send className="h-4 w-4" aria-hidden />
                إرسال رسالة
              </button>
            )}
          </div>
          {/* RTL: second group sits on the left Deactivate + Delete */}
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            <button
              type="button"
              disabled={busyAction === 'deactivate'}
              onClick={() => void handleDeactivate()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-[13px] font-black text-[#0C2A4B] transition hover:bg-slate-50 disabled:opacity-60"
            >
              <Power className="h-4 w-4" aria-hidden />
              {isActive ? 'إلغاء تفعيل' : 'تفعيل القسم'}
            </button>
            <button
              type="button"
              disabled={busyAction === 'delete'}
              onClick={() => void handleDelete()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-500 px-5 py-3 text-[13px] font-black text-white transition hover:bg-rose-600 disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              حذف القسم
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
