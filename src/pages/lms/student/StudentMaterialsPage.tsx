import { FolderOpen, RefreshCw } from 'lucide-react'
import { DashboardSection } from '@/components/dashboard'
import { LmsEmptyState, LmsPageSkeleton, MaterialCard } from '@/components/lms'
import { useStudentDashboardData } from '@/hooks/useStudentDashboardData'
import { StudentBackButton } from '@/components/shared/StudentBackButton'

export default function StudentMaterialsPage() {
  const { loading, refreshing, loadError, refresh, materialsScoped, registrations } = useStudentDashboardData()

  if (loading && materialsScoped.length === 0) {
    return <LmsPageSkeleton />
  }

  return (
    <div className="space-y-8 text-right rtl" dir="rtl">
      <header className="flex flex-wrap items-start justify-between gap-4 rounded-[1.35rem] border border-deepBlue/[0.06] bg-white p-6 shadow-sm ring-1 ring-deepBlue/[0.04]">
        <div>
          <h1 className="text-xl font-black text-deepBlue">المواد التعليمية</h1>
          <p className="mt-2 max-w-2xl text-[13px] font-semibold text-muted-700">
            مصدر الخادم: <span className="font-mono text-[11px]">GET /student/materials</span> معروض فقط ما يخص دوراتك
            المسجّلة ({registrations.length}).
          </p>
          {loadError ?
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-950">
              {loadError}
            </p>
          : null}
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-2xl border border-deepBlue/10 bg-deepBlue/[0.04] px-4 py-2 text-[11px] font-black text-deepBlue transition hover:bg-deepBlue/[0.07] disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
          تحديث
        </button>
      </header>

      <StudentBackButton fallback="/dashboard/student" label="العودة إلى لوحة الطالب" />

      <DashboardSection title="مكتبة المواد" subtitle="ملفات وروابط وفيديوهات الدورات التي سجّلت فيها فقط.">
        {materialsScoped.length === 0 ?
          <LmsEmptyState
            icon={FolderOpen}
            title="لا توجد مواد بعد"
            description="لا توجد مواد من الخادم لهذه الدورات حاليًا لا يتم إنشاء محتوى وهمي هنا."
          />
        : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {materialsScoped.map((m) => (
              <MaterialCard key={m.id} material={m} />
            ))}
          </div>
        }
      </DashboardSection>
    </div>
  )
}
