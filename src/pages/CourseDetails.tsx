import { useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Award,
  BadgeCheck,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  GraduationCap,
  Languages,
  MapPin,
  Monitor,
  Share2,
  Target,
  Users,
} from 'lucide-react'
import api from '../api/axios'
import toast from '@/lib/toast'
import StateMessage from '../components/StateMessage'
import CourseEnrollmentCard from '@/components/enrollment/CourseEnrollmentCard'
import type { Course, IconComponent } from '../types'
import { fadeUp, formatDuration, formatPrice } from '../utils/course'
import { buildCourseEnrollSignupHref, enrollActionLabel } from '@/utils/enrollmentRedirect'
import { resolvePublicCourseInstructor } from '@/utils/courseInstructor'
import {
  EMC_COURSE_COVER_PLACEHOLDER,
  ITEM_LABELS,
  certificateLineArabic,
  mapCourseStatusArabic,
  mapDeliveryTypeArabic,
  mapProgramTypeArabic,
  mapRegistrationOpen,
  resolveCourseCoverImageUrl,
  resolveItemType,
} from '@/utils/publicCourseDisplay'
import {
  coerceCourseBlockText,
  hasParsableCourseDate,
  normalizeBulletedCourseField,
  normalizeKeywords,
  safeTrimUnknown,
  unwrapPublicCoursePayload,
} from '@/utils/publicCourseNormalize'
import { useAuth } from '@/contexts/AuthContext'
import { fetchStudentRegistrations } from '@/api/studentApi'

