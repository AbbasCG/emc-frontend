import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Award,
  BookOpen,
  CheckCircle,
  ChevronRight,
  Clock,
  GraduationCap,
  PlayCircle,
  Users,
} from 'lucide-react'
import { fetchStudentLearningPath, type StudentEnrollment } from '../../../api/learningPathsApi'
import { studentLearnHref } from '@/utils/studentLearnNavigation'

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US').format(n)
}

function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat('ar', {
    numberingSystem: 'latn',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso))
}

function certStatusLabel(status: string): { label: string; color: string; bg: string } {
  const s = status.toLowerCase()
  if (s === 'completed' || s === 'issued') return { label: 'مكتملة', color: 'text-emerald-700', bg: 'bg-emerald-100 border-emerald-200' }
  if (s === 'ready') return { label: 'جاهزة', color: 'text-amber-700', bg: 'bg-amber-100 border-amber-200' }
  return { label: 'غير جاهزة', color: 'text-slate-500', bg: 'bg-slate-100 border-slate-200' }
}

export default function StudentLearningPathDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [enrollment, setEnrollment] = useState<StudentEnrollment | null>(null)
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [accessMessage, setAccessMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    fetchStudentLearningPath(Number(id))
      .then((result) => {
        if (result.forbidden) {
          setForbidden(true)
          setAccessMessage(result.message ?? null)
          setEnrollment(null)
          return
        }
        if (!result.enrollment) {
          navigate('/dashboard/student/learning-paths', { replace: true })
          return
        }
        setEnrollment(result.enrollment)
      })
      .finally(() => setLoading(false))
  }, [id, navigate])

  if (loading) {
    return (
      <div className="animate-pulse space-y-5 pb-16" dir="rtl">
        <div className="h-60 rounded-[2rem] bg-slate-200" />
        <div className="h-8 w-1/3 rounded-xl bg-slate-100" />
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-24 rounded-2xl bg-slate-100" />
          ))}
        </div>
      </div>
    )
  }

  if (forbidden) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50/80 p-10 text-center shadow-sm" dir="rtl">
        <h1 className="text-xl font-black text-[#22334A]">
          {accessMessage ?? 'لا يمكنك الوصول إلى هذا المسار التعليمي.'}
        </h1>
        <Link
          to="/dashboard/student/learning-paths"
          className="mt-6 inline-block rounded-2xl bg-[#22334A] px-6 py-2.5 text-[12px] font-black text-white"
        >
          العودة إلى مساراتي
        </Link>
      </div>
    )
  }

  if (!enrollment) return null

  const path = enrollment.learning_path
  const isCompleted = enrollment.enrollment_status === 'completed'
  const certStatus = isCompleted ? 'completed' : enrollment.enrollment_status === 'active' ? 'not_ready' : 'not_ready'

  const durationLabel = path.duration
    ? `${path.duration} ${
        path.duration_unit === 'weeks' ? 'أسبوع'
        : path.duration_unit === 'months' ? 'شهر'
        : 'يوم'
      }`
    : null

  const certInfo = path.certificate_name ? certStatusLabel(certStatus) : null

  return (
    <div className="space-y-6 pb-20 text-right" dir="rtl">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-[2rem] border border-white/20 bg-gradient-to-bl from-[#22334A] via-[#1f3049] to-[#2691c2] p-[1px] shadow-[0_32px_80px_-36px_rgba(34,51,74,0.72)]">
        <div className="relative overflow-hidden rounded-[calc(2rem-1px)]">
          {/* Background cover image */}
          {path.featured_image && (
            <img
              src={path.featured_image}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full object-cover opacity-15"
            />
          )}
          <div className="relative bg-gradient-to-tl from-[#22334A]/95 via-[#22334A]/82 to-[#2691C2]/40 px-6 py-9 sm:px-10">
            <div aria-hidden className="pointer-events-none absolute -left-24 top-0 h-64 w-64 rounded-full bg-[#EC943C]/30 blur-[100px]" />
            <div aria-hidden className="pointer-events-none absolute -bottom-28 right-[-8%] h-72 w-72 rounded-full bg-white/10 blur-[90px]" />

            <div className="relative space-y-5">
              {/* Breadcrumb */}
              <nav className="flex items-center gap-2 text-[11px] font-black text-white/55">
                <Link to="/dashboard/student/learning-paths" className="hover:text-white">مساراتي التعليمية</Link>
                <ChevronRight className="h-3 w-3 opacity-50" />
                <span className="line-clamp-1 max-w-[16ch] text-white/90">{path.title}</span>
              </nav>

              <div>
                <h1 className="text-[1.7rem] font-black leading-tight text-white sm:text-[2.1rem]">{path.title}</h1>
                {path.short_description && (
                  <p className="mt-2 max-w-2xl text-[13px] font-semibold leading-relaxed text-white/65">
                    {path.short_description}
                  </p>
                )}
              </div>

              {/* Stats row */}
              <div className="flex flex-wrap items-center gap-3">
                {durationLabel && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/12 px-3 py-1.5 text-[12px] font-bold text-white backdrop-blur">
                    <Clock className="h-3.5 w-3.5 text-[#EC943C]" />
                    {durationLabel}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/12 px-3 py-1.5 text-[12px] font-bold text-white backdrop-blur">
                  <BookOpen className="h-3.5 w-3.5 text-white/70" />
                  {fmt(path.courses_count)} دورة
                </span>
                {path.students_count > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/12 px-3 py-1.5 text-[12px] font-bold text-white backdrop-blur">
                    <Users className="h-3.5 w-3.5 text-white/70" />
                    {fmt(path.students_count)} طالب
                  </span>
                )}
                {path.certificate_name && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/15 px-3 py-1.5 text-[12px] font-bold text-amber-200 backdrop-blur">
                    <Award className="h-3.5 w-3.5" />
                    {path.certificate_name}
                  </span>
                )}
              </div>

              {/* Enrollment badge */}
              <div className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-[13px] font-bold text-white backdrop-blur">
                {isCompleted ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                    أكملت هذا المسار
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-4 w-4 text-[#2691C2]" />
                    جاري — سُجِّل في {fmtDate(enrollment.enrolled_at)}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Journey Timeline ──────────────────────────────────────────────── */}
      {(path.courses?.length ?? 0) > 0 && (
        <section>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-[#22334A]">مسار الدراسة</h2>
              <p className="mt-0.5 text-[13px] font-semibold text-[#22334A]/50">
                {fmt(path.courses!.length)} دورة في هذا المسار
              </p>
            </div>
            <GraduationCap className="h-6 w-6 text-[#2691C2]/50" />
          </div>

          <div className="relative space-y-0">
            {/* Vertical connector — aligned to step circles */}
            <div
              aria-hidden
              className="absolute right-[1.15rem] top-9 w-0.5 bg-gradient-to-b from-[#2691C2]/60 via-slate-200 to-transparent"
              style={{ bottom: '2rem' }}
            />

            {path.courses!.map((course, i) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06, duration: 0.28 }}
                className="relative flex items-start gap-4 pb-4"
              >
                {/* Step circle */}
                <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-bl from-[#22334A] to-[#2691C2] text-[12px] font-black text-white shadow-md shadow-[#2691C2]/25">
                  {fmt(i + 1)}
                </div>

                {/* Card */}
                <div className="group flex flex-1 flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm ring-1 ring-[#22334A]/[0.03] transition hover:border-[#2691C2]/35 hover:shadow-md">
                  {/* Thumbnail */}
                  {course.image_url ? (
                    <img
                      src={course.image_url}
                      alt={course.title}
                      className="h-14 w-[4.5rem] shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-[4.5rem] shrink-0 items-center justify-center rounded-xl bg-gradient-to-bl from-[#22334A]/10 to-[#2691C2]/10">
                      <BookOpen className="h-5 w-5 text-[#2691C2]/50" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 font-black leading-snug text-[#22334A] transition group-hover:text-[#2691C2]">
                      {course.title}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                      {course.duration && (
                        <span className="inline-flex items-center gap-1 rounded-lg border border-slate-100 bg-slate-50 px-2 py-0.5">
                          <Clock className="h-3 w-3" /> {course.duration}
                        </span>
                      )}
                      {course.level && (
                        <span className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-0.5">{course.level}</span>
                      )}
                      {(course as { assignments_count?: number }).assignments_count != null && (
                        <span className="rounded-lg border border-[#EC943C]/20 bg-orange-50 px-2 py-0.5 text-[#EC943C]">
                          {fmt((course as { assignments_count?: number }).assignments_count!)} واجب
                        </span>
                      )}
                    </div>
                  </div>

                  {/* CTA */}
                  <Link
                    to={studentLearnHref(course.id)}
                    className="shrink-0 rounded-xl bg-[#22334A] px-3.5 py-2 text-[12px] font-black text-white shadow-sm transition hover:bg-[#2691C2]"
                  >
                    متابعة التعلم
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ── Learning Outcomes ─────────────────────────────────────────────── */}
      {path.learning_outcomes.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-black text-[#22334A]">ماذا ستتعلم</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {path.learning_outcomes.map((o, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 rounded-2xl border border-[#2691C2]/12 bg-blue-50/40 p-3.5 shadow-sm"
              >
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#2691C2]" />
                <span className="text-[13px] font-semibold text-[#22334A]/80">{o}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Certificate Section ───────────────────────────────────────────── */}
      {path.certificate_name && certInfo && (
        <section>
          <h2 className="mb-3 text-xl font-black text-[#22334A]">الشهادة</h2>
          <div className={`rounded-3xl border p-6 ${certInfo.bg}`}>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
                <Award className="h-6 w-6 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-[#22334A]">{path.certificate_name}</p>
                </div>
              <span className={`rounded-2xl border px-4 py-2 text-[12px] font-black ${certInfo.bg} ${certInfo.color}`}>
                {certInfo.label}
              </span>
            </div>

            {!isCompleted && (
              <div className="mt-4 flex items-center gap-2 rounded-2xl border border-[#22334A]/10 bg-white/70 p-3.5">
                <Clock className="h-4 w-4 shrink-0 text-[#22334A]/40" />
                <p className="text-[12px] font-semibold text-[#22334A]/60">
                  أكمل جميع دورات المسار للحصول على الشهادة
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Instructor ───────────────────────────────────────────────────── */}
      {path.instructor && (
        <section>
          <h2 className="mb-3 text-xl font-black text-[#22334A]">المدرب</h2>
          <div className="flex items-center gap-4 rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm">
            {path.instructor.avatar_url ? (
              <img
                src={path.instructor.avatar_url}
                alt={path.instructor.name}
                className="h-14 w-14 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-bl from-[#22334A] to-[#2691C2] text-xl font-black text-white">
                {path.instructor.name.charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-black text-[#22334A]">{path.instructor.name}</p>
              {path.instructor.title && (
                <p className="mt-0.5 text-[12px] font-semibold text-slate-500">{path.instructor.title}</p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── Back link ────────────────────────────────────────────────────── */}
      <div className="pt-2">
        <Link
          to="/dashboard/student/learning-paths"
          className="inline-flex items-center gap-2 text-[13px] font-black text-[#2691C2] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          العودة إلى مساراتي التعليمية
        </Link>
      </div>
    </div>
  )
}
