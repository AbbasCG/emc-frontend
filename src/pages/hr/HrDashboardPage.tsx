import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
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
import HrStatCard from '@/components/hr/HrStatCard'
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

const quickLinks: { label: string; href: string; icon: typeof UserPlus }[] = [
  { label: 'إضافة عضو جديد', href: '/dashboard/hr/team', icon: UserPlus },
  { label: 'مراجعة طلبات الانضمام', href: '/dashboard/hr/applications', icon: ClipboardList },
  { label: 'إنشاء مهمة HR', href: '/dashboard/hr/tasks', icon: ListChecks },
  { label: 'إدارة الإدارات', href: '/dashboard/hr/departments', icon: Building2 },
  { label: 'رفع ملف', href: '/documents', icon: FolderUp },
]

export default function HrDashboardPage() {
  const [data, setData] = useState<HrDashboardSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const snap = await fetchHrDashboardSnapshot()
        if (!cancelled) setData(snap)
      } catch {
        if (!cancelled) setError('تعذر تحميل مؤشرات الموارد البشرية.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div dir="rtl" className="animate-pulse space-y-8 text-right">
        <div className="h-40 rounded-[1.65rem] bg-white/70 ring-1 ring-deepBlue/[0.06]" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 rounded-3xl bg-white/70 ring-1 ring-deepBlue/[0.06]" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div dir="rtl" className="rounded-3xl border border-red-100 bg-red-50/90 p-8 text-right text-sm font-semibold text-red-800 shadow-emc">
        {error ?? 'خطأ غير متوقع.'}
      </div>
    )
  }

  return (
    <div dir="rtl" className="space-y-10">
      <motion.header
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 0.61, 0.36, 1] as const }}
        className="relative overflow-hidden rounded-[1.75rem] border border-deepBlue/[0.08] bg-gradient-to-bl from-deepBlue via-[#1c2f45] to-[#101c2e] p-8 text-white shadow-emc-lg ring-1 ring-white/10"
      >
        <div aria-hidden className="pointer-events-none absolute -left-24 top-0 h-56 w-56 rounded-full bg-customBlue/30 blur-[100px]" />
        <div aria-hidden className="pointer-events-none absolute bottom-0 right-[10%] h-44 w-44 rounded-full bg-customOrange/20 blur-[80px]" />
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/55">قطاع الموارد البشرية</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">لوحة الموارد البشرية</h1>
        <p className="mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-white/72">
          قراءة شاملة للفريق، المتطوعين، والمدربين، والالتزامات الأسبوعية — بتجربة تنفيذية عربية واضحة لهوية EMC.
        </p>
      </motion.header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <HrStatCard icon={Users} label="أعضاء الفريق" value={fmtInt(data.totalTeamMembers)} hint="من دليل EMC العام أو الـ HR API" accent="blue" />
        <HrStatCard icon={HeartHandshake} label="متطوعون نشطون" value={fmtInt(data.activeVolunteers)} accent="orange" />
        <HrStatCard icon={GraduationCap} label="مدربون فعالون" value={fmtInt(data.activeInstructors)} hint="كتالوج المدربين العام" accent="blue" />
        <HrStatCard icon={ClipboardList} label="طلبات معلّقة" value={fmtInt(data.pendingApplications)} hint="متطوعون (تقديم/مراجعة)" accent="orange" />
        <HrStatCard icon={Building2} label="عدد الإدارات" value={fmtInt(data.departmentsCount)} accent="blue" />
        <HrStatCard icon={CalendarClock} label="تقدم التأهيل" value={fmtPct(data.onboardingProgressPct)} hint="تقدير من حالات المتطوعين" accent="orange" />
        <HrStatCard icon={CalendarClock} label="مقابلات/اجتماعات قادمة" value={fmtInt(data.interviewsUpcoming.length)} hint="من اجتماعات العمليات" accent="blue" />
        <HrStatCard icon={ListChecks} label="مهام الأسبوع" value={fmtInt(data.tasksDueThisWeek.length)} hint="مهام العمليات المستحقّة هذا الأسبوع" accent="orange" />
      </div>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.4 }}
        className="rounded-[1.65rem] border border-deepBlue/[0.06] bg-white/[0.9] p-6 shadow-emc ring-1 ring-deepBlue/[0.04]"
      >
        <h2 className="text-right text-sm font-black text-deepBlue">إجراءات سريعة</h2>
        <div className="mt-4 flex flex-wrap justify-end gap-3">
          {quickLinks.map((q, i) => (
            <motion.div key={q.href + q.label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * i }}>
              <Link
                to={q.href}
                className="inline-flex items-center gap-2 rounded-2xl border border-deepBlue/[0.08] bg-deepBlue/[0.03] px-4 py-2.5 text-[12px] font-black text-deepBlue shadow-sm transition hover:border-brand-400/40 hover:bg-white hover:shadow-emc-xs"
              >
                <q.icon size={16} className="text-customBlue" aria-hidden />
                {q.label}
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.section>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <HrDepartmentBarChart rows={data.departmentHeadcount} />

          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[1.65rem] border border-deepBlue/[0.06] bg-white/[0.88] p-6 shadow-emc ring-1 ring-deepBlue/[0.04]"
          >
            <h3 className="text-right text-sm font-black text-deepBlue">جدول لمحات</h3>
            <div className="mt-4 overflow-x-auto rounded-2xl ring-1 ring-slate-100">
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
          </motion.section>
        </div>

        <div className="grid gap-6">
          <motion.aside
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className="rounded-[1.65rem] border border-deepBlue/[0.06] bg-white/[0.88] p-6 shadow-emc ring-1 ring-deepBlue/[0.04]"
          >
            <h3 className="text-right text-sm font-black text-deepBlue">مقابلات واجتماعات قادمة</h3>
            <ul className="mt-4 space-y-3 text-right">
              {data.interviewsUpcoming.length === 0 ?
                <li className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-xs font-semibold text-slate-500">
                  {data.linked.meetings ? 'لا توجد عناصر مجدولة في النطاق الحالي.' : 'لم يتم ربط هذا القسم بالبيانات بعد'}
                </li>
              : data.interviewsUpcoming.map((m) => (
                  <li key={m.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3">
                    <p className="text-sm font-black text-deepBlue">{m.title}</p>
                    <p className="mt-1 text-[11px] font-bold text-slate-500">{fmtWhen(m.when)}</p>
                    {m.subtitle ? <p className="mt-0.5 text-[11px] text-slate-400">{m.subtitle}</p> : null}
                  </li>
                ))}
            </ul>
          </motion.aside>

          <motion.aside
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-[1.65rem] border border-deepBlue/[0.06] bg-white/[0.88] p-6 shadow-emc ring-1 ring-deepBlue/[0.04]"
          >
            <h3 className="text-right text-sm font-black text-deepBlue">مهام مستحقة هذا الأسبوع</h3>
            <ul className="mt-4 space-y-3 text-right">
              {data.tasksDueThisWeek.length === 0 ?
                <li className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-xs font-semibold text-slate-500">
                  {data.linked.tasks ? 'لا توجد مهام مستحقة ضمن الأسبوع الحالي.' : 'لم يتم ربط هذا القسم بالبيانات بعد'}
                </li>
              : data.tasksDueThisWeek.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 px-4 py-3">
                    <span className="text-[11px] font-bold text-slate-500 font-latin">{t.due_at ? fmtWhen(t.due_at) : '—'}</span>
                    <span className="min-w-0 flex-1 text-sm font-bold text-deepBlue">{t.title}</span>
                  </li>
                ))}
            </ul>
            <Link to="/dashboard/hr/tasks" className="mt-4 block text-center text-[11px] font-black text-customBlue hover:underline">
              كافة مهام الموارد البشرية
            </Link>
          </motion.aside>
        </div>
      </div>
    </div>
  )
}
