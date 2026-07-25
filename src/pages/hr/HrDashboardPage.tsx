import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  Award,
  BookOpen,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  FolderLock,
  GraduationCap,
  HeartHandshake,
  Loader2,
  RefreshCw,
  Rocket,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react'
import { fetchHrDashboard, type HrDashboardData } from '@/api/hrDashboardApi'
import { formatDate } from '@/utils/dateTime'

// ── English-only number formatter ──────────────────────────────────────────
function n(v: number | null | undefined): string {
  if (v == null) return '—'
  return new Intl.NumberFormat('en-US').format(v)
}

// ── KPI Card ───────────────────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
  href,
  alert,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  accent: string
  href?: string
  alert?: boolean
}) {
  const inner = (
    <div
      className={`relative flex flex-col gap-3 rounded-2xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md ${
        alert ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-100'
      }`}
    >
      <div className="flex items-start justify-between">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent}`}>
          <Icon size={18} />
        </span>
        {alert && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400">
            <AlertCircle size={12} className="text-white" />
          </span>
        )}
      </div>
      <div className="text-right">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
        <p className="mt-0.5 text-3xl font-black text-[#0C2A4B]">{value}</p>
        {sub && <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>}
      </div>
    </div>
  )
  if (href) return <Link to={href}>{inner}</Link>
  return inner
}

// ── Quick Action Button ────────────────────────────────────────────────────
function QuickAction({ label, href, icon: Icon, accent }: { label: string; href: string; icon: React.ElementType; accent: string }) {
  return (
    <Link
      to={href}
      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-[#0C2A4B] shadow-sm transition hover:border-[#0077B6]/40 hover:bg-sky-50/50 hover:shadow-md"
    >
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${accent}`}>
        <Icon size={16} />
      </span>
      {label}
    </Link>
  )
}

