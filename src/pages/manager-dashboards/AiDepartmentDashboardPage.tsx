import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Calendar, ClipboardList, FileBarChart, Presentation, Sparkles, UserCheck, Users } from 'lucide-react'
import { DashboardHero } from '@/components/dashboard'
import { useDepartmentAccess } from '@/hooks/useDepartmentAccess'
import { fetchDepartmentMembers, type DepartmentMember } from '@/api/operationsReportsApi'

/**
 * إدارة الذكاء الاصطناعي والتحول الرقمي — إدارة تنظيمية عادية، بنفس بنية
 * لوحات المدراء الأخرى (انظر PartnershipsManagerDashboardPage وغيرها).
 *
 * عمدًا لا تعرض أي بيانات تقنية (استخدام/تكلفة/توليدات/أتمتة) — تلك تبقى في
 * "مركز الذكاء الاصطناعي" التقني المنفصل (/dashboard/admin/ai)، المتاح فقط
 * لأدوار الإدارة العليا التقنية. هذه الصفحة تُبنى فقط على ما هو موجود فعلاً
 * لكل الإدارات: DepartmentAccessService (عبر useDepartmentAccess) وقائمة
 * أعضاء الإدارة — لا يُفترض القيادة من اسم الدور، بل تُشتق من القيادة
 * الفعلية (departments.leader_id) تمامًا كما تفعل التقارير الأسبوعية.
 */

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

export default function AiDepartmentDashboardPage() {
  const { manifest, loading: accessLoading, soleDepartmentId } = useDepartmentAccess()
  const [members, setMembers] = useState<DepartmentMember[]>([])

  const departmentName = soleDepartmentId
    ? manifest?.allowed_departments.find((d) => d.id === soleDepartmentId)?.name
    : undefined

  useEffect(() => {
    let alive = true
    if (!soleDepartmentId) return
    void fetchDepartmentMembers(soleDepartmentId).then((rows) => {
      if (alive) setMembers(rows)
    })
    return () => {
      alive = false
    }
  }, [soleDepartmentId])

  const leaderMember = members.find((m) => m.kind === 'leader')

  return (
    <div dir="rtl" className="space-y-8 text-right">
      <DashboardHero
        greeting={hourGreeting()}
        name={departmentName ?? 'إدارة الذكاء الاصطناعي والتحول الرقمي'}
        role="مدير الذكاء الاصطناعي — EMC"
        subtitle="قيادة إدارة الذكاء الاصطناعي والتحول الرقمي: أعضاء الإدارة، التقارير الأسبوعية، تقارير الاجتماعات، والطلبات الاستشارية."
        quickStats={
          !accessLoading && soleDepartmentId
            ? [
                { label: 'قائد الإدارة', value: leaderMember?.name ?? '—' },
                { label: 'عدد الأعضاء', value: members.length },
              ]
            : undefined
        }
        actions={
          <>
            <Link to="/dashboard/operations/weekly-reports" className="rounded-2xl border border-white/[0.14] bg-white/[0.10] px-4 py-2 text-[11px] font-black text-white backdrop-blur-sm transition hover:border-white/[0.3] hover:bg-white/[0.18]">التقارير الأسبوعية</Link>
            <Link to="/dashboard/operations/meeting-reports" className="rounded-2xl border border-white/[0.14] bg-white/[0.10] px-4 py-2 text-[11px] font-black text-white backdrop-blur-sm transition hover:border-white/[0.3] hover:bg-white/[0.18]">تقارير الاجتماعات</Link>
            <Link to="/dashboard/members" className="rounded-2xl border border-white/[0.14] bg-white/[0.10] px-4 py-2 text-[11px] font-black text-white backdrop-blur-sm transition hover:border-white/[0.3] hover:bg-white/[0.18]">الأعضاء</Link>
          </>
        }
      />

      {!accessLoading && !soleDepartmentId && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold text-amber-800">
          لم يتم ربط حسابك بعد كقائد فعلي لإدارة معتمدة. تواصل مع الإدارة العليا لاعتماد قيادتك للإدارة.
        </div>
      )}

      <section className="rounded-2xl border border-deepBlue/[0.06] bg-white p-6 shadow-sm ring-1 ring-deepBlue/[0.03]">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles size={16} className="text-customBlue" />
          <h2 className="text-sm font-black text-deepBlue">إدارة الذكاء الاصطناعي والتحول الرقمي</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickLink href="/dashboard/members"                       label="أعضاء الإدارة"          icon={Users}         />
          <QuickLink href="/dashboard/operations/weekly-reports"      label="التقارير الأسبوعية"     icon={FileBarChart}  />
          <QuickLink href="/dashboard/operations/meeting-reports"     label="تقارير الاجتماعات"      icon={Calendar}      />
          <QuickLink href="/dashboard/department/meeting-lounge"      label="صالة الاجتماعات"        icon={Presentation}  />
          <QuickLink href="/dashboard/department/hr-requests"         label="طلبات الموارد البشرية"  icon={UserCheck}     />
          <QuickLink href="/dashboard/admin/ai/expert-applications"   label="الطلبات الاستشارية"     icon={ClipboardList} />
        </div>
      </section>
    </div>
  )
}
