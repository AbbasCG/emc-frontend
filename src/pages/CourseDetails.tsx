import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { motion } from 'framer-motion'
import {
  BadgeCheck,
  BookOpen,
  Clock3,
  Languages,
  MapPin,
  Monitor,
  Users,
} from 'lucide-react'
import api from '../api/axios'
import toast from '@/lib/toast'
import StateMessage from '../components/StateMessage'
import type { Course } from '../types'
import { unwrapPublicCoursePayload, safeTrimUnknown, sanitizeCourseForDisplay } from '@/utils/publicCourseNormalize'
import { useAuth } from '@/contexts/AuthContext'
import PublicSeo from '@/components/public/PublicSeo'
import { CourseJsonLd } from '@/components/public/JsonLd'
import PublicMobileEnrollBar from '@/components/public/detail/PublicMobileEnrollBar'
import PublicDetailCtaButton from '@/components/public/detail/PublicDetailCtaButton'
import AppAlert from '@/components/ui/AppAlert'
import { resolveCourseEnrollCta } from '@/utils/publicCourseDetailCta'
import { buildPublicLoginHref, PUBLIC_ENROLL_STUDENT_ONLY_MSG } from '@/utils/publicEnrollAuth'
import { hasEnrollIntentHost, setEnrollIntent } from '@/lib/enrollIntent'
import { resolvePriceZone, trackFunnelEvent } from '@/lib/funnelEvents'
import { resolveItemType } from '@/utils/publicCourseDisplay'
import { findPathsContainingCourse, type PathUpsellMatch } from '@/utils/pathUpsell'
import type { LearningPath } from '@/api/learningPathsApi'
import { deriveCourseDetail } from '@/utils/courseDetailDerived'
import { fetchStudentRegistrations, type StudentCourseAccess } from '@/api/studentApi'
import { fetchCoursesFromApi } from '@/api/coursesApi.public'
import { useFetch } from '@/hooks/useFetch'
import { formatPublicText, formatPublicTime, formatPublicCount } from '@/utils/publicDetailFormat'
import {
  LAUNCH_PROMISE,
  OPEN_ENROLLMENT_LABEL,
  REFUND_LINE,
  UPGRADE_COUPON_NOTE,
  seatsLine,
} from '@/data/webSpec'
import {
  averageRatingFromReviews,
  categoryLabel,
  courseHasCertificate,
  extractCourseGallery,
  extractCourseVideoUrl,
  hasMeaningfulDuration,
  parseCourseReviews,
  resolveCourseSeatMetrics,
} from '@/utils/courseDetailPageData'
import type { MetricWidget } from '@/components/public/course-detail/CourseDetailMetricsDashboard'
import PremiumHero from '@/components/public/course-detail/premium/PremiumHero'
import PremiumSnapshot from '@/components/public/course-detail/premium/PremiumSnapshot'
import PremiumDescription from '@/components/public/course-detail/premium/PremiumDescription'
import PremiumSchedule from '@/components/public/course-detail/premium/PremiumSchedule'
import PremiumJourney from '@/components/public/course-detail/premium/PremiumJourney'
import PremiumLearnGrid from '@/components/public/course-detail/premium/PremiumLearnGrid'
import PremiumCurriculum from '@/components/public/course-detail/premium/PremiumCurriculum'
import PremiumStickyPanel from '@/components/public/course-detail/premium/PremiumStickyPanel'

const CourseDetailRelatedCarousel = lazy(
  () => import('@/components/public/course-detail/CourseDetailRelatedCarousel'),
)

const PAGE_TOP = 'pt-[calc(4rem+1rem)] sm:pt-[calc(4.25rem+1.25rem)]'
const STICKY_TOP = 'lg:top-[calc(4.25rem+0.75rem)]'
const WISHLIST_KEY = 'emc_course_wishlist'
const EMPTY_RELATED: Course[] = []
const SKELETON_SLOTS = Array.from({ length: 5 }, (_, i) => i)

const LEVEL_LABEL_MAP: Record<string, string> = {
  beginner: 'مبتدئ',
  intermediate: 'متوسط',
  advanced: 'متقدم',
}

function levelLabel(raw: unknown): string | null {
  const s = safeTrimUnknown(raw)
  if (!s) return null
  return LEVEL_LABEL_MAP[s.toLowerCase()] ?? s
}