export default function CourseDetails() {
  const { slug } = useParams()
  const { user, isAuthenticated } = useAuth()
  const enrollRef = useRef<HTMLDivElement>(null)

  const [course, setCourse] = useState<Course | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [alreadyEnrolled, setAlreadyEnrolled] = useState(false)

  // Load course
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
        if (!item?.slug) { setNotFound(true); setCourse(null); return }
        setCourse(item)
      } catch (err) {
        if (axios.isCancel(err)) return
        if (axios.isAxiosError(err) && err.response?.status === 404) { setNotFound(true); setCourse(null); return }
        setError('تعذر تحميل تفاصيل الدورة. يرجى المحاولة مرة أخرى.')
      } finally {
        setIsLoading(false)
      }
    }
    fetchCourse()
    return () => controller.abort()
  }, [slug])

  // Check enrollment
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
      } catch { /* default false */ }
    })()
    return () => { cancelled = true }
  }, [isAuthenticated, course?.id, user?.role]) // eslint-disable-line react-hooks/exhaustive-deps

  const derived = useMemo(() => {
    if (!course) return null
    const apiExtra = course as unknown as Record<string, unknown>
    const itemType = resolveItemType(course)
    const L = ITEM_LABELS[itemType]
    const isFree = course.type === 'free'
    const registration = mapRegistrationOpen(course)
    const coverUrl = resolveCourseCoverImageUrl(course) ?? EMC_COURSE_COVER_PLACEHOLDER
    const instructor = resolvePublicCourseInstructor(course)
    const deliveryAr = mapDeliveryTypeArabic(course, apiExtra)
    const programAr = mapProgramTypeArabic(course, apiExtra)
    const statusAr = mapCourseStatusArabic(course.status, course.is_published)
    const langRaw = safeTrimUnknown(course.language ?? apiExtra.language)
    const langLooksWrong = langRaw && ['archived','draft','published','active','inactive','cancelled','online','offline','hybrid'].includes(langRaw.toLowerCase())
    const languageDisplay = langLooksWrong ? null : langRaw || null
    const hasStartDate = hasParsableCourseDate(course.start_date)
    const hasEndDate = hasParsableCourseDate(course.end_date)
    const calculatedDuration = formatDuration(course.start_date, course.end_date)
    const explicitDurationStr = safeTrimUnknown(course.duration)
    const displayDuration = explicitDurationStr || calculatedDuration || (!hasStartDate && !hasEndDate ? 'انضم إلى الدورة القادمة' : '')
    const hoursNum = Number(course.training_hours ?? apiExtra.hours_count ?? apiExtra.training_hours)
    const hoursLabel = Number.isFinite(hoursNum) && hoursNum > 0 ? `${Math.round(hoursNum)} ساعة تدريبية` : ''
    const seatsRaw = course.capacity ?? apiExtra.seats_count ?? apiExtra.capacity
    const seatsNum = seatsRaw != null ? Number(seatsRaw) : NaN
    const seatsLabel = Number.isFinite(seatsNum) && seatsNum > 0 ? `${Math.round(seatsNum)} مقعد` : ''
    const regsRaw = course.registrations_count ?? apiExtra.registrations_count
    const regsNum = regsRaw != null ? Number(regsRaw) : NaN
    const seatsFull =
      Number.isFinite(seatsNum) && seatsNum > 0 && Number.isFinite(regsNum) && regsNum >= seatsNum
    const regsLabel = Number.isFinite(regsNum) && regsNum >= 0 ? `${Math.round(regsNum)} مسجَّل` : ''
    const deptLabel = safeTrimUnknown(course.department?.name ?? course.department_name ?? apiExtra.department_name)
    const trackLabel = safeTrimUnknown(course.track_title ?? course.track?.title ?? apiExtra.track_title)
    const certificateLine = certificateLineArabic(course, apiExtra)
    const keywordTags = normalizeKeywords(apiExtra.keywords ?? course.keywords)
    let prerequisitesCombined = coerceCourseBlockText(course.prerequisites ?? apiExtra.prerequisites)
    const requirementsBullets = normalizeBulletedCourseField(apiExtra.requirements)
    if (!prerequisitesCombined && requirementsBullets.length > 0) prerequisitesCombined = requirementsBullets.join('\n')
    const learningOutcomesBlock =
      coerceCourseBlockText(course.learning_outcomes ?? apiExtra.learning_outcomes) ||
      coerceCourseBlockText(apiExtra.expected_outcomes)
    const curriculumBullets = normalizeBulletedCourseField(apiExtra.curriculum_topics)
    const featuresBullets = normalizeBulletedCourseField(course.features ?? apiExtra.features)
    const outcomesBullets = normalizeBulletedCourseField(course.learning_outcomes ?? apiExtra.learning_outcomes)
    const learningSidebarItems = uniqStrings([
      ...outcomesBullets, ...featuresBullets, ...curriculumBullets,
      ...(learningOutcomesBlock ? learningOutcomesBlock.split(/\r?\n+/).map((s) => s.trim()).filter(Boolean) : []),
    ])
    const meetingLink = safeTrimUnknown(course.meeting_link ?? apiExtra.meeting_link)
    const locationLabel = safeTrimUnknown(course.location ?? apiExtra.location)
    const dateRange =
      formatArabicDate(course.start_date) && formatArabicDate(course.end_date) ?
        `${formatArabicDate(course.start_date)} — ${formatArabicDate(course.end_date)}`
      : formatArabicDate(course.start_date) || formatArabicDate(course.end_date) || ''
    const startClock = formatClockLabel(course.start_time ?? apiExtra.start_time)
    const endClock = formatClockLabel(course.end_time ?? apiExtra.end_time)
    const clockRange = startClock && endClock ? `${startClock} — ${endClock}` : startClock || endClock || ''
    const priceLabel = isFree ? 'مجانية' : formatPrice(course.price)
    const enrollSignupHref = buildCourseEnrollSignupHref(course.slug)
    const enrollLabel = enrollActionLabel(itemType)

    // Info tiles (hero section) — type-aware
    const heroTiles: { icon: IconComponent; label: string; value: string; accent?: 'blue' | 'orange' }[] = []
    const pushTile = (icon: IconComponent, label: string, value: unknown, accent?: 'blue' | 'orange') => {
      const v = safeTrimUnknown(value)
      if (!v || v === '—') return
      heroTiles.push({ icon, label, value: v, accent })
    }
    if (deliveryAr) pushTile(Monitor, L.mode, deliveryAr)
    pushTile(Clock3, L.duration, displayDuration || 'انضم إلى الدورة القادمة')
    pushTile(BriefcaseBusiness, 'المدرب', instructor.assigned && instructor.name ? instructor.name : 'يحدد لاحقاً')
    pushTile(Award, 'السعر', priceLabel, isFree ? 'blue' : 'orange')
    if (locationLabel && (deliveryAr === 'حضوري' || deliveryAr === 'هجين')) pushTile(MapPin, 'المكان', locationLabel)
    if (seatsLabel) pushTile(Users, 'المقاعد', seatsLabel)

    // Detail rows (lower section) — type-aware, workshop suppresses course-only rows
    const detailRows: { icon: IconComponent; label: string; value: string }[] = []
    const pushDetail = (icon: IconComponent, label: string, value: unknown) => {
      const v = safeTrimUnknown(value)
      if (!v || v === '—') return
      detailRows.push({ icon, label, value: v })
    }
    if (deliveryAr) pushDetail(Monitor, L.mode, deliveryAr)
    if (programAr) pushDetail(CalendarDays, L.type, programAr)
    pushDetail(BriefcaseBusiness, L.type + ' (الكتالوج)', isFree ? 'مجانية' : 'مدفوعة')
    pushDetail(Clock3, L.duration, displayDuration)
    if (hoursLabel) pushDetail(BookOpen, 'عدد الساعات', hoursLabel)
    const audience = safeTrimUnknown(course.target_audience ?? apiExtra.target_audience)
    if (audience) pushDetail(Target, 'الفئة المستهدفة', audience)
    // Workshop: suppress language, level, track, session_format, study_days
    if (itemType !== 'workshop') {
      if (languageDisplay) pushDetail(Languages, 'لغة الدورة', languageDisplay)
      const level = safeTrimUnknown(course.level ?? apiExtra.level)
      if (level) pushDetail(Award, 'المستوى', level)
      if (trackLabel) pushDetail(BookOpen, 'المسار', trackLabel)
      const sessionFmt = safeTrimUnknown(course.session_format ?? apiExtra.session_format)
      if (sessionFmt) pushDetail(CalendarDays, 'صيغة الجلسات', sessionFmt)
      const studyDays = safeTrimUnknown(course.study_days ?? apiExtra.study_days)
      if (studyDays) pushDetail(BookOpen, 'أيام الدراسة', studyDays)
    }
    if (locationLabel && (deliveryAr === 'حضوري' || deliveryAr === 'هجين')) pushDetail(MapPin, 'المكان', locationLabel)
    if (meetingLink && (deliveryAr === 'عن بُعد' || deliveryAr === 'هجين' || course.is_online)) pushDetail(ExternalLink, 'رابط اللقاء', meetingLink)
    if (seatsLabel) pushDetail(Users, 'عدد المقاعد', seatsLabel)
    if (regsLabel) pushDetail(Users, 'عدد المسجلين', regsLabel)
    if (certificateLine) pushDetail(BadgeCheck, 'الشهادة', certificateLine)
    if (statusAr) pushDetail(BadgeCheck, 'حالة النشر', statusAr)
    if (dateRange) pushDetail(CalendarDays, L.date, dateRange)
    if (clockRange) pushDetail(Clock3, L.time, clockRange)
    if (deptLabel) pushDetail(BriefcaseBusiness, 'الإدارة / القسم', deptLabel)
    // Program: add tracks/outputs
    if (itemType === 'program') {
      const tracks = safeTrimUnknown(apiExtra.tracks_count ?? apiExtra.tracks)
      if (tracks) pushDetail(BookOpen, 'المسارات', tracks)
    }


    return {
      apiExtra, itemType, L, isFree, registration, coverUrl, instructor,
      keywordTags, prerequisitesCombined, learningOutcomesBlock, learningSidebarItems,
      detailRows, heroTiles, meetingLink, deliveryAr, programAr, priceLabel,
      enrollSignupHref, enrollLabel, displayDuration, seatsLabel, seatsFull,
    }
  }, [course])

  function scrollToEnroll() {
    enrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function handleShare() {
    const url = window.location.href
    const title = course?.title ?? 'برنامج تدريبي من EMC'
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

  if (isLoading) return <CourseDetailsLoading />
  if (error) return (
    <main className="bg-slate-50 px-4 pb-20 pt-32 sm:px-6 lg:px-8">
      <StateMessage type="error" title="حدث خطأ" message={error} />
    </main>
  )
  if (notFound || !course || !derived) return (
    <main className="bg-slate-50 px-4 pb-20 pt-32 sm:px-6 lg:px-8">
      <StateMessage type="empty" title="الدورة غير موجودة" message="لم نتمكن من العثور على هذه الدورة." />
    </main>
  )

  const {
    itemType, L, isFree, registration, coverUrl, instructor, keywordTags,
    prerequisitesCombined, learningOutcomesBlock, learningSidebarItems,
    detailRows, heroTiles, meetingLink, priceLabel, enrollSignupHref, enrollLabel,
    deliveryAr, seatsFull,
  } = derived

  const instructorHeading = instructor.assigned && instructor.name ? instructor.name : 'لم يتم تعيين مدرب بعد'
  const pageUrl = window.location.href
  const encodedUrl = encodeURIComponent(pageUrl)
  const encodedTitle = encodeURIComponent(course.title)

  // --- Smart single button ---
  function SmartRegisterButton({ size = 'lg' }: { size?: 'lg' | 'sm' }) {
    const cls = size === 'lg'
      ? 'inline-flex w-full items-center justify-center gap-2 rounded-xl px-7 py-4 font-extrabold text-white shadow-lg sm:w-auto'
      : 'inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-extrabold text-white shadow-md'

    if (!registration.open) {
      return (
        <span className={`${cls} cursor-not-allowed bg-slate-300 text-slate-500 shadow-none`}>
          التسجيل مغلق
        </span>
      )
    }
    if (seatsFull) {
      return (
        <span className={`${cls} cursor-not-allowed bg-slate-300 text-slate-500 shadow-none`}>
          المقاعد مكتملة
        </span>
      )
    }
    if (alreadyEnrolled) {
      return (
        <Link to="/dashboard/student/courses" className={`${cls} bg-emerald-600 shadow-emerald-100`}>
          <BadgeCheck size={20} />
          عرض تسجيلي
        </Link>
      )
    }
    if (!isAuthenticated) {
      return (
        <Link to={enrollSignupHref} className={`${cls} bg-customOrange shadow-orange-100`}>
          <GraduationCap size={20} />
          سجّل حسابك للالتحاق
        </Link>
      )
    }
    // Logged in, not enrolled, open
    return (
      <motion.button
        type="button"
        whileHover={{ scale: 1.04 }}
        onClick={scrollToEnroll}
        className={`${cls} bg-customOrange shadow-orange-100`}
      >
        <GraduationCap size={20} />
        {enrollLabel}
      </motion.button>
    )
  }

  return (
    <main className="bg-slate-50 px-4 pb-20 pt-28 sm:px-6 lg:px-8" dir="rtl">
      <motion.div
        className="mx-auto max-w-7xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.45 }}
      >
        <Breadcrumb courseTitle={course.title} />

        {/* ── Hero section ── */}
        <motion.section
          className="mt-8 grid gap-8 rounded-2xl bg-white p-5 shadow-2xl shadow-slate-200/80 ring-1 ring-slate-100 sm:p-7 lg:grid-cols-[1.05fr_0.95fr] lg:p-9"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          {/* Left: info */}
          <div className="order-1 text-right lg:order-1">
            {/* Type badge */}
            <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-sky-50 px-4 py-2 text-sm font-black text-customBlue">
              <GraduationCap size={17} />
              {L.badge}
            </span>

            {/* Status + enrollment chips */}
            <div className="mt-3 flex flex-wrap items-center justify-start gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${registration.open ? 'bg-emerald-50 text-emerald-800 ring-emerald-100' : 'bg-orange-50 text-orange-800 ring-orange-100'}`}>
                {registration.labelAr}
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${isFree ? 'bg-sky-50 text-customBlue ring-sky-100' : 'bg-orange-50 text-customOrange ring-orange-100'}`}>
                {isFree ? 'مجانية' : priceLabel}
              </span>
            </div>

            <h1 className="mt-4 text-3xl font-black leading-[1.3] text-deepBlue sm:text-4xl lg:text-5xl">
              {course.title}
            </h1>

            {course.short_description && (
              <p className="mt-5 text-lg leading-9 text-slate-600">{course.short_description}</p>
            )}

            {keywordTags.length > 0 && (
              <div className="mt-4 flex flex-wrap justify-start gap-2">
                {keywordTags.map((k, i) => (
                  <span key={`${k}-${i}`} className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600 ring-1 ring-slate-200">{k}</span>
                ))}
              </div>
            )}

            {/* Hero info tiles */}
            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              {heroTiles.map((t, i) => (
                <InfoTile key={i} icon={t.icon} label={t.label} value={t.value} accent={t.accent} />
              ))}
            </div>

            {/* Action row: single smart button + share */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <SmartRegisterButton />

              {/* Share cluster */}
              <div className="flex items-center gap-2">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.04 }}
                  onClick={() => void handleShare()}
                  title="نسخ الرابط / مشاركة"
                  className="inline-flex items-center gap-2 rounded-xl border border-customBlue px-5 py-4 font-extrabold text-customBlue transition hover:bg-sky-50"
                >
                  <Share2 size={18} />
                  شارك
                </motion.button>
                <a
                  href={`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  title="شارك على واتساب"
                  className="inline-flex h-14 w-14 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                </a>
                <a
                  href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`}
                  target="_blank"
                  rel="noreferrer"
                  title="شارك على X"
                  className="inline-flex h-14 w-14 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 transition hover:bg-slate-100"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.255 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  title="شارك على LinkedIn"
                  className="inline-flex h-14 w-14 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-700 transition hover:bg-blue-100"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
                <button
                  type="button"
                  onClick={async () => {
                    try { await navigator.clipboard.writeText(pageUrl); toast.success('تم نسخ الرابط') }
                    catch { toast.error('تعذّر نسخ الرابط') }
                  }}
                  title="نسخ الرابط"
                  className="inline-flex h-14 w-14 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100"
                >
                  <Copy size={17} />
                </button>
              </div>
            </div>

            {meetingLink && registration.open && (deliveryAr === 'عن بُعد' || deliveryAr === 'هجين') && (
              <p className="mt-4 text-right text-sm font-semibold text-slate-600">
                <a href={meetingLink} className="text-customBlue underline-offset-4 hover:underline" target="_blank" rel="noreferrer">فتح رابط اللقاء</a>
              </p>
            )}
          </div>

          {/* Right: cover image */}
          <motion.div className="order-2 lg:order-2" whileHover={{ scale: 1.015 }} transition={{ duration: 0.35 }}>
            <div className="relative h-[360px] overflow-hidden rounded-2xl shadow-xl sm:h-[430px]">
              <img src={coverUrl} alt="" className="h-full w-full object-cover transition duration-700 hover:scale-105" />
              <div className="absolute inset-0 bg-deepBlue/15" />
              <span className={`absolute right-5 top-5 rounded-full px-5 py-2 text-sm font-black text-white ${isFree ? 'bg-customBlue' : 'bg-customOrange'}`}>
                {isFree ? 'مجانية' : 'مدفوعة'}
              </span>
              <span className="absolute left-5 top-5 rounded-full bg-deepBlue/80 px-4 py-1.5 text-xs font-black text-white backdrop-blur-sm">
                {L.badge}
              </span>
            </div>
          </motion.div>
        </motion.section>

        {/* ── Summary + sticky registration + instructor ── */}
        <section className="mt-10 grid gap-8 lg:grid-cols-[1fr_minmax(300px,380px)] lg:items-start">
          {/* Summary (right in RTL) */}
          <motion.article
            className="order-1 rounded-2xl bg-white p-6 text-right shadow-xl shadow-slate-200/70 ring-1 ring-slate-100 sm:p-8 lg:col-start-1 lg:row-start-1"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5 }}
          >
            <CardHeading>
              {itemType === 'workshop' ? 'ملخص الورشة' : itemType === 'program' ? 'ملخص البرنامج' : 'ملخص الدورة'}
            </CardHeading>
            {course.short_description && (
              <p className="mt-5 text-base leading-9 text-slate-600">{course.short_description}</p>
            )}
            {detailRows.length > 0 && (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {detailRows.map((item, idx) => (
                  <DetailRow key={`${item.label}-${idx}`} {...item} />
                ))}
              </div>
            )}
          </motion.article>

          {/* Sticky registration (left in RTL) */}
          <aside
            ref={enrollRef}
            id="enroll"
            className="order-2 scroll-mt-28 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-24 lg:self-start"
          >
            <RegistrationSidebarCard
              course={course}
              itemType={itemType}
              isFree={isFree}
              priceLabel={priceLabel}
              registrationOpen={registration.open}
              seatsFull={seatsFull}
              alreadyEnrolled={alreadyEnrolled}
              heroTiles={heroTiles.slice(0, 4)}
            />
          </aside>

          {/* Instructor */}
          <motion.article
            className="order-3 rounded-2xl bg-white p-6 text-right shadow-xl shadow-slate-200/70 ring-1 ring-slate-100 lg:col-start-1 lg:row-start-2"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.5 }}
          >
            <CardHeading>نبذة عن المدرّب</CardHeading>
            <div className="mt-6 flex items-center gap-4">
              <img
                src={
                  instructor.assigned ?
                    instructor.avatarUrl ?? EMC_INSTRUCTOR_AVATAR_PLACEHOLDER
                  : EMC_INSTRUCTOR_AVATAR_PLACEHOLDER
                }
                alt=""
                className="h-16 w-16 shrink-0 rounded-full object-cover ring-4 ring-sky-50"
              />
              <div className="min-w-0">
                <h3 className="text-lg font-black leading-snug text-deepBlue">{instructorHeading}</h3>
                {instructor.assigned && instructor.title && (
                  <p className="mt-0.5 text-sm font-bold text-customBlue">{instructor.title}</p>
                )}
                {instructor.assigned && instructor.email && (
                  <a
                    href={`mailto:${instructor.email}`}
                    className="mt-1 block truncate text-xs font-semibold text-slate-500 hover:text-customBlue"
                    dir="ltr"
                  >
                    {instructor.email}
                  </a>
                )}
              </div>
            </div>
            {instructor.assigned && instructor.bio && (
              <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-4">
                <p className="whitespace-pre-line text-sm font-semibold leading-8 text-slate-700">{instructor.bio}</p>
              </div>
            )}
          </motion.article>
        </section>

        {/* ── Long-form content below ── */}
        <section className="mt-10 space-y-8">
          {(course.description || prerequisitesCombined || learningOutcomesBlock) && (
            <motion.article
              className="rounded-2xl bg-white p-6 text-right shadow-xl shadow-slate-200/70 ring-1 ring-slate-100 sm:p-8"
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.5 }}
            >
              <CardHeading>
                {itemType === 'workshop' ? 'تفاصيل الورشة' : itemType === 'program' ? 'تفاصيل البرنامج' : 'تفاصيل الدورة'}
              </CardHeading>

              {course.description && (
                <p className="mt-7 whitespace-pre-line text-lg leading-10 text-slate-600">{course.description}</p>
              )}

              {prerequisitesCombined && (
                <div className="mt-6 rounded-xl border border-sky-100 bg-sky-50/80 px-5 py-4 text-right">
                  <p className="text-xs font-black uppercase tracking-wide text-customBlue">المتطلبات المسبقة</p>
                  <p className="mt-2 whitespace-pre-line text-sm font-semibold leading-7 text-slate-700">
                    {prerequisitesCombined}
                  </p>
                </div>
              )}

              {learningOutcomesBlock && (
                <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/60 px-5 py-4 text-right">
                  <p className="text-xs font-black uppercase tracking-wide text-emerald-800">المخرجات التعليمية</p>
                  <p className="mt-2 whitespace-pre-line text-sm font-semibold leading-7 text-slate-700">
                    {learningOutcomesBlock}
                  </p>
                </div>
              )}
            </motion.article>
          )}

          {learningSidebarItems.length > 0 && (
            <motion.article
              className="rounded-2xl bg-white p-6 text-right shadow-xl shadow-slate-200/70 ring-1 ring-slate-100 sm:p-8"
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.5 }}
            >
              <CardHeading>
                {itemType === 'workshop' ? 'ما ستغطيه الورشة' : 'المنهاج والمحتوى'}
              </CardHeading>
              <ul className="mt-7 grid gap-3 sm:grid-cols-2">
                {learningSidebarItems.map((item, i) => (
                  <li
                    key={`${item}-${i}`}
                    className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm font-bold leading-7 text-slate-600"
                  >
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-customBlue" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.article>
          )}
        </section>

        {/* ── CTA banner ── */}
        <CourseDetailsCTA
          course={course}
          coverUrl={coverUrl}
          registrationOpen={registration.open}
          seatsFull={seatsFull}
          alreadyEnrolled={alreadyEnrolled}
          isAuthenticated={isAuthenticated}
          enrollSignupHref={enrollSignupHref}
          enrollLabel={enrollLabel}
          onScrollToEnroll={scrollToEnroll}
        />
      </motion.div>
    </main>
  )
}

// ─── Placeholder / helpers ──────────────────────────────────────────────────

const EMC_INSTRUCTOR_AVATAR_PLACEHOLDER =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#22334A"/><stop offset="100%" stop-color="#2691C2"/></linearGradient></defs><circle cx="80" cy="80" r="80" fill="url(#g)"/><circle cx="80" cy="62" r="22" fill="#ffffff33"/><path fill="#ffffff44" d="M36 138c10-26 26-38 44-38s34 12 44 38"/></svg>`,
  )

function uniqStrings(lines: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of lines) {
    const line = raw.trim()
    if (!line || seen.has(line)) continue
    seen.add(line)
    out.push(line)
  }
  return out
}

function formatArabicDate(raw: unknown): string {
  if (!hasParsableCourseDate(raw)) return ''
  try {
    return new Intl.DateTimeFormat('ar', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(String(raw)))
  } catch { return '' }
}

function formatClockLabel(raw: unknown): string {
  const s = safeTrimUnknown(raw)
  if (!s) return ''
  const d = Date.parse(`1970-01-01T${s}`)
  if (!Number.isFinite(d)) return s
  try { return new Intl.DateTimeFormat('ar', { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(d)) }
  catch { return s }
}

function CourseDetailsLoading() {
  return (
    <main className="bg-slate-50 px-4 pb-20 pt-28 sm:px-6 lg:px-8" dir="rtl">
      <div className="mx-auto max-w-7xl">
        <div className="h-6 w-64 animate-pulse rounded bg-slate-200" />
        <div className="mt-8 grid gap-8 rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-100 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-5">
            <div className="h-10 w-[85%] animate-pulse rounded bg-slate-200" />
            <div className="h-28 animate-pulse rounded bg-slate-100" />
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          </div>
          <div className="h-[430px] animate-pulse rounded-2xl bg-slate-200" />
        </div>
        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_minmax(300px,380px)]">
          <div className="h-64 animate-pulse rounded-2xl bg-slate-200/70" />
          <div className="h-[520px] animate-pulse rounded-2xl bg-slate-200/70" />
          <div className="h-48 animate-pulse rounded-2xl bg-slate-200/70 lg:col-start-1" />
        </div>
      </div>
    </main>
  )
}

function Breadcrumb({ courseTitle }: { courseTitle: string }) {
  return (
    <nav className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-500">
      <Link to="/" className="transition hover:text-customBlue">الرئيسية</Link>
      <span className="text-customOrange">&gt;</span>
      <Link to="/courses" className="transition hover:text-customBlue">الدورات</Link>
      <span className="text-customOrange">&gt;</span>
      <span className="text-deepBlue">{courseTitle}</span>
    </nav>
  )
}

function InfoTile({ icon: Icon, label, value, accent = 'blue' }: { icon: IconComponent; label: string; value: string; accent?: 'blue' | 'orange' }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <div className="flex items-center gap-3">
        <span className={`grid h-11 w-11 place-items-center rounded-lg ${accent === 'orange' ? 'bg-orange-50 text-customOrange' : 'bg-sky-50 text-customBlue'}`}>
          <Icon size={21} />
        </span>
        <div>
          <span className="block text-xs font-black text-slate-400">{label}</span>
          <strong className={`mt-1 block text-base font-black ${accent === 'orange' ? 'text-customOrange' : 'text-deepBlue'}`}>{value}</strong>
        </div>
      </div>
    </div>
  )
}

