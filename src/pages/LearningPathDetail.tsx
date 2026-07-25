import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import DOMPurify from 'dompurify'
import {
  GraduationCap,
  Clock,
  BookOpen,
  Award,
  Users,
  ChevronLeft,
  CheckCircle,
  ArrowLeft,
  Loader2,
  Star,
  Globe,
  BarChart2,
  CircleDot,
  CalendarDays,
  MessageCircle,
} from 'lucide-react'
import toast from '@/lib/toast'
import {
  buildPublicLoginHref,
  isStudentUser,
  PUBLIC_ENROLL_STUDENT_ONLY_MSG,
} from '@/utils/publicEnrollAuth'
import {
  fetchPublicLearningPath,
  fetchEnrollmentStatus,
  enrollInLearningPath,
  type LearningPath,
  type EnrollmentStatus,
} from '../api/learningPathsApi'
import { formatEuroInteger } from '../utils/currency'
import { useAuth } from '../contexts/AuthContext'
import PublicSeo from '@/components/public/PublicSeo'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

function DurationLabel(path: LearningPath) {
  if (!path.duration) return null
  const unit = path.duration_unit === 'weeks' ? 'أسبوع' : path.duration_unit === 'months' ? 'شهر' : 'يوم'
  return `${path.duration} ${unit}`
}

