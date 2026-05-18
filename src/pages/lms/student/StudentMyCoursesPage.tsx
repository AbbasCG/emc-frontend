import { BookOpen } from 'lucide-react'
import { motion } from 'framer-motion'
import EnrolledCourseCard from '@/components/dashboard/EnrolledCourseCard'
import { DashboardSection, EmptyState } from '@/components/dashboard'
import { useStudentLearningLists } from '@/hooks/useStudentLearningLists'

export default function StudentMyCoursesPage() {
  const { loading, enrollmentsMerged } = useStudentLearningLists()

  return (
    <div className="space-y-8 text-right rtl" dir="rtl">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[1.65rem] border border-deepBlue/[0.08] bg-gradient-to-bl from-[#22334A] to-[#2691C2] p-6 text-white shadow-lg"
      >
        <h1 className="text-xl font-black sm:text-2xl">دوراتي</h1>
        <p className="mt-2 max-w-2xl text-sm font-semibold text-white/85">
          قائمة الدورات المسجّلة من /dashboard و /student/courses و /student/registrations (مدموجة بلا ازدواج).
        </p>
      </motion.header>

      <DashboardSection title="تسجيلاتي النشطة">
        {loading ?
          <div className="flex min-h-[10rem] items-center justify-center rounded-2xl border bg-slate-50">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-customBlue border-t-transparent" />
          </div>
        : enrollmentsMerged.length === 0 ?
          <EmptyState
            icon={BookOpen}
            title="لا توجد دورات مسجلة حاليًا"
            description="سجّل من الكتالوج ثم ارجع هنا."
            action={{ label: 'استعرض الدورات المتاحة', href: '/courses' }}
          />
        : <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {enrollmentsMerged.map((e) => (
              <EnrolledCourseCard
                key={e.id}
                enrollment={e}
                actionLabel="متابعة التعلم"
                actionTo={e.course?.slug ? `/courses/${e.course.slug}` : '/dashboard/student/progress'}
              />
            ))}
          </div>
        }
      </DashboardSection>
    </div>
  )
}
