import { motion } from 'framer-motion'
import {
  Briefcase,
  Calendar,
  ClipboardList,
  HeartHandshake,
  Megaphone,
  ShieldQuestion,
  TrendingUp,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import type { OperationsDashboardData } from '@/types/operations'
import { DashboardSection } from '@/components/dashboard'

function Metric({
  icon: Icon,
  label,
  value,
  hint,
  to,
  accent,
}: {
  icon: React.ElementType
  label: string
  value: number | string
  hint?: string
  to: string
  accent: 'blue' | 'orange'
}) {
  const glow =
    accent === 'orange'
      ? 'shadow-[0_22px_48px_-20px_rgba(236,148,60,0.35)]'
      : 'shadow-[0_22px_48px_-20px_rgba(38,145,194,0.35)]'

  return (
    <Link to={to}>
      <motion.div
        whileHover={{ y: -4 }}
        className={[
          'relative overflow-hidden rounded-2xl bg-white p-5 ring-1 ring-deepBlue/[0.06]',
          glow,
        ].join(' ')}
      >
        <div
          className={
            accent === 'orange'
              ? 'absolute -left-10 -top-10 h-28 w-28 rounded-full bg-customOrange/15 blur-2xl'
              : 'absolute -left-10 -top-10 h-28 w-28 rounded-full bg-customBlue/15 blur-2xl'
          }
        />
        <div className="relative flex items-start justify-between gap-3">
          <Icon size={22} className={accent === 'orange' ? 'text-customOrange' : 'text-customBlue'} />
          <div className="text-right">
            <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-2 text-3xl font-black text-deepBlue">{value}</p>
            {hint && <p className="mt-1 text-[11px] font-semibold text-slate-500">{hint}</p>}
          </div>
        </div>
      </motion.div>
    </Link>
  )
}

export default function OperationsDashboard({ data }: { data: OperationsDashboardData }) {
  return (
    <div className="space-y-10">
      <section className="rounded-[1.35rem] border border-white/80 bg-gradient-to-bl from-deepBlue via-deepBlue to-[#152536] p-8 text-right text-white shadow-xl ring-1 ring-white/10">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-white/45">مركز العمليات</p>
        <h1 className="mt-3 text-3xl font-black leading-tight">لوحة القيادة التشغيلية</h1>
        <p className="mt-4 max-w-2xl text-sm font-semibold leading-relaxed text-white/70">
          رؤية موحّدة للإدارات، المهام، الاجتماعات، الشراكات، التسويق، والدعم — بنفس هوية EMC العربية
          والاحتراف المعهود.
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Link
            to="/dashboard/admin/tasks/kanban"
            className="rounded-xl bg-customOrange px-5 py-2.5 text-xs font-black text-white shadow-lg shadow-orange-900/20"
          >
            لوحة كانبان
          </Link>
          <Link
            to="/dashboard/admin/meetings"
            className="rounded-xl border border-white/25 bg-white/10 px-5 py-2.5 text-xs font-black text-white backdrop-blur-sm"
          >
            الاجتماعات
          </Link>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={Users}
          label="إدارات نشطة"
          value={data.active_departments}
          to="/dashboard/admin/departments"
          accent="blue"
        />
        <Metric
          icon={ClipboardList}
          label="مهام مفتوحة"
          value={data.open_tasks}
          to="/dashboard/admin/tasks"
          accent="orange"
        />
        <Metric
          icon={TrendingUp}
          label="متأخرة"
          value={data.overdue_tasks}
          hint="تحتاج متابعة"
          to="/dashboard/admin/tasks/overdue"
          accent="orange"
        />
        <Metric
          icon={Calendar}
          label="اجتماعات قادمة"
          value={data.upcoming_meetings}
          to="/dashboard/admin/meetings"
          accent="blue"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={Briefcase}
          label="طلبات شراكة"
          value={data.pending_partnership_requests}
          to="/dashboard/admin/partnership-requests"
          accent="blue"
        />
        <Metric
          icon={HeartHandshake}
          label="متطوعون"
          value={data.volunteer_applications}
          to="/dashboard/admin/volunteers"
          accent="orange"
        />
        <Metric
          icon={ShieldQuestion}
          label="تذاكر دعم"
          value={data.support_tickets_open}
          to="/dashboard/admin/support-tickets"
          accent="blue"
        />
        <Metric
          icon={Megaphone}
          label="محتوى قيد المراجعة"
          value={data.marketing_in_review}
          to="/dashboard/admin/marketing"
          accent="orange"
        />
      </div>

      <div className="grid gap-8 xl:grid-cols-2">
        <DashboardSection title="نشاط حديث">
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-deepBlue/[0.05]">
            {(data.recent_activity?.length ?? 0) === 0 ? (
              <p className="py-10 text-center text-sm font-bold text-slate-400">لا يوجد نشاط مسجل بعد.</p>
            ) : (
              <ul className="space-y-3 text-right">
                {data.recent_activity!.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3 text-xs font-semibold text-deepBlue ring-1 ring-slate-100"
                  >
                    <span className="text-[10px] font-bold text-slate-400">{a.at}</span>
                    <span className="flex-1 text-right">{a.label}</span>
                    <span className="rounded-full bg-customBlue/10 px-2 py-0.5 text-[10px] font-black text-customBlue">
                      {a.kind}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DashboardSection>

        <DashboardSection title="صحة الإدارات">
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-deepBlue/[0.05]">
            {(data.department_health?.length ?? 0) === 0 ? (
              <p className="py-10 text-center text-sm font-bold text-slate-400">
                يظهر المؤشر عند ربط الخادم ببيانات الإدارات.
              </p>
            ) : (
              <ul className="space-y-3">
                {data.department_health!.map((d) => (
                  <li key={d.department_id} className="text-right">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-lg font-black text-customBlue">{d.score}</span>
                      <span className="text-sm font-black text-deepBlue">{d.title}</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-l from-customOrange to-customBlue"
                        initial={{ width: 0 }}
                        animate={{ width: `${d.score}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DashboardSection>
      </div>

      <DashboardSection title="إجراءات سريعة">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'مهامي', href: '/dashboard/admin/tasks/my', icon: ClipboardList },
            { label: 'نماذج', href: '/dashboard/admin/forms', icon: Megaphone },
            { label: 'شركاء', href: '/dashboard/admin/partners', icon: Briefcase },
            { label: 'طلب شراكة عام', href: '/partnerships/apply', icon: HeartHandshake },
          ].map((x) => (
            <Link
              key={x.href}
              to={x.href}
              className="flex items-center justify-between rounded-2xl bg-white px-5 py-4 text-sm font-black text-deepBlue shadow-sm ring-1 ring-deepBlue/[0.06] transition hover:border-customBlue/30 hover:ring-customBlue/20"
            >
              <x.icon size={18} className="text-customOrange" />
              <span>{x.label}</span>
            </Link>
          ))}
        </div>
      </DashboardSection>
    </div>
  )
}