export default function LearningPathDetail() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [path, setPath] = useState<LearningPath | null>(null)
  const [loading, setLoading] = useState(true)
  const [enrollStatus, setEnrollStatus] = useState<EnrollmentStatus>({ enrolled: false, enrollment: null })
  const [enrolling, setEnrolling] = useState(false)
  const [enrollMsg, setEnrollMsg] = useState<string | null>(null)

  // Re-arm the loading state during render when the route slug changes (react.dev
  // "adjusting state when a prop changes"). On mount the effect only re-set the already
  // initial `true`, so seeding `seen` with the current slug keeps behaviour identical.
  const [seenSlug, setSeenSlug] = useState(slug)
  if (seenSlug !== slug) {
    setSeenSlug(slug)
    if (slug) setLoading(true)
  }

  useEffect(() => {
    if (!slug) return
    fetchPublicLearningPath(slug).then((data) => {
      if (!data) navigate('/learning-paths', { replace: true })
      else setPath(data)
      setLoading(false)
    })
  }, [slug, navigate])

  /** Imperative re-check after enrolling — called from an event handler. */
  const refreshEnrollStatus = useCallback(async () => {
    if (!slug || !user || user.role !== 'student') return
    const status = await fetchEnrollmentStatus(slug)
    setEnrollStatus(status)
  }, [slug, user])

  useEffect(() => {
    if (!slug || !user || user.role !== 'student') return
    let alive = true
    void (async () => {
      const status = await fetchEnrollmentStatus(slug)
      if (alive) setEnrollStatus(status)
    })()
    return () => {
      alive = false
    }
  }, [slug, user])

  const handleEnroll = async () => {
    if (!slug) return
    if (!user) {
      navigate(buildPublicLoginHref(location.pathname))
      return
    }
    if (!isStudentUser(user.role)) {
      toast.error(PUBLIC_ENROLL_STUDENT_ONLY_MSG)
      return
    }
    setEnrolling(true)
    setEnrollMsg(null)
    const result = await enrollInLearningPath(slug)
    if (result.enrolled) {
      setEnrollMsg('أنت مسجل بالفعل في هذا المسار.')
      setEnrollStatus({ enrolled: true, enrollment: null })
    } else if (result.success) {
      await refreshEnrollStatus()
    } else {
      setEnrollMsg(result.message ?? 'فشل التسجيل. حاول مجدداً.')
    }
    setEnrolling(false)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 pt-20">
        <Loader2 className="h-10 w-10 animate-spin text-[#0077B6]" />
      </div>
    )
  }

  if (!path) return null

  const effectivePrice = path.discount_price ?? path.price
  const durationLabel = DurationLabel(path)
  const whatsappCourses = (path.courses ?? []).filter((c) => c.whatsapp_community_url)

  return (
    <main className="bg-slate-50 pt-20" dir="rtl">
      <PublicSeo
        title={path.title}
        description={path.short_description || path.full_description?.slice(0, 160) || `مسار تعليمي ${path.title}`}
        path={`/learning-paths/${path.slug}`}
        image={path.featured_image}
        type="article"
      />
      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-bl from-[#0C2A4B] via-[#1c4567] to-[#162334] py-20 text-white">
        {path.featured_image && (
          <img
            src={path.featured_image}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover opacity-15 mix-blend-luminosity"
          />
        )}
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_380px]">
            {/* Left column */}
            <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={{ duration: 0.5 }}>
              {/* Breadcrumb */}
              <nav className="mb-6 flex items-center gap-2 text-sm text-slate-300">
                <Link to="/" className="hover:text-white">الرئيسية</Link>
                <ChevronLeft className="h-4 w-4" />
                <Link to="/learning-paths" className="hover:text-white">المسارات التعليمية</Link>
                <ChevronLeft className="h-4 w-4" />
                <span className="text-white">{path.title}</span>
              </nav>

              {/* Badges */}
              <div className="mb-4 flex flex-wrap gap-2">
                {path.is_featured && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#F28C00] px-3 py-1 text-xs font-black">
                    <Star className="h-3 w-3 fill-white" /> مسار مميز
                  </span>
                )}
                {path.level && (
                  <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold backdrop-blur">
                    <BarChart2 className="mr-1 inline h-3 w-3" />
                    {path.level}
                  </span>
                )}
                {path.language && (
                  <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold backdrop-blur">
                    <Globe className="mr-1 inline h-3 w-3" />
                    {path.language}
                  </span>
                )}
              </div>

              <h1 className="mb-4 text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
                {path.title}
              </h1>

              {path.short_description && (
                <p className="mb-8 max-w-2xl text-lg leading-9 text-slate-300">
                  {path.short_description}
                </p>
              )}

              {/* Quick stats */}
              <div className="flex flex-wrap gap-6 text-sm">
                {durationLabel && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-[#0077B6]" />
                    <span>{durationLabel}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-[#F28C00]" />
                  <span>{path.courses_count} دورة</span>
                </div>
                {path.students_count > 0 && (
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-slate-300" />
                    <span>{new Intl.NumberFormat('en-US').format(path.students_count)} طالب</span>
                  </div>
                )}
                {path.certificate_name && (
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-amber-400" />
                    <span>شهادة إتمام</span>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Pricing card */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              transition={{ duration: 0.5, delay: 0.15 }}
              className="rounded-3xl bg-white p-8 text-[#0C2A4B] shadow-2xl"
            >
              {path.featured_image ? (
                <img
                  src={path.featured_image}
                  alt={path.title}
                  className="mb-6 h-44 w-full rounded-2xl object-cover"
                />
              ) : (
                <div className="mb-6 flex h-44 w-full items-center justify-center rounded-2xl bg-gradient-to-br from-[#0077B6] to-[#0C2A4B]">
                  <GraduationCap className="h-16 w-16 text-white/40" />
                </div>
              )}

              <div className="mb-2">
                {path.discount_price != null && path.price != null && path.price > path.discount_price && (
                  <p className="text-sm font-medium text-slate-400 line-through">
                    {formatEuroInteger(path.price, 'ar')}
                  </p>
                )}
                <p className="text-3xl font-black text-[#0C2A4B]">
                  {effectivePrice === 0 || effectivePrice == null
                    ? 'مجاناً'
                    : formatEuroInteger(effectivePrice, 'ar')}
                </p>
              </div>

              <div className="mb-6 space-y-2 text-sm text-slate-500">
                {durationLabel && (
                  <div className="flex items-center justify-between">
                    <span>{durationLabel}</span>
                    <span className="font-semibold text-slate-700">المدة</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span>{path.courses_count} دورة</span>
                  <span className="font-semibold text-slate-700">المحتوى</span>
                </div>
                {path.certificate_name && (
                  <div className="flex items-center justify-between">
                    <span className="text-amber-600 font-semibold">✓</span>
                    <span className="font-semibold text-slate-700">شهادة إتمام</span>
                  </div>
                )}
              </div>

              {enrollStatus.enrolled ? (
                <Link
                  to={`/dashboard/student/learning-paths/${path.id}`}
                  className="block w-full rounded-2xl bg-emerald-500 py-3.5 text-center font-black text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-600"
                >
                  <CheckCircle className="mr-2 inline h-4 w-4" />
                  ادخل إلى مساري
                </Link>
              ) : (
                <button
                  onClick={() => void handleEnroll()}
                  disabled={enrolling || !path.enrollment_open}
                  className="block w-full rounded-2xl bg-[#0077B6] py-3.5 text-center font-black text-white shadow-lg shadow-[#0077B6]/25 transition hover:bg-[#1d7aab] disabled:opacity-60"
                >
                  {enrolling ? (
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  ) : !path.enrollment_open ? (
                    'التسجيل مغلق حالياً'
                  ) : !user ? (
                    'سجّل دخولك للتسجيل في المسار'
                  ) : (
                    'سجّل في المسار'
                  )}
                </button>
              )}
              {enrollMsg && (
                <p className="mt-2 text-center text-xs text-amber-600">{enrollMsg}</p>
              )}
              <p className="mt-3 text-center text-xs text-slate-400">
                <Link to="/contact" className="text-[#0077B6] hover:underline">
                  تواصل معنا للاستفسار
                </Link>
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── BODY ─────────────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
          <div className="space-y-12">
            {/* Description */}
            {path.full_description && (
              <motion.section variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                <h2 className="mb-4 text-2xl font-black text-[#0C2A4B]">عن هذا المسار</h2>
                <div
                  className="prose prose-slate max-w-none text-right leading-9 text-slate-600"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(path.full_description) }}
                />
              </motion.section>
            )}

            {/* Schedule info */}
            {(path.study_days_per_week != null ||
              (path.study_days && path.study_days.length > 0) ||
              path.study_time ||
              path.schedule_note) && (
              <motion.section variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                <h2 className="mb-4 text-2xl font-black text-[#0C2A4B]">جدول الدراسة</h2>
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  {path.study_days_per_week != null && (
                    <div className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                      <CalendarDays className="h-5 w-5 shrink-0 text-[#0077B6]" />
                      <span>عدد أيام الدراسة في الأسبوع: {path.study_days_per_week}</span>
                    </div>
                  )}
                  {path.study_days && path.study_days.length > 0 && (
                    <div className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                      <CalendarDays className="h-5 w-5 shrink-0 text-[#0077B6]" />
                      <span>أيام الدراسة: {path.study_days.join('، ')}</span>
                    </div>
                  )}
                  {path.study_time && (
                    <div className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                      <Clock className="h-5 w-5 shrink-0 text-[#0077B6]" />
                      <span>وقت الدراسة: {path.study_time}</span>
                    </div>
                  )}
                  {path.schedule_note && (
                    <div className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                      <CircleDot className="h-5 w-5 shrink-0 text-[#0077B6]" />
                      <span>{path.schedule_note}</span>
                    </div>
                  )}
                </div>
              </motion.section>
            )}

            {/* WhatsApp communities for enrolled students */}
            {enrollStatus.enrolled && whatsappCourses.length > 0 && (
              <motion.section variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                <h2 className="mb-4 text-2xl font-black text-[#0C2A4B]">مجتمعات الواتساب للدورات</h2>
                <div className="space-y-3">
                  {whatsappCourses.map((c) => (
                    <div
                      key={c.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <span className="text-sm font-black text-[#0C2A4B]">{c.title}</span>
                      <button
                        type="button"
                        onClick={() => window.open(c.whatsapp_community_url!, '_blank', 'noopener,noreferrer')}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2 text-xs font-black text-white"
                      >
                        <MessageCircle className="h-4 w-4" aria-hidden />
                        الانضمام
                      </button>
                    </div>
                  ))}
                </div>
              </motion.section>
            )}

            {/* Learning Journey Timeline */}
            {(path.courses ?? []).length > 0 && (
              <motion.section variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                <h2 className="mb-6 text-2xl font-black text-[#0C2A4B]">رحلة التعلم</h2>
                <div className="space-y-4">
                  {(path.courses ?? []).map((course, i) => (
                    <div
                      key={course.id}
                      className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      {/* Step indicator */}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0077B6] text-sm font-black text-white shadow-md shadow-[#0077B6]/30">
                        {i + 1}
                      </div>
                      {/* Course info */}
                      <div className="flex-1 text-right">
                        <div className="mb-1 flex flex-wrap items-center justify-start gap-2">
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            {course.duration && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" /> {course.duration}
                              </span>
                            )}
                            {course.level && (
                              <span className="flex items-center gap-1">
                                <CircleDot className="h-3 w-3" /> {course.level}
                              </span>
                            )}
                          </div>
                          <h3 className="font-black text-[#0C2A4B]">{course.title}</h3>
                        </div>
                        {course.short_description && (
                          <p className="line-clamp-2 text-sm text-slate-500">{course.short_description}</p>
                        )}
                      </div>
                      {/* Thumbnail */}
                      {course.image_url && (
                        <img
                          src={course.image_url}
                          alt={course.title}
                          className="hidden h-16 w-24 shrink-0 rounded-xl object-cover sm:block"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </motion.section>
            )}

            {/* Learning Outcomes */}
            {path.learning_outcomes.length > 0 && (
              <motion.section variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                <h2 className="mb-5 text-2xl font-black text-[#0C2A4B]">ماذا ستتعلم</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {path.learning_outcomes.map((item, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-xl bg-[#0077B6]/5 p-4">
                      <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#0077B6]" />
                      <span className="text-sm font-medium text-slate-700">{item}</span>
                    </div>
                  ))}
                </div>
              </motion.section>
            )}

            {/* Requirements */}
            {path.requirements.length > 0 && (
              <motion.section variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                <h2 className="mb-5 text-2xl font-black text-[#0C2A4B]">المتطلبات</h2>
                <ul className="space-y-2">
                  {path.requirements.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#F28C00]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.section>
            )}

            {/* Certificate */}
            {path.certificate_name && (
              <motion.section
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-l from-amber-50 to-white p-8"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500 shadow-lg shadow-amber-500/30">
                    <Award className="h-7 w-7 text-white" />
                  </div>
                  <div className="text-right">
                    <h2 className="text-xl font-black text-[#0C2A4B]">شهادة الإتمام</h2>
                    <p className="text-sm font-semibold text-amber-700">{path.certificate_name}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-600">
                  بعد إتمام جميع الدورات في هذا المسار بنجاح، ستحصل على شهادة معتمدة تثبت كفاءتك وتفتح لك أبواباً جديدة في مسيرتك المهنية.
                </p>
              </motion.section>
            )}

            {/* Instructor */}
            {path.instructor && (
              <motion.section variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                <h2 className="mb-5 text-2xl font-black text-[#0C2A4B]">المدرب</h2>
                <div className="flex items-center gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  {path.instructor.avatar_url ? (
                    <img
                      src={path.instructor.avatar_url}
                      alt={path.instructor.name}
                      className="h-16 w-16 rounded-2xl object-cover shadow"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0077B6]/10 text-xl font-black text-[#0077B6]">
                      {path.instructor.name.charAt(0)}
                    </div>
                  )}
                  <div className="text-right">
                    <h3 className="text-lg font-black text-[#0C2A4B]">{path.instructor.name}</h3>
                    {path.instructor.title && (
                      <p className="text-sm text-slate-500">{path.instructor.title}</p>
                    )}
                  </div>
                </div>
              </motion.section>
            )}
          </div>

          {/* Sticky sidebar CTA */}
          <aside className="hidden lg:block">
            <div className="sticky top-28 rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
              <div className="mb-4 text-right">
                {path.discount_price != null && path.price != null && path.price > path.discount_price && (
                  <p className="text-sm text-slate-400 line-through">
                    {formatEuroInteger(path.price, 'ar')}
                  </p>
                )}
                <p className="text-4xl font-black text-[#0C2A4B]">
                  {effectivePrice === 0 || effectivePrice == null
                    ? 'مجاناً'
                    : formatEuroInteger(effectivePrice, 'ar')}
                </p>
              </div>
              <Link
                to="/contact"
                className="mb-3 block w-full rounded-2xl bg-[#0077B6] py-4 text-center font-black text-white shadow-lg shadow-[#0077B6]/25 transition hover:bg-[#1d7aab]"
              >
                سجّل في المسار الآن
              </Link>
              <Link
                to="/contact"
                className="block w-full rounded-2xl border border-slate-200 py-3.5 text-center text-sm font-semibold text-slate-600 transition hover:border-[#0077B6] hover:text-[#0077B6]"
              >
                استفسر عن المسار
              </Link>

              <ul className="mt-6 space-y-3 text-right text-sm text-slate-600">
                {durationLabel && (
                  <li className="flex items-center justify-between">
                    <span className="font-semibold">{durationLabel}</span>
                    <Clock className="h-4 w-4 text-[#0077B6]" />
                  </li>
                )}
                <li className="flex items-center justify-between">
                  <span className="font-semibold">{path.courses_count} دورة</span>
                  <BookOpen className="h-4 w-4 text-[#F28C00]" />
                </li>
                {path.certificate_name && (
                  <li className="flex items-center justify-between">
                    <span className="font-semibold text-amber-600">شهادة مرفقة</span>
                    <Award className="h-4 w-4 text-amber-500" />
                  </li>
                )}
              </ul>
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile CTA bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white p-4 shadow-lg lg:hidden">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xl font-black text-[#0C2A4B]">
            {effectivePrice === 0 || effectivePrice == null
              ? 'مجاناً'
              : formatEuroInteger(effectivePrice ?? 0, 'ar')}
          </p>
          <Link
            to="/contact"
            className="flex-1 rounded-2xl bg-[#0077B6] py-3 text-center font-black text-white transition hover:bg-[#1d7aab]"
          >
            سجّل الآن
          </Link>
        </div>
      </div>

      {/* Back link */}
      <div className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:pb-16 lg:px-8">
        <Link
          to="/learning-paths"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#0077B6] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          العودة إلى المسارات
        </Link>
      </div>
    </main>
  )
}
