import { Link } from 'react-router'
import {
  BookMarked,
  Calendar,
  ClipboardList,
  BookOpen,
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

export default function SectionLeadDashboardPage() {
  return (
    <div dir="rtl" className="space-y-8 text-right">
      <DashboardHero
        greeting={hourGreeting()}
        name="قائد القسم"
        role="قائد قسم — EMC"
        subtitle="إدارة مهام قسمك، متابعة الاجتماعات، والاطلاع على البرامج والدورات."
        actions={
          <>
            <Link to="/dashboard/section-lead/tasks"    className="rounded-2xl border border-white/[0.14] bg-white/[0.10] px-4 py-2 text-[11px] font-black text-white backdrop-blur-sm transition hover:border-white/[0.3] hover:bg-white/[0.18]">المهام</Link>
            <Link to="/dashboard/section-lead/meetings" className="rounded-2xl border border-white/[0.14] bg-white/[0.10] px-4 py-2 text-[11px] font-black text-white backdrop-blur-sm transition hover:border-white/[0.3] hover:bg-white/[0.18]">الاجتماعات</Link>
          </>
        }
      />

      <section className="rounded-2xl border border-deepBlue/[0.06] bg-white p-6 shadow-sm ring-1 ring-deepBlue/[0.03]">
        <div className="mb-4 flex items-center gap-2">
          <ClipboardList size={16} className="text-customBlue" />
          <h2 className="text-sm font-black text-deepBlue">نشاطات القسم</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickLink href="/dashboard/section-lead/tasks"    label="مهام القسم"        icon={ClipboardList} />
          <QuickLink href="/dashboard/section-lead/meetings" label="اجتماعات القسم"    icon={Calendar}      />
          <QuickLink href="/dashboard/section-lead/programs" label="البرامج والدورات"  icon={BookMarked}    />
          <QuickLink href="/dashboard/section-lead/knowledge" label="قاعدة المعرفة"   icon={BookOpen}      />
        </div>
      </section>
    </div>
  )
}
