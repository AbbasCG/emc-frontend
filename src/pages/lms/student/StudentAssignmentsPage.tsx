import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ClipboardList, RefreshCw } from 'lucide-react'
import type { StudentAssignment } from '@/types/lms'
import { DashboardSection } from '@/components/dashboard'
import { AssignmentCard, AssignmentSubmitModal, LmsEmptyState, LmsPageSkeleton } from '@/components/lms'
import { useStudentDashboardData } from '@/hooks/useStudentDashboardData'

const NON_SUBMITTABLE: StudentAssignment['status'][] = ['submitted', 'graded']

export default function StudentAssignmentsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const {
    loading,
    refreshing,
    loadError,
    refresh,
    assignmentsScoped,
    registrations,
  } = useStudentDashboardData()

  const [active, setActive] = useState<StudentAssignment | null>(null)

  const submitQueryId = searchParams.get('submit')

  useEffect(() => {
    if (!submitQueryId || assignmentsScoped.length === 0) return
    const targetId = Number(submitQueryId)
    if (!Number.isFinite(targetId)) return
    const match = assignmentsScoped.find(
      (a) => a.assignment_id === targetId || a.id === targetId,
    )
    if (match && !NON_SUBMITTABLE.includes(match.status)) {
      setActive(match)
      setSearchParams({}, { replace: true })
    }
  }, [submitQueryId, assignmentsScoped, setSearchParams])

  if (loading && assignmentsScoped.length === 0) return <LmsPageSkeleton />

  return (
    <div className="space-y-8 text-right rtl" dir="rtl">
      <header className="flex flex-wrap items-start justify-between gap-4 rounded-[1.35rem] border border-deepBlue/[0.06] bg-white p-6 shadow-sm ring-1 ring-deepBlue/[0.04]">
        <div>
          <h1 className="text-xl font-black text-deepBlue">الواجبات</h1>
          <p className="mt-2 max-w-2xl text-[13px] font-semibold text-muted-700">
            تسليم الواجبات المرتبطة بدوراتك المسجّلة ({registrations.length} دورة).
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

      <DashboardSection title="واجبات الدورات المسجّلة">
        {assignmentsScoped.length === 0 ?
          <LmsEmptyState
            icon={ClipboardList}
            title="لا توجد واجبات حالياً"
            description="عند إسناد واجبات ضمن دوراتك ستظهر هنا مع المواعيد."
          />
        : <div className="grid gap-4">
            {assignmentsScoped.map((a) => (
              <AssignmentCard
                key={`${a.id}-${a.assignment_id}`}
                assignment={a}
                onSubmit={
                  NON_SUBMITTABLE.includes(a.status) ?
                    undefined
                  : () => setActive(a)
                }
              />
            ))}
          </div>
        }
      </DashboardSection>

      <AssignmentSubmitModal
        assignment={active}
        onClose={() => setActive(null)}
        onSuccess={refresh}
      />
    </div>
  )
}
