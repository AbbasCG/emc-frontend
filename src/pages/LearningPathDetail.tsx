import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { useParams, Link, useNavigate, useLocation } from 'react-router'
import { motion } from 'framer-motion'
import DOMPurify from 'dompurify'
import {
  GraduationCap,
  Clock,
  BookOpen,
  Award,
  Users,
  CheckCircle,
  Loader2,
  Star,
  CircleDot,
  CalendarDays,
  MessageCircle,
} from 'lucide-react'
import toast from '@/lib/toast'
import { hasEnrollIntentHost, setEnrollIntent } from '@/lib/enrollIntent'
import { resolvePriceZone, trackFunnelEvent } from '@/lib/funnelEvents'
import {
  buildPublicLoginHref,
  isStudentUser,
  PUBLIC_ENROLL_STUDENT_ONLY_MSG,
} from '@/utils/publicEnrollAuth'
import {
  fetchPublicLearningPath,
  fetchEnrollmentStatus,
  enrollInLearningPath,
  checkoutLearningPath,
  type LearningPath,
  type EnrollmentStatus,
} from '../api/learningPathsApi'
import { formatEuroInteger } from '../utils/currency'
import { useAuth } from '../contexts/AuthContext'
import PublicSeo from '@/components/public/PublicSeo'
import ArrowLeftIcon from '@/components/ui/ArrowLeftIcon'
import TrackMonthTimeline from '@/components/tracks/TrackMonthTimeline'
import TrackOutcomesGrid from '@/components/tracks/TrackOutcomesGrid'
import ValueBreakdown from '@/components/tracks/ValueBreakdown'
import { formatPathDuration } from '@/pages/LearningPaths/learningPathDisplay'
import {
  formatNumberEn,
  formatSessionDurationArabic,
  toLatinDigits,
} from '@/utils/publicDetailFormat'
import {
  LAUNCH_PROMISE,
  OPEN_ENROLLMENT_LABEL,
  REFUND_LINE,
  UPGRADE_COUPON_NOTE,
  seatsLine,
} from '@/data/webSpec'

/**
 * EMC-WEB-001 §6.2 — the track detail template.
 *
 * Section order is the spec's order, and nothing here is decorative:
 *   1  رأس الصفحة    — name · transformation sentence · months + weekly load · «تسجيل مفتوح»
 *   2  صندوق الشراء  — price · ValueBreakdown · seats · ONE primary action · promise · refund
 *   3  لمن هذا المسار — personas + a frank «ليس لك إذا…»
 *   4  رحلتك شهراً بشهر — the month-by-month rail (the centrepiece)
 *   5  ماذا يحمل خريج المسار — outcomes + certificate
 *   6  the professional-outcome statement, verbatim between hairlines
 *   7  certificate · FAQ · closing CTA
 *
 * §1.3 governs the whole page: a paid product shows NO dates — «تسجيل مفتوح»
 * instead — and the only urgency is a real remaining-seat count. Every block
 * below is fed by real API fields; when a field is absent the block is absent
 * too. Nothing is invented and «قريباً» is never written.
 */

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

const SECTION_TITLE =
  'emc-title-arc mb-6 font-display text-2xl font-black tracking-tight text-deepBlue'

/**
 * Free-text field read defensively off the payload — the public path type does
 * not declare the editorial fields §6.2 asks for, and a missing one must yield
 * `null` (render nothing) rather than a placeholder.
 *
 * `latinize` is on by default (§1 — digits are always Latin) and turned OFF for
 * copy that must reach the page verbatim.
 */
function readText(path: LearningPath, keys: readonly string[], latinize = true): string | null {
  const raw = path as unknown as Record<string, unknown>
  for (const key of keys) {
    const value = raw[key]
    if (typeof value === 'string' && value.trim()) {
      const text = value.trim()
      return latinize ? toLatinDigits(text) : text
    }
  }
  return null
}

