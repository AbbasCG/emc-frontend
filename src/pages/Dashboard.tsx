import axios from 'axios'
import {
  Bell,
  BookOpen,
  Calendar,
  CheckCircle,
  ClipboardList,
  GraduationCap,
  MessageSquareQuote,
  ScrollText,
  TrendingUp,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useEffect, useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../api/axios'
import {
  STUDENT_SCOPE_REFRESH_EVENT,
  fetchStudentCoursesList,
  fetchStudentLmsDashboard,
  fetchStudentRegistrations,
  type StudentListedCourse,
  type StudentRegistrationRow,
} from '@/api/studentApi'
import { notifyNotificationsRefresh } from '@/api/notificationsApi'
import { fetchCoursesStrict } from '@/api/superAdminCatalogApi'
import {
  DashboardSection,
  EmptyState,
  EnrolledCourseCard,
  NotificationItem,
  StatCard,
  UpcomingSessionCard,
} from '../components/dashboard'
import { AssignmentCard, ProgressRing, SessionCard } from '@/components/lms'
import { courseImages } from '@/utils/course'
import { useAuth } from '../contexts/AuthContext'
import type {
  Course,
  DashboardStats,
  Notification as EmcNotification,
  StudentDashboard,
  UpcomingSession,
} from '../types'
import type { StudentLmsDashboard, LmsSession } from '@/types/lms'
import { mergeStudentEnrollments } from '@/utils/studentEnrollmentMerge'
import { normalizeStudentDashboardPayload } from '@/utils/studentDashboardEnvelope'

function toFiniteStat(n: unknown, fallback = 0): number {
  if (typeof n === 'number' && Number.isFinite(n)) return n
  const x = Number(n)
  return Number.isFinite(x) ? x : fallback
}

function mapLmsSessionToUpcoming(s: LmsSession): UpcomingSession {
  return {
    id: s.id,
    course_name: s.course_name,
    date: s.date ?? s.starts_at ?? '',
    time: s.time,
    type: s.type === 'offline' ? 'offline' : 'online',
    instructor_name: s.instructor_name,
    location: s.location,
    meeting_link: s.meeting_link,
    platform: (s.platform as UpcomingSession['platform']) ?? undefined,
  }
}

function deriveStatsFromLms(lms: StudentLmsDashboard): DashboardStats {
  return {
    enrolled_courses: Array.isArray(lms.current_courses) ? lms.current_courses.length : 0,
    upcoming_sessions: Array.isArray(lms.upcoming_sessions) ? lms.upcoming_sessions.length : 0,
    completed_certificates: Array.isArray(lms.certificates_placeholder) ? lms.certificates_placeholder.length : 0,
    training_hours: 0,
  }
}

function hourGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'صباح الخير'
  if (hour < 18) return 'مساء الخير'
  return 'مساء النور'
}

