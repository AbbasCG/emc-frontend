import { Link, useSearchParams } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import EvaluationForm from '@/components/lms/EvaluationForm'
import type { EvaluationPayload } from '@/api/studentApi'
import { notifyStudentScopeRefresh, submitStudentEvaluation } from '@/api/studentApi'
import type { StudentRegistrationRow } from '@/api/studentApi'
import { useStudentDashboardData } from '@/hooks/useStudentDashboardData'
import type { StudentProgressPayload } from '@/types/lms'
import { StudentBackButton } from '@/components/shared/StudentBackButton'

function eligibleForEvaluation(
  r: StudentRegistrationRow,
  reviewedCourseIds: Set<number>,
  progress: StudentProgressPayload,
): boolean {
  if (reviewedCourseIds.has(r.course_id)) return false
  const st = String(r.status ?? '').toLowerCase()
  const row = progress.course_progress.find((c) => c.course_id === r.course_id)
  const progressed =
    row != null &&
    (row.progress_percent >= 85 ||
      row.sessions_completed > 0 ||
      (row.assignments_done > 0 && row.assignments_total > 0))
  const statusOk =
    st.includes('complete') ||
    st.includes('attend') ||
    st.includes('verified') ||
    st.includes('approved')
  return statusOk || Boolean(progressed)
}

export default function StudentEvaluationPage() {
  const {
    loading,
    refreshing,
    loadError,
    refresh,
    registrations,
    progressMerged,
    reviewedCourseIds,
  } = useStudentDashboardData()

  const [params] = useSearchParams()
  const courseId = Number(params.get('course_id') ?? '') || undefined
  const registrationId = Number(params.get('registration_id') ?? '') || undefined
  const label = params.get('course') ?? undefined

  const eligible = registrations.filter((r) => eligibleForEvaluation(r, reviewedCourseIds, progressMerged))

  async function handleSubmit(payload: EvaluationPayload) {
    await submitStudentEvaluation(payload)
    notifyStudentScopeRefresh()
    await refresh()
  }

  const pickedRegistration =
    courseId == null ?
      undefined
    : registrationId != null ?
      registrations.find((r) => r.course_id === courseId && r.id === registrationId)
    : registrations.find((r) => r.course_id === courseId)

  const formAllowed =
    courseId != null &&
    pickedRegistration != null &&
    eligibleForEvaluation(pickedRegistration, reviewedCourseIds, progressMerged)

  return (
    <div className="mx-auto max-w-3xl space-y-8 text-right rtl" dir="rtl">
      <header className="rounded-[1.35rem] border border-deepBlue/[0.06] bg-white p-6 shadow-sm ring-1 ring-deepBlue/[0.04]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-customBlue/10 px-4 py-1.5 text-xs font-black text-customBlue">
              <Sparkles size={14} />
              تقييم الدورة
            </div>
            <h1 className="text-2xl font-black text-deepBlue">شاركنا رأيك</h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-slate-600">
              تقييم واحد لكل دورة بعد حضور أو إكمال معقول — مستند إلى تسجيلاتك وبيانات التقدّم الحقيقية.
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
            disabled={loading || refreshing}
            className="rounded-2xl border border-deepBlue/10 bg-deepBlue/[0.04] px-4 py-2 text-[11px] font-black text-deepBlue disabled:opacity-60"
          >
            {refreshing ? 'جارٍ التحديث…' : 'تحديث'}
          </button>
        </div>
      </header>

      <StudentBackButton fallback="/dashboard/student/courses" label="العودة إلى دوراتي" />

      {courseId != null ?
        formAllowed ?
          <EvaluationForm
            courseLabel={label ?? pickedRegistration?.course_title ?? undefined}
            defaultCourseId={courseId}
            defaultRegistrationId={registrationId ?? pickedRegistration?.id}
            onSubmit={handleSubmit}
          />
        : <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-6 text-[13px] font-bold text-rose-900">
            لا يمكن تقييم هذه الدورة بعد — إما أنها غير مؤهّلة بعد أو سبق إرسال تقييم لها.
            <div className="mt-4">
              <Link className="font-black text-customBlue hover:underline" to="/dashboard/student/evaluation">
                العودة لاختيار دورة
              </Link>
            </div>
          </div>
      : <>
          <section className="rounded-[1.35rem] bg-white p-6 shadow-md ring-1 ring-deepBlue/[0.06]">
            <h2 className="text-lg font-black text-deepBlue">دورات يمكن تقييمها الآن</h2>
            <p className="mt-2 text-[13px] font-semibold text-muted-700">
              يظهر هنا ما يحقّ له تقييم وفق حالة التسجيل أو التقدّم من الخادم، مع استبعاد الدورات التي سبق تقييمها (
              <span className="font-mono text-[11px]">GET /student/reviews</span>).
            </p>
            {loading && eligible.length === 0 ?
              <div className="mt-6 grid gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={`ev-sk-${String(i)}`} className="h-14 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            : eligible.length === 0 ?
              <p className="mt-6 rounded-xl border border-slate-100 bg-slate-50 px-4 py-5 text-[13px] font-semibold text-muted-700">
                لا توجد دورات مؤهّلة للتقييم حاليًا — أكمل الجلسات أو انتظر تأكيد التسجيل من الخادم.
              </p>
            : <ul className="mt-6 space-y-3">
                {eligible.map((r) => {
                  const q = new URLSearchParams({
                    course_id: String(r.course_id),
                    registration_id: String(r.id),
                    course: r.course_title ?? `دورة ${r.course_id}`,
                  })
                  return (
                    <li key={r.id}>
                      <Link
                        to={`/dashboard/student/evaluation?${q.toString()}`}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-deepBlue/[0.06] bg-white px-4 py-3 text-[13px] font-black text-deepBlue shadow-sm transition hover:border-customBlue/35 hover:bg-brand-400/[0.06]"
                      >
                        <span>{r.course_title ?? `دورة ${r.course_id}`}</span>
                        <span className="text-[11px] font-bold text-customBlue">بدء التقييم ←</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            }
          </section>

          <section className="rounded-[1.35rem] border border-dashed border-slate-200 bg-slate-50/80 px-5 py-5 text-[12px] font-semibold text-muted-700">
            أو افتح الرابط من لوحة الدورة مع باراميترات <span className="font-mono">course_id</span> و{' '}
            <span className="font-mono">registration_id</span>.
          </section>
        </>
      }
    </div>
  )
}