// ── Status badge ───────────────────────────────────────────────────────────
const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending:              { label: 'قيد الانتظار', cls: 'bg-amber-100 text-amber-700' },
  reviewing:            { label: 'تحت المراجعة', cls: 'bg-blue-100 text-blue-700' },
  accepted:             { label: 'مقبول',         cls: 'bg-emerald-100 text-emerald-700' },
  rejected:             { label: 'مرفوض',         cls: 'bg-red-100 text-red-600' },
  converted_to_member:  { label: 'عضو',           cls: 'bg-slate-100 text-slate-600' },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { label: status, cls: 'bg-slate-100 text-slate-600' }
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-black ${s.cls}`}>{s.label}</span>
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function HrDashboardPage() {
  const [data, setData] = useState<HrDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setData(await fetchHrDashboard())
    } catch {
      setError('تعذّر تحميل بيانات الموارد البشرية.')
    } finally {
      setLoading(false)
    }
  }

  // Mount load — `loading`/`error` already start in the right state, so the effect does
  // no synchronous reset (the refresh/retry buttons still call `load` directly).
  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const result = await fetchHrDashboard()
        if (alive) setData(result)
      } catch {
        if (alive) setError('تعذّر تحميل بيانات الموارد البشرية.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  const s = data?.stats

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50/60">
      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <div className="border-b border-slate-200 bg-white px-6 py-8 shadow-sm">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-[#0077B6]">EMC — الموارد البشرية</p>
              <h1 className="mt-1 text-2xl font-black text-[#0C2A4B]">قطاع الموارد البشرية</h1>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                إدارة الأعضاء، المدربين، المتطوعين، والطلبات الداخلية
              </p>
            </div>
            <button
              onClick={() => void load()}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              تحديث
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-6 space-y-8">
        {/* ── Error ─────────────────────────────────────────────────────── */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <AlertCircle size={16} className="shrink-0 text-red-500" />
            <p className="text-sm font-bold text-red-600">{error}</p>
            <button onClick={() => void load()} className="ms-auto text-xs font-black text-red-600 underline">إعادة المحاولة</button>
          </div>
        )}

        {/* ── KPI Section 1: الأعضاء والفريق ──────────────────────────── */}
        <section>
          <h2 className="mb-4 text-xs font-black uppercase tracking-widest text-slate-400">
            1 — الأعضاء والفريق
          </h2>
          {loading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[...Array(4)].map((_, i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <KpiCard label="إجمالي الأعضاء"    value={n(s?.total_members)}   icon={Users}      accent="bg-[#0C2A4B]/10 text-[#0C2A4B]"  />
              <KpiCard label="الأعضاء النشطون"   value={n(s?.active_members)}  icon={UserCheck}  accent="bg-emerald-100 text-emerald-700" />
              <KpiCard label="أعضاء الفريق"      value={n(s?.team_members)}    icon={Award}      accent="bg-violet-100 text-violet-700"   />
              <KpiCard label="الإدارات"           value={n(s?.departments_count)} icon={Building2} accent="bg-sky-100 text-sky-700"        href="/dashboard/hr/departments" />
            </div>
          )}
        </section>

        {/* ── KPI Section 2: المتطوعون ──────────────────────────────────── */}
        <section>
          <h2 className="mb-4 text-xs font-black uppercase tracking-widest text-slate-400">
            2 — المتطوعون والطلبات
          </h2>
          {loading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[...Array(4)].map((_, i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <KpiCard
                label="طلبات جديدة"
                value={n(s?.pending_volunteer_requests)}
                icon={HeartHandshake}
                accent="bg-amber-100 text-amber-700"
                href="/dashboard/hr/volunteer-requests"
                alert={(s?.pending_volunteer_requests ?? 0) > 0}
              />
              <KpiCard
                label="مقبولون"
                value={n(s?.accepted_volunteers)}
                icon={CheckCircle2}
                accent="bg-emerald-100 text-emerald-700"
                href="/dashboard/volunteer"
              />
              <KpiCard
                label="بانتظار التحويل"
                value={n(s?.volunteers_waiting_conversion)}
                icon={TrendingUp}
                accent="bg-orange-100 text-orange-700"
                href="/dashboard/volunteer"
                alert={(s?.volunteers_waiting_conversion ?? 0) > 0}
              />
              <KpiCard
                label="تم التحويل"
                value={n(s?.converted_volunteers)}
                icon={UserPlus}
                accent="bg-teal-100 text-teal-700"
              />
            </div>
          )}
        </section>

        {/* ── KPI Section 3: المدربون والمهام ────────────────────────────── */}
        <section>
          <h2 className="mb-4 text-xs font-black uppercase tracking-widest text-slate-400">
            3 — المدربون والمهام
          </h2>
          {loading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
              {[...Array(2)].map((_, i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                label="المدربون"
                value={n(s?.instructors)}
                icon={GraduationCap}
                accent="bg-indigo-100 text-indigo-700"
                href="/dashboard/hr/instructors"
              />
              <KpiCard
                label="مهام HR المفتوحة"
                value={n(s?.open_hr_tasks)}
                icon={ClipboardCheck}
                accent="bg-rose-100 text-rose-700"
                href="/dashboard/hr/tasks"
                alert={(s?.open_hr_tasks ?? 0) > 5}
              />
            </div>
          )}
        </section>

        {/* ── Quick Actions ─────────────────────────────────────────────── */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-black text-[#0C2A4B]">الإجراءات السريعة</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <QuickAction label="مراجعة طلبات التطوع"     href="/dashboard/hr/volunteer-requests" icon={HeartHandshake}  accent="bg-amber-100 text-amber-700"   />
            <QuickAction label="عرض المتطوعين المقبولين"  href="/dashboard/volunteer"             icon={CheckCircle2}    accent="bg-emerald-100 text-emerald-700" />
            <QuickAction label="إدارة المدربين"           href="/dashboard/hr/instructors"        icon={GraduationCap}   accent="bg-indigo-100 text-indigo-700"  />
            <QuickAction label="الإدارات والأدوار"        href="/dashboard/hr/departments"        icon={Building2}       accent="bg-sky-100 text-sky-700"        />
            <QuickAction label="مهام الموارد البشرية"     href="/dashboard/hr/tasks"              icon={ClipboardCheck}  accent="bg-rose-100 text-rose-700"      />
            <QuickAction label="ملفات الموارد البشرية"    href="/dashboard/hr/documents"          icon={FolderLock}      accent="bg-slate-100 text-slate-600"    />
          </div>
        </section>

        {/* ── Content Grid ──────────────────────────────────────────────── */}
        {!loading && data && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Recent Volunteer Requests */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <Link to="/dashboard/hr/volunteer-requests" className="flex items-center gap-1 text-[11px] font-black text-[#0077B6] hover:underline">
                  عرض الكل <ArrowLeft size={12} />
                </Link>
                <h3 className="text-sm font-black text-[#0C2A4B]">آخر طلبات التطوع</h3>
              </div>
              {data.recent_volunteer_requests.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">لا توجد طلبات حتى الآن</p>
              ) : (
                <ul className="space-y-2">
                  {data.recent_volunteer_requests.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                      <StatusBadge status={r.status} />
                      <div className="min-w-0 flex-1 text-right">
                        <p className="truncate text-sm font-black text-[#0C2A4B]">{r.full_name}</p>
                        <p className="text-[11px] text-slate-400">{r.desired_department ?? r.email}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Accepted volunteers pending conversion */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <Link to="/dashboard/volunteer" className="flex items-center gap-1 text-[11px] font-black text-[#0077B6] hover:underline">
                  عرض الكل <ArrowLeft size={12} />
                </Link>
                <h3 className="text-sm font-black text-[#0C2A4B]">مقبولون بانتظار التحويل</h3>
              </div>
              {data.accepted_volunteers.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">لا يوجد متطوعون مقبولون في انتظار التحويل</p>
              ) : (
                <ul className="space-y-2">
                  {data.accepted_volunteers.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 rounded-xl bg-emerald-50 px-3 py-2.5">
                      <p className="text-[11px] text-slate-400">{r.accepted_at ? formatDate(r.accepted_at) : '—'}</p>
                      <div className="min-w-0 flex-1 text-right">
                        <p className="truncate text-sm font-black text-[#0C2A4B]">{r.full_name}</p>
                        <p className="text-[11px] text-slate-400">{r.desired_department ?? r.email}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Recent Instructors */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <Link to="/dashboard/hr/instructors" className="flex items-center gap-1 text-[11px] font-black text-[#0077B6] hover:underline">
                  عرض الكل <ArrowLeft size={12} />
                </Link>
                <h3 className="text-sm font-black text-[#0C2A4B]">آخر المدربين</h3>
              </div>
              {data.recent_instructors.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">لا يوجد مدربون مسجلون</p>
              ) : (
                <ul className="space-y-2">
                  {data.recent_instructors.map((i) => (
                    <li key={i.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                      <span className="flex items-center gap-1 text-[11px] text-slate-500">
                        <BookOpen size={11} />
                        {n(i.courses_count)}
                      </span>
                      <div className="min-w-0 flex-1 text-right">
                        <p className="truncate text-sm font-black text-[#0C2A4B]">{i.name}</p>
                        <p className="text-[11px] text-slate-400">{i.title ?? i.email ?? '—'}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Department breakdown */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <Link to="/dashboard/hr/departments" className="flex items-center gap-1 text-[11px] font-black text-[#0077B6] hover:underline">
                  عرض الكل <ArrowLeft size={12} />
                </Link>
                <h3 className="text-sm font-black text-[#0C2A4B]">توزيع الأعضاء بالإدارات</h3>
              </div>
              {data.department_breakdown.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">لا توجد إدارات نشطة</p>
              ) : (
                <ul className="space-y-2">
                  {data.department_breakdown.slice(0, 6).map((d) => {
                    const max = Math.max(...data.department_breakdown.map((x) => x.members_count), 1)
                    const pct = Math.round((d.members_count / max) * 100)
                    return (
                      <li key={d.name} className="grid gap-1 text-right">
                        <div className="flex items-center justify-between text-[12px]">
                          <span className="font-black text-[#0C2A4B]">{n(d.members_count)}</span>
                          <span className="font-semibold text-slate-600">{d.name}</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-[#0077B6] transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin text-[#0077B6]" />
          </div>
        )}

        {/* Onboarding / Tasks shortcuts */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Link to="/dashboard/hr/onboarding" className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-700"><Rocket size={18} /></span>
            <div className="text-right">
              <p className="text-sm font-black text-[#0C2A4B]">التأهيل والانضمام</p>
              <p className="text-[11px] text-slate-400">متابعة عمليات الانضمام</p>
            </div>
          </Link>
          <Link to="/dashboard/hr/tasks" className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-700"><ClipboardCheck size={18} /></span>
            <div className="text-right">
              <p className="text-sm font-black text-[#0C2A4B]">مهام الموارد البشرية</p>
              <p className="text-[11px] text-slate-400">{n(s?.open_hr_tasks)} مهمة مفتوحة</p>
            </div>
          </Link>
          <Link to="/dashboard/hr/documents" className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><FolderLock size={18} /></span>
            <div className="text-right">
              <p className="text-sm font-black text-[#0C2A4B]">ملفات الموارد البشرية</p>
              <p className="text-[11px] text-slate-400">الوثائق والملفات الداخلية</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
