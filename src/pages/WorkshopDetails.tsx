import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Calendar,
  Clock,
  ExternalLink,
  GraduationCap,
  Loader2,
  Users,
  Wifi,
} from 'lucide-react'
import toast from '@/lib/toast'
import PublicSeo from '@/components/public/PublicSeo'
import StateMessage from '@/components/StateMessage'
import { fetchPublicWorkshopBySlug, type PublicWorkshop } from '@/api/workshopsApi.public'
import { fetchStudentRegistrations } from '@/api/studentApi'
import { useAuth } from '@/contexts/AuthContext'
import { EMC_COURSE_COVER_PLACEHOLDER } from '@/utils/publicCourseDisplay'
import {
  formatPublicDate,
  formatPublicTime,
  formatSessionDurationFromRange,
} from '@/utils/publicDetailFormat'
import PublicQuickFactsSection from '@/components/public/detail/PublicQuickFactsSection'
import type { PublicInfoCard } from '@/components/public/detail/PublicDetailInfoCards'

const PAGE_TOP = 'pt-[calc(4rem+1.25rem)] sm:pt-[calc(4.25rem+1.5rem)]'
const STICKY_TOP = 'lg:top-[calc(4.25rem+1rem)]'
import PublicDetailHero from '@/components/public/detail/PublicDetailHero'
import PublicFinalCTA from '@/components/public/detail/PublicFinalCTA'
import PublicStickyEnrollmentPanel from '@/components/public/detail/PublicStickyEnrollmentPanel'
import PublicMobileEnrollBar from '@/components/public/detail/PublicMobileEnrollBar'
import PublicDetailSection from '@/components/public/detail/PublicDetailSection'
import PublicInstructorCard from '@/components/public/detail/PublicInstructorCard'
import PublicWorkshopRegistrationCard from '@/components/public/detail/PublicWorkshopRegistrationCard'
import { resolvePublicAssetUrl } from '@/utils/mediaUrl'
import { normalizeRole } from '@/utils/dashboardAccess'
import {
  buildCourseDetailEnrollHref,
  buildPublicLoginHref,
  gatePublicEnrollClick,
  PUBLIC_ENROLL_STUDENT_ONLY_MSG,
} from '@/utils/publicEnrollAuth'

