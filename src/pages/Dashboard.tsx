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
  DashboardHero,
  DashboardKpiCard,
  DashboardKpiSkeleton,
  DashboardCardGridSkeleton,
  DashboardListSkeleton,
  DashboardErrorWidget,
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
  StudentDashboard,
  UpcomingSession,
} from '../types'
import type { StudentLmsDashboard, LmsSession } from '@/types/lms'
import { mergeStudentEnrollments } from '@/utils/studentEnrollmentMerge'
import { normalizeStudentDashboardPayload } from '@/utils/studentDashboardEnvelope'
import { studentLearnHref } from '@/utils/studentLearnNavigation'

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
  const h = new Date().getHours()
  if (h < 12) return 'صباح الخير'
  if (h < 18) return 'مساء الخير'
  return 'مساء النور'
}

function HeroChip({ href, label }: { href: string; label: string }) {
  return (
    <Link
      to={href}
      className="rounded-2xl border border-white/[0.12] bg-white/[0.12] px-4 py-2 text-[11px] font-black text-white backdrop-blur-sm transition hover:border-white/[0.3] hover:bg-white/[0.18]"
    >
      {label}
    </Link>
  )
}

export default function Dashboard() {
  const { user } = useAuth()

  const [data, setData] = useState<StudentDashboard>(() => normalizeStudentDashboardPayload(null))
  const [dashLoading, setDashLoading] = useState(true)
  const [dashError, setDashError] = useState<string | null>(null)
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

  // Critical data: dashboard + LMS in parallel
  useEffect(() => {
    let isMounted = true
    setDashLoading(true)
    setLmsLoading(true)
    setDashError(null)
    setLmsError(null)

    void Promise.allSettled([
      apiClient.get('/dashboard', { skipErrorToast: true }),
      fetchStudentLmsDashboard(),
    ]).then(([dashResult, lmsResult]) => {
      if (!isMounted) return

      if (dashResult.status === 'fulfilled') {
        setData(normalizeStudentDashboardPayload(dashResult.value.data))
      } else {
        setData(normalizeStudentDashboardPayload(null))
        setDashError('تعذّر تحميل لوحة التحكم.')
      }
      setDashLoading(false)

      if (lmsResult.status === 'fulfilled') {
        const row = lmsResult.value
        setLmsDash(row)
        if (dashResult.status === 'rejected') {
          setData((prev) => ({ ...prev, stats: deriveStatsFromLms(row) }))
        }
      } else {
        setLmsDash(null)
        setLmsError('تعذّر تحميل بيانات التعلّم.')
      }
      setLmsLoading(false)
    })

    return () => { isMounted = false }
  }, [])

  // Secondary: enrollment sources (non-blocking)
  useEffect(() => {
    void syncStudentEnrollmentSources()
  }, [syncStudentEnrollmentSources])

  // Tertiary: course catalog (non-blocking)
  useEffect(() => {
    let alive = true
    setCatalogLoading(true)
    void (async () => {
      const pack = await fetchCoursesStrict()
      if (!alive) return
      setCatalog(pack.ok ? [...pack.rows] : [])
      setCatalogLoading(false)
    })()
    return () => { alive = false }
  }, [])

  // Refresh event handler
  useEffect(() => {
    function onStudentRefresh() {
      void syncStudentEnrollmentSources()
      notifyNotificationsRefresh()
      fetchStudentLmsDashboard()
        .then((row) => {
          setLmsDash(row)
          setLmsError(null)
          setData((prev) => ({
            ...prev,
            stats: { ...deriveStatsFromLms(row), training_hours: prev.stats.training_hours },
          }))
        })
        .catch(() => {
          setLmsDash(null)
          setLmsError('تعذّر تحميل بيانات التعلّم.')
        })
      void (async () => {
        try {
          const response = await apiClient.get('/dashboard', { skipErrorToast: true })
          setData(normalizeStudentDashboardPayload(response.data))
          setDashError(null)
        } catch (err: unknown) {
          if (axios.isCancel(err)) return
          setDashError('تعذّر تحميل لوحة التحكم.')
        }
      })()
    }
    window.addEventListener(STUDENT_SCOPE_REFRESH_EVENT, onStudentRefresh)
    return () => window.removeEventListener(STUDENT_SCOPE_REFRESH_EVENT, onStudentRefresh)
  }, [syncStudentEnrollmentSources])

  // ── Derived data ──────────────────────────────────────────────────────────
  const { stats, enrollments, upcoming_sessions: legacySessions } = data
  const enrollmentsSafe = Array.isArray(enrollments) ? enrollments : []
  const enrollmentsMerged = mergeStudentEnrollments(enrollmentsSafe, studentRegsApi, studentCoursesApi)

  const upcomingLmsRaw = Array.isArray(lmsDash?.upcoming_sessions) ? [...(lmsDash?.upcoming_sessions ?? [])] : []
  const sessions =
    upcomingLmsRaw.length > 0 ? upcomingLmsRaw.map(mapLmsSessionToUpcoming) : [...legacySessions]

  const dashboardNotifications = Array.isArray(lmsDash?.notifications) ? lmsDash.notifications : []
  const currentLmsCourses = Array.isArray(lmsDash?.current_courses) ? [...lmsDash!.current_courses] : []
  const pendingAssignments = Array.isArray(lmsDash?.pending_assignments) ? [...lmsDash!.pending_assignments] : []
  const certPlaceholders = Array.isArray(lmsDash?.certificates_placeholder) ? [...lmsDash.certificates_placeholder] : []

  const pendingDueCount = pendingAssignments.filter((a) => a.status === 'pending' || a.status === 'late').length
  const unreadCount = dashboardNotifications.filter((n) => {
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
  if (lmsLoading) learningLine = 'جارٍ تحميل بيانات التعلّم…'
  else if (lmsDash != null && Number.isFinite(lmsDash.progress_percent))
    learningLine = `تقدّمك في المحتوى: ${Math.round(lmsDash.progress_percent)}%.`
  else if (activeEnrollCount === 0 && completedEnrollCount === 0)
    learningLine = 'لم تسجل بعد — تصفّح الدورات المتاحة ضمن هذه الصفحة وابدأ.'

  const displayName = user?.name?.trim() || 'متعلّم EMC'
  const greeting = hourGreeting()

  const heroStats = lmsLoading
    ? undefined
    : [
        { label: 'الدورات',    value: enrollmentsMerged.length                             },
        { label: 'تقدّمي',     value: lmsDash ? `${Math.round(lmsDash.progress_percent)}%` : '—' },
        { label: 'جلسات قادمة', value: Array.isArray(sessions) ? sessions.length : 0       },
      ]

  return (
    <div className="space-y-10 text-right rtl" dir="rtl">
      {/* 1 — Hero — always visible */}
      <DashboardHero
        greeting={greeting}
        name={displayName}
        role="بوابة الطالب"
        subtitle={learningLine}
        quickStats={heroStats}
        actions={
          <>
            <HeroChip href="/dashboard/student/materials"  label="المقررات والمواد" />
            <HeroChip href="/dashboard/student/sessions"   label="جدول الجلسات"    />
            <HeroChip href="/dashboard/student/evaluation" label="تقييم التجربة"   />
            <HeroChip href="/dashboard/profile"            label="إعداد الحساب"    />
          </>
        }
      />

      {/* Error banners (per-section, not full-page block) */}
      {dashError && !dashLoading && (
        <DashboardErrorWidget
          title="تعذّر تحميل لوحة التحكم"
          description={dashError}
          compact
        />
      )}

      {/* 2 — LMS mini KPIs — skeleton while loading */}
      {lmsLoading ? (
        <DashboardKpiSkeleton count={4} />
      ) : lmsError ? (
        <DashboardErrorWidget title="تعذّر تحميل بيانات التعلّم" description={lmsError} compact />
      ) : lmsDash ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardKpiCard label="التقدّم المعرفي"         value={`${Math.round(lmsDash.progress_percent)}%`} icon={TrendingUp}    variant="brand"  />
          <DashboardKpiCard label="الحضور المسجل"           value={`${Math.round(lmsDash.attendance_percent)}%`} icon={Calendar}   variant="brand"  />
          <DashboardKpiCard label="واجبات تنتظر التسليم"   value={String(pendingDueCount)}                       icon={ClipboardList} variant="accent" />
          <DashboardKpiCard label="شهادات قيد الإصدار"     value={String(certPlaceholders.length)}               icon={ScrollText} variant="muted"  />
        </div>
      ) : null}

      {/* 3 — Overview stats */}
      <DashboardSection title="نظرتي التعليمية السريعة" subtitle="كل الأرقام من بياناتك الحقيقية فقط.">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <StatCard title="الدورات المسجّلة"    value={String(enrollmentsMerged.length)}                              icon={BookOpen}           color="blue"   />
          <StatCard title="جلسات قادمة"         value={String(Array.isArray(sessions) ? sessions.length : 0)}         icon={Calendar}           color="orange" />
          <StatCard title="دورات مكتملة"        value={String(completedEnrollCount)}                                   icon={CheckCircle}        color="green"  />
          <StatCard title="إشعار غير مقروء"     value={String(unreadCount)}                                            icon={Bell}               color="purple" />
          <StatCard title="شهادات مكتسبة"       value={String(toFiniteStat(stats.completed_certificates, 0))}          icon={GraduationCap}      color="orange" />
          <StatCard title="مراجعات مستحقة"      value={String(completedEnrollCount)}                                   icon={MessageSquareQuote} color="blue"   />
        </div>
      </DashboardSection>

      {/* 4 — Pending assignments (priority) */}
      {pendingAssignments.length > 0 && (
        <DashboardSection title="أولوية الواجبات" action={{ label: 'الكل', href: '/dashboard/student/assignments' }}>
          <div className="grid gap-4 lg:grid-cols-2">
            {pendingAssignments.slice(0, 2).map((a) => (
              <AssignmentCard key={a.id} assignment={a} />
            ))}
          </div>
        </DashboardSection>
      )}

      {/* 5 — Enrolled courses */}
      <DashboardSection
        title="دوراتي والتسجيلات الحالية"
        subtitle="مزامنة من لوحة الموحّد وجداول الطالب والتسجيلات."
      >
        {dashLoading ? (
          <DashboardCardGridSkeleton count={4} cols={4} />
        ) : enrollmentsMerged.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {enrollmentsMerged.slice(0, 8).map((e) => (
              <EnrolledCourseCard
                key={e.id}
                enrollment={e}
                actionLabel="متابعة التعلم"
                actionTo={studentLearnHref(e.course.id)}
              />
            ))}
          </div>
        ) : !lmsLoading && currentLmsCourses.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {currentLmsCourses.slice(0, 6).map((c, idx) => {
              const pct = typeof c.progress_percent === 'number' ? Math.round(c.progress_percent) : 0
              const hrefContinue = studentLearnHref(c.id)
              return (
                <motion.div
                  key={c.id}
                  layout
                  whileHover={{ y: -3 }}
                  className="flex flex-col gap-4 rounded-2xl border border-deepBlue/[0.06] bg-white p-5 shadow-sm ring-1 ring-deepBlue/[0.03]"
                >
                  <div className="min-h-[6.75rem] overflow-hidden rounded-xl">
                    <img alt="" src={courseImages[idx % courseImages.length]} className="h-full w-full rounded-xl object-cover" />
                  </div>
                  <div>
                    <h3 className="text-[1rem] font-black leading-snug text-deepBlue">{c.title}</h3>
                    {c.instructor_name && (
                      <p className="mt-1 text-[11px] font-bold text-slate-500">مع المدرب: {c.instructor_name}</p>
                    )}
                    {c.start_date != null && String(c.start_date).trim() !== '' ? (
                      <p className="mt-2 text-[11px] font-bold text-slate-600" dir="ltr">
                        {String(c.start_date).slice(0, 10)}
                        {c.start_time ? ` — ${c.start_time}` : ''}
                      </p>
                    ) : (
                      <p className="mt-2 rounded-lg border border-sky-200/80 bg-sky-50/90 px-2 py-1.5 text-[10px] font-bold text-sky-950">
                        انضممت إلى الدورة القادمة — سيتم إشعارك عند تحديد الموعد
                      </p>
                    )}
                  </div>
                  {pct > 0 || c.progress_percent !== undefined ? (
                    <div className="flex items-center justify-between gap-3">
                      <ProgressRing percent={pct} size={68} stroke={6} />
                      <Link
                        to={hrefContinue}
                        className="rounded-2xl bg-deepBlue px-4 py-2 text-[11px] font-black text-white shadow-inner transition hover:bg-customBlue"
                      >
                        متابعة التعلم
                      </Link>
                    </div>
                  ) : (
                    <Link
                      to={hrefContinue}
                      className="rounded-2xl border border-customBlue/35 bg-customBlue/10 px-4 py-2 text-center text-[11px] font-black text-deepBlue hover:bg-customBlue/18"
                    >
                      متابعة التعلم
                    </Link>
                  )}
                </motion.div>
              )
            })}
          </div>
        ) : (
          <EmptyState
            icon={BookOpen}
            title="لا توجد دورات مسجلة حاليًا"
            description="سيُعرض هنا كل تسجيل مؤكَّد مع الخادم."
            action={{ label: 'استعرض الدورات المتاحة', href: '/courses' }}
          />
        )}
      </DashboardSection>

      {/* 6 — Browse courses */}
      <DashboardSection
        title="دورات يمكنني التسجيل لها الآن"
        action={!catalogLoading && browseCourses.length > 0 ? { label: 'الكتالوج العام', href: '/courses' } : undefined}
      >
        {catalogLoading ? (
          <DashboardCardGridSkeleton count={3} cols={3} />
        ) : browseCourses.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={catalog.length === 0 ? 'لم تُحمَّل قائمة الدورات.' : 'أنت مسجل في هذه الدورات بالفعل أو القائمة خالية.'}
            action={{ label: 'فتح دورات المنصّة', href: '/courses' }}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {browseCourses.slice(0, 6).map((c, i) => (
              <motion.div
                key={c.id ?? i}
                layout
                className="rounded-2xl border border-deepBlue/[0.06] bg-white/[0.95] p-4 shadow-sm ring-1 ring-deepBlue/[0.03] transition hover:border-customOrange/35 hover:shadow-md"
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
                  <span className="text-[11px] font-black text-slate-400">
                    {toFiniteStat(c.price as number | string | undefined, 0) ? 'برسوم' : 'مجانية'}
                  </span>
                  <Link
                    to={`/courses/${c.slug}`}
                    className="rounded-2xl bg-customOrange px-3 py-1.5 text-[11px] font-black text-white shadow-sm hover:brightness-105"
                  >
                    {c.start_date != null && String(c.start_date).trim() !== '' && String(c.start_date) !== '—'
                      ? 'التسجيل الآن'
                      : 'انضم إلى الدورة القادمة'}
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </DashboardSection>

      {/* 7 — Sessions + Notifications */}
      <div className="grid gap-10 xl:grid-cols-[1fr_minmax(0,340px)]">
        <DashboardSection
          title="الجلسات القادمة"
          action={
            Array.isArray(sessions) && sessions.length > 0
              ? { label: 'جدول الجلسات', href: '/dashboard/student/sessions' }
              : undefined
          }
        >
          {lmsLoading ? (
            <DashboardListSkeleton count={3} />
          ) : Array.isArray(sessions) && sessions.length > 0 ? (
            <ol className="relative space-y-5 border-e-2 border-customBlue/20 pe-8">
              {upcomingLmsRaw.length > 0
                ? upcomingLmsRaw.slice(0, 8).map((s) => (
                    <li key={s.id}><SessionCard session={s} /></li>
                  ))
                : sessions.slice(0, 8).map((s) => (
                    <li key={s.id} className="relative">
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
                    </li>
                  ))}
            </ol>
          ) : (
            <EmptyState icon={Calendar} title="لم تُحمّل جلسات قريبة بعد" />
          )}
        </DashboardSection>

        <DashboardSection
          title="أحدث الإشعارات"
          action={{ label: 'مركز الإشعارات', href: '/dashboard/notifications' }}
        >
          {lmsLoading ? (
            <DashboardListSkeleton count={4} />
          ) : dashboardNotifications.length > 0 ? (
            <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-deepBlue/[0.05] bg-white shadow-sm ring-1 ring-white">
              {dashboardNotifications.slice(0, 5).map((n, i) => (
                <NotificationItem key={String(n.id ?? i)} notification={n} />
              ))}
            </div>
          ) : (
            <EmptyState icon={Bell} title="لا إشعارات حديثة." />
          )}
        </DashboardSection>
      </div>

      {/* 8 — Evaluation CTA */}
      <motion.section
        layout
        className="rounded-2xl border border-customOrange/25 bg-customOrange/[0.06] px-6 py-5 shadow-inner ring-1 ring-customOrange/20"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 rtl:flex-row-reverse">
          <div className="min-w-[12rem] text-right">
            <h3 className="text-sm font-black text-deepBlue">قيِّم تجربتك قبل أن تذهب التفاصيل بعيدًا</h3>
            <p className="mt-1 text-[11px] font-semibold leading-relaxed text-slate-600">
              {completedEnrollCount > 0 ? (
                <>تم تسجيل <span className="font-black text-deepBlue">{completedEnrollCount}</span> دورة كمكتملة.</>
              ) : (
                'سيُفعِّل هذا التنبيه تلقائيًا بعد إكمال أول دورة.'
              )}
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

      {/* 9 — Certificates */}
      <DashboardSection title="الشهادات المكتسبة" action={{ label: 'شهاداتي', href: '/dashboard/certificates' }}>
        {lmsLoading ? (
          <DashboardCardGridSkeleton count={2} cols={2} />
        ) : toFiniteStat(stats.completed_certificates, 0) > 0 || certPlaceholders.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-200/95 bg-emerald-50/90 px-4 py-3 text-[12px] font-black text-deepBlue ring-1 ring-emerald-100">
              عدد أكملها الخادم في الموجز:{' '}
              <span>{toFiniteStat(stats.completed_certificates, 0)}</span>
            </div>
            {certPlaceholders.slice(0, 4).map((c, i) => (
              <div key={`${String(c.label)}-${i}`} className="rounded-xl border border-dashed border-customOrange/40 bg-customOrange/[0.04] px-4 py-3 text-right">
                <p className="font-black text-deepBlue">{c.label}</p>
                {c.note && <p className="mt-1 text-[11px] font-semibold text-slate-600">{c.note}</p>}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={ScrollText} title="لا شهادة مفعّلة في الملمس الحالي بعد" />
        )}
      </DashboardSection>
    </div>
  )
}
