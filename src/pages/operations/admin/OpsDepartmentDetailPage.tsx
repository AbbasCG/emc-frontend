import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ClipboardList,
  HeartHandshake,
  Info,
  RefreshCw,
  UserCheck,
  Users,
} from 'lucide-react'
import { fetchAdminDepartmentById } from '@/api/superAdminOpsApi'
import type { AdminDepartment } from '@/types/operations'
import { errorToast } from '@/lib/toast'

/* ── Status helpers ─────────────────────────────────────────────────────── */

function statusLabel(s: AdminDepartment['status']) {
  if (s === 'healthy') return 'سليم'
  if (s === 'risk') return 'خطر'
  return 'انتباه'
}

function StatusBadge({ status }: { status: AdminDepartment['status'] }) {
  const cls =
    status === 'healthy'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
      : status === 'risk'
        ? 'bg-rose-50 text-rose-700 ring-rose-200'
        : 'bg-amber-50 text-amber-700 ring-amber-200'
  const Icon =
    status === 'healthy' ? CheckCircle2 : status === 'risk' ? AlertCircle : AlertTriangle
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-black ring-1 ${cls}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {statusLabel(status)}
    </span>
  )
}

function computeReasons(d: AdminDepartment): string[] {
  if (d.status === 'healthy') return ['جميع المؤشرات سليمة']
  const reasons: string[] = []
  if (d.leaders_count === 0) reasons.push('لا يوجد قائد معيّن')
  if (d.members_count === 0) reasons.push('لا يوجد أعضاء مرتبطون')
  if (d.volunteer_requests_count > 0) reasons.push(`${d.volunteer_requests_count} طلب تطوع قيد المراجعة`)
  if (d.open_tasks_count !== null && d.open_tasks_count > 0) reasons.push(`${d.open_tasks_count} مهمة مفتوحة`)
  if (d.pending_items_count > 0) reasons.push(`${d.pending_items_count} بنود قيد الانتظار`)
  return reasons.length ? reasons : ['تحتاج إلى مراجعة']
}

/* ── Metric card ────────────────────────────────────────────────────────── */

function MetricCard({
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
  accent: 'blue' | 'orange' | 'emerald' | 'amber' | 'sky' | 'rose'
  linkTo?: string
  linkLabel?: string
}) {
  const colorMap = {
    blue: 'text-[#2691C2] bg-[#2691C2]/10 ring-[#2691C2]/20',
    orange: 'text-[#EC943C] bg-[#EC943C]/10 ring-[#EC943C]/20',
    emerald: 'text-emerald-700 bg-emerald-50 ring-emerald-200',
    amber: 'text-amber-700 bg-amber-50 ring-amber-200',
    sky: 'text-sky-700 bg-sky-50 ring-sky-200',
    rose: 'text-rose-700 bg-rose-50 ring-rose-200',
  }
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className={`grid h-10 w-10 place-items-center rounded-xl ring-1 ${colorMap[accent]}`}>
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <p className="text-2xl font-black text-[#22334A] tabular-nums">{value}</p>
      </div>
      <p className="text-[12px] font-black text-slate-500">{label}</p>
      {linkTo && linkLabel ? (
        <Link
          to={linkTo}
          className="inline-flex items-center gap-1 text-[11px] font-black text-[#2691C2] hover:underline"
        >
          {linkLabel}
          <ChevronLeft className="h-3 w-3" aria-hidden />
        </Link>
      ) : null}
    </div>
  )
}

