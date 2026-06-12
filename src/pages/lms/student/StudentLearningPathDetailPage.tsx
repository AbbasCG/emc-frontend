import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BookOpen,
  Clock,
  Award,
  ChevronRight,
  Loader2,
  CheckCircle,
  PlayCircle,
  Users,
  ExternalLink,
} from 'lucide-react'
import { fetchStudentLearningPath, type StudentEnrollment } from '../../../api/learningPathsApi'

export default function StudentLearningPathDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [enrollment, setEnrollment] = useState<StudentEnrollment | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    fetchStudentLearningPath(Number(id))
      .then((data) => {
        if (!data) navigate('/dashboard/student/learning-paths', { replace: true })
        else setEnrollment(data)
      })
      .finally(() => setLoading(false))
  }, [id, navigate])

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#2691C2]" />
      </div>
    )

  if (!enrollment) return null

  const path = enrollment.learning_path

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#22334A] to-[#1a4a6b] px-4 py-12 sm:px-8 lg:px-12">
        <div className="absolute inset-0 opacity-10">
          {path.featured_image && (
            <img src={path.featured_image} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="relative mx-auto max-w-5xl">
          {/* Breadcrumb */}
          <nav className="mb-6 flex items-center gap-2 text-xs text-white/60">
            <Link to="/dashboard/student" className="hover:text-white">لوحة التحكم</Link>
            <ChevronRight className="h-3 w-3" />
            <Link to="/dashboard/student/learning-paths" className="hover:text-white">مساراتي</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-white/90 line-clamp-1">{path.title}</span>
          </nav>

          <h1 className="mb-3 text-3xl font-black text-white sm:text-4xl">{path.title}</h1>

          {path.short_description && (
            <p className="mb-6 max-w-2xl text-base text-white/70">{path.short_description}</p>
          )}

          {/* Stats */}
          <div className="mb-6 flex flex-wrap gap-4 text-sm text-white/80">
            {path.duration && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {path.duration} {path.duration_unit === 'weeks' ? 'أسبوع' : path.duration_unit === 'months' ? 'شهر' : 'يوم'}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <BookOpen className="h-4 w-4" />
              {path.courses_count} دورة
            </span>
            {path.students_count > 0 && (
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {path.students_count.toLocaleString('ar-EG')} طالب
              </span>
            )}
            {path.certificate_name && (
              <span className="flex items-center gap-1.5 text-amber-300">
                <Award className="h-4 w-4" />
                {path.certificate_name}
              </span>
            )}
          </div>

          {/* Enrollment status */}
          <div className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white backdrop-blur">
            {enrollment.enrollment_status === 'completed' ? (
              <>
                <CheckCircle className="h-4 w-4 text-emerald-400" />
                أكملت هذا المسار
              </>
            ) : (
              <>
                <PlayCircle className="h-4 w-4 text-[#2691C2]" />
                جاري — سُجِّل في {new Date(enrollment.enrolled_at).toLocaleDateString('ar-EG')}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-8 lg:px-12">

        {/* Curriculum */}
        {(path.courses?.length ?? 0) > 0 && (
          <section>
            <h2 className="mb-4 text-xl font-black text-[#22334A]">مسار الدراسة</h2>
            <div className="space-y-3">
              {path.courses!.map((course, i) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2691C2] text-sm font-black text-white">
                    {i + 1}
                  </div>
                  {course.image_url ? (
                    <img
                      src={course.image_url}
                      alt={course.title}
                      className="h-12 w-16 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-16 items-center justify-center rounded-xl bg-slate-100">
                      <BookOpen className="h-5 w-5 text-slate-400" />
                    </div>
                  )}
                  <div className="flex-1 text-right">
                    <p className="font-bold text-[#22334A]">{course.title}</p>
                    {course.duration && (
                      <p className="text-[11px] text-slate-400 flex items-center gap-1 justify-end">
                        <Clock className="h-3 w-3" /> {course.duration}
                      </p>
                    )}
                  </div>
                  <Link
                    to={`/courses/${course.slug}`}
                    className="rounded-xl border border-[#2691C2]/30 px-3 py-1.5 text-xs font-bold text-[#2691C2] transition hover:bg-[#2691C2]/10"
                  >
                    <ExternalLink className="inline h-3.5 w-3.5" />
                  </Link>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Learning Outcomes */}
        {path.learning_outcomes.length > 0 && (
          <section>
            <h2 className="mb-4 text-xl font-black text-[#22334A]">ماذا ستتعلم</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {path.learning_outcomes.map((o, i) => (
                <div key={i} className="flex items-start gap-2 rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#2691C2]" />
                  <span className="text-sm text-slate-700">{o}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Certificate */}
        {path.certificate_name && (
          <section className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 p-6">
            <div className="flex items-center gap-3">
              <Award className="h-8 w-8 text-amber-500" />
              <div>
                <p className="font-black text-amber-700">شهادة إتمام</p>
                <p className="text-sm text-amber-600">{path.certificate_name}</p>
              </div>
            </div>
          </section>
        )}

        {/* Instructor */}
        {path.instructor && (
          <section>
            <h2 className="mb-4 text-xl font-black text-[#22334A]">المدرب</h2>
            <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              {path.instructor.avatar_url ? (
                <img
                  src={path.instructor.avatar_url}
                  alt={path.instructor.name}
                  className="h-14 w-14 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#2691C2]/10 text-xl font-black text-[#2691C2]">
                  {path.instructor.name.charAt(0)}
                </div>
              )}
              <div>
                <p className="font-black text-[#22334A]">{path.instructor.name}</p>
                {path.instructor.title && (
                  <p className="text-sm text-slate-500">{path.instructor.title}</p>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
