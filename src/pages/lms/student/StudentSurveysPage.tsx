import { useEffect, useState } from 'react'
import { Sparkles, ArrowLeft } from 'lucide-react'
import { DashboardPageShell, EmcButton, Eyebrow, Surface } from '@/components/ui'
import { submitStudentEvaluation } from '@/api/studentApi'
import { EvaluationForm } from '@/components/lms'
import { fetchStudentCoursesList, type StudentListedCourse } from '@/api/studentApi'

export default function StudentSurveysPage() {
  const [courses, setCourses] = useState<StudentListedCourse[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    fetchStudentCoursesList().then(setCourses)
  }, [])

  const handleSubmit = async (payload: Parameters<typeof submitStudentEvaluation>[0]) => {
    await submitStudentEvaluation(payload)
    setSubmitted(true)
    setSelectedCourseId(null)
  }

  if (submitted) {
    return (
      <DashboardPageShell
        title="شكراً لتقييمك"
        eyebrow={<Eyebrow tone="accent">STUDENT · SURVEYS</Eyebrow>}
        description="تم حفظ تقييمك بنجاح."
      >
        <Surface variant="default" elevation={3} padding="lg" className="text-center">
          <Sparkles size={40} className="mx-auto text-customOrange mb-3" />
          <p className="text-lg font-black text-deepBlue">نقدر لك مشاركتك!</p>
          <p className="mt-2 text-sm text-slate-500">تساعدنا تقييماتك على تحسين جودة المحتوى والتنظيم.</p>
          <div className="mt-6">
            <EmcButton variant="primary" size="sm" onClick={() => setSubmitted(false)}>
              تقييم دورة أخرى
            </EmcButton>
          </div>
        </Surface>
      </DashboardPageShell>
    )
  }

  return (
    <DashboardPageShell
      title="الاستبيانات ونماذج التقييم"
      eyebrow={<Eyebrow tone="accent">STUDENT · SURVEYS</Eyebrow>}
      description="قم بتقييم الدورات التي التحقت بها وساعدنا في التطوير."
    >
      {!selectedCourseId && (
        <Surface variant="default" elevation={3} padding="lg">
          <h3 className="text-sm font-black text-deepBlue mb-4">اختر دورة للتقييم</h3>
          {courses.length === 0 ? (
            <p className="text-sm text-slate-500">لا توجد دورات مسجلة حالياً. سجل في دورة أولاً.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {courses.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCourseId(c.id)}
                  className="rounded-xl border border-slate-200 bg-white p-4 text-right hover:border-customBlue/30 hover:shadow-sm transition-all"
                >
                  <p className="text-sm font-black text-deepBlue">{c.title}</p>
                  {c.instructor_name && (
                    <p className="mt-1 text-xs text-slate-500">المدرب: {c.instructor_name}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </Surface>
      )}

      {selectedCourseId && (
        <Surface variant="default" elevation={3} padding="lg">
          <button
            onClick={() => setSelectedCourseId(null)}
            className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-customBlue mb-4"
          >
            <ArrowLeft size={14} /> رجوع
          </button>
          <EvaluationForm
            courseLabel={courses.find((c) => c.id === selectedCourseId)?.title}
            defaultCourseId={selectedCourseId}
            onSubmit={handleSubmit}
          />
        </Surface>
      )}
    </DashboardPageShell>
  )
}