function CardHeading({ children }: { children: string }) {
  return (
    <div>
      <h2 className="text-2xl font-black text-deepBlue">{children}</h2>
      <span className="mt-3 block h-1 w-16 rounded-full bg-customOrange" />
    </div>
  )
}

function DetailRow({ icon: Icon, label, value }: { icon: IconComponent; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-white text-customBlue shadow-sm"><Icon size={20} /></span>
      <div className="min-w-0">
        <span className="block text-xs font-black text-slate-400">{label}</span>
        <strong className="mt-1 block break-words text-sm font-black text-deepBlue">{value}</strong>
      </div>
    </div>
  )
}

function RegistrationSidebarCard({
  course,
  itemType,
  isFree,
  priceLabel,
  registrationOpen,
  seatsFull,
  alreadyEnrolled,
  heroTiles,
}: {
  course: Course
  itemType: ReturnType<typeof resolveItemType>
  isFree: boolean
  priceLabel: string
  registrationOpen: boolean
  seatsFull: boolean
  alreadyEnrolled: boolean
  heroTiles: { label: string; value: string }[]
}) {
  return (
    <CourseEnrollmentCard
      course={course}
      itemType={itemType}
      isFree={isFree}
      priceLabel={priceLabel}
      registrationOpen={registrationOpen}
      seatsFull={seatsFull}
      alreadyEnrolled={alreadyEnrolled}
      heroTiles={heroTiles}
    />
  )
}

