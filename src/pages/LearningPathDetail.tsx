import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate, useLocation } from 'react-router'
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
  CircleDot,
  CalendarDays,
  MessageCircle,
} from 'lucide-react'
import toast from '@/lib/toast'
import { hasEnrollIntentHost, setEnrollIntent } from '@/lib/enrollIntent'
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

const inViewProps = {
  variants: fadeUp,
  initial: 'hidden' as const,
  whileInView: 'visible' as const,
  viewport: { once: true, amount: 0.15 },
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
      // In-context QuickJoin (3 fields, auto-enroll) — /login only if the host is absent.
      if (path && hasEnrollIntentHost()) {
        setEnrollIntent({
          kind: 'path',
          slug,
          title: path.title,
          isFree: (path.discount_price ?? path.price ?? 0) === 0,
          id: path.id,
          price: path.discount_price ?? path.price ?? undefined,
        })
        return
      }
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
      <div className="flex min-h-screen items-center justify-center bg-paper pt-20">
        <Loader2 className="h-10 w-10 animate-spin text-customBlue" />
      </div>
    )
  }

  if (!path) return null

  const effectivePrice = path.discount_price ?? path.price
  const durationLabel = DurationLabel(path)
  const whatsappCourses = (path.courses ?? []).filter((c) => c.whatsapp_community_url)
  const enrolledHref = `/dashboard/student/learning-paths/${path.id}`
  const enrollDisabled = enrolling || !path.enrollment_open
  const priceText =
    effectivePrice === 0 || effectivePrice == null ? 'مجاناً' : formatEuroInteger(effectivePrice, 'ar')
  const struckOriginal =
    path.discount_price != null && path.price != null && path.price > path.discount_price ?
      formatEuroInteger(path.price, 'ar')
    : null

  /**
   * The one real enroll action — hero, sidebar and mobile bar all render THIS
   * (same handleEnroll, same disabled/enrolled states). No CTA points at /contact.
   */
  const renderEnrollAction = (
    idleLabel: string,
    closedLabel: string,
    className = '',
    guestLabel = 'سجّل دخولك للتسجيل في المسار',
  ) =>
    enrollStatus.enrolled ?
      <Link
        to={enrolledHref}
        className={`inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-center font-black text-white transition-colors duration-200 hover:bg-emerald-700 ${className}`}
      >
        <CheckCircle className="h-4 w-4" aria-hidden />
        ادخل إلى مساري
      </Link>
    : <button
        type="button"
        onClick={() => void handleEnroll()}
        disabled={enrollDisabled}
        className={`inline-flex items-center justify-center gap-2 rounded-xl bg-customOrange px-6 py-3.5 text-center font-black text-white transition duration-200 hover:brightness-[1.03] disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      >
        {enrolling ?
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        : !path.enrollment_open ?
          closedLabel
        : !user ?
          guestLabel
        : idleLabel}
      </button>

  return (
    <main className="bg-paper pt-20" dir="rtl">
      <PublicSeo
        title={path.title}
        description={path.short_description || path.full_description?.slice(0, 160) || `مسار تعليمي ${path.title}`}
        path={`/learning-paths/${path.slug}`}
        image={path.featured_image}
        type="article"
      />
      {/* ── HERO — dawn field, editorial two-column (no pricing card) ─────────── */}
      <section className="emc-dawn relative overflow-hidden py-20 text-white">
        {path.featured_image && (
          <img
            src={path.featured_image}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover opacity-15 mix-blend-luminosity"
          />
        )}
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_380px]">
            {/* Title column */}
            <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={{ duration: 0.5 }}>
              {/* Breadcrumb */}
              <nav className="mb-6 flex items-center gap-2 text-sm text-ice/80">
                <Link to="/" className="transition-colors hover:text-white">الرئيسية</Link>
                <ChevronLeft className="h-4 w-4" aria-hidden />
                <Link to="/learning-paths" className="transition-colors hover:text-white">المسارات التعليمية</Link>
                <ChevronLeft className="h-4 w-4" aria-hidden />
                <span className="text-white">{path.title}</span>
              </nav>

              {/* Kicker — plain text meta, no chips */}
              <p className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-bold tracking-wide text-brand-200">
                <span>مسار تعليمي</span>
                {path.is_featured && (
                  <>
                    <span aria-hidden>·</span>
                    <span className="inline-flex items-center gap-1 text-accent-300">
                      <Star className="h-3 w-3 fill-current" aria-hidden />
                      مسار مميز
                    </span>
                  </>
                )}
                {path.level && (
                  <>
                    <span aria-hidden>·</span>
                    <span>مستوى {path.level}</span>
                  </>
                )}
                {path.language && (
                  <>
                    <span aria-hidden>·</span>
                    <span>{path.language}</span>
                  </>
                )}
              </p>

              <h1 className="mb-4 font-display text-4xl font-black leading-tight tracking-tight [text-wrap:balance] sm:text-5xl">
                {path.title}
              </h1>

              {path.short_description && (
                <p className="mb-8 max-w-2xl text-lg leading-9 text-ice/90">
                  {path.short_description}
                </p>
              )}

              {/* Quick stats — plain text with icons */}
              <div className="flex flex-wrap gap-6 text-sm">
                {durationLabel && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-sky" aria-hidden />
                    <span>{durationLabel}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-accent-300" aria-hidden />
                  <span>{path.courses_count} دورة</span>
                </div>
                {path.students_count > 0 && (
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-ice" aria-hidden />
                    <span>
                      <span dir="ltr" className="tabular-nums">{new Intl.NumberFormat('en-US').format(path.students_count)}</span>
                      {' '}طالب
                    </span>
                  </div>
                )}
                {path.certificate_name && (
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-accent-300" aria-hidden />
                    <span>شهادة إتمام</span>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Editorial summary column — whitespace + hairlines, not a card */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              transition={{ duration: 0.5, delay: 0.15 }}
              className="text-right"
            >
              {path.featured_image ?
                <img
                  src={path.featured_image}
                  alt={path.title}
                  className="emc-page-clip h-48 w-full object-cover"
                />
              : <div className="emc-page-clip flex h-48 w-full items-center justify-center bg-navy">
                  <GraduationCap className="h-16 w-16 text-ice/40" aria-hidden />
                </div>
              }

              <div className="mt-6">
                {struckOriginal && (
                  <p dir="ltr" className="text-right text-sm font-semibold tabular-nums text-ice/60 line-through">
                    {struckOriginal}
                  </p>
                )}
                <p dir="ltr" className="text-right font-display text-4xl font-black tabular-nums tracking-tight text-white">
                  {priceText}
                </p>
              </div>

              <dl className="mt-5 text-sm">
                {durationLabel && (
                  <div className="flex items-center justify-between border-t border-white/15 py-2.5">
                    <dt className="font-semibold text-ice/80">المدة</dt>
                    <dd className="font-bold text-white">{durationLabel}</dd>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-white/15 py-2.5">
                  <dt className="font-semibold text-ice/80">المحتوى</dt>
                  <dd className="font-bold text-white">{path.courses_count} دورة</dd>
                </div>
                {path.certificate_name && (
                  <div className="flex items-center justify-between border-t border-white/15 py-2.5">
                    <dt className="font-semibold text-ice/80">شهادة إتمام</dt>
                    <dd className="font-bold text-accent-300">✓</dd>
                  </div>
                )}
              </dl>

              <div className="mt-5">
                {renderEnrollAction('سجّل في المسار', 'التسجيل مغلق حالياً', 'w-full')}
                {enrollMsg && (
                  <p className="mt-2 text-center text-xs text-accent-300">{enrollMsg}</p>
                )}
                <p className="mt-3 text-center text-xs text-ice/70">
                  <Link to="/contact" className="text-ice underline-offset-4 transition-colors hover:text-white hover:underline">
                    تواصل معنا للاستفسار
                  </Link>
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── BODY ─────────────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1fr_360px]">
          <div className="space-y-14">
            {/* Description */}
            {path.full_description && (
              <motion.section {...inViewProps}>
                <h2 className="emc-title-arc mb-6 font-display text-2xl font-black tracking-tight text-deepBlue">عن هذا المسار</h2>
                <div
                  className="prose prose-slate max-w-none text-right leading-9 text-foreground/80"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(path.full_description) }}
                />
              </motion.section>
            )}

            {/* Schedule info — plain rows, no box */}
            {(path.study_days_per_week != null ||
              (path.study_days && path.study_days.length > 0) ||
              path.study_time ||
              path.schedule_note) && (
              <motion.section {...inViewProps}>
                <h2 className="emc-title-arc mb-6 font-display text-2xl font-black tracking-tight text-deepBlue">جدول الدراسة</h2>
                <div className="space-y-3.5">
                  {path.study_days_per_week != null && (
                    <div className="flex items-center gap-3 text-sm font-semibold text-foreground">
                      <CalendarDays className="h-5 w-5 shrink-0 text-customBlue" aria-hidden />
                      <span>عدد أيام الدراسة في الأسبوع: {path.study_days_per_week}</span>
                    </div>
                  )}
                  {path.study_days && path.study_days.length > 0 && (
                    <div className="flex items-center gap-3 text-sm font-semibold text-foreground">
                      <CalendarDays className="h-5 w-5 shrink-0 text-customBlue" aria-hidden />
                      <span>أيام الدراسة: {path.study_days.join('، ')}</span>
                    </div>
                  )}
                  {path.study_time && (
                    <div className="flex items-center gap-3 text-sm font-semibold text-foreground">
                      <Clock className="h-5 w-5 shrink-0 text-customBlue" aria-hidden />
                      <span>وقت الدراسة: {path.study_time}</span>
                    </div>
                  )}
                  {path.schedule_note && (
                    <div className="flex items-center gap-3 text-sm font-semibold text-foreground">
                      <CircleDot className="h-5 w-5 shrink-0 text-customBlue" aria-hidden />
                      <span>{path.schedule_note}</span>
                    </div>
                  )}
                </div>
              </motion.section>
            )}

            {/* WhatsApp communities for enrolled students — editorial rows */}
            {enrollStatus.enrolled && whatsappCourses.length > 0 && (
              <motion.section {...inViewProps}>
                <h2 className="emc-title-arc mb-6 font-display text-2xl font-black tracking-tight text-deepBlue">مجتمعات الواتساب للدورات</h2>
                <div>
                  {whatsappCourses.map((c) => (
                    <div
                      key={c.id}
                      className="emc-row flex flex-wrap items-center justify-between gap-3 px-2 py-3.5"
                    >
                      <span className="text-sm font-black text-deepBlue">{c.title}</span>
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

            {/* Learning Journey — the loved numbered stations, drawn as editorial rows */}
            {(path.courses ?? []).length > 0 && (
              <motion.section {...inViewProps}>
                <h2 className="emc-title-arc mb-6 font-display text-2xl font-black tracking-tight text-deepBlue">رحلة التعلم</h2>
                <ol>
                  {(path.courses ?? []).map((course, i) => (
                    <li key={course.id} className="emc-row flex items-start gap-4 px-2 py-5">
                      {/* Station number */}
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black tabular-nums text-deepBlue ring-2 ring-navy">
                        {i + 1}
                      </span>
                      {/* Course info */}
                      <div className="flex-1 text-right">
                        <div className="mb-1 flex flex-wrap items-center justify-start gap-2">
                          <div className="flex items-center gap-2 text-xs text-muted-400">
                            {course.duration && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" aria-hidden /> {course.duration}
                              </span>
                            )}
                            {course.level && (
                              <span className="flex items-center gap-1">
                                <CircleDot className="h-3 w-3" aria-hidden /> {course.level}
                              </span>
                            )}
                          </div>
                          <h3 className="font-black text-deepBlue">{course.title}</h3>
                        </div>
                        {course.short_description && (
                          <p className="line-clamp-2 text-sm text-muted-500">{course.short_description}</p>
                        )}
                      </div>
                      {/* Thumbnail */}
                      {course.image_url && (
                        <img
                          src={course.image_url}
                          alt={course.title}
                          className="emc-page-clip-sm hidden h-16 w-24 shrink-0 object-cover sm:block"
                        />
                      )}
                    </li>
                  ))}
                </ol>
              </motion.section>
            )}

            {/* Learning Outcomes — plain check list, no tinted tiles */}
            {path.learning_outcomes.length > 0 && (
              <motion.section {...inViewProps}>
                <h2 className="emc-title-arc mb-6 font-display text-2xl font-black tracking-tight text-deepBlue">ماذا ستتعلم</h2>
                <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                  {path.learning_outcomes.map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-customBlue" aria-hidden />
                      <span className="text-sm font-medium leading-7 text-foreground">{item}</span>
                    </div>
                  ))}
                </div>
              </motion.section>
            )}

            {/* Requirements */}
            {path.requirements.length > 0 && (
              <motion.section {...inViewProps}>
                <h2 className="emc-title-arc mb-6 font-display text-2xl font-black tracking-tight text-deepBlue">المتطلبات</h2>
                <ul className="space-y-2">
                  {path.requirements.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-foreground/80">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-customOrange" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.section>
            )}

            {/* Certificate — editorial statement between hairlines, no gradient card */}
            {path.certificate_name && (
              <motion.section {...inViewProps}>
                <div className="emc-hairline" aria-hidden />
                <div className="py-8">
                  <div className="flex items-center gap-4">
                    <Award className="h-10 w-10 shrink-0 text-accent-700" aria-hidden />
                    <div className="text-right">
                      <h2 className="font-display text-xl font-black tracking-tight text-deepBlue">شهادة الإتمام</h2>
                      <p className="text-sm font-semibold text-accent-700">{path.certificate_name}</p>
                    </div>
                  </div>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-foreground/80">
                    بعد إتمام جميع الدورات في هذا المسار بنجاح، ستحصل على شهادة معتمدة تثبت كفاءتك وتفتح لك أبواباً جديدة في مسيرتك المهنية.
                  </p>
                </div>
                <div className="emc-hairline" aria-hidden />
              </motion.section>
            )}

            {/* Instructor — plain row */}
            {path.instructor && (
              <motion.section {...inViewProps}>
                <h2 className="emc-title-arc mb-6 font-display text-2xl font-black tracking-tight text-deepBlue">المدرب</h2>
                <div className="flex items-center gap-5">
                  {path.instructor.avatar_url ?
                    <img
                      src={path.instructor.avatar_url}
                      alt={path.instructor.name}
                      className="emc-page-clip-sm h-16 w-16 object-cover"
                    />
                  : <div className="emc-page-clip-sm flex h-16 w-16 items-center justify-center bg-brand-50 text-xl font-black text-customBlue">
                      {path.instructor.name.charAt(0)}
                    </div>
                  }
                  <div className="text-right">
                    <h3 className="text-lg font-black text-deepBlue">{path.instructor.name}</h3>
                    {path.instructor.title && (
                      <p className="text-sm text-muted-500">{path.instructor.title}</p>
                    )}
                  </div>
                </div>
              </motion.section>
            )}
          </div>

          {/* Sticky sidebar — editorial summary, REAL enroll action (was a dead /contact link) */}
          <aside className="hidden lg:block">
            <div className="sticky top-28 text-right">
              <div className="emc-hairline" aria-hidden />
              <div className="pt-6">
                {struckOriginal && (
                  <p dir="ltr" className="text-right text-sm font-semibold tabular-nums text-muted-400 line-through">
                    {struckOriginal}
                  </p>
                )}
                <p dir="ltr" className="emc-stat-num text-right text-5xl">
                  {priceText}
                </p>

                <div className="mt-6">
                  {renderEnrollAction('سجّل في المسار الآن', 'التسجيل مغلق حالياً', 'w-full')}
                  {enrollMsg && (
                    <p className="mt-2 text-center text-xs text-accent-700">{enrollMsg}</p>
                  )}
                </div>

                <p className="mt-5 text-center">
                  <Link to="/contact" className="emc-cta-line text-sm">
                    استفسر عن المسار
                  </Link>
                </p>

                <dl className="mt-7 text-sm">
                  {durationLabel && (
                    <div className="flex items-center justify-between border-t border-line py-3">
                      <dt className="flex items-center gap-2 text-muted-500">
                        <Clock className="h-4 w-4 text-customBlue" aria-hidden />
                        المدة
                      </dt>
                      <dd className="font-bold text-deepBlue">{durationLabel}</dd>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-line py-3">
                    <dt className="flex items-center gap-2 text-muted-500">
                      <BookOpen className="h-4 w-4 text-customBlue" aria-hidden />
                      المحتوى
                    </dt>
                    <dd className="font-bold text-deepBlue">{path.courses_count} دورة</dd>
                  </div>
                  {path.certificate_name && (
                    <div className="flex items-center justify-between border-t border-line py-3">
                      <dt className="flex items-center gap-2 text-muted-500">
                        <Award className="h-4 w-4 text-accent-700" aria-hidden />
                        الشهادة
                      </dt>
                      <dd className="font-bold text-accent-700">شهادة مرفقة</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile CTA bar — the only persistent CTA on phones: it MUST enroll */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-line bg-white p-4 shadow-lg lg:hidden">
        <div className="flex items-center justify-between gap-4">
          <p dir="ltr" className="emc-stat-num text-2xl">
            {priceText}
          </p>
          {renderEnrollAction('سجّل الآن', 'التسجيل مغلق', 'flex-1', 'سجّل الآن')}
        </div>
      </div>

      {/* Back link */}
      <div className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8 lg:pb-16">
        <Link
          to="/learning-paths"
          className="emc-cta-line text-sm"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          العودة إلى المسارات
        </Link>
      </div>
    </main>
  )
}
