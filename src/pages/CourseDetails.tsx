import { useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { Link, useParams } from 'react-router-dom'
import api from '../api/axios'
import toast from '@/lib/toast'
import StateMessage from '../components/StateMessage'
import CourseEnrollmentCard from '@/components/enrollment/CourseEnrollmentCard'
import type { Course } from '../types'
import { unwrapPublicCoursePayload } from '@/utils/publicCourseNormalize'
import { useAuth } from '@/contexts/AuthContext'
import PublicSeo from '@/components/public/PublicSeo'
import PublicDetailSection from '@/components/public/detail/PublicDetailSection'
import PublicMobileEnrollBar from '@/components/public/detail/PublicMobileEnrollBar'
import PublicInstructorCard from '@/components/public/detail/PublicInstructorCard'
import PublicDetailHero from '@/components/public/detail/PublicDetailHero'
import PublicLearningOutcomes from '@/components/public/detail/PublicLearningOutcomes'
import PublicRequirementsList from '@/components/public/detail/PublicRequirementsList'
import PublicFinalCTA from '@/components/public/detail/PublicFinalCTA'
import PublicStickyEnrollmentPanel from '@/components/public/detail/PublicStickyEnrollmentPanel'
import PublicDetailCtaButton from '@/components/public/detail/PublicDetailCtaButton'
import PublicQuickFactsSection from '@/components/public/detail/PublicQuickFactsSection'
import PublicCurriculumSection from '@/components/public/detail/PublicCurriculumSection'
import { resolveCourseEnrollCta } from '@/utils/publicCourseDetailCta'
import { deriveCourseDetail } from '@/utils/courseDetailDerived'
import { fetchStudentRegistrations } from '@/api/studentApi'

/** Clears fixed navbar (h-16 / lg:h-[4.25rem]) without overlapping hero */
const PAGE_TOP = 'pt-[calc(4rem+1.25rem)] sm:pt-[calc(4.25rem+1.5rem)]'
const STICKY_TOP = 'lg:top-[calc(4.25rem+1rem)]'

export default function CourseDetails() {
  const { slug } = useParams()
  const { isAuthenticated, user } = useAuth()
  const enrollRef = useRef<HTMLDivElement>(null)

  const [course, setCourse] = useState<Course | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [alreadyEnrolled, setAlreadyEnrolled] = useState(false)

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
          (typeof response.data === 'object' && response.data !== null && 'slug' in response.data ?
            (response.data as Course)
          : null)
        if (!item?.slug) {
          setNotFound(true)
          setCourse(null)
          return
        }
        setCourse(item)
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
    fetchCourse()
    return () => controller.abort()
  }, [slug])

  useEffect(() => {
    if (!isAuthenticated || !course || user?.role !== 'student') return
    let cancelled = false
    void (async () => {
      try {
        const rows = await fetchStudentRegistrations()
        if (cancelled) return
        setAlreadyEnrolled(
          rows.some((r) => r.course_id === course.id || (course.slug && r.slug === course.slug)),
        )
      } catch {
        /* default false */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, course?.id, user?.role]) // eslint-disable-line react-hooks/exhaustive-deps

  const derived = useMemo(() => (course ? deriveCourseDetail(course) : null), [course])

  const overviewParagraphs = useMemo(() => {
    if (!course || !derived) return []
    const short = course.short_description?.trim() ?? ''
    const parts: string[] = []
    const full = derived.fullDescription?.trim() ?? ''
    if (full && full !== short) parts.push(full)
    if (derived.targetAudience?.trim()) parts.push(derived.targetAudience.trim())
    if (derived.methodologyLines.length > 0) parts.push(derived.methodologyLines.join('\n'))
    return parts
  }, [course, derived])

  const learningItems = useMemo(() => {
    if (!derived) return []
    const hay = overviewParagraphs.join('\n').toLowerCase()
    return derived.learningItems.filter((item) => {
      const key = item.toLowerCase().slice(0, Math.min(28, item.length))
      return key.length < 8 || !hay.includes(key)
    })
  }, [derived, overviewParagraphs])

  function scrollToEnroll() {
    enrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

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

  if (isLoading) return <CourseDetailsLoading />
  if (error) {
    return (
      <main className={`overflow-x-hidden bg-slate-50 px-4 pb-20 ${PAGE_TOP} sm:px-6 lg:px-8`}>
        <StateMessage type="error" title="حدث خطأ" message={error} />
      </main>
    )
  }
  if (notFound || !course || !derived) {
    return (
      <main className={`overflow-x-hidden bg-slate-50 px-4 pb-20 ${PAGE_TOP} sm:px-6 lg:px-8`}>
        <StateMessage type="empty" title="الدورة غير موجودة" message="لم نتمكن من العثور على هذه الدورة." />
      </main>
    )
  }

  const { itemType, L, isFree, registration, coverUrl, instructor, keywordTags, quickFacts, curriculumGroups, requirementsItems, priceLabel, seatsFull } =
    derived

  const enrollCta = resolveCourseEnrollCta({
    registrationOpen: registration.open,
    seatsFull,
    alreadyEnrolled,
    isAuthenticated,
    courseSlug: course.slug,
    courseId: course.id,
  })

  const heroBadges = [
    { label: L.badge, tone: 'blue' as const },
    {
      label: registration.open && !seatsFull ? registration.labelAr : seatsFull ? 'مكتمل' : registration.labelAr,
      tone: (registration.open && !seatsFull ? 'green' : 'slate') as 'green' | 'slate',
    },
  ]

  const enrollmentCard = (
    <CourseEnrollmentCard
      course={course}
      itemType={itemType}
      isFree={isFree}
      priceLabel={priceLabel}
      registrationOpen={registration.open}
      seatsFull={seatsFull}
      alreadyEnrolled={alreadyEnrolled}
    />
  )

  return (
    <main className={`overflow-x-hidden bg-[#f8fafc] pb-24 ${PAGE_TOP} lg:pb-16`} dir="rtl">
      <PublicSeo
        title={course.title}
        description={course.short_description || course.description?.slice(0, 160) || `دورة ${course.title}`}
        path={`/courses/${course.slug}`}
        image={coverUrl}
        type="article"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <PublicDetailHero
          breadcrumbs={[
            { label: 'الرئيسية', href: '/' },
            { label: 'البرامج', href: '/programs' },
            { label: 'الدورات', href: '/courses' },
            { label: course.title },
          ]}
          title={course.title}
          description={course.short_description ?? undefined}
          coverUrl={coverUrl}
          badges={heroBadges}
          keywordTags={keywordTags}
          onShare={() => void handleShare()}
          cta={
            <PublicDetailCtaButton cta={enrollCta} onScrollToEnroll={scrollToEnroll} size="lg" />
          }
        />

        <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] lg:items-start lg:gap-8">
          <div className="min-w-0 space-y-5">
            <PublicQuickFactsSection items={quickFacts} />

            {overviewParagraphs.length > 0 && (
              <PublicDetailSection id="overview" title="نظرة عامة" compact>
                <div className="space-y-4">
                  {overviewParagraphs.map((block) => (
                    <p key={block.slice(0, 48)} className="whitespace-pre-line text-sm leading-8 text-slate-700">
                      {block}
                    </p>
                  ))}
                </div>
              </PublicDetailSection>
            )}

            <PublicLearningOutcomes
              title={itemType === 'workshop' ? 'ما ستغطيه الورشة' : 'ماذا ستتعلم'}
              items={learningItems}
            />

            <PublicRequirementsList items={requirementsItems} />

            <PublicCurriculumSection
              title={itemType === 'workshop' ? 'محتوى الورشة' : 'المنهاج والمحتوى'}
              groups={curriculumGroups}
            />

            {instructor.assigned && instructor.name && (
              <PublicInstructorCard instructor={instructor} variant="featured" />
            )}

            <div ref={enrollRef} id="enroll" className="scroll-mt-[calc(4.25rem+1rem)] lg:hidden">
              {enrollmentCard}
            </div>
          </div>

          <aside className={`hidden lg:sticky ${STICKY_TOP} lg:block lg:self-start`}>
            <PublicStickyEnrollmentPanel>{enrollmentCard}</PublicStickyEnrollmentPanel>
          </aside>
        </section>

        <PublicFinalCTA
          title={course.title}
          cta={
            <PublicDetailCtaButton cta={enrollCta} onScrollToEnroll={scrollToEnroll} size="md" />
          }
          compact
        />
      </div>

      <PublicMobileEnrollBar
        visible
        priceHint={isFree ? 'مجانية' : priceLabel}
        actionLabel={enrollCta.label}
        disabled={enrollCta.disabled}
        onAction={() => {
          if (enrollCta.href) return
          if (enrollCta.scrollToEnroll) scrollToEnroll()
        }}
        extra={
          enrollCta.href ?
            <Link
              to={enrollCta.href}
              className="inline-flex h-11 min-w-[8.5rem] flex-1 items-center justify-center rounded-xl bg-customOrange px-4 text-sm font-black text-white"
            >
              {enrollCta.label}
            </Link>
          : enrollCta.scrollToEnroll ?
            <button
              type="button"
              onClick={scrollToEnroll}
              className="inline-flex h-11 min-w-[8.5rem] flex-1 items-center justify-center rounded-xl bg-customOrange px-4 text-sm font-black text-white"
            >
              {enrollCta.label}
            </button>
          : undefined
        }
      />
    </main>
  )
}

function CourseDetailsLoading() {
  return (
    <main className={`overflow-x-hidden bg-slate-50 px-4 pb-16 ${PAGE_TOP} sm:px-6 lg:px-8`} dir="rtl">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="h-[320px] animate-pulse rounded-[1.75rem] bg-slate-200" />
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-36 animate-pulse rounded-2xl bg-white ring-1 ring-slate-100" />
            ))}
          </div>
          <div className="hidden h-80 animate-pulse rounded-2xl bg-white ring-1 ring-slate-100 lg:block" />
        </div>
      </div>
    </main>
  )
}