function CourseDetailsCTA({
  course, coverUrl, registrationOpen, seatsFull, alreadyEnrolled,
  isAuthenticated, enrollSignupHref, enrollLabel, onScrollToEnroll,
}: {
  course: Course; coverUrl: string; registrationOpen: boolean; seatsFull: boolean
  alreadyEnrolled: boolean; isAuthenticated: boolean; enrollSignupHref: string
  enrollLabel: string; onScrollToEnroll: () => void
}) {
  function renderBtn() {
    if (!registrationOpen)
      return <span className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 px-7 py-4 font-extrabold text-slate-200 sm:w-auto">التسجيل مغلق</span>
    if (seatsFull)
      return <span className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 px-7 py-4 font-extrabold text-slate-200 sm:w-auto">المقاعد مكتملة</span>
    if (alreadyEnrolled)
      return <Link to="/dashboard/student/courses" className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-7 py-4 font-extrabold text-white sm:w-auto"><BadgeCheck size={20} />عرض تسجيلي</Link>
    if (!isAuthenticated)
      return <Link to={enrollSignupHref} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-customOrange px-7 py-4 font-extrabold text-white sm:w-auto"><GraduationCap size={20} />سجّل حسابك للالتحاق</Link>
    return (
      <motion.button type="button" whileHover={{ scale: 1.04 }} onClick={onScrollToEnroll}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-customOrange px-7 py-4 font-extrabold text-white sm:w-auto">
        <GraduationCap size={20} />{enrollLabel}
      </motion.button>
    )
  }

  return (
    <motion.section
      className="mt-10 grid items-center gap-8 overflow-hidden rounded-2xl bg-gradient-to-l from-deepBlue via-[#1c4567] to-[#162334] px-6 py-9 text-white shadow-2xl sm:px-10 lg:grid-cols-[1fr_360px]"
      variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.5 }}
    >
      <div className="text-right">
        <h2 className="text-3xl font-black leading-tight sm:text-4xl">{course.title}</h2>
        {course.short_description && <p className="mt-4 text-lg leading-9 text-slate-200">{course.short_description}</p>}
        <div className="mt-7 flex flex-col gap-4 sm:flex-row">
          {renderBtn()}
          <motion.div whileHover={{ scale: 1.04 }}>
            <Link to="/courses" className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-customBlue px-7 py-4 font-extrabold text-white sm:w-auto">
              استكشف جميع الدورات <ArrowLeft size={20} />
            </Link>
          </motion.div>
        </div>
      </div>
      <img src={coverUrl} alt="" className="h-72 w-full rounded-2xl object-cover opacity-95 shadow-2xl" />
    </motion.section>
  )
}
