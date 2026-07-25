import { Link } from 'react-router'
import {
  Building2,
  Calendar,
  ClipboardList,
  FileBarChart,
  FileText,
  PieChart,
  Presentation,
  Sparkles,
} from 'lucide-react'
import { DashboardHero } from '@/components/dashboard'

function hourGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'صباح الخير'
  if (h < 18) return 'مساء الخير'
  return 'مساء النور'
}

function QuickLink({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) {
  return (
    <Link
      to={href}
      className="flex items-center gap-3 rounded-xl border border-deepBlue/[0.07] bg-deepBlue/[0.02] px-4 py-3.5 text-[12px] font-black text-deepBlue shadow-sm transition hover:border-customBlue/35 hover:bg-customBlue/[0.05] hover:shadow-md"
    >
      <Icon size={16} className="shrink-0 text-customBlue" aria-hidden />
      {label}
    </Link>
  )
}

const OPS_LINKS = [
  { label: 'لوحة العمليات', href: '/dashboard/admin/operations',    icon: Sparkles      },
  { label: 'الإدارات',      href: '/dashboard/admin/departments',   icon: Building2     },
  { label: 'المهام',        href: '/dashboard/admin/tasks',         icon: ClipboardList },
  { label: 'الاجتماعات',   href: '/dashboard/admin/meetings',      icon: Calendar      },
  { label: 'النماذج',      href: '/dashboard/admin/forms',         icon: FileText      },
]


export default function OperationsManagerDashboardPage() {
  return (
    <div dir="rtl" className="space-y-8 text-right">
      <DashboardHero
        greeting={hourGreeting()}
        name="إدارة التشغيل والعمليات"
        role="مدير التشغيل والعمليات — EMC"
        subtitle="متابعة الإدارات، المهام، الاجتماعات، النماذج، ومؤشرات الأداء التشغيلي."
        actions={
          <>
            <Link to="/dashboard/admin/operations" className="rounded-2xl border border-white/[0.14] bg-white/[0.10] px-4 py-2 text-[11px] font-black text-white backdrop-blur-sm transition hover:border-white/[0.3] hover:bg-white/[0.18]">العمليات</Link>
            <Link to="/dashboard/admin/tasks"      className="rounded-2xl border border-white/[0.14] bg-white/[0.10] px-4 py-2 text-[11px] font-black text-white backdrop-blur-sm transition hover:border-white/[0.3] hover:bg-white/[0.18]">المهام</Link>
            <Link to="/dashboard/admin/meetings"   className="rounded-2xl border border-white/[0.14] bg-white/[0.10] px-4 py-2 text-[11px] font-black text-white backdrop-blur-sm transition hover:border-white/[0.3] hover:bg-white/[0.18]">الاجتماعات</Link>
          </>
        }
      />

      <section className="rounded-2xl border border-deepBlue/[0.06] bg-white p-6 shadow-sm ring-1 ring-deepBlue/[0.03]">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles size={16} className="text-customBlue" />
          <h2 className="text-sm font-black text-deepBlue">العمليات والهيكل التنظيمي</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {OPS_LINKS.map((l) => <QuickLink key={l.href} {...l} />)}
        </div>
      </section>

      <section className="rounded-2xl border border-deepBlue/[0.06] bg-white p-6 shadow-sm ring-1 ring-deepBlue/[0.03]">
        <div className="mb-4 flex items-center gap-2">
          <FileBarChart size={16} className="text-customBlue" />
          <h2 className="text-sm font-black text-deepBlue">المتابعة والتقارير</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickLink href="/dashboard/admin/kpi"               label="مؤشرات الأداء KPI"       icon={PieChart}      />
          <QuickLink href="/dashboard/admin/reports"           label="التقارير التحليلية"        icon={FileBarChart}  />
          <QuickLink href="/dashboard/admin/workshop-requests" label="طلبات البرامج التدريبية" icon={Presentation}  />
        </div>
      </section>
    </div>
  )
}