/** List field read defensively — an array of strings, or one string on separate lines. */
function readList(path: LearningPath, keys: readonly string[]): string[] {
  const raw = path as unknown as Record<string, unknown>
  for (const key of keys) {
    const value = raw[key]
    if (Array.isArray(value)) {
      const items = value
        .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
        .filter(Boolean)
        .map(toLatinDigits)
      if (items.length) return items
    }
    if (typeof value === 'string' && value.trim()) {
      const items = value
        .split(/\r?\n|؛|\|/)
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map(toLatinDigits)
      if (items.length) return items
    }
  }
  return []
}

type FaqItem = { question: string; answer: string }

/**
 * §6.2 — the FAQ comes wholly from path data, which is also why the freeze-policy
 * question appears only when the API actually ships it: there is no hardcoded
 * question list to fall back to.
 */
function readFaq(path: LearningPath): FaqItem[] {
  const raw = path as unknown as Record<string, unknown>
  const source = raw.faq ?? raw.faqs ?? raw.questions
  if (!Array.isArray(source)) return []
  const items: FaqItem[] = []
  for (const entry of source) {
    if (!entry || typeof entry !== 'object') continue
    const row = entry as Record<string, unknown>
    const question = [row.question, row.q, row.title].find(
      (value) => typeof value === 'string' && value.trim(),
    )
    const answer = [row.answer, row.a, row.body, row.content].find(
      (value) => typeof value === 'string' && value.trim(),
    )
    if (typeof question === 'string' && typeof answer === 'string') {
      items.push({ question: toLatinDigits(question.trim()), answer: toLatinDigits(answer.trim()) })
    }
  }
  return items
}

/**
 * §6.2 — the head states the duration in MONTHS. Only clean whole/half values
 * become a phrase; any other fraction falls back to the shared duration label
 * rather than rounding a real number into a wrong one.
 */
function monthsPhrase(value: number): string | null {
  if (!Number.isFinite(value) || value <= 0) return null
  const whole = Math.floor(value)
  const fraction = value - whole
  const hasHalf = Math.abs(fraction - 0.5) < 0.01
  if (!hasHalf && fraction > 0.01) return null
  if (hasHalf) {
    if (whole === 0) return 'نصف شهر'
    if (whole === 1) return 'شهر ونصف'
    if (whole <= 9) return `${toLatinDigits(whole)} أشهر ونصف`
    return `${toLatinDigits(whole)} شهراً ونصف`
  }
  if (whole === 1) return 'شهر واحد'
  if (whole === 2) return 'شهران'
  if (whole <= 10) return `${toLatinDigits(whole)} أشهر`
  return `${toLatinDigits(whole)} شهراً`
}

/** Months when the API counts in months, otherwise the real label in its own unit. */
function durationHeadline(path: LearningPath): string | null {
  const unit = (path.duration_unit ?? '').toLowerCase()
  const value = Number(path.duration)
  if (unit === 'months' && Number.isFinite(value)) {
    const phrase = monthsPhrase(value)
    if (phrase) return phrase
  }
  return formatPathDuration(path)
}

/**
 * §6.2 — the weekly load that sits beside the months. A number becomes a proper
 * Arabic hour phrase; a string (typically a range like «6–8») passes through and
 * only gains the unit when it does not already carry one. No field, no line.
 */
function weeklyLoadLabel(path: LearningPath): string | null {
  const raw = path as unknown as Record<string, unknown>
  const value =
    raw.weekly_hours ??
    raw.hours_per_week ??
    raw.weekly_load ??
    raw.study_hours_per_week ??
    raw.weekly_commitment
  if (value == null || value === '') return null
  if (typeof value === 'number') {
    const label = formatSessionDurationArabic(value)
    return label ? `${label} أسبوعياً` : null
  }
  if (typeof value !== 'string') return null
  const text = toLatinDigits(value.trim())
  if (!text) return null
  return /ساع/.test(text) ? text : `${text} ساعات أسبوعياً`
}

/**
 * §1.3 — remaining seats for the next batch, taken only from a real numeric field
 * on the API payload. Anything else yields null and the urgency line disappears.
 */
function remainingSeats(path: LearningPath): number | null {
  const raw = path as unknown as Record<string, unknown>
  const value = raw.seats_remaining ?? raw.remaining_seats ?? raw.available_seats
  return typeof value === 'number' ? value : null
}

