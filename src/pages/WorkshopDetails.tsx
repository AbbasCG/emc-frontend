import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BadgeCheck,
  CalendarDays,
  Clock3,
  ExternalLink,
  GraduationCap,
  Loader2,
  MapPin,
  Monitor,
  Share2,
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
import { formatPublicDate, formatPublicTime, toLatinDigits } from '@/utils/publicDetailFormat'
import { resolvePublicAssetUrl } from '@/utils/mediaUrl'
import { normalizeRole } from '@/utils/dashboardAccess'
import {
  buildPublicLoginHref,
  buildWorkshopDetailEnrollHref,
  gatePublicEnrollClick,
  PUBLIC_ENROLL_STUDENT_ONLY_MSG,
} from '@/utils/publicEnrollAuth'
import { resolveCertificateAvailability } from '@/utils/programCertificateAvailability'
import { formatEuroInteger } from '@/utils/currency'
import PremiumSnapshot from '@/components/public/course-detail/premium/PremiumSnapshot'
import PublicMobileEnrollBar from '@/components/public/detail/PublicMobileEnrollBar'
import type { MetricWidget } from '@/components/public/course-detail/CourseDetailMetricsDashboard'

const PAGE_TOP = 'pt-[calc(4rem+1rem)] sm:pt-[calc(4.25rem+1.25rem)]'
const STICKY_TOP = 'lg:top-[calc(4.25rem+0.75rem)]'