/* ── Section wrapper ────────────────────────────────────────────────────── */

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-4">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#22334A]/[0.06] text-[#22334A]">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <h2 className="font-black text-[#22334A]">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function EmptyNote({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-[13px] font-semibold text-slate-400">
      {text}
    </p>
  )
}

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function OpsDepartmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [dept, setDept] = useState<AdminDepartment | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  async function load() {
    if (!id) return
    setLoadError(null)
    setLoading(true)
    try {
      const data = await fetchAdminDepartmentById(id)
      setDept(data)
    } catch {
      setLoadError('تعذّر تحميل بيانات الإدارة. تحقق من الاتصال وأعد المحاولة.')
      errorToast('تعذّر تحميل بيانات الإدارة')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [id])

  if (loading) {
    return (
      <div dir="rtl" className="space-y-6">
        <div className="h-40 animate-pulse rounded-3xl bg-slate-100" />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
        <div className="h-48 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div dir="rtl" className="rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-rose-500" aria-hidden />
        <p className="mt-3 font-black text-rose-800">{loadError}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#22334A] px-6 py-2.5 text-sm font-black text-white"
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          إعادة المحاولة
        </button>
      </div>
    )
  }

  if (!dept) {
    return (
      <div dir="rtl" className="rounded-2xl bg-white p-10 text-center font-black text-[#22334A] ring-1 ring-[#22334A]/[0.06]">
        لم يتم العثور على الإدارة.
      </div>
    )
  }

  const reasons = computeReasons(dept)

  return (
    <div dir="rtl" className="space-y-6">
      {/* Back */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 text-[12px] font-black text-[#2691C2] transition hover:text-[#22334A]"
      >
        <ChevronLeft className="h-4 w-4 rotate-180" aria-hidden />
        الإدارات
      </button>

      {/* Hero header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-bl from-[#22334A] to-[#1a2840] px-8 py-8 shadow-xl"
      >
        <div className="pointer-events-none absolute -end-20 -top-20 h-60 w-60 rounded-full bg-[#2691C2]/20 blur-[70px]" aria-hidden />
        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-start gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/10 text-2xl font-black text-white ring-2 ring-white/20">
              <Building2 className="h-7 w-7" aria-hidden />
            </span>
            <div>
              <h1 className="text-2xl font-black text-white">{dept.name_ar}</h1>
              {dept.name_en ? (
                <p className="mt-1 text-[13px] font-semibold text-white/55">{dept.name_en}</p>
              ) : null}
              {dept.description_ar ? (
                <p className="mt-2 max-w-xl text-[13px] font-semibold leading-relaxed text-white/65">{dept.description_ar}</p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusBadge status={dept.status} />
            {reasons.map((r, i) => (
              <div key={i} className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5">
                <Info className="h-3 w-3 text-white/60" aria-hidden />
                <p className="text-[11px] font-semibold text-white/80">{r}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Metrics grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          icon={Users}
          label="إجمالي الأعضاء"
          value={dept.members_count}
          accent="blue"
          linkTo={`/dashboard/super-admin/crud/team?department=${dept.id}`}
          linkLabel="عرض الفريق"
        />
        <MetricCard
          icon={UserCheck}
          label="القادة"
          value={dept.leaders_count}
          accent="emerald"
        />
        <MetricCard
          icon={BookOpen}
          label="الدورات والبرامج"
          value={dept.courses_count}
          accent="sky"
          linkTo={dept.courses_count > 0 ? `/dashboard/super-admin/crud/programs?department=${dept.id}` : undefined}
          linkLabel={dept.courses_count > 0 ? 'عرض البرامج' : undefined}
        />
        <MetricCard
          icon={HeartHandshake}
          label="طلبات التطوع"
          value={dept.volunteer_requests_count}
          accent="orange"
          linkTo={`/dashboard/super-admin/volunteer-requests?department=${encodeURIComponent(dept.name_ar)}`}
          linkLabel="عرض الطلبات"
        />
        <MetricCard
          icon={AlertTriangle}
          label="بنود قيد الانتظار"
          value={dept.pending_items_count}
          accent={dept.pending_items_count >= 10 ? 'rose' : dept.pending_items_count > 0 ? 'amber' : 'emerald'}
        />
        {dept.open_tasks_count !== null ? (
          <MetricCard
            icon={ClipboardList}
            label="مهام مفتوحة"
            value={dept.open_tasks_count}
            accent={dept.open_tasks_count > 0 ? 'amber' : 'emerald'}
          />
        ) : (
          <div className="flex flex-col justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5">
            <p className="text-[11px] font-black text-slate-400">نظام المهام</p>
            <p className="mt-1 text-[12px] font-semibold text-slate-500">لا يوجد نظام مهام مرتبط حالياً</p>
          </div>
        )}
      </div>

      {/* Section: Leader */}
      <Section title="القيادة" icon={UserCheck}>
        {dept.leader_name ? (
          <div className="flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-100">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 font-black text-emerald-700">
              {dept.leader_name.charAt(0)}
            </span>
            <div>
              <p className="font-black text-[#22334A]">{dept.leader_name}</p>
              <p className="text-[11px] text-slate-500">قائد الإدارة</p>
            </div>
          </div>
        ) : (
          <EmptyNote text="لا يوجد قائد معيّن بعد" />
        )}
      </Section>

      {/* Section: Team */}
      <Section title="الفريق المرتبط" icon={Users}>
        {dept.members_count > 0 ? (
          <div className="space-y-3">
            <p className="text-[13px] font-semibold text-slate-600">
              يضم هذا القسم <span className="font-black text-[#22334A]">{dept.members_count}</span> عضو، منهم{' '}
              <span className="font-black text-[#22334A]">{dept.leaders_count}</span> قائد.
            </p>
            <Link
              to={`/dashboard/super-admin/crud/team?department=${dept.id}`}
              className="inline-flex items-center gap-2 rounded-xl bg-[#22334A] px-4 py-2.5 text-[12px] font-black text-white shadow transition hover:opacity-90"
            >
              <Users className="h-4 w-4" aria-hidden />
              عرض أعضاء الإدارة
            </Link>
          </div>
        ) : (
          <EmptyNote text="لا يوجد أعضاء مرتبطون بهذه الإدارة" />
        )}
      </Section>

      {/* Section: Volunteer requests */}
      <Section title="طلبات التطوع المرتبطة" icon={HeartHandshake}>
        {dept.volunteer_requests_count > 0 ? (
          <div className="space-y-3">
            <p className="text-[13px] font-semibold text-slate-600">
              يوجد <span className="font-black text-[#22334A]">{dept.volunteer_requests_count}</span> طلب تطوع مرتبط بهذه الإدارة.
            </p>
            <Link
              to={`/dashboard/super-admin/volunteer-requests?department=${encodeURIComponent(dept.name_ar)}`}
              className="inline-flex items-center gap-2 rounded-xl bg-[#EC943C] px-4 py-2.5 text-[12px] font-black text-white shadow transition hover:opacity-90"
            >
              <HeartHandshake className="h-4 w-4" aria-hidden />
              عرض الطلبات
            </Link>
          </div>
        ) : (
          <EmptyNote text="لا توجد طلبات تطوع مرتبطة بهذه الإدارة" />
        )}
      </Section>

      {/* Section: Programs/courses */}
      <Section title="البرامج والدورات المرتبطة" icon={BookOpen}>
        {dept.courses_count > 0 ? (
          <div className="space-y-3">
            <p className="text-[13px] font-semibold text-slate-600">
              يوجد <span className="font-black text-[#22334A]">{dept.courses_count}</span> برنامج أو دورة مرتبطة بهذه الإدارة.
            </p>
            <Link
              to={`/dashboard/super-admin/crud/programs?department=${dept.id}`}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2691C2] px-4 py-2.5 text-[12px] font-black text-white shadow transition hover:opacity-90"
            >
              <BookOpen className="h-4 w-4" aria-hidden />
              عرض البرامج
            </Link>
          </div>
        ) : (
          <EmptyNote text="لا توجد برامج مرتبطة بهذه الإدارة" />
        )}
      </Section>

      {/* Section: Open tasks (conditional) */}
      {dept.open_tasks_count !== null ? (
        <Section title="المهام المفتوحة" icon={ClipboardList}>
          {dept.open_tasks_count > 0 ? (
            <p className="text-[13px] font-semibold text-slate-600">
              يوجد <span className="font-black text-amber-700">{dept.open_tasks_count}</span> مهمة مفتوحة حاليًا في هذه الإدارة.
            </p>
          ) : (
            <EmptyNote text="لا توجد مهام مفتوحة في هذه الإدارة حالياً" />
          )}
        </Section>
      ) : null}
    </div>
  )
}