/**
 * §6.2 — an installment line ONLY when the API exposes one. A written note is
 * rendered as given; a bare installment count becomes the plain statement of
 * that count. Absent otherwise — instalments are never implied.
 */
function installmentLine(path: LearningPath): string | null {
  const raw = path as unknown as Record<string, unknown>
  const note = ['installment_note', 'installment_plan', 'payment_plan', 'installments_note']
    .map((key) => raw[key])
    .find((value) => typeof value === 'string' && value.trim())
  if (typeof note === 'string') return toLatinDigits(note.trim())
  const rawCount = raw.installments ?? raw.installments_count
  const count = typeof rawCount === 'number' ? rawCount : Number(String(rawCount ?? '').trim())
  if (Number.isFinite(count) && count >= 2) {
    return `الدفع على ${toLatinDigits(Math.round(count))} دفعات`
  }
  return null
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

  // §17 — product_view for the track. `setPath` writes once per slug, so this
  // object identity is the natural once-per-product guard: enrollment-status
  // refreshes and re-renders can never repeat it. Side-effect only, no state
  // writes (effects law).
  useEffect(() => {
    if (!path) return
    trackFunnelEvent('product_view', {
      product_id: path.slug,
      type: 'track',
      price_zone: resolvePriceZone(),
    })
  }, [path])

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
    trackFunnelEvent('path_enroll_click', { slug })
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
    try {
      const isPaid = Number(path?.discount_price ?? path?.price ?? 0) > 0
      if (isPaid) {
        const checkout = await checkoutLearningPath(slug)
        if (checkout.checkout_url) {
          window.location.assign(checkout.checkout_url)
          return
        }
        setEnrollMsg(checkout.message ?? 'تعذر فتح بوابة الدفع. حاول مجدداً.')
        return
      }

      const result = await enrollInLearningPath(slug)
      if (result.enrolled) {
        setEnrollMsg('أنت مسجل بالفعل في هذا المسار.')
        setEnrollStatus({ enrolled: true, enrollment: null })
      } else if (result.success) {
        await refreshEnrollStatus()
      } else {
        setEnrollMsg(result.message ?? 'فشل التسجيل. حاول مجدداً.')
      }
    } catch (error) {
      const message = axios.isAxiosError(error) && error.response?.data?.message
      setEnrollMsg(typeof message === 'string' ? message : 'تعذر إكمال التسجيل. حاول مجدداً.')
    } finally {
      setEnrolling(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper pt-20">
        <Loader2 className="h-10 w-10 animate-spin text-customBlue" />
      </div>
    )
  }

  if (!path) return null

  // ── Derived display values ──────────────────────────────────────────────────
  const effectivePrice = path.discount_price ?? path.price
  const durationLabel = durationHeadline(path)
  const weeklyLoad = weeklyLoadLabel(path)
  // §6.2 — «المدة بالأشهر + الحمل الأسبوعي» in bold display type. When the weekly
  // load is absent the months stand alone; the closing clause is an API field, so
  // no positioning claim is ever written on the platform's behalf.
  const commitmentNote = readText(path, ['designed_for', 'audience_note', 'commitment_note'])
  const commitmentLine =
    durationLabel || weeklyLoad ?
      [[durationLabel, weeklyLoad].filter(Boolean).join(' · '), commitmentNote]
        .filter(Boolean)
.join(' ')
    : null

  const whatsappCourses = (path.courses ?? []).filter((c) => c.whatsapp_community_url)
  const enrolledHref = `/dashboard/student/learning-paths/${path.id}`
  const enrollDisabled = enrolling || !path.enrollment_open
  // REGIONAL PRICING SEAM — the public path API exposes one price today, so this
  // is the single place the displayed number is decided (mirrors Checkout).
  const priceText =
    effectivePrice === 0 || effectivePrice == null ? 'مجاناً' : formatEuroInteger(effectivePrice, 'ar')
  // §11 — the price never stands bare: the struck reference value is one of the
  // sanctioned contexts (never a «خصم %» headline).
  const struckOriginal =
    path.discount_price != null && path.price != null && path.price > path.discount_price ?
      formatEuroInteger(path.price, 'ar')
    : null
  // §1.3 — «تسجيل مفتوح» replaces any date, and seats are the only urgency.
  const seatsUrgency = path.enrollment_open ? seatsLine(remainingSeats(path)) : null
  const installment = installmentLine(path)

  const personas = readList(path, ['target_audience', 'audience', 'who_is_this_for', 'personas'])
  const notForYou = readList(path, ['not_for', 'not_suitable_for', 'not_for_you', 'who_is_not_for'])
  // §6.2 (6) — rendered VERBATIM: no latinisation, no rewording, no truncation.
  const professionalOutcome = readText(
    path,
    ['professional_outcome', 'career_outcome', 'outcome_statement', 'professional_statement'],
    false,
  )
  const certificateNote = readText(path, ['certificate_note', 'certificate_description'])
  const faq = readFaq(path)

  /**
   * The one real enroll action — head, sidebar, closing block and mobile bar all
   * render THIS (same handleEnroll, same disabled/enrolled states). Guests see the
   * action label, not a login demand: §1 forbids a mandatory account before payment,
   * and the handler opens in-context QuickJoin.
   */
  const renderEnrollAction = (
    idleLabel: string,
    closedLabel: string,
    className = '',
    guestLabel = idleLabel,
  ) =>
    enrollStatus.enrolled ?
      <Link
        to={enrolledHref}
        className={`inline-flex items-center justify-center gap-2 rounded-xl bg-success px-6 py-3.5 text-center font-black text-white transition duration-200 hover:brightness-[1.06] ${className}`}
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

      {/* ══ 1 · رأس الصفحة  +  2 · صندوق الشراء ═══════════════════════════════ */}
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
          <div className="grid items-start gap-12 lg:grid-cols-[1fr_380px]">
            {/* ── 1 · رأس الصفحة ── */}
            <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={{ duration: 0.5 }}>
              <nav className="mb-6 flex items-center gap-2 text-sm text-ice/80">
                <Link to="/" className="transition-colors hover:text-white">الرئيسية</Link>
                <ArrowLeftIcon size={14} className="shrink-0" />
                <Link to="/learning-paths" className="transition-colors hover:text-white">المسارات التعليمية</Link>
                <ArrowLeftIcon size={14} className="shrink-0" />
                <span className="text-white">{path.title}</span>
              </nav>

              {/* Kicker plain text meta, no chips */}
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
                {path.enrollment_open && (
                  <>
                    <span aria-hidden>·</span>
                    <span className="rounded-full border border-white/25 px-2.5 py-0.5 text-ice">
                      {OPEN_ENROLLMENT_LABEL}
                    </span>
                  </>
                )}
              </p>

              <h1 className="mb-4 font-display text-4xl font-black leading-tight tracking-tight [text-wrap:balance] sm:text-5xl">
                {path.title}
              </h1>

              {/* The transformation sentence */}
              {path.short_description && (
                <p className="mb-7 max-w-2xl text-lg leading-9 text-ice/90">
                  {path.short_description}
                </p>
              )}

              {/* المدة بالأشهر + الحمل الأسبوعي the head's load-bearing statement */}
              {commitmentLine && (
                <p className="mb-8 max-w-2xl font-display text-2xl font-black leading-snug tracking-tight text-white sm:text-3xl">
                  {commitmentLine}
                </p>
              )}

              {/* Quick stats plain text with icons */}
              <div className="flex flex-wrap gap-6 text-sm">
                {durationLabel && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-sky" aria-hidden />
                    <span>{durationLabel}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-accent-300" aria-hidden />
                  <span>{toLatinDigits(path.courses_count)} دورة</span>
                </div>
                {path.students_count > 0 && (
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-ice" aria-hidden />
                    <span>
                      <span dir="ltr" className="tabular-nums">{formatNumberEn(path.students_count)}</span>
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

            {/* ── 2 · صندوق الشراء whitespace + hairlines, not a card ── */}
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
                {struckOriginal && (
                  <p className="mt-1 text-xs font-bold text-ice/70">سعر EMC للوصول</p>
                )}
              </div>

              {/* Components-alone vs the track collapsed, and only when every
                  component price is real (the component gates itself). */}
              <ValueBreakdown path={path} tone="dark" className="mt-4" />

              {/* §1.3 seats are the only urgency, and only when the number is real. */}
              {seatsUrgency && (
                <p className="mt-4 text-sm font-bold text-accent-300">{seatsUrgency}</p>
              )}

              <div className="mt-5">
                {renderEnrollAction('احجز مقعدك في المسار', 'التسجيل مغلق حالياً', 'w-full')}
                {enrollMsg && (
                  <p className="mt-2 text-center text-xs text-accent-300">{enrollMsg}</p>
                )}

                {/* §8 the launch promise and the guarantee, verbatim from webSpec. */}
                <div className="mt-5 border-t border-white/15 pt-4">
                  <p className="text-[12px] leading-6 text-ice/80">{LAUNCH_PROMISE}</p>
                  <p className="mt-2 text-[12px] font-bold leading-6 text-ice">{REFUND_LINE}</p>
                  {installment && (
                    <p className="mt-2 text-[12px] leading-6 text-ice/80">{installment}</p>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══ BODY ══════════════════════════════════════════════════════════════ */}
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {/* ── 3 · لمن هذا المسار ── */}
        {(personas.length > 0 || notForYou.length > 0) && (
          <motion.section {...inViewProps} className="mb-16">
            <h2 className={SECTION_TITLE}>لمن هذا المسار</h2>
            {personas.length > 0 && (
              <ul className="grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
                {personas.map((persona, i) => (
                  <li key={i} className="emc-row flex items-start gap-3 px-2 py-4">
                    <ArrowLeftIcon size={14} className="mt-1.5 shrink-0 text-customBlue" />
                    <span className="text-sm leading-7 text-ink-500">{persona}</span>
                  </li>
                ))}
              </ul>
            )}
            {notForYou.length > 0 && (
              <div className="mt-10">
                <div className="emc-hairline" aria-hidden />
                <h3 className="mt-6 font-display text-lg font-black tracking-tight text-deepBlue">
                  ليس لك إذا…
                </h3>
                <ul className="mt-3 space-y-2.5">
                  {notForYou.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm leading-7 text-ink-400">
                      <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-ember" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.section>
        )}

        {/* ── 4 · رحلتك شهراً بشهر the centrepiece, full page width.
            The wrapper is gated on the same condition the component uses, so an
            empty path never leaves a block of dead vertical space behind. ── */}
        {(path.courses ?? []).length > 0 && (
          <motion.div {...inViewProps} className="mb-16">
            <TrackMonthTimeline path={path} />
          </motion.div>
        )}

        <div className="grid gap-12 lg:grid-cols-[1fr_360px]">
          <div className="space-y-14">
            {/* ── 5 · ماذا يحمل خريج المسار ── */}
            {((path.learning_outcomes ?? []).length > 0 || path.certificate_name) && (
              <motion.div {...inViewProps}>
                <TrackOutcomesGrid path={path} />
              </motion.div>
            )}

            {/* ── 6 · the professional-outcome statement verbatim, calm, bounded ── */}
            {professionalOutcome && (
              <motion.section {...inViewProps}>
                <div className="emc-hairline" aria-hidden />
                <p className="py-8 font-display text-lg leading-9 text-deepBlue sm:text-xl">
                  {professionalOutcome}
                </p>
                <div className="emc-hairline" aria-hidden />
              </motion.section>
            )}

            {/* Description */}
            {path.full_description && (
              <motion.section {...inViewProps}>
                <h2 className={SECTION_TITLE}>عن هذا المسار</h2>
                <div
                  className="prose prose-slate max-w-none text-right leading-9 text-ink-500"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(path.full_description) }}
                />
              </motion.section>
            )}

            {/* Requirements */}
            {(path.requirements ?? []).length > 0 && (
              <motion.section {...inViewProps}>
                <h2 className={SECTION_TITLE}>المتطلبات</h2>
                <ul className="space-y-2">
                  {(path.requirements ?? []).map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-ink-500">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-customOrange" aria-hidden />
                      {toLatinDigits(item)}
                    </li>
                  ))}
                </ul>
              </motion.section>
            )}

            {/* Schedule info plain rows, no box (§1.3: study rhythm, never a start date) */}
            {(path.study_days_per_week != null ||
              (path.study_days && path.study_days.length > 0) ||
              path.study_time ||
              path.schedule_note) && (
              <motion.section {...inViewProps}>
                <h2 className={SECTION_TITLE}>جدول الدراسة</h2>
                <div className="space-y-3.5">
                  {path.study_days_per_week != null && (
                    <div className="flex items-center gap-3 text-sm font-semibold text-ink-500">
                      <CalendarDays className="h-5 w-5 shrink-0 text-customBlue" aria-hidden />
                      <span>عدد أيام الدراسة في الأسبوع: {toLatinDigits(path.study_days_per_week)}</span>
                    </div>
                  )}
                  {path.study_days && path.study_days.length > 0 && (
                    <div className="flex items-center gap-3 text-sm font-semibold text-ink-500">
                      <CalendarDays className="h-5 w-5 shrink-0 text-customBlue" aria-hidden />
                      <span>أيام الدراسة: {path.study_days.join('، ')}</span>
                    </div>
                  )}
                  {path.study_time && (
                    <div className="flex items-center gap-3 text-sm font-semibold text-ink-500">
                      <Clock className="h-5 w-5 shrink-0 text-customBlue" aria-hidden />
                      <span>وقت الدراسة: {toLatinDigits(path.study_time)}</span>
                    </div>
                  )}
                  {path.schedule_note && (
                    <div className="flex items-center gap-3 text-sm font-semibold text-ink-500">
                      <CircleDot className="h-5 w-5 shrink-0 text-customBlue" aria-hidden />
                      <span>{toLatinDigits(path.schedule_note)}</span>
                    </div>
                  )}
                </div>
              </motion.section>
            )}

            {/* WhatsApp communities for enrolled students editorial rows */}
            {enrollStatus.enrolled && whatsappCourses.length > 0 && (
              <motion.section {...inViewProps}>
                <h2 className={SECTION_TITLE}>مجتمعات الواتساب للدورات</h2>
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
                        className="inline-flex items-center gap-2 rounded-xl bg-success px-4 py-2 text-xs font-black text-white transition duration-200 hover:brightness-[1.06]"
                      >
                        <MessageCircle className="h-4 w-4" aria-hidden />
                        الانضمام
                      </button>
                    </div>
                  ))}
                </div>
              </motion.section>
            )}

            {/* Instructor plain row */}
            {path.instructor && (
              <motion.section {...inViewProps}>
                <h2 className={SECTION_TITLE}>المدرب</h2>
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
                      <p className="text-sm text-ink-400">{path.instructor.title}</p>
                    )}
                  </div>
                </div>
              </motion.section>
            )}

            {/* ── 7a · شهادة الإتمام editorial statement between hairlines ── */}
            {path.certificate_name && (
              <motion.section {...inViewProps}>
                <div className="emc-hairline" aria-hidden />
                <div className="py-8">
                  <div className="flex items-center gap-4">
                    <Award className="h-10 w-10 shrink-0 text-ember" aria-hidden />
                    <div className="text-right">
                      <h2 className="font-display text-xl font-black tracking-tight text-deepBlue">شهادة الإتمام</h2>
                      <p className="text-sm font-semibold text-ember">{path.certificate_name}</p>
                    </div>
                  </div>
                  {certificateNote && (
                    <p className="mt-4 max-w-2xl text-sm leading-7 text-ink-500">{certificateNote}</p>
                  )}
                </div>
                <div className="emc-hairline" aria-hidden />
              </motion.section>
            )}

            {/* ── 7b · الأسئلة الشائعة path data only ── */}
            {faq.length > 0 && (
              <motion.section {...inViewProps}>
                <h2 className={SECTION_TITLE}>الأسئلة الشائعة</h2>
                <div>
                  {faq.map((item, i) => (
                    <details key={i} className="emc-row px-2 py-4">
                      <summary className="flex cursor-pointer list-none items-start gap-3 text-sm font-black text-deepBlue [&::-webkit-details-marker]:hidden">
                        <ArrowLeftIcon size={14} className="mt-1.5 shrink-0 text-customBlue" />
                        {item.question}
                      </summary>
                      <p className="mt-3 pe-7 text-sm leading-7 text-ink-500">{item.answer}</p>
                    </details>
                  ))}
                </div>
              </motion.section>
            )}
          </div>

          {/* Sticky re-offer the same single decision, never a competing one */}
          <aside className="hidden lg:block">
            <div className="sticky top-28 text-right">
              <div className="emc-hairline" aria-hidden />
              <div className="pt-6">
                {struckOriginal && (
                  <p dir="ltr" className="text-right text-sm font-semibold tabular-nums text-ink-400 line-through">
                    {struckOriginal}
                  </p>
                )}
                <p dir="ltr" className="emc-stat-num text-right text-5xl">
                  {priceText}
                </p>
                {struckOriginal && (
                  <p className="mt-2 text-xs font-bold text-ink-400">سعر EMC للوصول</p>
                )}

                {seatsUrgency && (
                  <p className="mt-3 text-sm font-bold text-ember">{seatsUrgency}</p>
                )}

                <div className="mt-6">
                  {renderEnrollAction('احجز مقعدك في المسار', 'التسجيل مغلق حالياً', 'w-full')}
                  {enrollMsg && (
                    <p className="mt-2 text-center text-xs text-ember">{enrollMsg}</p>
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
                      <dt className="flex items-center gap-2 text-ink-400">
                        <Clock className="h-4 w-4 text-customBlue" aria-hidden />
                        المدة
                      </dt>
                      <dd className="font-bold text-deepBlue">{durationLabel}</dd>
                    </div>
                  )}
                  {weeklyLoad && (
                    <div className="flex items-center justify-between border-t border-line py-3">
                      <dt className="flex items-center gap-2 text-ink-400">
                        <CalendarDays className="h-4 w-4 text-customBlue" aria-hidden />
                        الحمل الأسبوعي
                      </dt>
                      <dd className="font-bold text-deepBlue">{weeklyLoad}</dd>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-line py-3">
                    <dt className="flex items-center gap-2 text-ink-400">
                      <BookOpen className="h-4 w-4 text-customBlue" aria-hidden />
                      المحتوى
                    </dt>
                    <dd className="font-bold text-deepBlue">{toLatinDigits(path.courses_count)} دورة</dd>
                  </div>
                  {path.certificate_name && (
                    <div className="flex items-center justify-between border-t border-line py-3">
                      <dt className="flex items-center gap-2 text-ink-400">
                        <Award className="h-4 w-4 text-ember" aria-hidden />
                        الشهادة
                      </dt>
                      <dd className="font-bold text-ember">شهادة مرفقة</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* ── 7c · closing CTA the hesitant reader's exit that still converts ── */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="emc-hairline" aria-hidden />
        <div className="flex flex-col gap-6 py-10 text-right lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-display text-xl font-black leading-snug tracking-tight text-deepBlue sm:text-2xl">
              متردد؟ ابدأ بدورة واحدة وقيمتها تُخصم من المسار لاحقاً
            </p>
            <p className="mt-2 text-sm leading-7 text-ink-400">{UPGRADE_COUPON_NOTE}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-6">
            <Link to="/courses" className="emc-cta-line text-sm">
              <ArrowLeftIcon size={16} />
              تصفّح الدورات
            </Link>
            {renderEnrollAction('احجز مقعدك في المسار', 'التسجيل مغلق حالياً')}
          </div>
        </div>
        <div className="emc-hairline" aria-hidden />
      </section>

      {/* Mobile CTA bar the only persistent CTA on phones: it MUST enroll */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-line bg-white p-4 lg:hidden">
        <div className="flex items-center justify-between gap-4">
          <p dir="ltr" className="emc-stat-num text-2xl">
            {priceText}
          </p>
          {renderEnrollAction('احجز مقعدك', 'التسجيل مغلق', 'flex-1')}
        </div>
      </div>

      {/* Back link */}
      <div className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8 lg:pb-16">
        <Link
          to="/learning-paths"
          className="emc-cta-line text-sm"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          العودة إلى المسارات
        </Link>
      </div>
    </main>
  )
}