const AVATAR_PLACEHOLDER =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><circle cx="40" cy="40" r="40" fill="#2691C2"/><circle cx="40" cy="30" r="13" fill="rgba(255,255,255,0.35)"/><path fill="rgba(255,255,255,0.25)" d="M10 74c7-18 17-26 30-26s23 8 30 26"/></svg>`,
  )

function buildMetrics(workshop: PublicWorkshop): MetricWidget[] {
  const items: MetricWidget[] = []

  const startDate = formatPublicDate(workshop.start_date)
  const startTime = formatPublicTime(workshop.start_time)
  const endTime = formatPublicTime(workshop.end_time)
  const clockRange =
    startTime && endTime ? `${startTime} — ${endTime}` : startTime || endTime || ''

  const deliveryMode = workshop.is_online
    ? 'عن بُعد'
    : workshop.location_type === 'offline'
      ? 'حضوري'
      : 'مختلط'

  items.push({ id: 'delivery', icon: workshop.is_online ? Wifi : MapPin, label: 'نمط الحضور', value: deliveryMode, accent: 'blue' })

  if (workshop.duration_hours != null && workshop.duration_hours > 0) {
    items.push({ id: 'duration', icon: Clock3, label: 'المدة', value: `${workshop.duration_hours} ساعة`, accent: 'navy' })
  }
  if (startDate) {
    items.push({ id: 'start', icon: CalendarDays, label: 'تاريخ البداية', value: startDate, accent: 'blue' })
  }
  if (clockRange) {
    items.push({ id: 'time', icon: Clock3, label: 'الوقت', value: clockRange, accent: 'blue' })
  }
  if (workshop.seats_total != null && workshop.seats_total > 0) {
    items.push({ id: 'seats', icon: Users, label: 'إجمالي المقاعد', value: `${workshop.seats_total} مقعد`, accent: 'green' })
  }
  if (workshop.seats_remaining != null) {
    items.push({ id: 'remaining', icon: Users, label: 'المقاعد المتبقية', value: `${workshop.seats_remaining} مقعد`, accent: 'green' })
  }
  const cert = resolveCertificateAvailability(workshop)
  if (cert.hasCertificate && cert.label) {
    items.push({ id: 'cert', icon: BadgeCheck, label: 'الشهادة', value: cert.label, accent: 'orange' })
  }
  if (!workshop.is_online && workshop.location_type) {
    items.push({ id: 'location', icon: MapPin, label: 'المكان', value: workshop.location_type === 'offline' ? 'حضوري' : 'مختلط', accent: 'navy' })
  }
  if (workshop.is_online && workshop.meeting_link) {
    items.push({ id: 'mode', icon: Monitor, label: 'طريقة التقديم', value: 'أونلاين', accent: 'blue' })
  }

  return items
}

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
    if (!slug) { setNotFound(true); setLoading(false); return }
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
    return () => { alive = false }
  }, [slug])

  useEffect(() => {
    if (!isAuthenticated || !workshop?.course_id) { setAlreadyEnrolled(false); return }
    let alive = true
    void fetchStudentRegistrations().then((regs) => {
      if (!alive) return
      setAlreadyEnrolled(regs.some((r) => r.course_id === workshop.course_id))
    })
    return () => { alive = false }
  }, [isAuthenticated, workshop?.course_id])

  const coverUrl = useMemo(
    () => resolvePublicAssetUrl(workshop?.cover_image ?? null) ?? EMC_COURSE_COVER_PLACEHOLDER,
    [workshop?.cover_image],
  )

  const redirectPath = slug ? `/workshops/${slug}` : '/workshops'
  const isStudent = normalizeRole(user?.role) === 'student'
  const externalUrl = workshop?.external_registration_url ?? null
  const registrationOpen = workshop?.registration_open !== false
  const seatsFull = (workshop?.seats_remaining ?? 1) <= 0 && (workshop?.seats_total ?? 0) > 0

  const metrics = useMemo(() => (workshop ? buildMetrics(workshop) : []), [workshop])
  const certificateAvailability = useMemo(
    () => (workshop ? resolveCertificateAvailability(workshop) : null),
    [workshop],
  )

  async function handleShare() {
    const url = window.location.href
    const title = workshop?.title ?? 'ورشة من EMC'
    if (navigator.share) {
      try { await navigator.share({ title, url }); return } catch { /* fallback */ }
    }
    try {
      await navigator.clipboard.writeText(url)
      toast.success('تم نسخ الرابط')
    } catch {
      toast.error('تعذّر نسخ الرابط')
    }
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

  // ── CTA button (same pattern as CourseDetails) ──────────────────────────────
  function renderCta(size: 'sm' | 'lg' = 'lg') {
    const sm = size === 'sm'
    const base = `inline-flex items-center justify-center gap-2 rounded-xl font-extrabold text-white shadow-lg transition ${
      sm ? 'px-5 py-2.5 text-sm' : 'px-7 py-3.5 text-sm'
    }`

    if (!registrationOpen || seatsFull) {
      return (
        <span className={`${base} cursor-not-allowed bg-slate-300 text-slate-500 shadow-none`}>
          {seatsFull ? 'اكتمل العدد' : 'التسجيل مغلق'}
        </span>
      )
    }
    if (externalUrl) {
      return (
        <a href={externalUrl} target="_blank" rel="noopener noreferrer" className={`${base} bg-[#EC943C]`}>
          <ExternalLink size={18} />
          التسجيل الخارجي
        </a>
      )
    }
    if (alreadyEnrolled) {
      return (
        <Link to="/dashboard/student/courses" className={`${base} bg-emerald-600`}>
          عرض تسجيلي
        </Link>
      )
    }
    if (!isAuthenticated) {
      return (
        <Link to={buildPublicLoginHref(redirectPath)} className={`${base} bg-[#EC943C]`}>
          <GraduationCap size={18} />
          سجّل الدخول للتسجيل
        </Link>
      )
    }
    if (!isStudent) {
      return (
        <button type="button" onClick={() => toast.error(PUBLIC_ENROLL_STUDENT_ONLY_MSG)} className={`${base} bg-[#EC943C]`}>
          <GraduationCap size={18} />
          سجّل في الورشة
        </button>
      )
    }
    if (workshop?.course_slug) {
      return (
        <Link to={buildWorkshopDetailEnrollHref(workshop.course_slug)} className={`${base} bg-[#EC943C]`}>
          <GraduationCap size={18} />
          سجّل في الورشة
        </Link>
      )
    }
    return (
      <button type="button" onClick={scrollToEnroll} className={`${base} bg-[#EC943C]`}>
        <GraduationCap size={18} />
        سجّل في الورشة
      </button>
    )
  }

  // ── Loading / error states ───────────────────────────────────────────────────
  if (loading) {
    return (
      <main className={`relative overflow-x-hidden bg-gradient-to-br from-[#22334A] to-[#2691C2] ${PAGE_TOP}`} dir="rtl">
        <div className="flex min-h-[280px] items-center justify-center py-12">
          <Loader2 className="h-10 w-10 animate-spin text-white/80" />
        </div>
      </main>
    )
  }

  if (loadError && !workshop) {
    return (
      <main className={`overflow-x-hidden bg-[#f8fafc] px-4 pb-20 ${PAGE_TOP} sm:px-6 lg:px-8`} dir="rtl">
        <StateMessage type="error" title="تعذّر التحميل" message="لم نتمكن من تحميل تفاصيل الورشة. حاول مجدداً." />
      </main>
    )
  }

  if (notFound || !workshop) {
    return (
      <main className={`overflow-x-hidden bg-[#f8fafc] px-4 pb-20 ${PAGE_TOP} sm:px-6 lg:px-8`} dir="rtl">
        <StateMessage type="empty" title="الورشة غير موجودة" message="لم نتمكن من العثور على هذه الورشة." />
      </main>
    )
  }

  const w = workshop
  const price = w.price ?? 0
  const isFree = w.is_free
  const priceLabel = isFree ? 'مجانية' : toLatinDigits(formatEuroInteger(price, 'ar'))
  const instructorAvatarUrl = resolvePublicAssetUrl(w.instructor_avatar)
  const seoDesc = w.short_description ?? (w.description ? w.description.slice(0, 160) : `ورشة ${w.title} — EMC`)

  // ── Sidebar enrollment panel (matches CourseDetails enrollSidebar) ───────────
  const enrollSidebar = (
    <div className="overflow-hidden text-right">
      <div className="border-b border-[#22334A]/6 bg-gradient-to-l from-[#2691C2]/8 via-white to-[#EC943C]/5 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-black text-[#22334A]">سجّل في الورشة</h3>
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ring-1 ${
            !registrationOpen || seatsFull
              ? 'bg-orange-50 text-orange-800 ring-orange-100'
              : 'bg-emerald-50 text-emerald-800 ring-emerald-100'
          }`}>
            {seatsFull ? 'اكتمل العدد' : registrationOpen ? 'متاح للتسجيل' : 'مغلق'}
          </span>
        </div>
      </div>
      <div className="border-b border-[#22334A]/6 px-5 py-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-black text-slate-400">الرسوم</span>
          <div className="text-left">
            <span className={`text-xl font-black tabular-nums ${isFree ? 'text-[#2691C2]' : 'text-[#EC943C]'}`}>
              {isFree ? 'مجانية' : priceLabel}
            </span>
          </div>
        </div>
      </div>
      <div className="p-4 sm:p-5">
        {renderCta('sm')}
      </div>
      {/* Instructor in sidebar */}
      {w.instructor_name && (
        <div className="border-t border-[#22334A]/6 bg-gradient-to-br from-[#2691C2]/6 to-white px-4 py-3.5 text-right">
          <p className="mb-2 text-[10px] font-black text-[#22334A]/45">المدرب</p>
          <div className="flex items-start gap-2.5">
            <img
              src={instructorAvatarUrl ?? AVATAR_PLACEHOLDER}
              alt=""
              loading="lazy"
              className="h-11 w-11 shrink-0 rounded-xl object-cover ring-2 ring-[#2691C2]/15"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-[#22334A]">{w.instructor_name}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <main className={`relative overflow-x-hidden bg-[#22334A] pb-20 ${PAGE_TOP} lg:pb-8`} dir="rtl">
      <PublicSeo
        title={w.title}
        description={seoDesc}
        path={`/workshops/${w.slug}`}
        image={coverUrl}
        type="article"
      />

      {/* ── SECTION 1: Premium dark gradient hero (matches PremiumHero exactly) ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#2a4568] via-[#256a9a] to-[#2fa0d4]">
        {/* Glows */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 right-1/4 h-[420px] w-[420px] rounded-full bg-[#3db4e8]/28 blur-[100px]" />
          <div className="absolute -bottom-16 left-0 h-[320px] w-[320px] rounded-full bg-[#EC943C]/16 blur-[80px]" />
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.06)_42%,rgba(255,255,255,0.1)_100%)]"
        />

        <div className="relative mx-auto flex max-w-[88rem] flex-col items-center gap-6 px-4 py-7 sm:px-6 lg:flex-row lg:items-center lg:gap-10 lg:px-10 lg:py-8 xl:px-12">

          {/* Left: text */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-1 flex-col gap-3.5 text-right"
          >
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-1.5 text-[11px] font-semibold text-white/85">
              <Link to="/" className="transition-colors hover:text-white">الرئيسية</Link>
              <span className="text-white/50">/</span>
              <Link to="/workshops" className="transition-colors hover:text-white">الورش</Link>
              <span className="text-white/50">/</span>
              <span className="max-w-[160px] truncate text-white/90">{w.title}</span>
            </nav>

            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full border border-white/35 bg-white/20 px-3 py-1 text-[11px] font-black text-white shadow-sm backdrop-blur-sm">
                ورشة تدريبية
              </span>
              {certificateAvailability?.hasCertificate && certificateAvailability.badgeLabel && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/45 bg-emerald-300/22 px-3 py-1 text-[11px] font-black text-white">
                  <BadgeCheck className="h-3 w-3" />
                  {certificateAvailability.badgeLabel}
                </span>
              )}
              {registrationOpen && !seatsFull && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/45 bg-emerald-300/22 px-3 py-1 text-[11px] font-black text-white">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-100" />
                  التسجيل مفتوح
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-2xl font-black leading-[1.2] tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.35)] sm:text-3xl lg:text-[2.25rem]">
              {w.title}
            </h1>

            {/* Short description */}
            {w.short_description && (
              <p className="max-w-[520px] text-[14px] leading-[1.75] text-white/95 sm:text-[15px]">
                {w.short_description}
              </p>
            )}

            {/* Instructor card in hero */}
            {w.instructor_name && (
              <div className="flex items-center gap-2.5 rounded-xl border border-white/28 bg-white/16 px-3 py-2 backdrop-blur-md">
                <img
                  src={instructorAvatarUrl ?? AVATAR_PLACEHOLDER}
                  alt=""
                  loading="eager"
                  className="h-9 w-9 shrink-0 rounded-full border border-white/35 object-cover"
                />
                <div className="text-right">
                  <p className="text-[10px] font-semibold text-white/80">المدرب</p>
                  <p className="text-sm font-black text-white">{w.instructor_name}</p>
                </div>
              </div>
            )}

            {/* CTA + share */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              {renderCta('lg')}
              <button
                type="button"
                onClick={() => void handleShare()}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/30 bg-white/18 px-3.5 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/28"
              >
                <Share2 className="h-4 w-4" />
                مشاركة
              </button>
            </div>
          </motion.div>

          {/* Right: cover image */}
          <motion.div
            initial={{ opacity: 0, x: -20, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.06 }}
            className="hidden shrink-0 flex-col gap-2 lg:flex lg:w-[400px] xl:w-[460px]"
          >
            <div className="group relative overflow-hidden rounded-2xl border border-white/15 shadow-[0_24px_60px_-16px_rgba(0,0,0,0.35)]">
              <img
                src={coverUrl}
                alt=""
                loading="eager"
                className="aspect-[16/10] w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#2a4568]/45 via-transparent to-transparent" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── LIGHT CONTENT AREA ── */}
      <div className="bg-gradient-to-b from-[#f0f4f8] to-[#f8fafc]">

        {/* ── SECTION 2: Metrics snapshot (same as PremiumSnapshot in CourseDetails) ── */}
        <PremiumSnapshot items={metrics} />

        {/* ── MAIN BODY GRID ── */}
        <div className="mx-auto max-w-[88rem] px-4 py-4 sm:px-6 lg:px-10 lg:py-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-6">

            {/* ── Left column: content ── */}
            <div className="space-y-3">

              {/* Description — same style as PremiumDescription */}
              {(w.description || w.short_description) && (
                <section
                  aria-label="وصف الورشة"
                  dir="rtl"
                  className="rounded-2xl border border-white/80 bg-white/90 p-3.5 shadow-sm sm:p-4"
                >
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-black text-[#22334A]">
                    <span className="h-4 w-1 rounded-full bg-[#2691C2]" aria-hidden />
                    عن الورشة
                  </h2>
                  <div className="space-y-3">
                    {w.description && w.description !== w.short_description ? (
                      <p className="whitespace-pre-line text-[13px] leading-[1.75] text-slate-700">
                        {w.description}
                      </p>
                    ) : w.short_description ? (
                      <p className="whitespace-pre-line text-[13px] leading-[1.75] text-slate-700">
                        {w.short_description}
                      </p>
                    ) : null}
                  </div>
                </section>
              )}

              {/* Mobile enrollment card */}
              <div ref={enrollRef} id="enroll" className="scroll-mt-[calc(4.25rem+1rem)] lg:hidden">
                <div className="overflow-hidden rounded-[1.25rem] border border-white/80 bg-white shadow-[0_16px_48px_-16px_rgba(34,51,74,0.18)] backdrop-blur-xl ring-1 ring-[#22334A]/5">
                  {enrollSidebar}
                </div>
              </div>
            </div>

            {/* ── Right sidebar: sticky enrollment panel ── */}
            <aside className={`hidden lg:sticky ${STICKY_TOP} lg:block lg:self-start`}>
              <div className="overflow-hidden rounded-[1.25rem] border border-white/80 bg-white shadow-[0_16px_48px_-16px_rgba(34,51,74,0.18)] backdrop-blur-xl ring-1 ring-[#22334A]/5">
                {enrollSidebar}
              </div>
            </aside>
          </div>
        </div>
      </div>

      {/* ── Mobile floating enroll bar ── */}
      <PublicMobileEnrollBar
        visible
        priceHint={isFree ? 'مجانية' : priceLabel}
        actionLabel={
          !isAuthenticated
            ? 'تسجيل الدخول للالتحاق'
            : alreadyEnrolled
              ? 'عرض تسجيلي'
              : 'سجّل في الورشة'
        }
        disabled={!registrationOpen || seatsFull}
        onAction={scrollToEnroll}
        extra={
          !isAuthenticated ? (
            <Link
              to={buildPublicLoginHref(redirectPath)}
              className="inline-flex h-12 flex-1 items-center justify-center rounded-xl bg-[#EC943C] px-4 text-sm font-black text-white"
            >
              تسجيل الدخول للالتحاق
            </Link>
          ) : externalUrl ? (
            <a
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 flex-1 items-center justify-center rounded-xl bg-[#EC943C] px-4 text-sm font-black text-white"
            >
              التسجيل الخارجي
            </a>
          ) : undefined
        }
      />
    </main>
  )
}
