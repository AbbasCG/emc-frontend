import { useSearchParams } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { submitStudentEvaluation } from '@/api/studentApi'
import { EvaluationForm } from '@/components/lms'

export default function StudentEvaluationPage() {
  const [params] = useSearchParams()
  const courseId = Number(params.get('course_id') ?? '') || undefined
  const registrationId = Number(params.get('registration_id') ?? '') || undefined
  const label = params.get('course') ?? undefined

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="text-right">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-customBlue/10 px-4 py-1.5 text-xs font-black text-customBlue">
          <Sparkles size={14} />
          تقييم ما بعد التعلم
        </div>
        <h1 className="text-2xl font-black text-deepBlue">شاركنا رأيك</h1>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
          تساعدنا هذه النماذج على تحسين جودة المحتوى والتنظيم باستمرار — لا يستغرق الأمر سوى دقيقة.
        </p>
      </div>

      <EvaluationForm
        courseLabel={label}
        defaultCourseId={courseId}
        defaultRegistrationId={registrationId}
        onSubmit={submitStudentEvaluation}
      />
    </div>
  )
}