function buildMetrics(
  course: Course,
  derived: ReturnType<typeof deriveCourseDetail>,
): MetricWidget[] {
  const x = course as Record<string, unknown>
  const seats = resolveCourseSeatMetrics(course)
  const items: MetricWidget[] = []
  const push = (
    id: string,
    icon: MetricWidget['icon'],
    label: string,
    value: string,
    accent?: MetricWidget['accent'],
  ) => {
    const normalized = formatPublicText(value)
    if (!normalized.trim()) return
    items.push({ id, icon, label, value: normalized, accent })
  }

  // §1.3 — the snapshot never carries a start/end date for a paid product: the
  // batch opens when the seat is bought, and the promise below the CTA states when
  // it starts. Duration, seats and delivery carry the schedule meaning instead.
  if (hasMeaningfulDuration(derived.displayDuration)) {
    push('duration', Clock3, 'المدة', derived.displayDuration, 'navy')
  }
  const startClock = formatPublicTime(course.start_time ?? x.start_time)
  const endClock = formatPublicTime(course.end_time ?? x.end_time)
  const clockRange =
 startClock && endClock ? `${startClock} ${endClock}`: startClock || endClock || ''
  if (clockRange) push('time', Clock3, 'الوقت', clockRange, 'blue')
  if (seats.capacity != null && seats.capacity > 0) {
    push('capacity', Users, 'إجمالي المقاعد', formatPublicCount(seats.capacity, 'مقعد'), 'green')
  }
  if (seats.enrolled != null && seats.enrolled >= 0) {
    push('enrolled', Users, 'المسجّلون', formatPublicCount(seats.enrolled, 'مسجّل'), 'navy')
  }
  if (seats.remaining != null) {
    push('remaining', Users, 'المقاعد المتبقية', formatPublicCount(seats.remaining, 'مقعد'), 'green')
  }
  if (derived.deliveryAr) push('delivery', Monitor, 'طريقة التقديم', derived.deliveryAr, 'blue')
  const lang = safeTrimUnknown(course.language ?? x.language)
  if (lang) push('language', Languages, 'اللغة', lang, 'navy')
  if (derived.locationLabel) push('location', MapPin, 'المكان', derived.locationLabel, 'navy')
  if (courseHasCertificate(course) && derived.certificateLine) {
    push('certificate', BadgeCheck, 'الشهادة', derived.certificateLine, 'orange')
  }
  if (derived.sessionsLabel) push('sessions', BookOpen, 'الجلسات', derived.sessionsLabel, 'orange')

  return items
}

