import {
  Bell,
  BookOpen,
  Calendar,
  CheckCircle,
  ChevronLeft,
  ClipboardList,
  GraduationCap,
  Radio,
  RefreshCw,
  ScrollText,
  TrendingUp,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  DashboardSection,
  DashboardHero,
  DashboardCardGridSkeleton,
  DashboardListSkeleton,
  DashboardErrorWidget,
  EmptyState,
  NotificationItem,
} from '../components/dashboard'
import { SessionCard } from '@/components/lms'
import { useAuth } from '../contexts/AuthContext'
import { useStudentDashboardData } from '@/hooks/useStudentDashboardData'
import { studentLearnHref } from '@/utils/studentLearnNavigation'
import { formatDateTime } from '@/utils/dateTime'
import { getUserAvatarUrl, getUserInitials } from '@/utils/userIdentity'
import { resolvePublicAssetUrl } from '@/utils/mediaUrl'
import type { LmsSession } from '@/types/lms'

// ─── helpers ──────────────────────────────────────────────────────────────────

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

// ─── KPI Card ─────────────────────────────────────────────────────────────────

type KpiProps = {
  label: string
  value: string | number
  icon: React.ComponentType<{ size?: number; className?: string }>
  color: 'blue' | 'orange' | 'green' | 'purple' | 'slate'
}

const KPI_COLOR: Record<KpiProps['color'], string> = {
  blue:   'bg-customBlue/[0.08] text-customBlue ring-customBlue/15',
  orange: 'bg-customOrange/[0.08] text-customOrange ring-customOrange/15',
  green:  'bg-emerald-500/[0.08] text-emerald-600 ring-emerald-200/60',
  purple: 'bg-violet-500/[0.08] text-violet-600 ring-violet-200/60',
  slate:  'bg-slate-100 text-slate-500 ring-slate-200/60',
}
const KPI_ICON_BG: Record<KpiProps['color'], string> = {
  blue:   'bg-customBlue/10 text-customBlue',
  orange: 'bg-customOrange/10 text-customOrange',
  green:  'bg-emerald-100 text-emerald-600',
  purple: 'bg-violet-100 text-violet-600',
  slate:  'bg-slate-100 text-slate-400',
}

function KpiCard({ label, value, icon: Icon, color }: KpiProps) {
  return (
    <motion.div
      layout
      whileHover={{ y: -2 }}
      className={`flex items-center gap-4 rounded-2xl p-4 ring-1 ${KPI_COLOR[color]}`}
    >
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${KPI_ICON_BG[color]}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0 text-right">
        <p className="text-[11px] font-bold opacity-70">{label}</p>
        <p className="mt-0.5 text-xl font-black tabular-nums leading-none">{value}</p>
      </div>
    </motion.div>
  )
}

// ─── Course Card ──────────────────────────────────────────────────────────────

const DISPLAY_STATUS_LABEL: Record<string, string> = {
  active:          'نشطة',
  completed:       'مكتملة',
  upcoming:        'قادمة',
  waiting_class:   'بانتظار توزيعك على فصل دراسي',
  needs_placement: 'يحتاج اختبار تحديد مستوى',
  pending:         'معلّقة',
}
const DISPLAY_STATUS_COLOR: Record<string, string> = {
  active:          'bg-customBlue/90 text-white',
  completed:       'bg-emerald-600/90 text-white',
  upcoming:        'bg-amber-500/90 text-white',
  waiting_class:   'bg-violet-600/90 text-white',
  needs_placement: 'bg-amber-600/90 text-white',
  pending:         'bg-slate-400/90 text-white',
}

type DashCourse = {
  id: number
  title: string
  slug?: string | null
  instructor_name?: string | null
  progress_percent?: number
  display_status?: string
  is_completed?: boolean
  start_date?: string | null
  start_time?: string | null
  course_image?: string | null
  cover_url?: string | null
  class_assignment?: { name?: string; level_code?: string; schedule_day?: string; schedule_time?: string } | null
}