export default function WorkshopDetailsPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const enrollRef = useRef<HTMLDivElement>(null)
  const [workshop, setWorkshop] = useState<PublicWorkshop | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [alreadyEnrolled, setAlreadyEnrolled] = useState(false)

  useEffect(() => {
    if (!slug) {
      setNotFound(true)
      setLoading(false)
      return
    }
    let alive = true
    setLoading(true)
    setLoadError(false)
    void fetchPublicWorkshopBySlug(slug).then((res) => {
      if (!alive) return
      if (!res.workshop) {
        setNotFound(!res.ok)
        setLoadError(!res.ok)
        setWorkshop(null)
      } else {
        setWorkshop(res.workshop)
        setNotFound(false)
      }
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [slug])

  useEffect(() => {
    if (!isAuthenticated || !workshop?.course_id) {
      setAlreadyEnrolled(false)
      return
    }
    let alive = true
    void fetchStudentRegistrations().then((regs) => {
      if (!alive) return
      setAlreadyEnrolled(regs.some((r) => r.course_id === workshop.course_id))
    })
    return () => {
      alive = false
    }
  }, [isAuthenticated, workshop?.course_id])

  const coverUrl = useMemo(
    () => resolvePublicAssetUrl(workshop?.cover_image ?? null) ?? EMC_COURSE_COVER_PLACEHOLDER,
    [workshop?.cover_image],
  )

  const redirectPath = slug ? `/workshops/${slug}` : '/workshops'
  const isStudent = normalizeRole(user?.role) === 'student'
  const externalUrl = workshop?.external_registration_url ?? null
  const registrationOpen = workshop?.registration_open !== false

  const quickFacts = useMemo((): PublicInfoCard[] => {
    if (!workshop) return []
    const facts: PublicInfoCard[] = []

    const startDate = formatPublicDate(workshop.start_date)
    const startClock = formatPublicTime(workshop.start_time)
    const endClock = formatPublicTime(workshop.end_time)
    const clockRange =
      startClock && endClock ? `${startClock} — ${endClock}` : startClock || endClock || ''
    const sessionDuration = formatSessionDurationFromRange(workshop.start_time, workshop.end_time)

    let totalDuration = ''
    if (workshop.duration_hours != null && workshop.duration_hours > 0) {
      totalDuration = `${String(workshop.duration_hours)} ساعة`
    } else if (sessionDuration) {
      totalDuration = sessionDuration
    }

    const deliveryMode =
      workshop.is_online ? 'عن بُعد' : workshop.location_type === 'offline' ? 'حضوري' : 'مختلط'

    if (deliveryMode) facts.push({ icon: Wifi, label: 'نمط الحضور', value: deliveryMode })
    if (totalDuration) facts.push({ icon: Clock, label: 'المدة', value: totalDuration })
    if (sessionDuration && workshop.start_time && workshop.end_time) {
      facts.push({ icon: Clock, label: 'مدة الجلسة', value: sessionDuration })
    }
    if (startDate) facts.push({ icon: Calendar, label: 'تاريخ البداية', value: startDate })
    if (clockRange) facts.push({ icon: Clock, label: 'الوقت', value: clockRange })

    const seats =
      workshop.seats_remaining != null ?
        `${String(workshop.seats_remaining)} متاح`
      : workshop.seats_total != null ?
        `${String(workshop.seats_total)} مقعد`
      : ''
    if (seats) facts.push({ icon: Users, label: 'المقاعد', value: seats })
    if (workshop.certificate_name) {
      facts.push({ icon: GraduationCap, label: 'الشهادة', value: workshop.certificate_name })
    }

    return facts
  }, [workshop])

  const overviewText = useMemo(() => {
    if (!workshop?.description) return null
    const short = workshop.short_description?.trim() ?? ''
    const full = workshop.description.trim()
    if (full === short) return null
    return full
  }, [workshop])

  async function handleShare() {
    const url = window.location.href
    const title = workshop?.title ?? 'ورشة من EMC'
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

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center bg-slate-50 pt-28">
        <Loader2 className="h-10 w-10 animate-spin text-[#0077B6]" />
      </main>
    )
  }

  if (loadError && !workshop) {
    return (
      <main className="bg-slate-50 px-4 pb-20 pt-32 sm:px-6">
        <StateMessage type="error" title="تعذّر التحميل" message="لم نتمكن من تحميل تفاصيل الورشة. حاول مجدداً." />
      </main>
    )
  }

  if (notFound || !workshop) {
    return (
      <main className="bg-slate-50 px-4 pb-20 pt-32 sm:px-6">
        <StateMessage type="empty" title="الورشة غير موجودة" message="لم نتمكن من العثور على هذه الورشة." />
      </main>
    )
  }

  const w = workshop

  const seoDesc =
    w.short_description ??
    (w.description ? w.description.slice(0, 160) : `ورشة ${w.title} — EMC`)

  const instructor =
    w.instructor_name ?
      {
        name: w.instructor_name,
        avatarUrl: resolvePublicAssetUrl(w.instructor_avatar),
      }
    : null

  const sidebarProps = {
    workshop: w,
    registrationOpen,
    alreadyEnrolled,
    isAuthenticated,
    isStudent,
    redirectPath,
    externalUrl,
  }

  function scrollToEnroll() {
    gatePublicEnrollClick({
      isAuthenticated,
      role: user?.role,
      redirectPath,
      navigate,
      onStudent: () => enrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    })
  }

  function renderHeroCta() {
    const cls =
      'inline-flex w-full items-center justify-center gap-2 rounded-xl px-7 py-3.5 text-sm font-extrabold text-white shadow-lg sm:w-auto'

    if (!registrationOpen) {
      return (
        <span className={`${cls} cursor-not-allowed bg-slate-300 text-slate-500 shadow-none`}>التسجيل مغلق</span>
      )
    }
    if (externalUrl) {
      return (
        <a href={externalUrl} target="_blank" rel="noopener noreferrer" className={`${cls} bg-customOrange`}>
          <ExternalLink size={18} />
          التسجيل الخارجي
        </a>
      )
    }
    if (alreadyEnrolled) {
      return (
        <Link to="/dashboard/student/courses" className={`${cls} bg-emerald-600`}>
          عرض تسجيلي
        </Link>
      )
    }
    if (!isAuthenticated) {
      return (
        <Link
          to={buildPublicLoginHref(redirectPath)}
          className={`${cls} bg-customOrange`}
        >
          <GraduationCap size={18} />
          سجّل الدخول للتسجيل
        </Link>
      )
    }
    if (!isStudent) {
      return (
        <button
          type="button"
          onClick={() => toast.error(PUBLIC_ENROLL_STUDENT_ONLY_MSG)}
          className={`${cls} bg-customOrange`}
        >
          <GraduationCap size={18} />
          سجّل في الورشة
        </button>
      )
    }
    if (w.course_slug) {
      return (
        <Link to={buildCourseDetailEnrollHref(w.course_slug)} className={`${cls} bg-customOrange`}>
          <GraduationCap size={18} />
          سجّل في الورشة
        </Link>
      )
    }
    return (
      <button type="button" onClick={scrollToEnroll} className={`${cls} bg-customOrange`}>
        <GraduationCap size={18} />
        سجّل في الورشة
      </button>
    )
  }

  return (
    <main className={`overflow-x-hidden bg-[#f8fafc] pb-24 ${PAGE_TOP} lg:pb-16`} dir="rtl">
      <PublicSeo
        title={w.title}
        description={seoDesc}
        path={`/workshops/${w.slug}`}
        image={coverUrl}
        type="article"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <PublicDetailHero
          breadcrumbs={[
            { label: 'الرئيسية', href: '/' },
            { label: 'الورش', href: '/workshops' },
            { label: w.title },
          ]}
          title={w.title}
          description={w.short_description ?? undefined}
          coverUrl={coverUrl}
          badges={[
            { label: 'ورشة تدريبية', tone: 'blue' },
            { label: registrationOpen ? 'التسجيل مفتوح' : 'التسجيل مغلق', tone: registrationOpen ? 'green' : 'slate' },
          ]}
          onShare={() => void handleShare()}
          cta={renderHeroCta()}
        />

        <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] lg:items-start lg:gap-8">
          <div className="min-w-0 space-y-5">
            <PublicQuickFactsSection items={quickFacts} />

            {overviewText && (
              <PublicDetailSection title="نظرة عامة" compact>
                <div className="whitespace-pre-wrap text-sm leading-8 text-slate-700">{overviewText}</div>
              </PublicDetailSection>
            )}

            {instructor && <PublicInstructorCard instructor={instructor} variant="featured" />}

            <div ref={enrollRef} id="enroll" className="scroll-mt-[calc(4.25rem+1rem)] lg:hidden">
              <PublicWorkshopRegistrationCard {...sidebarProps} />
            </div>
          </div>

          <aside className={`hidden lg:sticky ${STICKY_TOP} lg:block lg:self-start`}>
            <PublicStickyEnrollmentPanel>
              <PublicWorkshopRegistrationCard {...sidebarProps} />
            </PublicStickyEnrollmentPanel>
          </aside>
        </section>

        <PublicFinalCTA
          title={w.title}
          cta={renderHeroCta()}
          backHref="/workshops"
          backLabel="العودة إلى الورش"
          compact
        />
      </div>

      <PublicMobileEnrollBar
        visible
        priceHint={w.is_free ? 'مجانية' : 'برسوم'}
        actionLabel={!isAuthenticated ? 'تسجيل الدخول للالتحاق' : 'سجّل في الورشة'}
        disabled={!registrationOpen}
        onAction={scrollToEnroll}
        extra={
          !isAuthenticated ?
            <Link
              to={buildPublicLoginHref(redirectPath)}
              className="inline-flex h-12 flex-1 items-center justify-center rounded-xl bg-customOrange px-4 text-sm font-black text-white"
            >
              تسجيل الدخول للالتحاق
            </Link>
          : externalUrl ?
            <a
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 flex-1 items-center justify-center rounded-xl bg-customOrange px-4 text-sm font-black text-white"
            >
              التسجيل الخارجي
            </a>
          : undefined
        }
      />
    </main>
  )
}
