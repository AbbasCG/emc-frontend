import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Award,
  BookOpen,
  CheckCircle,
  ChevronLeft,
  Clock,
  GraduationCap,
  Loader2,
  PlayCircle,
  Route,
} from 'lucide-react'
import { fetchStudentLearningPaths, type StudentEnrollment } from '../../../api/learningPathsApi'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US').format(n)
}

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('ar', {
    numberingSystem: 'latn',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso))
}

export default function StudentLearningPathsPage() {
  const [enrollments, setEnrollments] = useState<StudentEnrollment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStudentLearningPaths()
      .then(setEnrollments)
      .finally(() => setLoading(false))
  }, [])

  const stats = useMemo(() => {
    const total = enrollments.length
    const completed = enrollments.filter((e) => e.enrollment_status === 'completed').length
    const active = total - completed
    const certCount = enrollments.filter((e) => e.learning_path.certificate_name).length
    return { total, completed, active, certCount }
  }, [enrollments])

  return (
    <div className="space-y-6 pb-16 text-right" dir="rtl">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-bl from-[#0C2A4B] via-[#1f3046] to-[#0077B6] px-6 py-8 shadow-[0_20px_50px_-20px_rgba(12,42,75,0.5)] sm:px-10"
      >
        <div aria-hidden className="pointer-events-none absolute -left-20 top-0 h-48 w-48 rounded-full bg-[#F28C00]/20 blur-[90px]" />
        <div aria-hidden className="pointer-events-none absolute -bottom-16 -right-10 h-48 w-48 rounded-full bg-white/10 blur-[80px]" />

        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/55">رحلة التعلّم</p>
            <h1 className="text-[1.7rem] font-black leading-tight text-white sm:text-[2rem]">مساراتي التعليمية</h1>
            <p className="text-[13px] font-semibold text-white/70">
              تابع تقدّمك عبر المسارات التي سجّلت فيها
            </p>
          </div>

          {!loading && enrollments.length > 0 && (
            <div className="flex shrink-0 gap-3">
              {[
                { label: 'نشط', value: stats.active, color: 'text-[#F28C00]' },
                { label: 'مكتمل', value: stats.completed, color: 'text-emerald-400' },
                { label: 'شهادة', value: stats.certCount, color: 'text-amber-300' },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-center backdrop-blur">
                  <p className={`text-[1.4rem] font-black tabular-nums ${color}`}>{fmt(value)}</p>
                  <p className="mt-0.5 text-[10px] font-bold text-white/60">{label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.section>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-[#0077B6]" />
        </div>
      ) : enrollments.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white py-24 text-center shadow-sm"
        >
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-50">
            <Route className="h-8 w-8 text-slate-300" />
          </div>
          <p className="text-base font-black text-[#0C2A4B]">لا توجد مسارات تعليمية مسجّلة حالياً</p>
          <p className="mt-1 text-sm text-slate-400">اكتشف المسارات المتاحة وابدأ رحلتك التعليمية</p>
          <Link
            to="/learning-paths"
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[#0077B6] px-6 py-3 text-sm font-black text-white shadow-md shadow-[#0077B6]/25 transition hover:bg-[#1d7aab]"
          >
            استكشف المسارات
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </motion.div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {enrollments.map((en, i) => {
            const path = en.learning_path
            const dur = path.duration
              ? `${path.duration} ${path.duration_unit === 'weeks' ? 'أسبوع' : path.duration_unit === 'months' ? 'شهر' : 'يوم'}`
              : null
            const isCompleted = en.enrollment_status === 'completed'

            return (
              <motion.div
                key={en.enrollment_id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.07 }}
                className="h-full"
              >
                <Link
                  to={`/dashboard/student/learning-paths/${path.id}`}
                  className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#0077B6]/40 hover:shadow-lg"
                >
                  {/* Cover */}
                  <div className="relative h-36 overflow-hidden bg-gradient-to-br from-[#0C2A4B] to-[#1a4a6b]">
                    {path.featured_image ? (
                      <img
                        src={path.featured_image}
                        alt={path.title}
                        className="h-full w-full object-cover opacity-80 transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <GraduationCap className="absolute inset-0 m-auto h-12 w-12 text-white/15" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0C2A4B]/70 to-transparent" />
                    <div className="absolute bottom-2.5 right-3">
                      {isCompleted ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-black text-white shadow-sm">
                          <CheckCircle className="h-3 w-3" /> مكتمل
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#0077B6] px-2.5 py-0.5 text-[10px] font-black text-white shadow-sm">
                          <PlayCircle className="h-3 w-3" /> جاري
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="flex flex-1 flex-col gap-3 p-4">
                    <h3 className="line-clamp-2 text-[15px] font-black leading-snug text-[#0C2A4B] transition group-hover:text-[#0077B6]">
                      {path.title}
                    </h3>

                    {/* Meta pills */}
                    <div className="flex flex-wrap gap-1.5">
                      {dur && (
                        <span className="inline-flex items-center gap-1 rounded-xl border border-slate-100 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-500">
                          <Clock className="h-3 w-3 text-[#0077B6]" />
                          {dur}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 rounded-xl border border-slate-100 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-500">
                        <BookOpen className="h-3 w-3 text-[#F28C00]" />
                        {fmt(path.courses_count)} دورة
                      </span>
                      {path.certificate_name && (
                        <span className="inline-flex items-center gap-1 rounded-xl border border-amber-100 bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700">
                          <Award className="h-3 w-3" /> شهادة
                        </span>
                      )}
                    </div>

                    {/* Instructor — only if assigned */}
                    {path.instructor && (
                      <p className="text-[11px] text-slate-400">
                        المدرب:{' '}
                        <span className="font-semibold text-slate-600">{path.instructor.name}</span>
                      </p>
                    )}

                    {/* Footer */}
                    <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3">
                      <span className="text-[11px] text-slate-400">سُجِّل {fmtDate(en.enrolled_at)}</span>
                      <span className="flex items-center gap-1 text-[11px] font-black text-[#0077B6]">
                        متابعة المسار
                        <ChevronLeft className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