function CourseCard({ course }: { course: DashCourse }) {
  const pct = typeof course.progress_percent === 'number' ? Math.round(course.progress_percent) : 0
  const coverUrl = resolvePublicAssetUrl(course.cover_url ?? course.course_image ?? null)
  const learnHref = studentLearnHref(course.id)
  const detailHref = course.slug ? `/courses/${course.slug}` : '/dashboard/student/registrations'
  const displayStatus = course.display_status ?? (course.is_completed ? 'completed' : 'active')
  const statusLabel = DISPLAY_STATUS_LABEL[displayStatus] ?? displayStatus
  const statusColor = DISPLAY_STATUS_COLOR[displayStatus] ?? DISPLAY_STATUS_COLOR.active
  const cg = course.class_assignment

  const scheduleText = (() => {
    if (cg?.schedule_day || cg?.schedule_time) {
      return [cg.schedule_day, cg.schedule_time].filter(Boolean).join(' · ')
    }
    if (course.start_date) {
      const iso = course.start_time ? `${course.start_date}T${course.start_time}` : course.start_date
      return formatDateTime(iso)
    }
    return null
  })()

  return (
    <motion.article
      layout
      whileHover={{ y: -3 }}
      className="flex flex-col overflow-hidden rounded-2xl border border-deepBlue/[0.06] bg-white shadow-sm ring-1 ring-deepBlue/[0.03] transition-shadow hover:shadow-md"
    >
      {/* Image */}
      <div className="relative h-36 overflow-hidden bg-gradient-to-br from-deepBlue to-customBlue">
        {coverUrl ? (
          <img src={coverUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <GraduationCap size={40} className="text-white/30" />
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-deepBlue/70 to-transparent" />
        <span className={`absolute right-2.5 top-2.5 rounded-full px-2.5 py-1 text-[10px] font-black ${statusColor}`}>
          {statusLabel}
        </span>
        <h3 className="absolute bottom-2 left-3 right-3 line-clamp-2 text-right text-[14px] font-black leading-snug text-white drop-shadow-sm">
          {course.title}
        </h3>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-4 text-right">
        {course.instructor_name && (
          <p className="text-[11px] font-bold text-slate-500">
            المدرب: <span className="font-semibold text-deepBlue">{course.instructor_name}</span>
          </p>
        )}

        {cg?.name && (
          <p className="rounded-lg border border-customBlue/15 bg-customBlue/[0.04] px-2.5 py-1.5 text-[10px] font-black text-customBlue">
            الصف: {cg.name} {cg.level_code ? `· ${cg.level_code}` : ''}
          </p>
        )}

        {scheduleText ? (
          <p className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
            <Calendar size={12} className="shrink-0 text-customBlue" />
            <span dir="ltr">{scheduleText}</span>
          </p>
        ) : (
          <p className="text-[10px] font-bold text-slate-400">سيتم إشعارك عند تحديد الموعد</p>
        )}

        {/* Progress bar */}
        <div>
          <div className="mb-1 flex items-center justify-between text-[10px] font-black">
            <span className="text-customBlue">{pct}%</span>
            <span className="text-slate-400">التقدم</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <motion.div
              className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : pct > 0 ? 'bg-customBlue' : 'bg-slate-200'}`}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-auto grid gap-2">
          {displayStatus === 'needs_placement' ? (
            <Link
              to={`/dashboard/student/courses/${course.id}/placement-test`}
              className="rounded-xl bg-amber-600 px-4 py-2.5 text-center text-[11px] font-black text-white transition hover:brightness-105"
            >
              بدء اختبار تحديد المستوى
            </Link>
          ) : displayStatus === 'completed' ? (
            <Link
              to={detailHref}
              className="rounded-xl border-2 border-emerald-200 bg-emerald-50 px-4 py-2.5 text-center text-[11px] font-black text-emerald-700 transition hover:bg-emerald-100"
            >
              عرض التفاصيل
            </Link>
          ) : (
            <Link
              to={learnHref}
              className="rounded-xl bg-deepBlue px-4 py-2.5 text-center text-[11px] font-black text-white transition hover:bg-customBlue"
            >
              {pct > 0 ? 'متابعة التعلم' : 'ابدأ التعلم'}
            </Link>
          )}
          <Link
            to={detailHref}
            className="rounded-xl border-2 border-customOrange/35 bg-orange-50/50 px-4 py-2.5 text-center text-[11px] font-black text-deepBlue transition hover:border-customOrange hover:bg-orange-50"
          >
            تفاصيل الدورة
          </Link>
        </div>
      </div>
    </motion.article>
  )
}

// ─── Session Group ─────────────────────────────────────────────────────────────

function SessionGroup({
  icon: Icon,
  title,
  iconClass,
  sessions,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  title: string
  iconClass: string
  sessions: LmsSession[]
}) {
  if (sessions.length === 0) return null
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon size={15} className={iconClass} />
        <h4 className="text-[12px] font-black text-deepBlue">{title}</h4>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">{sessions.length}</span>
      </div>
      <div className="space-y-3">
        {sessions.slice(0, 4).map((s) => (
          <SessionCard key={s.id} session={s} joinMeetingLabel="انضم للجلسة" compact />
        ))}
      </div>
    </div>
  )
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useAuth()
  const {
    loading,
    loadError,
    refresh,
    refreshing,
    lmsDashboard,
    enrollmentsMerged,
    sessionsLive,
    sessionsUpcoming,
    sessionsEnded,
    notificationsUnread,
  } = useStudentDashboardData()

  const counts                = lmsDashboard.counts
  const pendingAssignments    = lmsDashboard.pending_assignments
  const dashboardNotifications = Array.isArray(lmsDashboard.notifications) ? lmsDashboard.notifications : []

  // Build the best course list available
  const currentCourses: DashCourse[] = (
    (lmsDashboard.active_courses?.length ?? 0) > 0
      ? lmsDashboard.active_courses!
      : lmsDashboard.current_courses
  ) as DashCourse[]

  const displayCourses: DashCourse[] =
    enrollmentsMerged.length > 0
      ? enrollmentsMerged.map((e) => {
          const eRaw = e as Record<string, unknown>
          const cRaw = e.course as Record<string, unknown>
          return {
            id:              e.course.id,
            title:           e.course.title,
            slug:            e.course.slug ?? null,
            instructor_name: (e.course.instructor_name as string | undefined) ?? null,
            progress_percent: e.status === 'completed' ? 100 : ((eRaw.progress_percent as number | undefined) ?? 0),
            display_status:  e.status === 'completed' ? 'completed' : ((eRaw.display_status as string | undefined) ?? 'active'),
            course_image:    (cRaw.course_image as string | undefined) ?? null,
            cover_url:       (cRaw.cover_url as string | undefined) ?? null,
            class_assignment: (eRaw.class_assignment as DashCourse['class_assignment']) ?? null,
          }
        })
      : currentCourses

  const certificates     = Array.isArray(lmsDashboard.certificates) ? [...lmsDashboard.certificates] : []
  const pendingDueCount  = counts.pending_assignments_count
  const activeCount      = counts.active_courses_count
  const unreadCount      = notificationsUnread || counts.unread_notifications_count
  const hasSessions      = sessionsLive.length + sessionsUpcoming.length + sessionsEnded.length > 0

  const avatarUrl      = getUserAvatarUrl(user ?? null)
  const avatarInitials = getUserInitials(user ?? null)
  const displayName    = user?.name?.trim() || 'متعلّم EMC'

  const heroStats = loading
    ? undefined
    : [
        { label: 'دوراتي', value: counts.enrolled_courses_count || enrollmentsMerged.length },
        { label: 'واجبات معلّقة', value: pendingDueCount },
        { label: 'جلسات قادمة', value: counts.upcoming_sessions_count || (sessionsLive.length + sessionsUpcoming.length) },
      ]

  return (
    <div className="space-y-8 text-right rtl" dir="rtl">
      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <DashboardHero
        greeting={hourGreeting()}
        name={displayName}
        role="بوابة الطالب"
        subtitle={
          loading
            ? 'جارٍ تحميل بيانات التعلّم…'
            : loadError
              ? loadError
              : counts.enrolled_courses_count === 0
                ? 'لم تسجل بعد — تصفّح الدورات المتاحة وابدأ.'
                : `تقدّمك: ${Math.round(lmsDashboard.progress_percent)}%`
        }
        quickStats={heroStats}
        avatarUrl={avatarUrl}
        avatarInitials={avatarInitials}
        actions={
          <>
            <HeroChip href="/dashboard/student/materials"  label="المواد التعليمية" />
            <HeroChip href="/dashboard/student/sessions"   label="جدول الجلسات" />
            <HeroChip href="/dashboard/student/attendance" label="سجل الحضور" />
            <HeroChip href="/dashboard/student/evaluation" label="تقييم التجربة" />
          </>
        }
      />

      {/* Error banner */}
      {loadError && !loading && (
        <DashboardErrorWidget
          title="تعذّر تحميل لوحة الطالب"
          description={loadError}
          compact
        />
      )}

      {/* ── KPIs ────────────────────────────────────────────────────────────── */}
      {!loading && !loadError && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="دورات نشطة"
            value={activeCount}
            icon={BookOpen}
            color="blue"
          />
          <KpiCard
            label="واجبات تنتظر التسليم"
            value={pendingDueCount}
            icon={ClipboardList}
            color="orange"
          />
          <KpiCard
            label="التقدّم الإجمالي"
            value={`${Math.round(lmsDashboard.progress_percent)}%`}
            icon={TrendingUp}
            color="green"
          />
          <KpiCard
            label="إشعارات غير مقروءة"
            value={unreadCount}
            icon={Bell}
            color={unreadCount > 0 ? 'purple' : 'slate'}
          />
        </div>
      )}
      {loading && (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      )}

      {/* ── Sessions ────────────────────────────────────────────────────────── */}
      <div className="grid gap-8 xl:grid-cols-[1fr_minmax(0,340px)]">
        <DashboardSection
          title="الجلسات"
          action={{ label: 'جدول كامل', href: '/dashboard/student/sessions' }}
        >
          {loading ? (
            <DashboardListSkeleton count={3} />
          ) : !hasSessions ? (
            <EmptyState icon={Calendar} title="لا توجد جلسات مجدولة حاليًا" />
          ) : (
            <div className="space-y-6">
              <AnimatePresence>
                <SessionGroup
                  icon={Radio}
                  title="مباشرة الآن"
                  iconClass="text-emerald-600"
                  sessions={sessionsLive}
                />
                <SessionGroup
                  icon={Calendar}
                  title="قادمة"
                  iconClass="text-customBlue"
                  sessions={sessionsUpcoming}
                />
                <SessionGroup
                  icon={CheckCircle}
                  title="انتهت (آخر يومين)"
                  iconClass="text-slate-400"
                  sessions={sessionsEnded}
                />
              </AnimatePresence>
            </div>
          )}
        </DashboardSection>

        {/* ── Notifications ───────────────────────────────────────────────── */}
        <DashboardSection
          title="أحدث الإشعارات"
          action={{ label: 'مركز الإشعارات', href: '/dashboard/notifications' }}
        >
          {loading ? (
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

      {/* ── Pending Assignments ─────────────────────────────────────────────── */}
      {pendingAssignments.length > 0 && (
        <DashboardSection
          title="واجبات تنتظر تسليمك"
          action={{ label: 'الكل', href: '/dashboard/student/assignments' }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {pendingAssignments.slice(0, 4).map((a) => (
              <Link
                key={a.id}
                to={`/dashboard/student/assignments?submit=${a.assignment_id ?? a.id}`}
                className="flex items-start justify-between gap-4 rounded-2xl border border-amber-200/70 bg-amber-50/80 p-4 ring-1 ring-amber-100 transition hover:border-amber-300"
              >
                <div className="min-w-0 text-right">
                  <p className="line-clamp-1 text-[13px] font-black text-deepBlue">{a.title}</p>
                  {a.course_name && (
                    <p className="mt-0.5 text-[11px] font-bold text-slate-500">{a.course_name}</p>
                  )}
                  {a.due_at && (
                    <p className="mt-1 text-[10px] font-bold text-amber-700" dir="ltr">
                      {formatDateTime(a.due_at)}
                    </p>
                  )}
                </div>
                <span className="shrink-0 rounded-full bg-amber-500/90 px-2.5 py-1 text-[10px] font-black text-white">
                  مطلوب
                </span>
              </Link>
            ))}
          </div>
        </DashboardSection>
      )}

      {/* ── My Courses ─────────────────────────────────────────────────────── */}
      <DashboardSection
        title="دوراتي"
        subtitle="الدورات المسجّل فيها — مزامنة من بيانات التسجيل الحقيقية."
        action={
          displayCourses.length > 8
            ? { label: 'عرض الكل', href: '/dashboard/student/courses' }
            : undefined
        }
      >
        {loading ? (
          <DashboardCardGridSkeleton count={4} cols={4} />
        ) : displayCourses.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {displayCourses.slice(0, 8).map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={BookOpen}
            title="لا توجد دورات مسجلة حاليًا"
            description="استعرض الدورات المتاحة وابدأ رحلتك التعليمية."
            action={{ label: 'استعرض الدورات', href: '/courses' }}
          />
        )}
      </DashboardSection>

      {/* ── Certificates ────────────────────────────────────────────────────── */}
      {(loading || certificates.length > 0 || counts.certificates_count > 0) && (
        <DashboardSection
          title="الشهادات المكتسبة"
          action={{ label: 'شهاداتي', href: '/dashboard/certificates' }}
        >
          {loading ? (
            <DashboardCardGridSkeleton count={2} cols={2} />
          ) : certificates.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {certificates.slice(0, 4).map((c) => (
                <Link
                  key={c.id}
                  to="/dashboard/certificates"
                  className="rounded-xl border border-emerald-200/95 bg-emerald-50/90 px-4 py-3 text-right ring-1 ring-emerald-100 transition hover:border-emerald-300"
                >
                  <p className="font-black text-deepBlue">{c.title}</p>
                  {(c.course_name || c.track_name) && (
                    <p className="mt-1 text-[11px] font-semibold text-slate-600">
                      {c.course_name ?? c.track_name}
                    </p>
                  )}
                  {c.issued_at && (
                    <p className="mt-1 text-[10px] font-bold text-emerald-700" dir="ltr">
                      {formatDateTime(c.issued_at)}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState icon={ScrollText} title="لا شهادات مكتسبة بعد" />
          )}
        </DashboardSection>
      )}

      {/* ── Evaluation CTA ──────────────────────────────────────────────────── */}
      <motion.section
        layout
        className="rounded-2xl border border-customOrange/25 bg-customOrange/[0.06] px-6 py-5 shadow-inner ring-1 ring-customOrange/20"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 rtl:flex-row-reverse">
          <div className="min-w-[12rem] text-right">
            <h3 className="text-sm font-black text-deepBlue">قيِّم تجربتك التعليمية</h3>
            <p className="mt-1 text-[11px] font-semibold leading-relaxed text-slate-600">
              {counts.completed_courses_count > 0 ? (
                <>
                  أكملت <span className="font-black text-deepBlue">{counts.completed_courses_count}</span> دورة —
                  شاركنا رأيك.
                </>
              ) : (
                'سيُفعَّل هذا بعد إتمام أول دورة.'
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => void refresh()}
              disabled={refreshing}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-black text-slate-500 transition hover:border-customBlue hover:text-customBlue disabled:opacity-50"
              title="تحديث البيانات"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
              تحديث
            </button>
            <Link
              to="/dashboard/student/evaluation"
              className="flex items-center gap-1.5 rounded-xl bg-customOrange px-4 py-2.5 text-[11px] font-black text-white shadow-md transition hover:brightness-105"
            >
              الانتقال للتقييم
              <ChevronLeft size={13} />
            </Link>
          </div>
        </div>
      </motion.section>
    </div>
  )
}