function readWishlist(): string[] {
  try {
    const raw = localStorage.getItem(WISHLIST_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

export default function CourseDetails() {
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const justEnrolled = searchParams.get('enrolled') === '1'
  const { isAuthenticated, user } = useAuth()

  const [course, setCourse] = useState<Course | null>(null)
  // Seeded exactly as the old mount-time effect left it: a missing slug resolves straight
  // to the not-found state instead of loading.
  const [isLoading, setIsLoading] = useState(Boolean(slug))
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(!slug)
  const [alreadyEnrolled, setAlreadyEnrolled] = useState(false)
  const [courseAccess, setCourseAccess] = useState<StudentCourseAccess | null>(null)
  const [wishlisted, setWishlisted] = useState(false)

  // Re-arm the loading/error state during render when the route slug changes (react.dev
  // "adjusting state when a prop changes"), so the fetch effect below never writes state
  // synchronously.
  const [seenSlug, setSeenSlug] = useState(slug)
  if (seenSlug !== slug) {
    setSeenSlug(slug)
    if (slug) {
      setIsLoading(true)
      setError('')
      setNotFound(false)
    } else {
      setIsLoading(false)
      setNotFound(true)
    }
  }

  useEffect(() => {
    const slugKey = slug
    if (!slugKey) return
    const controller = new AbortController()
    void (async () => {
      try {
        const response = await api.get<Course | { data?: Course }>(
          `/courses/${encodeURIComponent(slugKey)}`,
          { signal: controller.signal, skipErrorToast: true },
        )
        const item =
          unwrapPublicCoursePayload(response.data) ??
          (typeof response.data === 'object' &&
            response.data !== null &&
            'slug' in response.data ?
            (response.data as Course)
          : null)
        if (!item?.slug) {
          setNotFound(true)
          setCourse(null)
          return
        }
        setCourse(sanitizeCourseForDisplay(item))
        setWishlisted(readWishlist().includes(item.slug))
      } catch (err) {
        if (axios.isCancel(err)) return
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          setNotFound(true)
          setCourse(null)
          return
        }
        setError('تعذر تحميل تفاصيل الدورة. يرجى المحاولة مرة أخرى.')
      } finally {
        setIsLoading(false)
      }
    })()
    return () => controller.abort()
  }, [slug])

  // §17 — product_view. Fires once per program: the dependency is the loaded
  // course object, which `setCourse` writes exactly once per slug, so a re-render
  // (wishlist, related carousel, auth hydration) can never repeat it. Side-effect
  // only, no state writes (effects law).
  useEffect(() => {
    if (!course) return
    trackFunnelEvent('product_view', {
      product_id: course.slug,
      type: resolveItemType(course),
      price_zone: resolvePriceZone(),
    })
  }, [course])

  // Errors intentionally ignored (as before): the carousel simply stays empty.
  const { data: relatedCoursesData } = useFetch(() => fetchCoursesFromApi(), [])
  const relatedCourses = relatedCoursesData ?? EMPTY_RELATED

  // G4 — path upsell: which public learning paths include this course. The list
  // fetch is cached module-level in pathUpsell, so repeat course visits don't
  // refetch. Errors resolve [] inside the util → the band simply never renders.
  const { data: upsellMatches, loading: upsellLoading } = useFetch<PathUpsellMatch[]>(
    () => (slug ? findPathsContainingCourse(slug) : Promise.resolve([])),
    [slug],
  )
  // Prefer a path that is actually open for enrollment; fall back to the first match.
  const upsell = upsellMatches?.find((m) => m.path.enrollment_open) ?? upsellMatches?.[0] ?? null
  const upsellPath = upsell?.path ?? null

  // View event only once the band can actually render (course loaded + matches
  // resolved for THIS slug — useFetch keeps stale data while a slug change loads).
  useEffect(() => {
    if (course && upsellPath && !upsellLoading) trackFunnelEvent('upsell_view', { slug: upsellPath.slug })
  }, [course, upsellPath, upsellLoading])

  /** Upsell «سجّل في المسار»: guests get the in-context PATH intent (mirrors
   *  LearningPathDetail.handleEnroll); signed-in users go to the path detail,
   *  which owns the real enroll gating. */
  function handleUpsellEnroll(path: LearningPath) {
    trackFunnelEvent('upsell_click', { target: 'path', slug: path.slug })
    if (!user) {
      if (hasEnrollIntentHost()) {
        setEnrollIntent({
          kind: 'path',
          slug: path.slug,
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
    navigate(`/learning-paths/${path.slug}`)
  }

  useEffect(() => {
    if (!isAuthenticated || !course || user?.role !== 'student') return
    let cancelled = false
    void (async () => {
      try {
        const rows = await fetchStudentRegistrations()
        if (cancelled) return
        const matched = rows.find(
          (r) => r.course_id === course.id || (course.slug && r.slug === course.slug),
        )
        setAlreadyEnrolled(Boolean(matched))
        // Backend eligibility (CourseAccessEligibilityService) — never re-derived
        // from registration presence alone; see resolveAccessBlockedCta().
        setCourseAccess(matched?.access ?? null)
      } catch {
        /* default false / no access block */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, course?.id, user?.role]) // eslint-disable-line react-hooks/exhaustive-deps

  const displayRelatedCourses = useMemo(
    () => relatedCourses.map((c) => sanitizeCourseForDisplay(c)),
    [relatedCourses],
  )

  const derived = useMemo(() => (course ? deriveCourseDetail(course) : null), [course])

  const learningItems = useMemo(() => {
    if (!derived) return []
    const fullDesc = derived.fullDescription?.trim() ?? ''
    return derived.learningItems.filter((item) => {
      const key = item.toLowerCase().slice(0, Math.min(28, item.length))
      return key.length < 8 || !fullDesc.toLowerCase().includes(key)
    })
  }, [derived])

  const reviews = useMemo(() => (course ? parseCourseReviews(course) : []), [course])

  const averageRating = useMemo(() => {
    if (!course) return null
    const x = course as Record<string, unknown>
    const apiAvg = x.average_rating ?? x.rating ?? x.avg_rating
    if (apiAvg != null && Number.isFinite(Number(apiAvg)))
      return Math.round(Number(apiAvg) * 10) / 10
    return averageRatingFromReviews(reviews)
  }, [course, reviews])

  const metrics = useMemo(
    () => (course && derived ? buildMetrics(course, derived) : []),
    [course, derived],
  )

  async function handleShare() {
    const url = window.location.href
    const title = course?.title ?? 'برنامج تدريبي من EMC'
    if (navigator.share) {
      try {
        await navigator.share({ title, url })
        return
      } catch {
        /* fallback */
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      toast.success('تم نسخ الرابط')
    } catch {
      toast.error('تعذّر نسخ الرابط')
    }
  }

  function toggleWishlist() {
    if (!course?.slug) return
    const list = readWishlist()
    const next =
      list.includes(course.slug) ?
        list.filter((s) => s !== course.slug)
      : [...list, course.slug]
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(next))
    setWishlisted(next.includes(course.slug))
    toast.success(next.includes(course.slug) ? 'أُضيفت إلى المفضلة' : 'أُزيلت من المفضلة')
  }

  function handleVideoPreview() {
    if (!course || !derived) return
    const url = extractCourseVideoUrl(course)
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
  }

  // ── Loading / error / not-found states ──────────────────────────────────────
  // M6.f: the loaded branch overrides this with the course's real meta; without a
  // fallback here the pre-data document ships no description at all (SEO audit).
  const fallbackSeo = (
    <PublicSeo
      title="تفاصيل الدورة"
      description="استعرض تفاصيل الدورة التدريبية في منصة EMC: المنهج، المدرب، مواعيد الجلسات وخطوات التسجيل."
      path={slug ? `/courses/${slug}` : '/courses'}
    />
  )
  if (isLoading) {
    return (
      <>
        {fallbackSeo}
        <CourseDetailsLoading />
      </>
    )
  }
  if (error) {
    return (
      <main
        className={`overflow-x-hidden bg-[#f8fafc] px-4 pb-20 ${PAGE_TOP} sm:px-6 lg:px-8`}
        dir="rtl"
      >
        {fallbackSeo}
        <StateMessage type="error" title="حدث خطأ" message={error} />
      </main>
    )
  }
  if (notFound || !course || !derived) {
    return (
      <main
        className={`overflow-x-hidden bg-[#f8fafc] px-4 pb-20 ${PAGE_TOP} sm:px-6 lg:px-8`}
        dir="rtl"
      >
        <PublicSeo
          title="الدورة غير موجودة"
          description="لم نتمكن من العثور على هذه الدورة تصفح كتالوج الدورات المتاح."
          path="/courses"
          noIndex
        />
        <StateMessage
          type="empty"
          title="الدورة غير موجودة"
          message="لم نتمكن من العثور على هذه الدورة."
        />
      </main>
    )
  }

  // ── Derived display values ──────────────────────────────────────────────────
  const {
    isFree,
    registration,
    coverUrl,
    instructor,
    curriculumGroups,
    requirementsItems,
    priceLabel,
    originalPriceLabel,
    seatsFull,
  } = derived

  // §1.3 — urgency is seats, never a date or a countdown. Rendered only when the
  // API reports a real remaining-seat number.
  const seatsUrgency =
    derived.isEnded || seatsFull ? null : seatsLine(resolveCourseSeatMetrics(course).remaining)

  const courseX = course as unknown as Record<string, unknown>
  const isPartOfLearningPath = Boolean(
    courseX.is_part_of_learning_path ?? courseX.is_path_owned ?? false,
  )
  const learningPathSlug =
    (courseX.learning_path as { slug?: string } | null | undefined)?.slug ?? null

  const courseX2 = course as Record<string, unknown>
  const enrollCta = resolveCourseEnrollCta({
    registrationOpen: registration.open,
    seatsFull,
    alreadyEnrolled,
    isAuthenticated,
    userRole: user?.role,
    courseSlug: course.slug,
    courseId: course.id,
    isEnded: derived.isEnded,
    allowEndedEnrollment: derived.isEnded && registration.open,
    isPartOfLearningPath,
    learningPathSlug,
    isPaid: Boolean(courseX2.is_paid),
    price: typeof courseX2.price === 'number' ? courseX2.price : undefined,
    currency: typeof courseX2.currency === 'string' ? courseX2.currency : 'EUR',
    access: courseAccess,
  })

  const gallery = extractCourseGallery(course, coverUrl)
  const videoUrl = extractCourseVideoUrl(course)
  const category = categoryLabel(course, derived)
  const level = levelLabel(course.level ?? (course as Record<string, unknown>).level)

  // G4 upsell band — station count + duration rendered as calm ink meta.
  const upsellStations = upsellPath ? upsellPath.courses?.length || upsellPath.courses_count : 0
  const upsellDuration =
    upsellPath?.duration ?
      `${upsellPath.duration} ${
        upsellPath.duration_unit === 'weeks' ? 'أسبوع'
        : upsellPath.duration_unit === 'months' ? 'شهر'
        : 'يوم'
      }`
    : null

  const enrollSidebar = (
    <div className="overflow-hidden text-right">
      <div className="border-b border-[#0C2A4B]/6 bg-gradient-to-l from-brand-50 to-white px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-base font-black tracking-tight text-[#0C2A4B]">الالتحاق بالبرنامج</h3>
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ring-1 ${
            derived.isEnded ? 'bg-slate-100 text-slate-700 ring-slate-200'
            : registration.open && !seatsFull
              ? 'bg-brand-50 text-ocean ring-brand-100'
              : 'bg-orange-50 text-orange-800 ring-orange-100'
          }`}>
            {derived.isEnded ?
              'انتهت'
            : registration.open && !seatsFull ?
              OPEN_ENROLLMENT_LABEL
            : seatsFull ? 'مكتمل'
            : 'مغلق'}
          </span>
        </div>
        {seatsUrgency && (
          <p className="mt-2 text-[11px] font-bold text-ink-400">{seatsUrgency}</p>
        )}
      </div>
      {derived.endedMessage ?
        <div className="border-b border-[#0C2A4B]/6 bg-slate-50 px-5 py-3">
          <p className="text-[12px] font-semibold leading-relaxed text-[#0C2A4B]/70">{derived.endedMessage}</p>
        </div>
      : null}
      <div className="border-b border-[#0C2A4B]/6 px-5 py-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-black text-slate-400">الرسوم</span>
          <div className="text-left">
            {originalPriceLabel && !isFree && (
              <span className="block text-[10px] font-bold text-slate-400 line-through tabular-nums">
                {originalPriceLabel}
              </span>
            )}
            <span className={`text-xl font-black tabular-nums ${isFree ? 'text-[#0077B6]' : 'text-accent-700'}`}>
              {isFree ? 'مجانية' : priceLabel}
            </span>
          </div>
        </div>
        {originalPriceLabel && !isFree && (
          <p className="mt-2 text-[11px] font-bold text-ink-400">سعر EMC للوصول</p>
        )}
      </div>
      <div className="space-y-3 p-4 sm:p-5">
        <PublicDetailCtaButton cta={enrollCta} className="w-full justify-center" />
        {enrollCta.message && (
          <AppAlert type={enrollCta.disabled ? 'info' : 'error'} title={enrollCta.message} />
        )}

        {/* §8 the launch promise, verbatim from webSpec, on a hairline seam. No box. */}
        <div className="emc-hairline" aria-hidden />
        <p className="text-[12px] leading-6 text-ink-400">{LAUNCH_PROMISE}</p>
        <p className="text-[12px] font-bold leading-6 text-ink-500">{REFUND_LINE}</p>
      </div>
    </div>
  )

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <main
      className={`relative overflow-x-hidden bg-[#0C2A4B] pb-20 ${PAGE_TOP} lg:pb-8`}
      dir="rtl"
    >
      <PublicSeo
        title={course.title}
        description={
          course.short_description ||
          course.description?.slice(0, 160) ||
          `دورة ${course.title}`
        }
        path={`/courses/${course.slug}`}
        image={coverUrl}
        type="article"
      />
      <CourseJsonLd
        name={course.title}
        description={course.short_description || course.description?.slice(0, 160) || `دورة ${course.title}`}
        slug={course.slug}
        image={coverUrl}
      />

      {/* ── SECTION 1: Immersive hero ── */}
      <PremiumHero
        course={course}
        derived={derived}
        coverUrl={coverUrl}
        gallery={gallery}
        videoUrl={videoUrl}
        category={category}
        level={level}
        rating={averageRating}
        reviewCount={reviews.length}
        wishlisted={wishlisted}
        onToggleWishlist={toggleWishlist}
        onShare={() => void handleShare()}
        onVideoPreview={videoUrl ? handleVideoPreview : undefined}
        cta={
          <PublicDetailCtaButton
            cta={enrollCta}
            size="lg"
          />
        }
      />

      {/* ── LIGHT CONTENT AREA ── */}
      <div className="bg-gradient-to-b from-[#f0f4f8] to-[#f8fafc]">

        {/* ── Success banner ── */}
        {justEnrolled && (
          <div className="flex items-center justify-center gap-2 border-b border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-800">
            <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
            تم تسجيلك في الدورة بنجاح
          </div>
        )}

        {/* ── SECTION 2: Course snapshot ── */}
        <PremiumSnapshot items={metrics} />

        {/* ── MAIN BODY GRID ── */}
        {/* id="enroll": /courses/{slug}#enroll must land on the action. The enroll panel
            renders twice (mobile inline + desktop aside), each hidden in the opposite
            viewport an id on the panel itself would resolve to a display:none element
            and noop. This wrapper always has a box: on desktop the sticky enroll aside
            sits at its top edge, on mobile the fixed enroll bar stays pinned in view. */}
        <div id="enroll" className="mx-auto max-w-[88rem] scroll-mt-24 px-4 py-4 sm:px-6 lg:px-10 lg:py-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-6">

            <div className="space-y-3">

              <PremiumDescription
                derived={derived}
                shortDescription={course.short_description}
                requirementsItems={requirementsItems}
              />

              <div className="rounded-2xl border border-line bg-white p-3.5 sm:p-4">
                <PremiumJourney course={course} derived={derived} />
              </div>

              {curriculumGroups.some((g) => g.items.some((x) => x.trim())) && (
                <div className="rounded-2xl border border-line bg-white p-3.5 sm:p-4">
                  <PremiumCurriculum groups={curriculumGroups} />
                </div>
              )}

              <PremiumSchedule course={course} derived={derived} />

              {learningItems.length > 0 && (
                <div className="rounded-2xl border border-line bg-white p-3.5 sm:p-4">
                  <PremiumLearnGrid items={learningItems} />
                </div>
              )}

              <div className="lg:hidden">
                <PremiumStickyPanel instructor={instructor}>
                  {enrollSidebar}
                </PremiumStickyPanel>
              </div>
            </div>

            <aside className={`hidden lg:sticky ${STICKY_TOP} lg:block lg:self-start`}>
              <PremiumStickyPanel instructor={instructor}>
                {enrollSidebar}
              </PremiumStickyPanel>
            </aside>
          </div>
        </div>

        {/* ── G4 UPSELL BAND this course is a station in a path (editorial seam, no box).
            Renders nothing while loading / when no path contains the course, and mounts
            below the enroll area so nothing above it ever shifts. ── */}
        {!upsellLoading && upsell && upsellPath && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            className="mx-auto max-w-[88rem] px-4 pb-4 sm:px-6 lg:px-10"
            dir="rtl"
          >
            <div className="emc-hairline" aria-hidden />
            <div className="flex flex-col gap-5 py-8 text-right lg:flex-row lg:items-center lg:justify-between lg:gap-8">
              <div>
                <p className="font-display text-lg font-black tracking-tight text-deepBlue sm:text-xl">
                  هذه الدورة محطة في {upsellPath.title} {' '}
                  {upsell.savingsPercent != null ?
                    <>
                      وفّر{' '}
                      <span dir="ltr" className="tabular-nums">
                        {upsell.savingsPercent}%
                      </span>{' '}
                      مع المسار الكامل
                    </>
                  : 'شهادة مسار معتمدة مع المسار الكامل'}
                </p>
                <p className="mt-1.5 text-sm font-semibold text-ink-400">
                  <span dir="ltr" className="tabular-nums">{upsellStations}</span> محطة
                  {upsellDuration ? ` · ${upsellDuration}` : ''}
                </p>
                {/* §11 the price never stands bare: the course value carries into the path. */}
                <p className="mt-2 text-[13px] font-semibold leading-6 text-ink-400">
                  {UPGRADE_COUPON_NOTE}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-6">
                <Link
                  to={`/learning-paths/${upsellPath.slug}`}
                  onClick={() => trackFunnelEvent('upsell_click', { target: 'path', slug: upsellPath.slug })}
                  className="emc-cta-line text-sm"
                >
                  عرض المسار
                </Link>
                <button
                  type="button"
                  onClick={() => handleUpsellEnroll(upsellPath)}
                  className="inline-flex items-center justify-center rounded-xl bg-customOrange px-6 py-3 text-sm font-black text-white transition duration-200 hover:brightness-[1.03]"
                >
                  سجّل في المسار
                </button>
              </div>
            </div>
            <div className="emc-hairline" aria-hidden />
          </motion.section>
        )}

        {/* Related courses */}
        <div className="mx-auto max-w-[88rem] space-y-3 px-4 pb-4 sm:px-6 lg:px-10">
          <Suspense
            fallback={
              <div className="h-40 animate-pulse rounded-2xl bg-white/60 ring-1 ring-slate-100" />
            }
          >
            <CourseDetailRelatedCarousel courses={displayRelatedCourses} currentSlug={course.slug} />
          </Suspense>
        </div>
      </div>

      {/* Mobile floating enroll bar */}
      <PublicMobileEnrollBar
        visible
        priceHint={isFree ? 'مجانية' : priceLabel}
        actionLabel={enrollCta.label}
        disabled={enrollCta.disabled}
        onAction={() => {
          if (enrollCta.denyNonStudent) toast.error(PUBLIC_ENROLL_STUDENT_ONLY_MSG)
        }}
        extra={
          enrollCta.href ? (
            <Link
              to={enrollCta.href}
              className="inline-flex h-11 min-w-[8.5rem] flex-1 items-center justify-center rounded-xl bg-[#F28C00] px-4 text-sm font-black text-white"
            >
              {enrollCta.label}
            </Link>
          ) : enrollCta.denyNonStudent ? (
            <button
              type="button"
              onClick={() => toast.error(PUBLIC_ENROLL_STUDENT_ONLY_MSG)}
              className="inline-flex h-11 min-w-[8.5rem] flex-1 items-center justify-center rounded-xl bg-[#F28C00] px-4 text-sm font-black text-white"
            >
              {enrollCta.label}
            </button>
          ) : undefined
        }
      />
    </main>
  )
}

function CourseDetailsLoading() {
  return (
    <main
      className={`relative overflow-x-hidden bg-gradient-to-br from-[#0C2A4B] to-[#0077B6] ${PAGE_TOP}`}
      dir="rtl"
    >
      <div className="flex min-h-[280px] items-center justify-center py-12">
        <div className="flex flex-col items-center gap-4">
          <div className="h-3 w-3 animate-bounce rounded-full bg-[#0077B6] [animation-delay:0s]" />
          <div className="h-3 w-3 animate-bounce rounded-full bg-[#F28C00] [animation-delay:0.15s]" />
          <div className="h-3 w-3 animate-bounce rounded-full bg-[#0077B6] [animation-delay:0.3s]" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="bg-gradient-to-b from-[#f0f4f8] to-[#f8fafc] px-4 pb-16 sm:px-6 lg:px-10">
        <div className="flex gap-2 overflow-hidden border-b border-[#0C2A4B]/8 bg-white py-4">
          {SKELETON_SLOTS.map((i) => (
            <div key={i} className="h-12 w-32 shrink-0 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
        <div className="mx-auto mt-6 max-w-[88rem]">
          <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
            <div className="space-y-4">
              <div className="h-40 animate-pulse rounded-2xl bg-white ring-1 ring-slate-100" />
              <div className="h-48 animate-pulse rounded-2xl bg-white ring-1 ring-slate-100" />
              <div className="h-32 animate-pulse rounded-2xl bg-white ring-1 ring-slate-100" />
            </div>
            <div className="hidden h-72 animate-pulse rounded-[1.5rem] bg-white ring-1 ring-slate-100 lg:block" />
          </div>
        </div>
      </div>
    </main>
  )
}
