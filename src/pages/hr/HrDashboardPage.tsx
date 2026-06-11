import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2,
  CalendarClock,
  ClipboardList,
  FolderUp,
  GraduationCap,
  HeartHandshake,
  ListChecks,
  UserPlus,
  Users,
} from 'lucide-react'
import { fetchHrDashboardSnapshot } from '@/api/hrDashboardApi'
import HrDepartmentBarChart from '@/components/hr/HrDepartmentBarChart'
import {
  DashboardHero,
  DashboardKpiCard,
  DashboardKpiSkeleton,
  DashboardListSkeleton,
  DashboardErrorWidget,
} from '@/components/dashboard'
import type { HrDashboardSnapshot } from '@/types/hr'

function fmtInt(n: number | null) {
  return n == null ? '—' : new Intl.NumberFormat('ar-SA').format(n)
}

function fmtPct(n: number | null) {
  return n == null ? '—' : `${Math.min(100, Math.max(0, n))}%`
}

function fmtWhen(iso: string) {
  if (!iso?.trim()) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat('ar-SA', {
    weekday: 'short',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d)
}

function hourGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'صباح الخير'
  if (h < 18) return 'مساء الخير'
  return 'مساء النور'
}

function HeroChip({ href, label }: { href: string; label: string }) {
  return (
    <Link
      to={href}
      className="rounded-2xl border border-white/[0.14] bg-white/[0.10] px-4 py-2 text-[11px] font-black text-white backdrop-blur-sm transition hover:border-white/[0.3] hover:bg-white/[0.18]"
    >
      {label}
    </Link>
  )
}

const QUICK_ACTIONS = [
  { label: 'إضافة عضو جديد',        href: '/dashboard/hr/team',         icon: UserPlus    },
  { label: 'مراجعة طلبات الانضمام', href: '/dashboard/hr/applications', icon: ClipboardList },
  { label: 'إنشاء مهمة HR',         href: '/dashboard/hr/tasks',        icon: ListChecks  },
  { label: 'إدارة الإدارات',         href: '/dashboard/hr/departments',  icon: Building2   },
  { label: 'رفع ملف',               href: '/documents',                  icon: FolderUp    },
]

