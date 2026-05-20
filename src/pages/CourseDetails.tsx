import { useEffect, useMemo, useState } from 'react'
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
  ExternalLink,
  GraduationCap,
  Languages,
  MapPin,
  Monitor,
  Share2,
  Target,
  UserPlus,
  Users,
} from 'lucide-react'
import api from '../api/axios'
import StateMessage from '../components/StateMessage'
import type { Course, IconComponent } from '../types'
import { fadeUp, formatDuration, formatPrice } from '../utils/course'
import { resolvePublicCourseInstructor } from '@/utils/courseInstructor'
import {
  EMC_COURSE_COVER_PLACEHOLDER,
  certificateLineArabic,
  mapCourseStatusArabic,
  mapDeliveryTypeArabic,
  mapProgramTypeArabic,
  mapRegistrationOpen,
  resolveCourseCoverImageUrl,
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

export default function CourseDetails() {
  const { slug } = useParams()
  const { user, isAuthenticated } = useAuth()
  const [course, setCourse] = useState<Course | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!slug) {
      setIsLoading(false)
      setNotFound(true)
      setCourse(null)
      return
    }

    const controller = new AbortController()
    const slugParam = slug

    async function fetchCourse() {
      try {
        setIsLoading(true)
        setError('')
        setNotFound(false)

        const response = await api.get<Course | { data?: Course }>(
          `/courses/${encodeURIComponent(slugParam)}`,
          {
            signal: controller.signal,
            skipErrorToast: true,
          },
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

  const derived = useMemo(() => {
    if (!course) return null

    const apiExtra = course as unknown as Record<string, unknown>

    const isFree = course.type === 'free'
    const registration = mapRegistrationOpen(course)

    const coverUrl = resolveCourseCoverImageUrl(course) ?? EMC_COURSE_COVER_PLACEHOLDER

    const instructor = resolvePublicCourseInstructor(course)

    const deliveryAr = mapDeliveryTypeArabic(course, apiExtra)
    const programAr = mapProgramTypeArabic(course, apiExtra)
    const statusAr = mapCourseStatusArabic(course.status, course.is_published)

    const langRaw = safeTrimUnknown(course.language ?? apiExtra.language)
    const langLooksWrong =
      langRaw &&
      ['archived', 'draft', 'published', 'active', 'inactive', 'cancelled', 'online', 'offline', 'hybrid'].includes(
        langRaw.toLowerCase(),
      )
    const languageDisplay = langLooksWrong ? null : langRaw || null

    const hasStartDate = hasParsableCourseDate(course.start_date)
    const hasEndDate = hasParsableCourseDate(course.end_date)
    const calculatedDuration = formatDuration(course.start_date, course.end_date)
    const explicitDurationStr = safeTrimUnknown(course.duration)
    const noPublishedSchedule = !hasStartDate && !hasEndDate
    const displayDuration =
      explicitDurationStr ||
      calculatedDuration ||
      (noPublishedSchedule ? 'انضم إلى الدورة القادمة' : '')

    const hoursNum = Number(course.training_hours ?? apiExtra.hours_count ?? apiExtra.training_hours)
    const hoursLabel =
      Number.isFinite(hoursNum) && hoursNum > 0 ? `${Math.round(hoursNum)} ساعة تدريبية` : ''

    const seatsRaw = course.capacity ?? apiExtra.seats_count ?? apiExtra.capacity
    const seatsNum = seatsRaw != null ? Number(seatsRaw) : NaN
    const seatsLabel =
      Number.isFinite(seatsNum) && seatsNum > 0 ? `${Math.round(seatsNum)} مقعد` : ''

    const regsRaw = course.registrations_count ?? apiExtra.registrations_count
    const regsNum = regsRaw != null ? Number(regsRaw) : NaN
    const regsLabel =
      Number.isFinite(regsNum) && regsNum >= 0 ? `${Math.round(regsNum)} مسجَّل` : ''

    const deptLabel = safeTrimUnknown(course.department?.name ?? course.department_name ?? apiExtra.department_name)
    const trackLabel = safeTrimUnknown(course.track_title ?? course.track?.title ?? apiExtra.track_title)

    const certificateLine = certificateLineArabic(course, apiExtra)

    const keywordTags = normalizeKeywords(apiExtra.keywords ?? course.keywords)

    let prerequisitesCombined = coerceCourseBlockText(course.prerequisites ?? apiExtra.prerequisites)
    const requirementsBullets = normalizeBulletedCourseField(apiExtra.requirements)
    if (!prerequisitesCombined && requirementsBullets.length > 0) {
      prerequisitesCombined = requirementsBullets.join('\n')
    }

    const learningOutcomesBlock =
      coerceCourseBlockText(course.learning_outcomes ?? apiExtra.learning_outcomes) ||
      coerceCourseBlockText(apiExtra.expected_outcomes)

    const curriculumBullets = normalizeBulletedCourseField(apiExtra.curriculum_topics)
    const featuresBullets = normalizeBulletedCourseField(course.features ?? apiExtra.features)
    const outcomesBullets = normalizeBulletedCourseField(course.learning_outcomes ?? apiExtra.learning_outcomes)

    const learningSidebarItems = uniqStrings([
      ...outcomesBullets,
      ...featuresBullets,
      ...curriculumBullets,
      ...(learningOutcomesBlock ?
        learningOutcomesBlock.split(/\r?\n+/).map((s) => s.trim()).filter(Boolean)
      : []),
    ])

    const meetingLink = safeTrimUnknown(course.meeting_link ?? apiExtra.meeting_link)
    const locationLabel = safeTrimUnknown(course.location ?? apiExtra.location)

    const dateRange =
      formatArabicDate(course.start_date) && formatArabicDate(course.end_date) ?
        `${formatArabicDate(course.start_date)} — ${formatArabicDate(course.end_date)}`
      : formatArabicDate(course.start_date) || formatArabicDate(course.end_date) || ''

    const startClock = formatClockLabel(course.start_time ?? apiExtra.start_time)
    const endClock = formatClockLabel(course.end_time ?? apiExtra.end_time)
    const clockRange =
      startClock && endClock ? `${startClock} — ${endClock}`
      : startClock || endClock || ''

    const catalogTypeLabel = isFree ? 'مجانية' : 'مدفوعة'
    const priceLabel = isFree ? 'مجانية' : formatPrice(course.price)
    const registerLabel = isFree ? 'سجل الآن مجاناً' : 'سجل الآن'

    const registerHref = `/courses/${course.slug}/register`
    const loginNextHref = `/login?next=${encodeURIComponent(registerHref)}`

    const detailRows: { icon: IconComponent; label: string; value: string }[] = []

    function pushDetail(icon: IconComponent, label: string, value: unknown) {
      const v = safeTrimUnknown(value)
      if (!v || v === '—') return
      detailRows.push({ icon, label, value: v })
    }

    if (deliveryAr) pushDetail(Monitor, 'نمط التقديم', deliveryAr)
    if (programAr) pushDetail(CalendarDays, 'نوع البرنامج', programAr)
    pushDetail(BriefcaseBusiness, 'نوع الدورة بالكتالوج', catalogTypeLabel)

    pushDetail(Clock3, 'المدة', displayDuration)

    if (hoursLabel) pushDetail(BookOpen, 'عدد الساعات', hoursLabel)

    const audience = safeTrimUnknown(course.target_audience ?? apiExtra.target_audience)
    if (audience) pushDetail(Target, 'الفئة المستهدفة', audience)

    if (languageDisplay) pushDetail(Languages, 'لغة الدورة', languageDisplay)

    const level = safeTrimUnknown(course.level ?? apiExtra.level)
    if (level) pushDetail(Award, 'المستوى', level)

    if (locationLabel && (deliveryAr === 'حضوري' || deliveryAr === 'هجين')) {
      pushDetail(MapPin, 'المكان', locationLabel)
    }

    if (meetingLink && (deliveryAr === 'عن بُعد' || deliveryAr === 'هجين' || course.is_online)) {
      pushDetail(ExternalLink, 'رابط اللقاء', meetingLink)
    }

    if (seatsLabel) pushDetail(Users, 'عدد المقاعد', seatsLabel)
    if (regsLabel) pushDetail(Users, 'عدد المسجلين', regsLabel)

    if (certificateLine) pushDetail(BadgeCheck, 'الشهادة', certificateLine)

    if (statusAr) pushDetail(BadgeCheck, 'حالة النشر', statusAr)

    pushDetail(BadgeCheck, 'التسجيل', registration.labelAr)

    if (dateRange) pushDetail(CalendarDays, 'التواريخ', dateRange)
    if (clockRange) pushDetail(Clock3, 'أوقات اللقاء', clockRange)

    if (deptLabel) pushDetail(BriefcaseBusiness, 'الإدارة / القسم', deptLabel)
    if (trackLabel) pushDetail(BookOpen, 'المسار', trackLabel)

    const sessionFmt = safeTrimUnknown(course.session_format ?? apiExtra.session_format)
    if (sessionFmt) pushDetail(CalendarDays, 'صيغة الجلسات', sessionFmt)

    const studyDays = safeTrimUnknown(course.study_days ?? apiExtra.study_days)
    if (studyDays) pushDetail(BookOpen, 'أيام الدراسة', studyDays)

    return {
      apiExtra,
      isFree,
      registration,
      coverUrl,
      instructor,
      keywordTags,
      prerequisitesCombined,
      learningOutcomesBlock,
      learningSidebarItems,
      detailRows,
      meetingLink,
      locationLabel,
      deliveryAr,
      programAr,
      catalogTypeLabel,
      priceLabel,
      registerLabel,
      registerHref,
      loginNextHref,
      displayDuration,
      seatsLabel,
    }
  }, [course])

  if (isLoading) return <CourseDetailsLoading />

  if (error) {
    return (
      <main className="bg-slate-50 px-4 pb-20 pt-32 sm:px-6 lg:px-8">
        <StateMessage type="error" title="حدث خطأ" message={error} />
      </main>
    )
  }

  if (notFound || !course || !derived) {
    return (
      <main className="bg-slate-50 px-4 pb-20 pt-32 sm:px-6 lg:px-8">
        <StateMessage
          type="empty"
          title="الدورة غير موجودة"
          message="لم نتمكن من العثور على هذه الدورة. يمكنك الرجوع إلى صفحة الدورات واختيار دورة أخرى."
        />
      </main>
    )
  }

  const {
    registration,
    coverUrl,
    instructor,
    keywordTags,
    prerequisitesCombined,
    learningOutcomesBlock,
    learningSidebarItems,
    detailRows,
    meetingLink,
    isFree,
    priceLabel,
    registerLabel,
    registerHref,
    loginNextHref,
    displayDuration,
    seatsLabel,
    deliveryAr,
    programAr,
    catalogTypeLabel,
  } = derived

  const instructorHeading = instructor.assigned && instructor.name ? instructor.name : 'لم يتم تعيين مدرب بعد'
  const isStudent = user?.role === 'student'

  return (
    <main className="bg-slate-50 px-4 pb-20 pt-28 sm:px-6 lg:px-8">
      <motion.div
        className="mx-auto max-w-7xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.45 }}
      >
        <Breadcrumb courseTitle={course.title} />

        <motion.section
          className="mt-8 grid gap-8 rounded-2xl bg-white p-5 shadow-2xl shadow-slate-200/80 ring-1 ring-slate-100 sm:p-7 lg:grid-cols-[1.05fr_0.95fr] lg:p-9"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          <div className="order-2 text-right lg:order-1">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-sky-50 px-4 py-2 text-sm font-black text-customBlue">
              <GraduationCap size={17} />
              تفاصيل البرنامج التدريبي
            </span>

            <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${
                  registration.open ? 'bg-emerald-50 text-emerald-800 ring-emerald-100' : 'bg-orange-50 text-orange-800 ring-orange-100'
                }`}
              >
                {registration.labelAr}
              </span>
              {derived.registration.open && isAuthenticated && isStudent ?
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200">
                  حساب طالب — يمكن إكمال التسجيل ببيانات ملفك
                </span>
              : null}
            </div>

            <h1 className="mt-4 text-3xl font-black leading-[1.3] text-deepBlue sm:text-4xl lg:text-5xl">
              {course.title}
            </h1>

            {course.short_description ?
              <p className="mt-5 text-lg leading-9 text-slate-600">{course.short_description}</p>
            : null}

            {keywordTags.length > 0 ?
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                {keywordTags.map((k, i) => (
                  <span
                    key={`${k}-${i}`}
                    className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600 ring-1 ring-slate-200"
                  >
                    {k}
                  </span>
                ))}
              </div>
            : null}

            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              {deliveryAr ?
                <InfoTile icon={Monitor} label="نمط التقديم" value={deliveryAr} />
              : null}
              {programAr ?
                <InfoTile icon={CalendarDays} label="نوع البرنامج" value={programAr} />
              : null}
              <InfoTile icon={BriefcaseBusiness} label="نوع الدورة" value={catalogTypeLabel} />
              <InfoTile icon={Clock3} label="المدة" value={displayDuration || 'انضم إلى الدورة القادمة'} />
              <InfoTile icon={BriefcaseBusiness} label="المدرب" value={instructorHeading} />
              <InfoTile icon={Award} label="السعر" value={priceLabel} accent={isFree ? 'blue' : 'orange'} />
              {derived.locationLabel && (deliveryAr === 'حضوري' || deliveryAr === 'هجين') ?
                <InfoTile icon={MapPin} label="المكان" value={derived.locationLabel} />
              : null}
              {seatsLabel ?
                <InfoTile icon={Users} label="المقاعد" value={seatsLabel} />
              : null}
            </div>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
              {registration.open ?
                <>
                  <motion.div whileHover={{ scale: 1.04 }}>
                    <Link
                      to={registerHref}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-customOrange px-7 py-4 font-extrabold text-white shadow-lg shadow-orange-100 sm:w-auto"
                    >
                      <UserPlus size={20} />
                      {registerLabel}
                    </Link>
                  </motion.div>
                  {!isAuthenticated ?
                    <motion.div whileHover={{ scale: 1.03 }}>
                      <Link
                        to={loginNextHref}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-customBlue px-7 py-4 font-extrabold text-customBlue transition hover:bg-sky-50 sm:w-auto"
                      >
                        تسجيل الدخول ثم التسجيل في الدورة
                      </Link>
                    </motion.div>
                  : null}
                </>
              :
                <span className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-200 px-7 py-4 font-extrabold text-slate-600 sm:w-auto">
                  التسجيل مغلق
                </span>
              }

              <motion.button
                type="button"
                whileHover={{ scale: 1.04 }}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-customBlue px-7 py-4 font-extrabold text-customBlue transition hover:bg-sky-50"
              >
                <Share2 size={20} />
                شارك الدورة
              </motion.button>
            </div>

            {meetingLink && registration.open && (deliveryAr === 'عن بُعد' || deliveryAr === 'هجين') ?
              <p className="mt-4 text-right text-sm font-semibold text-slate-600">
                <a href={meetingLink} className="text-customBlue underline-offset-4 hover:underline" target="_blank" rel="noreferrer">
                  فتح رابط اللقاء
                </a>
              </p>
            : null}
          </div>

          <motion.div
            className="order-1 lg:order-2"
            whileHover={{ scale: 1.015 }}
            transition={{ duration: 0.35 }}
          >
            <div className="relative h-[360px] overflow-hidden rounded-2xl shadow-xl sm:h-[430px]">
              <img src={coverUrl} alt="" className="h-full w-full object-cover transition duration-700 hover:scale-105" />
              <div className="absolute inset-0 bg-deepBlue/15" />

              <span
                className={`absolute right-5 top-5 rounded-full px-5 py-2 text-sm font-black text-white ${
                  isFree ? 'bg-customBlue' : 'bg-customOrange'
                }`}
              >
                {isFree ? 'مجانية' : 'مدفوعة'}
              </span>
            </div>
          </motion.div>
        </motion.section>

        <section className="mt-10 grid gap-8 lg:grid-cols-[1fr_380px]">
          <motion.article
            className="rounded-2xl bg-white p-6 text-right shadow-xl shadow-slate-200/70 ring-1 ring-slate-100 sm:p-8"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5 }}
          >
            <CardHeading>تفاصيل الدورة</CardHeading>

            {course.description ?
              <p className="mt-7 whitespace-pre-line text-lg leading-10 text-slate-600">{course.description}</p>
            : null}

            {prerequisitesCombined ?
              <div className="mt-6 rounded-xl border border-sky-100 bg-sky-50/80 px-5 py-4 text-right">
                <p className="text-xs font-black uppercase tracking-wide text-customBlue">المتطلبات المسبقة</p>
                <p className="mt-2 whitespace-pre-line text-sm font-semibold leading-7 text-slate-700">
                  {prerequisitesCombined}
                </p>
              </div>
            : null}

            {learningOutcomesBlock ?
              <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/60 px-5 py-4 text-right">
                <p className="text-xs font-black uppercase tracking-wide text-emerald-800">المخرجات التعليمية</p>
                <p className="mt-2 whitespace-pre-line text-sm font-semibold leading-7 text-slate-700">
                  {learningOutcomesBlock}
                </p>
              </div>
            : null}

            {detailRows.length > 0 ?
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {detailRows.map((item, idx) => (
                  <DetailRow key={`${item.label}-${idx}`} {...item} />
                ))}
              </div>
            : null}
          </motion.article>

          <aside className="grid gap-8">
            {learningSidebarItems.length > 0 ?
              <motion.article
                className="rounded-2xl bg-white p-6 text-right shadow-xl shadow-slate-200/70 ring-1 ring-slate-100"
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.5 }}
              >
                <CardHeading>ما ستغطيه الدورة</CardHeading>

                <ul className="mt-7 grid gap-4">
                  {learningSidebarItems.map((item, index) => (
                    <li
                      key={`${item}-${index}`}
                      className="flex items-start gap-3 text-sm font-bold leading-7 text-slate-600"
                    >
                      <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-customBlue" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.article>
            : null}

            <motion.article
              className="rounded-2xl bg-white p-6 text-right shadow-xl shadow-slate-200/70 ring-1 ring-slate-100"
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.5 }}
            >
              <CardHeading>المدرب</CardHeading>

              <div className="mt-7 flex items-center gap-4">
                <img
                  src={
                    instructor.assigned ?
                      instructor.avatarUrl ?? EMC_INSTRUCTOR_AVATAR_PLACEHOLDER
                    : EMC_INSTRUCTOR_AVATAR_PLACEHOLDER
                  }
                  alt=""
                  className="h-20 w-20 rounded-full object-cover ring-4 ring-sky-50"
                />

                <div>
                  <h3 className="text-xl font-black text-deepBlue">{instructorHeading}</h3>
                  {instructor.assigned && instructor.title ?
                    <p className="mt-1 text-sm font-bold text-customBlue">{instructor.title}</p>
                  : null}
                </div>
              </div>

              {instructor.assigned && instructor.email ?
                <p className="mt-4 text-sm font-semibold text-slate-600">
                  البريد:{' '}
                  <a href={`mailto:${instructor.email}`} className="text-customBlue hover:underline">
                    {instructor.email}
                  </a>
                </p>
              : null}

              {instructor.assigned && instructor.bio ?
                <p className="mt-5 whitespace-pre-line leading-8 text-slate-600">{instructor.bio}</p>
              : instructor.assigned ?
                null
              : null}

              <motion.div whileHover={{ scale: 1.03 }} className="mt-6">
                <Link
                  to="/courses"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-deepBlue px-5 py-3 text-sm font-extrabold text-white"
                >
                  عرض جميع الدورات
                  <ArrowLeft size={18} />
                </Link>
              </motion.div>
            </motion.article>
          </aside>
        </section>

        <CourseDetailsCTA course={course} coverUrl={coverUrl} registerHref={registerHref} registrationOpen={registration.open} registerLabel={registerLabel} />
      </motion.div>
    </main>
  )
}

/** لوحة ألوان EMC بسيطة لصورة المدرب عند غيوب الصورة الحقيقية */
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
    return new Intl.DateTimeFormat('ar', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(String(raw)))
  } catch {
    return ''
  }
}

function formatClockLabel(raw: unknown): string {
  const s = safeTrimUnknown(raw)
  if (!s) return ''
  const d = Date.parse(`1970-01-01T${s}`)
  if (!Number.isFinite(d)) return s
  try {
    return new Intl.DateTimeFormat('ar', { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(d))
  } catch {
    return s
  }
}

function CourseDetailsLoading() {
  return (
    <main className="bg-slate-50 px-4 pb-20 pt-28 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="h-6 w-64 animate-pulse rounded bg-slate-200" />
        <div className="mt-8 grid gap-8 rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-100 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-5">
            <div className="h-10 w-[85%] animate-pulse rounded bg-slate-200" />
            <div className="h-28 animate-pulse rounded bg-slate-100" />
            <div className="flex flex-wrap justify-end gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-7 w-20 animate-pulse rounded-full bg-slate-100" />
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-20 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          </div>
          <div className="h-[430px] animate-pulse rounded-2xl bg-slate-200" />
        </div>
        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_380px]">
          <div className="h-80 animate-pulse rounded-2xl bg-slate-200/70" />
          <div className="h-64 animate-pulse rounded-2xl bg-slate-200/70" />
        </div>
      </div>
    </main>
  )
}

function Breadcrumb({ courseTitle }: { courseTitle: string }) {
  return (
    <nav className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-500">
      <Link to="/" className="transition hover:text-customBlue">
        الرئيسية
      </Link>
      <span className="text-customOrange">&gt;</span>
      <Link to="/courses" className="transition hover:text-customBlue">
        الدورات
      </Link>
      <span className="text-customOrange">&gt;</span>
      <span className="text-deepBlue">{courseTitle}</span>
    </nav>
  )
}

function InfoTile({
  icon: Icon,
  label,
  value,
  accent = 'blue',
}: {
  icon: IconComponent
  label: string
  value: string
  accent?: 'blue' | 'orange'
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <div className="flex items-center gap-3">
        <span
          className={`grid h-11 w-11 place-items-center rounded-lg ${
            accent === 'orange' ? 'bg-orange-50 text-customOrange' : 'bg-sky-50 text-customBlue'
          }`}
        >
          <Icon size={21} />
        </span>

        <div>
          <span className="block text-xs font-black text-slate-400">{label}</span>
          <strong
            className={`mt-1 block text-base font-black ${
              accent === 'orange' ? 'text-customOrange' : 'text-deepBlue'
            }`}
          >
            {value}
          </strong>
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

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: IconComponent
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-white text-customBlue shadow-sm">
        <Icon size={20} />
      </span>

      <div className="min-w-0">
        <span className="block text-xs font-black text-slate-400">{label}</span>
        <strong className="mt-1 block text-sm font-black text-deepBlue break-words">{value}</strong>
      </div>
    </div>
  )
}

function CourseDetailsCTA({
  course,
  coverUrl,
  registerHref,
  registrationOpen,
  registerLabel,
}: {
  course: Course
  coverUrl: string
  registerHref: string
  registrationOpen: boolean
  registerLabel: string
}) {
  return (
    <motion.section
      className="mt-10 grid items-center gap-8 overflow-hidden rounded-2xl bg-gradient-to-l from-deepBlue via-[#1c4567] to-[#162334] px-6 py-9 text-white shadow-2xl sm:px-10 lg:grid-cols-[1fr_360px]"
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.5 }}
    >
      <div className="text-right">
        <h2 className="text-3xl font-black leading-tight sm:text-4xl">{course.title}</h2>

        {course.short_description ?
          <p className="mt-4 text-lg leading-9 text-slate-200">{course.short_description}</p>
        : null}

        <div className="mt-7 flex flex-col gap-4 sm:flex-row">
          {registrationOpen ?
            <motion.div whileHover={{ scale: 1.04 }}>
              <Link
                to={registerHref}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-customOrange px-7 py-4 font-extrabold text-white sm:w-auto"
              >
                <UserPlus size={20} />
                {registerLabel}
              </Link>
            </motion.div>
          :
            <span className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 px-7 py-4 font-extrabold text-slate-200 sm:w-auto">
              التسجيل مغلق
            </span>
          }

          <motion.div whileHover={{ scale: 1.04 }}>
            <Link
              to="/courses"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-customBlue px-7 py-4 font-extrabold text-white sm:w-auto"
            >
              استكشف جميع الدورات
              <ArrowLeft size={20} />
            </Link>
          </motion.div>
        </div>
      </div>

      <img src={coverUrl} alt="" className="h-72 w-full rounded-2xl object-cover shadow-2xl opacity-95" />
    </motion.section>
  )
}
