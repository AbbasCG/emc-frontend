import { BookOpen } from 'lucide-react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { DashboardSection, EmptyState } from '@/components/dashboard'
import { useStudentLearningLists } from '@/hooks/useStudentLearningLists'
import { courseImages } from '@/utils/course'

export default function StudentAvailableCoursesPage() {
  const { loading, browseCourses, catalog } = useStudentLearningLists()

  return (
    <div className="space-y-8 text-right rtl" dir="rtl">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[1.65rem] border border-deepBlue/[0.08] bg-gradient-to-bl from-[#2691C2] to-[#22334A] p-6 text-white shadow-lg"
      >
        <h1 className="text-xl font-black sm:text-2xl">الدورات المتاحة</h1>
        <p className="mt-2 text-sm font-semibold text-white/85">
          مفلترة من كتالوج GET /courses بحيث لا تظهر دوراتك المسجّلة حالياً.
        </p>
      </motion.header>

      <DashboardSection title="يمكنني التسجيل الآن" action={{ label: 'كل الدورات', href: '/courses' }}>
        {loading ?
          <div className="flex min-h-[8rem] items-center justify-center rounded-2xl border bg-slate-50">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-white border-t-customBlue" />
          </div>
        : browseCourses.length === 0 ?
          <EmptyState
            icon={BookOpen}
            title={catalog.length === 0 ? 'لا يوجد كتالوج محمّل' : 'كل الدورات الحالية في قائمتك أو لا يوجد عرض'}
            description="افتح الكتالوج العام للمزيد."
            action={{ label: 'دورات المنصّة', href: '/courses' }}
          />
        : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {browseCourses.slice(0, 24).map((c) => {
              const noDate = c.start_date == null || String(c.start_date).trim() === '' || String(c.start_date) === '—'
              return (
                <motion.div
                  key={c.id}
                  layout
                  className="rounded-[1.35rem] border border-deepBlue/[0.06] bg-white p-4 shadow-md ring-1 ring-white"
                >
                  <div className="aspect-[21/10] overflow-hidden rounded-xl bg-slate-100">
                    <img
                      src={c.course_image || courseImages[Number(c.id) % courseImages.length]}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <h4 className="mt-4 line-clamp-2 text-sm font-black text-deepBlue">{c.title}</h4>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                    {noDate ?
                      <span className="text-[10px] font-bold text-[#EC943C]">موعد الدفعة القادمة غير محدد</span>
                    : <span className="font-mono text-[11px] text-slate-600 dir-ltr">{String(c.start_date).slice(0, 10)}</span>}
                    <Link
                      to={`/courses/${c.slug}`}
                      className="rounded-2xl bg-customOrange px-3 py-1.5 text-[11px] font-black text-white shadow-sm"
                    >
                      {noDate ? 'انضم إلى الدورة القادمة' : 'التسجيل الآن'}
                    </Link>
                  </div>
                </motion.div>
              )
            })}
          </div>
        }
      </DashboardSection>
    </div>
  )
}
