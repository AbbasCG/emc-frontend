import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GraduationCap,
  BookOpen,
  Clock,
  Award,
  Loader2,
  ChevronLeft,
  CheckCircle,
  PlayCircle,
} from 'lucide-react'
import { fetchStudentLearningPaths, type StudentEnrollment } from '../../../api/learningPathsApi'

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }

function StatusChip({ status }: { status: string }) {
  if (status === 'completed')
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
        <CheckCircle className="h-3 w-3" /> مكتمل
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#2691C2]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#2691C2] border border-[#2691C2]/20">
      <PlayCircle className="h-3 w-3" /> جاري
    </span>
  )
}

export default function StudentLearningPathsPage() {
  const [enrollments, setEnrollments] = useState<StudentEnrollment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStudentLearningPaths()
      .then(setEnrollments)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8" dir="rtl">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-[#22334A]">مساراتي التعليمية</h1>
        <p className="mt-1 text-sm text-slate-500">المسارات التي سجّلت فيها وتقدّمك في كل منها</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-[#2691C2]" />
        </div>
      ) : enrollments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white py-24 text-center shadow-sm">
          <GraduationCap className="mb-4 h-14 w-14 text-slate-200" />
          <p className="text-lg font-semibold text-slate-500">لم تسجّل في أي مسار تعليمي بعد</p>
          <p className="mt-1 text-sm text-slate-400">تصفح المسارات المتاحة وابدأ رحلتك التعليمية</p>
          <Link
            to="/learning-paths"
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[#2691C2] px-5 py-3 text-sm font-black text-white shadow-md shadow-[#2691C2]/25 transition hover:bg-[#1d7aab]"
          >
            تصفح المسارات
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <AnimatePresence>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {enrollments.map((en, i) => {
              const path = en.learning_path
              return (
                <motion.div
                  key={en.enrollment_id}
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  transition={{ duration: 0.35, delay: i * 0.06 }}
                  className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:border-[#2691C2]/40 hover:shadow-lg"
                >
                  {/* Cover */}
                  <div className="relative h-40 bg-gradient-to-br from-[#22334A] to-[#2691C2]">
                    {path.featured_image ? (
                      <img
                        src={path.featured_image}
                        alt={path.title}
                        className="h-full w-full object-cover opacity-80"
                      />
                    ) : (
                      <GraduationCap className="absolute inset-0 m-auto h-12 w-12 text-white/20" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#22334A]/60 to-transparent" />
                    <div className="absolute bottom-3 right-3">
                      <StatusChip status={en.enrollment_status} />
                    </div>
                  </div>

                  {/* Body */}
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="mb-2 line-clamp-2 font-black text-[#22334A] group-hover:text-[#2691C2] transition">
                      {path.title}
                    </h3>

                    <div className="mb-4 flex flex-wrap gap-2 text-[11px] text-slate-500">
                      {path.duration && (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3 text-[#2691C2]" />
                          {path.duration} {path.duration_unit === 'weeks' ? 'أسبوع' : path.duration_unit === 'months' ? 'شهر' : 'يوم'}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <BookOpen className="h-3 w-3 text-[#EC943C]" />
                        {path.courses_count} دورة
                      </span>
                      {path.certificate_name && (
                        <span className="inline-flex items-center gap-1 text-amber-600">
                          <Award className="h-3 w-3" /> شهادة
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400">
                      سُجِّل في {new Date(en.enrolled_at).toLocaleDateString('ar-EG')}
                    </p>

                    <Link
                      to={`/dashboard/student/learning-paths/${path.id}`}
                      className="mt-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-[#2691C2] px-4 py-2.5 text-xs font-black text-white shadow-sm shadow-[#2691C2]/20 transition hover:bg-[#1d7aab]"
                    >
                      <PlayCircle className="h-4 w-4" />
                      فتح المسار
                    </Link>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </AnimatePresence>
      )}
    </div>
  )
}