export default function Dashboard() {
  const { user } = useAuth()

  const [data, setData] = useState<StudentDashboard>(() => normalizeStudentDashboardPayload(null))
  const [isLoading, setIsLoading] = useState(true)
  const [dashSourceError, setDashSourceError] = useState<string | null>(null)
  const [lmsDash, setLmsDash] = useState<StudentLmsDashboard | null>(null)
  const [lmsLoading, setLmsLoading] = useState(true)
  const [lmsError, setLmsError] = useState<string | null>(null)
  const [catalog, setCatalog] = useState<Course[]>([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [studentCoursesApi, setStudentCoursesApi] = useState<StudentListedCourse[]>([])
  const [studentRegsApi, setStudentRegsApi] = useState<StudentRegistrationRow[]>([])

  const syncStudentEnrollmentSources = useCallback(async () => {
    const [courses, registrations] = await Promise.all([
      fetchStudentCoursesList(),
      fetchStudentRegistrations(),
    ])
    setStudentCoursesApi(courses)
    setStudentRegsApi(registrations)
  }, [])

  useEffect(() => {
    let isMounted = true
    async function loadPrimaryDashboard() {
      setIsLoading(true)
      setLmsLoading(true)
      setLmsError(null)
      setDashSourceError(null)

      const [dashResult, lmsResult] = await Promise.allSettled([
        apiClient.get('/dashboard', { skipErrorToast: true }),
        fetchStudentLmsDashboard(),
      ])

      if (!isMounted) return

      if (dashResult.status === 'fulfilled') {
        setData(normalizeStudentDashboardPayload(dashResult.value.data))
        setDashSourceError(null)
      } else {
        setData(normalizeStudentDashboardPayload(null))
        const err = dashResult.reason
        const msg =
          axios.isAxiosError(err) && err.response?.data && typeof err.response.data === 'object'
            ? (() => {
                const m = (err.response.data as { message?: unknown }).message
                return typeof m === 'string' && m.trim() ? m : null
              })()
            : null
        setDashSourceError(msg ?? 'لم يتم استرجاع موجز لوحة الموحّد — تُشتق الأرقام من مصادر مرئية حيث تتوفر فقط.')
      }

      if (lmsResult.status === 'fulfilled') {
        const row = lmsResult.value
        setLmsDash(row)
        setLmsError(null)
        if (dashResult.status === 'rejected') {
          setData((prev) => ({
            ...prev,
            stats: deriveStatsFromLms(row),
          }))
        }
      } else {
        setLmsDash(null)
        const err = lmsResult.reason
        const msg =
          axios.isAxiosError(err) ?
            typeof err.response?.data === 'object' &&
            err.response?.data &&
            'message' in err.response.data &&
            typeof (err.response.data as { message: unknown }).message === 'string' ?
              (err.response.data as { message: string }).message
            : err.response?.status === 404 ?
              'لا توجد بيانات لوحة الطالب.'
            : `تعذّر الاتصال (${err.response?.status ?? '—'})`
          : 'تعذّر تحميل لوحة التعلّم.'
        setLmsError(msg)
      }

      setIsLoading(false)
      setLmsLoading(false)
    }

    void loadPrimaryDashboard()
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    let alive = true
    setCatalogLoading(true)
    void (async () => {
      const pack = await fetchCoursesStrict()
      if (!alive) return
      if (pack.ok) setCatalog([...pack.rows])
      else setCatalog([])
      setCatalogLoading(false)
    })()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    void syncStudentEnrollmentSources()
  }, [syncStudentEnrollmentSources])

  useEffect(() => {
    function onStudentRefresh() {
      void syncStudentEnrollmentSources()
      notifyNotificationsRefresh()
      fetchStudentLmsDashboard()
        .then((row) => {
          setLmsDash(row)
          setLmsError(null)
          const d = deriveStatsFromLms(row)
          setData((prev) => ({
            ...prev,
            stats: {
              ...d,
              training_hours: prev.stats.training_hours,
            },
          }))
        })
        .catch((err: unknown) => {
          setLmsDash(null)
          const msg =
            axios.isAxiosError(err) ?
              typeof err.response?.data === 'object' &&
              err.response?.data &&
              'message' in err.response.data &&
              typeof (err.response.data as { message: unknown }).message === 'string' ?
                (err.response.data as { message: string }).message
              : err.response?.status === 404 ?
                'لا توجد بيانات لوحة الطالب.'
              : `تعذّر الاتصال (${err.response?.status ?? '—'})`
            : 'تعذّر تحميل لوحة التعلّم.'
          setLmsError(msg)
        })

      void (async () => {
        try {
          const response = await apiClient.get('/dashboard', { skipErrorToast: true })
          setData(normalizeStudentDashboardPayload(response.data))
          setDashSourceError(null)
        } catch (err: unknown) {
          if (axios.isCancel(err)) return
          setData(normalizeStudentDashboardPayload(null))
          const msg =
            axios.isAxiosError(err) && err.response?.data && typeof err.response.data === 'object'
              ? (() => {
                  const m = (err.response.data as { message?: unknown }).message
                  return typeof m === 'string' && m.trim() ? m : null
                })()
              : null
          setDashSourceError(msg ?? 'لم يتم استرجاع موجز لوحة الموحّد — تُشتق الأرقام من مصادر مرئية حيث تتوفر فقط.')
        }
      })()
    }

    window.addEventListener(STUDENT_SCOPE_REFRESH_EVENT, onStudentRefresh)
    return () => window.removeEventListener(STUDENT_SCOPE_REFRESH_EVENT, onStudentRefresh)
  }, [syncStudentEnrollmentSources])

  if (isLoading) return <DashboardSkeleton />

  const base = data

  const { stats, enrollments, upcoming_sessions: legacySessions } = base
  const enrollmentsSafe = Array.isArray(enrollments) ? enrollments : []
  const enrollmentsMerged = mergeStudentEnrollments(enrollmentsSafe, studentRegsApi, studentCoursesApi)
  const legacyNotificationsSafe = Array.isArray(base.notifications) ? base.notifications : []

  const upcomingLmsRaw = Array.isArray(lmsDash?.upcoming_sessions) ? [...(lmsDash?.upcoming_sessions ?? [])] : []
  const sessions =
    upcomingLmsRaw.length > 0 ? upcomingLmsRaw.map(mapLmsSessionToUpcoming) : [...legacySessions]

  const notifications =
    Array.isArray(lmsDash?.notifications) && lmsDash?.notifications ?
      [...lmsDash.notifications]
    : [...legacyNotificationsSafe]

  const currentLmsCourses = Array.isArray(lmsDash?.current_courses) ? [...lmsDash!.current_courses] : []

  const pendingAssignments = Array.isArray(lmsDash?.pending_assignments)
    ? [...lmsDash!.pending_assignments]
    : []

  const certPlaceholders =
    Array.isArray(lmsDash?.certificates_placeholder) ? [...lmsDash.certificates_placeholder] : []

  const pendingDueCount =
    pendingAssignments.filter((a) => a.status === 'pending' || a.status === 'late').length

  const unreadCount = [...notifications].filter((raw) => {
    if (!raw || typeof raw !== 'object') return false
    const n = raw as { is_read?: boolean; read_at?: string | null }
    if (typeof n.is_read === 'boolean') return !n.is_read
    return n.read_at == null || String(n.read_at).trim() === ''
  }).length

  const enrolledSlugs = new Set(
    enrollmentsMerged.filter((e) => e.course?.slug).map((e) => String(e.course.slug)),
  )
  const browseCourses = [...catalog].filter((c) => c.slug && !enrolledSlugs.has(c.slug))

  const completedEnrollCount = enrollmentsMerged.filter((e) => e.status === 'completed').length
  const activeEnrollCount = enrollmentsMerged.filter((e) => e.status !== 'completed').length

  let learningLine = 'تابع بطاقاتك أدناه لإكمال جلساتك القادمة.'
  if (lmsLoading) learningLine = 'جلب حالة مسار التعلّم الحالية…'
  else if (lmsDash != null && Number.isFinite(lmsDash.progress_percent))
    learningLine = `تقدّمك التقريبي في المحتوى: ${Math.round(lmsDash.progress_percent)}%.`
  else if (dashSourceError) learningLine = dashSourceError
  else if (activeEnrollCount === 0 && completedEnrollCount === 0)
    learningLine = 'لم تسجل بعد — تصفّح الدورات المتاحة ضمن هذه الصفحة وابدأ.'
  const hour = hourGreeting()
  const displayName = user?.name?.trim() || 'متعلّم EMC'

  return (
    <div className="space-y-12 text-right rtl" dir="rtl">
      {dashSourceError ?
        <p className="rounded-2xl border border-amber-200/95 bg-amber-50/[0.7] px-4 py-3 text-[12px] font-bold leading-relaxed text-amber-950 ring-1 ring-amber-100">
          لوحة الموحّد العامّة تعذّرت — العرض الأسفل لا يعتمد سوى ما يتيحه استجاباتك الحقيقية.
        </p>
      : null}

      {/* 1 — ترحيب وإجراءات سريعة */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-[1.85rem] border border-deepBlue/[0.08] bg-gradient-to-bl from-deepBlue via-[#22344a] to-[#2691C2]/90 p-[1px] shadow-xl"
      >
        <div className="rounded-[calc(1.85rem-1px)] bg-white/[0.04] px-6 py-7 text-white sm:px-9">
          <p className="text-xs font-black tracking-wide text-white/55">{hour}،</p>
          <h1 className="mt-1 text-[1.65rem] font-black leading-snug">{displayName}</h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-white/82">{learningLine}</p>

          <div className="mt-6 flex flex-wrap gap-2">
            <QuickChip href="/dashboard/student/materials" label="المقررات والمواد" />
            <QuickChip href="/dashboard/student/sessions" label="جدول الجلسات" />
            <QuickChip href="/dashboard/student/evaluation" label="تقييم التجربة" />
            <QuickChip href="/dashboard/profile" label="إعداد الحساب" />
          </div>
        </div>
      </motion.section>

      {/* LMS summary row */}
      {(lmsLoading || lmsError || lmsDash) && (
        <div className="space-y-2">
          {lmsLoading && (
            <div className="grid animate-pulse gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-24 rounded-2xl bg-slate-100/90 ring-1 ring-slate-200/65" />
              ))}
            </div>
          )}
          {lmsError && !lmsLoading && (
            <div className="rounded-2xl border border-orange-100/90 bg-orange-50/90 px-4 py-3 text-[12px] font-bold leading-relaxed text-orange-950 ring-1 ring-orange-100">
              لم يكتمل تحميل منصّة التعلّم: {lmsError}
            </div>
          )}
          {!lmsLoading && lmsDash && (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <OverviewMini
                label="التقدّم المعرفي"
                value={`${Math.round(lmsDash.progress_percent)}%`}
                Icon={TrendingUp}
                tone="blue"
              />
              <OverviewMini
                label="الحضور المسجل"
                value={`${Math.round(lmsDash.attendance_percent)}%`}
                Icon={Calendar}
                tone="teal"
              />
              <OverviewMini
                label="واجبات تنتظر التسليم"
                value={String(pendingDueCount)}
                Icon={ClipboardList}
                tone="orange"
              />
              <OverviewMini
                label="شهادات قيد الإصدار"
                value={String(certPlaceholders.length)}
                Icon={ScrollText}
                tone="violet"
              />
            </div>
          )}
        </div>
      )}

      {/* 2 — نظرة عامة */}
      <DashboardSection title="نظرتي التعليمية السريعة" subtitle="كل الأرقام من بياناتك الحقيقية فقط؛ لا تهيئة وهمية.">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <StatCard
            title="الدورات المسجّلة"
            value={String(enrollmentsMerged.length)}
            icon={BookOpen}
            color="blue"
          />
          <StatCard title="جلسات قادمة" value={String(Array.isArray(sessions) ? sessions.length : 0)} icon={Calendar} color="orange" />
          <StatCard title="دورات مكتملة" value={String(completedEnrollCount)} icon={CheckCircle} color="green" />
          <StatCard title="إشعار غير مقروء" value={String(unreadCount)} icon={Bell} color="purple" />
          <StatCard
            title="شهادات مكتسبة"
            value={String(toFiniteStat(stats.completed_certificates, 0))}
            icon={GraduationCap}
            color="orange"
          />
          <StatCard title="مراجعات مستحقة تقريبًا" value={String(completedEnrollCount)} icon={MessageSquareQuote} color="blue" />
        </div>
      </DashboardSection>

      {pendingAssignments.length > 0 && (
        <DashboardSection title="أولوية الواجبات" action={{ label: 'الكل', href: '/dashboard/student/assignments' }}>
          <div className="grid gap-4 lg:grid-cols-2">
            {pendingAssignments.slice(0, 2).map((a) => (
              <AssignmentCard key={a.id} assignment={a} />
            ))}
          </div>
        </DashboardSection>
      )}

      {/* 3 — الدورات الحالية */}
      <DashboardSection
        title="دوراتي والتسجيلات الحالية"
        subtitle="مزامنة من لوحة الموحّد وجداول الطالب والتسجيلات حيث تتيحها نقطة البرمجة."
      >
        {enrollmentsMerged.length > 0 ?
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {enrollmentsMerged.slice(0, 8).map((e) => (
              <EnrolledCourseCard
                key={e.id}
                enrollment={e}
                actionLabel="متابعة التعلم"
                actionTo={e.course?.slug ? `/courses/${e.course.slug}` : '/dashboard/student/progress'}
              />
            ))}
          </div>
        : !lmsLoading && currentLmsCourses.length > 0 ?
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {currentLmsCourses.slice(0, 6).map((c, idx) => {
              const pct = typeof c.progress_percent === 'number' ? Math.round(c.progress_percent) : 0
              const hrefContinue = c.slug ? `/courses/${c.slug}` : '/dashboard/student/progress'
              return (
                <motion.div
                  key={c.id}
                  layout
                  whileHover={{ y: -3 }}
                  className="flex flex-col gap-4 rounded-[1.35rem] border border-deepBlue/[0.06] bg-white p-5 shadow-md ring-1 ring-white"
                >
                  <div className="min-h-[6.75rem] overflow-hidden rounded-xl">
                    <img
                      alt=""
                      src={courseImages[idx % courseImages.length]}
                      className="h-full w-full rounded-xl object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="text-[1rem] font-black leading-snug text-deepBlue">{c.title}</h3>
                    {c.instructor_name ?
                      <p className="mt-1 text-[11px] font-bold text-slate-500">مع المدرب: {c.instructor_name}</p>
                    : null}
                    {c.start_date != null && String(c.start_date).trim() !== '' ?
                      <p className="mt-2 text-[11px] font-bold text-slate-600" dir="ltr">
                        {String(c.start_date).slice(0, 10)}
                        {c.start_time ? ` — ${c.start_time}` : ''}
                      </p>
                    : (
                      <p className="mt-2 rounded-lg border border-sky-200/80 bg-sky-50/90 px-2 py-1.5 text-[10px] font-bold text-sky-950">
                        انضممت إلى الدورة القادمة — سيتم إشعارك عند تحديد الموعد
                      </p>
                    )}
                  </div>
                  {pct > 0 || c.progress_percent !== undefined ?
                    <div className="flex items-center justify-between gap-3">
                      <ProgressRing percent={pct} size={68} stroke={6} />
                      <Link
                        to={hrefContinue}
                        className="rounded-2xl bg-deepBlue px-4 py-2 text-[11px] font-black text-white shadow-inner transition hover:bg-customBlue"
                      >
                        متابعة التعلم
                      </Link>
                    </div>
                  : <Link
                      to={hrefContinue}
                      className="rounded-2xl border border-customBlue/35 bg-brand-400/10 px-4 py-2 text-center text-[11px] font-black text-deepBlue hover:bg-brand-400/18"
                    >
                      متابعة التعلم
                    </Link>
                  }
                  <p className="text-[10px] font-bold text-muted-500">
                    الجلسة القادمة مذكورة في خانة المواعيد — راجع أيضًا جلساتي المفصّلة.
                  </p>
                </motion.div>
              )
            })}
          </div>
        : <EmptyState
            icon={BookOpen}
            title="لا توجد دورات مسجلة حاليًا"
            description="سيُعرض هنا كل تسجيل مؤكَّد مع الخادم عبر لوحة الموحّد أو مسارات الطالب والتسجيل."
            action={{ label: 'استعرض الدورات المتاحة', href: '/courses' }}
          />}
      </DashboardSection>

      {/* 4 — الدورات المتاحة */}
      <DashboardSection
        title="دورات يمكنني التسجيل لها الآن"
        subtitle="محمّلة من نقطة عامة بحساب مسجَّل؛ إن تعذرت، يمكنك الزيارة من صفحة الكتالوج."
        action={browseCourses.length === 0 && !catalogLoading ? undefined : { label: 'الكتالوج العام', href: '/courses' }}
      >
        {catalogLoading ?
          <div className="flex min-h-[8rem] items-center justify-center rounded-2xl border border-deepBlue/[0.05] bg-slate-50/80 ring-1 ring-slate-100">
            <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-customBlue border-t-transparent" />
          </div>
        : browseCourses.length === 0 ?
          <EmptyState
            icon={BookOpen}
            title={catalog.length === 0 ? 'لم تُحمَّل قائمة خارجية الآن.' : 'أنت ضمن هذه الدروس بالفعل أو القائمة خالية بعد التصفية.'}
            description="صفحة الدورات العامة هي المصدر الموثوق عند نقص نقطة الواجهة."
            action={{ label: 'فتح دورات المنصّة', href: '/courses' }}
          />
        : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {browseCourses.slice(0, 6).map((c, i) => (
              <motion.div
                key={c.id ?? i}
                layout
                className="rounded-[1.35rem] border border-deepBlue/[0.06] bg-white/[0.95] p-4 shadow-md ring-1 ring-white transition hover:border-customOrange/35"
              >
                <div className="aspect-[21/10] overflow-hidden rounded-xl bg-slate-100">
                  <img
                    src={c.course_image || courseImages[Number(c.id) % courseImages.length]}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
                <h4 className="mt-4 line-clamp-2 text-sm font-black leading-relaxed text-deepBlue">{c.title}</h4>
                <div className="mt-5 flex justify-between gap-2">
                  <span className="text-[11px] font-black text-muted-600">
                    {toFiniteStat(c.price as number | string | undefined, 0) ?
                      <>
                        رسوم تشير إليها الكتالوج
                      </>
                    : 'مجانية'}
                  </span>
                  <Link
                    to={`/courses/${c.slug}`}
                    className="rounded-2xl bg-customOrange px-3 py-1.5 text-[11px] font-black text-white shadow-sm hover:brightness-105"
                  >
                    {c.start_date != null && String(c.start_date).trim() !== '' && String(c.start_date) !== '—' ?
                      'التسجيل الآن'
                    : 'انضم إلى الدورة القادمة'}
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        }
      </DashboardSection>

      {/* 5 + 6 — جلسات + إشعارات */}
      <div className="grid gap-10 xl:grid-cols-[1fr_minmax(0,340px)]">
        <DashboardSection
          title="الجلسات القادمة"
          action={
            Array.isArray(sessions) && sessions.length > 0 ?
              { label: 'جدول الجلسات', href: '/dashboard/student/sessions' }
            : undefined
          }
        >
          {Array.isArray(sessions) && sessions.length > 0 ?
            <ol className="relative space-y-5 border-e-2 border-customBlue/20 pe-8">
              {upcomingLmsRaw.length > 0 ?
                upcomingLmsRaw.slice(0, 8).map((s) => (
                  <li key={s.id}>
                    <SessionCard session={s} />
                  </li>
                ))
              : sessions.slice(0, 8).map((s) => (
                  <li key={s.id}>
                    <div className="relative">
                      <span className="absolute -end-[27px] top-3 grid h-2.5 w-2.5 place-items-center rounded-full bg-customBlue ring-[5px] ring-white" />
                      <UpcomingSessionCard
                        courseName={s.course_name}
                        date={s.date ? s.date : '—'}
                        time={s.time ?? undefined}
                        type={s.type}
                        instructor={s.instructor_name ?? undefined}
                        location={s.location ?? undefined}
                        meetingLink={s.meeting_link ?? undefined}
                        platform={s.platform ?? undefined}
                      />
                    </div>
                  </li>
                ))
              }
            </ol>
          : <EmptyState icon={Calendar} title="لم تُحمّل جلسات قريبة بعد" />}
        </DashboardSection>

        <DashboardSection
          title="أحدث الإشعارات"
          action={
            notifications.length > 0 ? { label: 'مركز الإشعارات', href: '/dashboard/notifications' } : undefined
          }
        >
          {notifications.length > 0 ?
            <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-deepBlue/[0.05] bg-white shadow-sm ring-1 ring-white">
              {[...notifications].slice(0, 5).map((n) => (
                <NotificationItem key={String((n as EmcNotification).id)} notification={n as EmcNotification} />
              ))}
            </div>
          : <EmptyState icon={Bell} title="لا إشعارات حديثة" />}
        </DashboardSection>
      </div>

      {/* 7 — تنبيه التقييم */}
      <motion.section layout className="rounded-[1.35rem] border border-orange-500/22 bg-orange-500/[0.06] px-6 py-5 shadow-inner ring-1 ring-orange-400/22">
        <div className="flex flex-wrap items-center justify-between gap-4 rtl:flex-row-reverse">
          <div className="min-w-[12rem] text-right rtl:text-right">
            <h3 className="text-sm font-black text-deepBlue">قيِّم تجربتك قبل أن تذهب التفاصيل بعيدًا</h3>
            <p className="mt-1 text-[11px] font-semibold leading-relaxed text-slate-600">
              {completedEnrollCount > 0 ?
                <>
                  تم تسجيل <span className="font-black text-deepBlue">{completedEnrollCount}</span> دورة كمكتملة — نشجّعك بتقييم
                  حصّة واحدة لكل دورة حسب المتاح على الخادم.
                </>
              : 'سيُفعِّل هذا التنبيه تلقائيًا بعد إكمال أول دورة.'}
            </p>
          </div>
          <Link
            to="/dashboard/student/evaluation"
            className="shrink-0 rounded-2xl bg-customOrange px-5 py-2.5 text-xs font-black text-white shadow-md hover:brightness-105"
          >
            الانتقال للتقييم
          </Link>
        </div>
      </motion.section>

      {/* 8 — الشهادات */}
      <DashboardSection title="الشهادات المكتسبة" action={{ label: 'شهاداتي', href: '/dashboard/certificates' }}>
        {toFiniteStat(stats.completed_certificates, 0) > 0 || certPlaceholders.length > 0 ?
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-200/95 bg-emerald-50/90 px-4 py-3 text-[12px] font-black text-deepBlue ring-1 ring-emerald-100">
              عدد أكملها الخادم في الموجز:{' '}
              <span>{toFiniteStat(stats.completed_certificates, 0)}</span>
            </div>
            {certPlaceholders.slice(0, 4).map((c, i) => (
              <div key={`${String(c.label)}-${String(i)}`} className="rounded-xl border border-dashed border-customOrange/40 bg-orange-50/45 px-4 py-3 text-right">
                <p className="font-black text-deepBlue">{c.label}</p>
                {c.note ?
                  <p className="mt-1 text-[11px] font-semibold text-slate-600">{c.note}</p>
                : null}
              </div>
            ))}
          </div>
        : <EmptyState icon={ScrollText} title="لا شهادة مفعّلة في الملمس الحالي بعد" />}
      </DashboardSection>
    </div>
  )
}

function QuickChip({ href, label }: { href: string; label: string }) {
  return (
    <Link
      to={href}
      className="rounded-2xl border border-white/[0.12] bg-white/[0.12] px-4 py-2 text-[11px] font-black text-white shadow-inner backdrop-blur-sm transition hover:border-white/[0.3] hover:bg-white/[0.18]"
    >
      {label}
    </Link>
  )
}

function OverviewMini({
  label,
  value,
  Icon,
  tone,
}: {
  label: string
  value: string
  Icon: typeof BookOpen
  tone: 'blue' | 'teal' | 'orange' | 'violet'
}) {
  const ring =
    tone === 'blue' ? 'from-customBlue/[0.12] ring-customBlue/18'
    : tone === 'teal' ? 'from-teal-500/[0.1] ring-teal-400/22'
    : tone === 'orange' ? 'from-orange-400/[0.12] ring-orange-300/35'
    : 'from-violet-400/[0.12] ring-violet-300/38'
  return (
    <motion.div layout className={`rounded-[1.35rem] border border-deepBlue/[0.05] bg-gradient-to-br to-white/[0.6] px-5 py-4 shadow-sm ring-1 ${ring}`}>
      <div className="flex items-center gap-3 rtl:flex-row-reverse">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-deepBlue/[0.07] shadow-inner ring-1 ring-white">
          <Icon className="h-5 w-5 text-deepBlue" aria-hidden />
        </span>
        <div className="min-w-0 text-right rtl:text-right">
          <p className="text-[18px] font-black leading-none text-deepBlue">{value}</p>
          <p className="mt-1 truncate text-[10px] font-black uppercase tracking-wide text-muted-500">{label}</p>
        </div>
      </div>
    </motion.div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-10 text-right rtl" dir="rtl">
      <div className="h-40 rounded-[1.85rem] bg-slate-200" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-[1.35rem] bg-slate-100 ring-1 ring-slate-200/70" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-slate-100" />
        ))}
      </div>
      <div className="h-72 rounded-[1.5rem] bg-slate-100" />
    </div>
  )
}
