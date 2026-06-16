import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import {
  BadgeCheck,
  BookOpen,
  CalendarDays,
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
import PublicMobileEnrollBar from '@/components/public/detail/PublicMobileEnrollBar'
import PublicDetailCtaButton from '@/components/public/detail/PublicDetailCtaButton'
import { resolveCourseEnrollCta } from '@/utils/publicCourseDetailCta'
import { PUBLIC_ENROLL_STUDENT_ONLY_MSG } from '@/utils/publicEnrollAuth'
import { deriveCourseDetail } from '@/utils/courseDetailDerived'
import { fetchStudentRegistrations } from '@/api/studentApi'
import { fetchCoursesFromApi } from '@/api/coursesApi.public'
import { formatPublicDate, formatPublicText, formatPublicTime, formatPublicCount } from '@/utils/publicDetailFormat'
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

function levelLabel(raw: unknown): string | null {
  const s = safeTrimUnknown(raw)
  if (!s) return null
  const map: Record<string, string> = {
    beginner: 'مبتدئ',
    intermediate: 'متوسط',
    advanced: 'متقدم',
  }
  return map[s.toLowerCase()] ?? s
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

  const start = formatPublicDate(course.start_date)
  if (start) push('start', CalendarDays, 'تاريخ البداية', start, 'blue')
  const end = formatPublicDate(course.end_date)
  if (end) push('end', CalendarDays, 'تاريخ النهاية', end, 'blue')
  if (hasMeaningfulDuration(derived.displayDuration)) {
    push('duration', Clock3, 'المدة', derived.displayDuration, 'navy')
  }
  const startClock = formatPublicTime(course.start_time ?? x.start_time)
  const endClock = formatPublicTime(course.end_time ?? x.end_time)
  const clockRange =
    startClock && endClock ? `${startClock} — ${endClock}` : startClock || endClock || ''
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
  const justEnrolled = searchParams.get('enrolled') === '1'
  const { isAuthenticated, user } = useAuth()

  const [course, setCourse] = useState<Course | null>(null)
  const [relatedCourses, setRelatedCourses] = useState<Course[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [alreadyEnrolled, setAlreadyEnrolled] = useState(false)
  const [wishlisted, setWishlisted] = useState(false)

  useEffect(() => {
    if (!slug) {
      setIsLoading(false)
      setNotFound(true)
      return
    }
    const controller = new AbortController()
    async function fetchCourse() {
      const slugKey = slug
      if (!slugKey) return
      try {
        setIsLoading(true)
        setError('')
        setNotFound(false)
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
    }
    void fetchCourse()
    return () => controller.abort()
  }, [slug])

  useEffect(() => {
    let alive = true
    void fetchCoursesFromApi()
      .then((list) => {
        if (alive) setRelatedCourses(list)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated || !course || user?.role !== 'student') return
    let cancelled = false
    void (async () => {
      try {
        const rows = await fetchStudentRegistrations()
        if (cancelled) return
        setAlreadyEnrolled(
          rows.some(
            (r) => r.course_id === course.id || (course.slug && r.slug === course.slug),
          ),
        )
      } catch {
        /* default false */
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
  if (isLoading) return <CourseDetailsLoading />
  if (error) {
    return (
      <main
        className={`overflow-x-hidden bg-[#f8fafc] px-4 pb-20 ${PAGE_TOP} sm:px-6 lg:px-8`}
        dir="rtl"
      >
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
    discountPercent,
    seatsFull,
  } = derived

  const courseX = course as unknown as Record<string, unknown>
  const isPartOfLearningPath = Boolean(
    courseX.is_part_of_learning_path ?? courseX.is_path_owned ?? false,
  )
  const learningPathSlug =
    (courseX.learning_path as { slug?: string } | null | undefined)?.slug ?? null

  const enrollCta = resolveCourseEnrollCta({
    registrationOpen: registration.open,
    seatsFull,
    alreadyEnrolled,
    isAuthenticated,
    userRole: user?.role,
    courseSlug: course.slug,
    courseId: course.id,
    isPartOfLearningPath,
    learningPathSlug,
  })

  const gallery = extractCourseGallery(course, coverUrl)
  const videoUrl = extractCourseVideoUrl(course)
  const category = categoryLabel(course, derived)
  const level = levelLabel(course.level ?? (course as Record<string, unknown>).level)

  const enrollSidebar = (
    <div className="overflow-hidden text-right">
      <div className="border-b border-[#22334A]/6 bg-gradient-to-l from-[#2691C2]/8 via-white to-[#EC943C]/5 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-black text-[#22334A]">الالتحاق بالبرنامج</h3>
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ring-1 ${
            registration.open && !seatsFull
              ? 'bg-emerald-50 text-emerald-800 ring-emerald-100'
              : 'bg-orange-50 text-orange-800 ring-orange-100'
          }`}>
            {registration.open && !seatsFull ? 'متاح للتسجيل' : seatsFull ? 'مكتمل' : 'مغلق'}
          </span>
        </div>
      </div>
      <div className="border-b border-[#22334A]/6 px-5 py-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-black text-slate-400">الرسوم</span>
          <div className="text-left">
            {originalPriceLabel && !isFree && (
              <span className="block text-[10px] font-bold text-slate-400 line-through tabular-nums">
                {originalPriceLabel}
              </span>
            )}
            <span className={`text-xl font-black tabular-nums ${isFree ? 'text-[#2691C2]' : 'text-[#EC943C]'}`}>
              {isFree ? 'مجانية' : priceLabel}
            </span>
          </div>
        </div>
        {discountPercent != null && discountPercent > 0 && !isFree && (
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] font-black text-slate-400">الخصم</span>
            <span className="rounded-full bg-[#EC943C]/15 px-2.5 py-0.5 text-[10px] font-black tabular-nums text-[#EC943C]">
              {String(discountPercent)}%
            </span>
          </div>
        )}
      </div>
      <div className="p-4 sm:p-5">
        <PublicDetailCtaButton cta={enrollCta} className="w-full justify-center" />
      </div>
    </div>
  )

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <main
      className={`relative overflow-x-hidden bg-[#22334A] pb-20 ${PAGE_TOP} lg:pb-8`}
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
        <div className="mx-auto max-w-[88rem] px-4 py-4 sm:px-6 lg:px-10 lg:py-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-6">

            <div className="space-y-3">

              <PremiumDescription
                derived={derived}
                shortDescription={course.short_description}
                requirementsItems={requirementsItems}
              />

              <div className="rounded-2xl border border-white/80 bg-white/90 p-3.5 shadow-sm sm:p-4">
                <PremiumJourney course={course} derived={derived} />
              </div>

              {curriculumGroups.some((g) => g.items.some((x) => x.trim())) && (
                <div className="rounded-2xl border border-white/80 bg-white/90 p-3.5 shadow-sm sm:p-4">
                  <PremiumCurriculum groups={curriculumGroups} />
                </div>
              )}

              <PremiumSchedule course={course} derived={derived} />

              {learningItems.length > 0 && (
                <div className="rounded-2xl border border-white/80 bg-white/90 p-3.5 shadow-sm sm:p-4">
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
              className="inline-flex h-11 min-w-[8.5rem] flex-1 items-center justify-center rounded-xl bg-[#EC943C] px-4 text-sm font-black text-white"
            >
              {enrollCta.label}
            </Link>
          ) : enrollCta.denyNonStudent ? (
            <button
              type="button"
              onClick={() => toast.error(PUBLIC_ENROLL_STUDENT_ONLY_MSG)}
              className="inline-flex h-11 min-w-[8.5rem] flex-1 items-center justify-center rounded-xl bg-[#EC943C] px-4 text-sm font-black text-white"
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
      className={`relative overflow-x-hidden bg-gradient-to-br from-[#22334A] to-[#2691C2] ${PAGE_TOP}`}
      dir="rtl"
    >
      <div className="flex min-h-[280px] items-center justify-center py-12">
        <div className="flex flex-col items-center gap-4">
          <div className="h-3 w-3 animate-bounce rounded-full bg-[#2691C2] [animation-delay:0s]" />
          <div className="h-3 w-3 animate-bounce rounded-full bg-[#EC943C] [animation-delay:0.15s]" />
          <div className="h-3 w-3 animate-bounce rounded-full bg-[#2691C2] [animation-delay:0.3s]" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="bg-gradient-to-b from-[#f0f4f8] to-[#f8fafc] px-4 pb-16 sm:px-6 lg:px-10">
        <div className="flex gap-2 overflow-hidden border-b border-[#22334A]/8 bg-white py-4">
          {Array.from({ length: 5 }).map((_, i) => (
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
