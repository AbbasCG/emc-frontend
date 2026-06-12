import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  GraduationCap,
  BookOpen,
  Users,
  Clock,
  Award,
  Loader2,
  Eye,
} from 'lucide-react'
import { fetchInstructorLearningPaths, type LearningPath } from '../../../api/learningPathsApi'

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    published: { label: 'منشور',  cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    draft:     { label: 'مسودة',  cls: 'bg-slate-100 text-slate-600 border-slate-200' },
    archived:  { label: 'مؤرشف', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  }
  const { label, cls } = map[status] ?? { label: status, cls: 'bg-slate-100 text-slate-600 border-slate-200' }
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${cls}`}>
      {label}
    </span>
  )
}

export default function InstructorLearningPathsPage() {
  const [paths, setPaths] = useState<LearningPath[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchInstructorLearningPaths()
      .then(setPaths)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8" dir="rtl">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-[#22334A]">مساراتي التعليمية</h1>
        <p className="mt-1 text-sm text-slate-500">المسارات المُسنَدة إليك كمدرب</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-[#2691C2]" />
        </div>
      ) : paths.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white py-24 text-center shadow-sm">
          <GraduationCap className="mb-4 h-14 w-14 text-slate-200" />
          <p className="text-lg font-semibold text-slate-500">لم يُسنَد إليك أي مسار تعليمي بعد</p>
          <p className="mt-1 text-sm text-slate-400">تواصل مع الإدارة لتسنيد مسار إليك</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {paths.map((path, i) => (
            <motion.div
              key={path.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
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
                <div className="absolute bottom-3 right-3">
                  <StatusBadge status={path.status} />
                </div>
              </div>

              {/* Body */}
              <div className="flex flex-1 flex-col p-5">
                <h3 className="mb-2 line-clamp-2 font-black text-[#22334A] group-hover:text-[#2691C2] transition">
                  {path.title}
                </h3>

                <div className="mb-4 flex flex-wrap gap-3 text-[11px] text-slate-500">
                  {path.duration && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-[#2691C2]" />
                      {path.duration} {path.duration_unit === 'weeks' ? 'أسبوع' : path.duration_unit === 'months' ? 'شهر' : 'يوم'}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-3 w-3 text-[#EC943C]" />
                    {path.courses_count} دورة
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {path.students_count} طالب
                  </span>
                  {path.certificate_name && (
                    <span className="flex items-center gap-1 text-amber-600">
                      <Award className="h-3 w-3" /> شهادة
                    </span>
                  )}
                </div>

                <Link
                  to={`/dashboard/instructor/learning-paths/${path.id}`}
                  className="mt-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-[#2691C2] px-4 py-2.5 text-xs font-black text-white shadow-sm shadow-[#2691C2]/20 transition hover:bg-[#1d7aab]"
                >
                  <Eye className="h-4 w-4" />
                  إدارة المسار
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