export default function HrDashboardPage() {
  const [data, setData] = useState<HrDashboardSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const greeting = hourGreeting()

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const snap = await fetchHrDashboardSnapshot()
        if (!cancelled) setData(snap)
      } catch {
        if (!cancelled) setError('تعذر تحميل مؤشرات الموارد البشرية.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const heroStats = loading
    ? undefined
    : [
        { label: 'الفريق',      value: fmtInt(data?.totalTeamMembers ?? null)   },
        { label: 'متطوعون',     value: fmtInt(data?.activeVolunteers ?? null)    },
        { label: 'طلبات معلقة', value: fmtInt(data?.pendingApplications ?? null) },
      ]

  return (
    <div dir="rtl" className="space-y-8 text-right">
      {/* Hero — always visible */}
      <DashboardHero
        greeting={greeting}
        name="قطاع الموارد البشرية"
        role="EMC — HR"
        subtitle="قراءة شاملة للفريق، المتطوعين، والمدربين، والالتزامات الأسبوعية."
        quickStats={heroStats}
        actions={
          <>
            <HeroChip href="/dashboard/hr/team"         label="الفريق"    />
            <HeroChip href="/dashboard/hr/applications" label="الطلبات"   />
            <HeroChip href="/dashboard/hr/tasks"        label="المهام"    />
            <HeroChip href="/dashboard/hr/departments"  label="الإدارات"  />
          </>
        }
      />

      {/* KPI grid — skeleton while loading */}
      {loading ? (
        <DashboardKpiSkeleton count={8} />
      ) : error ? (
        <DashboardErrorWidget title="تعذر تحميل مؤشرات الموارد البشرية" description={error} />
      ) : data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DashboardKpiCard icon={Users}         label="أعضاء الفريق"           value={fmtInt(data.totalTeamMembers)}               variant="brand"  hint="من دليل EMC العام أو الـ HR API" />
          <DashboardKpiCard icon={HeartHandshake} label="متطوعون نشطون"         value={fmtInt(data.activeVolunteers)}                variant="accent" />
          <DashboardKpiCard icon={GraduationCap}  label="مدربون فعالون"          value={fmtInt(data.activeInstructors)}               variant="brand"  hint="كتالوج المدربين العام" />
          <DashboardKpiCard icon={ClipboardList}  label="طلبات معلّقة"           value={fmtInt(data.pendingApplications)}             variant="accent" hint="متطوعون (تقديم/مراجعة)" />
          <DashboardKpiCard icon={Building2}      label="عدد الإدارات"           value={fmtInt(data.departmentsCount)}                variant="brand"  />
          <DashboardKpiCard icon={CalendarClock}  label="تقدم التأهيل"           value={fmtPct(data.onboardingProgressPct)}           variant="accent" hint="تقدير من حالات المتطوعين" />
          <DashboardKpiCard icon={CalendarClock}  label="مقابلات / اجتماعات قادمة" value={fmtInt(data.interviewsUpcoming.length)}  variant="brand"  hint="من اجتماعات العمليات" />
          <DashboardKpiCard icon={ListChecks}     label="مهام الأسبوع"           value={fmtInt(data.tasksDueThisWeek.length)}         variant="accent" hint="مهام العمليات المستحقّة هذا الأسبوع" />
        </div>
      ) : null}

      {/* Quick Actions */}
      <section className="rounded-2xl border border-deepBlue/[0.06] bg-white p-6 shadow-sm ring-1 ring-deepBlue/[0.03]">
        <h2 className="mb-4 text-sm font-black text-deepBlue">الإجراءات السريعة</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {QUICK_ACTIONS.map((q) => {
            const Icon = q.icon
            return (
              <Link
                key={q.href}
                to={q.href}
                className="flex items-center gap-3 rounded-xl border border-deepBlue/[0.07] bg-deepBlue/[0.02] px-4 py-3 text-[12px] font-black text-deepBlue shadow-sm transition hover:border-customBlue/35 hover:bg-customBlue/[0.05] hover:shadow-md"
              >
                <Icon size={16} className="shrink-0 text-customBlue" aria-hidden />
                {q.label}
              </Link>
            )
          })}
        </div>
      </section>

      {/* Chart + Tables */}
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          {loading ? (
            <div className="h-64 animate-pulse rounded-2xl bg-slate-100 ring-1 ring-slate-200/70" />
          ) : data ? (
            <HrDepartmentBarChart rows={data.departmentHeadcount} />
          ) : null}

          {/* Snapshot table */}
          {!loading && data && (
            <div className="rounded-2xl border border-deepBlue/[0.06] bg-white p-6 shadow-sm ring-1 ring-deepBlue/[0.03]">
              <h3 className="mb-4 text-sm font-black text-deepBlue">جدول لمحات</h3>
              <div className="overflow-x-auto rounded-2xl ring-1 ring-slate-100">
                <table className="w-full min-w-[520px] text-right text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-black uppercase text-slate-400">
                    <tr>
                      <th className="px-4 py-3">المؤشر</th>
                      <th className="px-4 py-3">القيمة</th>
                      <th className="px-4 py-3">مصدر البيانات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-semibold text-deepBlue">
                    {[
                      ['أعضاء الفريق', fmtInt(data.totalTeamMembers), data.linked.team ? 'دليل الفريق العام / HR' : '—'],
                      ['متطوعون', fmtInt(data.activeVolunteers), data.linked.volunteers ? 'عمليات — متطوعون' : '—'],
                      ['مدربون', fmtInt(data.activeInstructors), data.linked.instructors ? 'كتالوج المدربين' : '—'],
                      ['طلبات معلّقة', fmtInt(data.pendingApplications), data.linked.volunteers ? 'حالات المتطوعين' : '—'],
                    ].map(([k, v, src]) => (
                      <tr key={String(k)}>
                        <td className="px-4 py-3">{k}</td>
                        <td className="px-4 py-3 font-latin tabular-nums">{v}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{src}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-6 content-start">
          {/* Upcoming interviews */}
          <div className="rounded-2xl border border-deepBlue/[0.06] bg-white p-6 shadow-sm ring-1 ring-deepBlue/[0.03]">
            <h3 className="mb-4 text-sm font-black text-deepBlue">مقابلات واجتماعات قادمة</h3>
            {loading ? (
              <DashboardListSkeleton count={3} />
            ) : !data || data.interviewsUpcoming.length === 0 ? (
              <div className="rounded-xl bg-slate-50 px-4 py-6 text-center text-xs font-semibold text-slate-500">
                {data?.linked.meetings ? 'لا توجد عناصر مجدولة في النطاق الحالي.' : 'لم يتم ربط هذا القسم بالبيانات بعد'}
              </div>
            ) : (
              <ul className="space-y-3">
                {data.interviewsUpcoming.map((m) => (
                  <li key={m.id} className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3">
                    <p className="text-sm font-black text-deepBlue">{m.title}</p>
                    <p className="mt-1 text-[11px] font-bold text-slate-500">{fmtWhen(m.when)}</p>
                    {m.subtitle && <p className="mt-0.5 text-[11px] text-slate-400">{m.subtitle}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Tasks due this week */}
          <div className="rounded-2xl border border-deepBlue/[0.06] bg-white p-6 shadow-sm ring-1 ring-deepBlue/[0.03]">
            <h3 className="mb-4 text-sm font-black text-deepBlue">مهام مستحقة هذا الأسبوع</h3>
            {loading ? (
              <DashboardListSkeleton count={3} />
            ) : !data || data.tasksDueThisWeek.length === 0 ? (
              <div className="rounded-xl bg-slate-50 px-4 py-6 text-center text-xs font-semibold text-slate-500">
                {data?.linked.tasks ? 'لا توجد مهام مستحقة ضمن الأسبوع الحالي.' : 'لم يتم ربط هذا القسم بالبيانات بعد'}
              </div>
            ) : (
              <ul className="space-y-3">
                {data.tasksDueThisWeek.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-4 py-3">
                    <span className="text-[11px] font-bold text-slate-500 font-latin">{t.due_at ? fmtWhen(t.due_at) : '—'}</span>
                    <span className="min-w-0 flex-1 text-sm font-bold text-deepBlue">{t.title}</span>
                  </li>
                ))}
              </ul>
            )}
            <Link to="/dashboard/hr/tasks" className="mt-4 block text-center text-[11px] font-black text-customBlue hover:underline">
              كافة مهام الموارد البشرية
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
