import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import { ListChecks, Users, ChevronLeft } from 'lucide-react'
import { fetchInstructorCourses } from '@/api/instructorApi'
import type { TeachingCourseLms } from '@/types/lms'
import { InstructorHero } from '@/components/instructor'
import toast from '@/lib/toast'

/**
 * Sidebar entry point for الاختبارات القصيرة — quizzes are course-scoped, so
 * this hub lists only the instructor's English-Institute courses (the ones
 * quizzes are actually gated to, per requires_placement_test) and links each
 * to the same per-course page the course card's own quiz link opens.
 */
export default function InstructorQuizzesHubPage() {
  const navigate = useNavigate()
  const [courses, setCourses] = useState<TeachingCourseLms[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const all = await fetchInstructorCourses()
        if (alive) setCourses(all.filter((c) => c.requires_placement_test))
      } catch {
        if (alive) toast.error('تعذّر تحميل الدورات')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  return (
    <div className="space-y-5 pb-16 font-[Cairo,sans-serif]" dir="rtl">
      <InstructorHero
        title="الاختبارات القصيرة"
        subtitle="اختر دورة لإدارة اختباراتها القصيرة والاختبار النهائي"
        backTo="/dashboard/instructor/courses"
        backLabel="دوراتي"
      />

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-3xl bg-slate-100" />)}
        </div>
      ) : courses.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <ListChecks className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-4 text-[16px] font-black text-deepBlue">لا توجد دورات تدعم الاختبارات القصيرة</p>
          <p className="mt-1.5 text-[12px] font-semibold text-deepBlue/45">
            الاختبارات القصيرة متاحة فقط لدورات المعهد الإنجليزي (التي تتطلب اختبار تحديد المستوى)
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c, i) => (
            <motion.button
              key={c.id}
              type="button"
              onClick={() => navigate(`/dashboard/instructor/courses/${c.id}/quizzes`)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, delay: i * 0.03 }}
              whileHover={{ y: -2, boxShadow: '0 12px 24px -12px rgba(12,42,75,0.18)' }}
              className="flex items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-5 text-right transition"
            >
              <div className="min-w-0">
                <p className="truncate text-[14px] font-black text-deepBlue">{c.title}</p>
                <p className="mt-1 flex items-center gap-1.5 text-[11px] font-bold text-deepBlue/45">
                  <Users className="h-3.5 w-3.5" />
                  {c.students_count ?? c.enrolled_students_count ?? c.student_count ?? 0} طالب
                </p>
              </div>
              <ChevronLeft className="h-4 w-4 shrink-0 text-slate-300" />
            </motion.button>
          ))}
        </div>
      )}
    </div>
  )
}
