import {
  ArrowLeft,
  Award,
  BookOpen,
  Calendar,
  CalendarClock,
  CheckCircle,
  ClipboardCheck,
  Clock,
  CreditCard,
  Hourglass,
  LayoutList,
  MessageSquare,
  PlayCircle,
  XCircle,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { Link } from 'react-router'
import { useState } from 'react'
import type { Course, Enrollment } from '@/types'
import { studentLearnHref } from '@/utils/studentLearnNavigation'
import { resolveCourseCoverImageUrl } from '@/utils/publicCourseDisplay'
import { getLevelFromScore, progressFromStatus } from '@/api/placementApi'
import { fmtDate, formatStudentDateTime } from '@/components/lms/lmsFormatters'
import PaymentRequiredCta from './PaymentRequiredCta'

const CEFR_CODE: Record<string, string> = {
  beginner:           'Starter',
  elementary:         'A1',
  pre_intermediate:   'A2',
  intermediate:       'B1',
  upper_intermediate: 'B2',
  advanced:           'C1',
}

function hasScheduledDate(course: Course): boolean {
  const d = course.start_date
  if (d == null) return false
  const s = String(d).trim()
  return s !== '' && s !== '—'
}

function stripSeconds(t: string): string {
  return String(t).slice(0, 5)
}

function formatScheduleLine(course: Course): string | null {
  if (!hasScheduledDate(course)) return null
  const dateStr = String(course.start_date).slice(0, 10)
  const formattedDate = fmtDate(dateStr)
  const cx = course as Record<string, unknown>
  const startTime = cx.start_time ? stripSeconds(String(cx.start_time)) : null
  const endTime   = cx.end_time   ? stripSeconds(String(cx.end_time))   : null
  if (startTime && endTime) return `${formattedDate}، ${startTime} - ${endTime}`
  if (startTime)             return `${formattedDate}، ${startTime}`
  return formattedDate
}

/** Course lifecycle end has passed, per the backend's centralized CourseComputedStatus —
 *  never re-derived from raw dates on the frontend. */
function isEndedByLifecycle(course: Course): boolean {
  const c = course as Record<string, unknown>
  return c.is_ended === true || c.computed_status === 'ended' || c.lifecycle_status === 'completed'
}

function statusArabic(enrollment: Enrollment): string {
  if (enrollment.status === 'completed' || isEndedByLifecycle(enrollment.course)) return 'مكتملة'
  // The detailed payment badge (rendered separately, see paymentBlocked in the
  // component body) already carries the specific pending/failed/required
  // label — this top-line status pill stays generic to avoid showing the
  // same message twice.
  const access = enrollment.access
  if (access?.payment_required && !access.payment_completed) return 'معلّقة'
  if (enrollment.can_start_learning || enrollment.placement_status === 'completed') return 'نشطة'
  if (enrollment.status === 'pending') return 'معلّقة'
  return 'نشطة'
}

export default function StudentMyCourseCard({ enrollment }: { enrollment: Enrollment }) {
  const { course, completed_sessions, total_sessions, status } = enrollment

  const imageUrl = resolveCourseCoverImageUrl(course)
  const [imgError, setImgError] = useState(false)
  const showFallback = !imageUrl || imgError

  const pct =
    total_sessions > 0 ? Math.round((completed_sessions / total_sessions) * 100)
    : status === 'completed' ? 100
    : 0

  const isCompleted = status === 'completed' || isEndedByLifecycle(course)
  const badgeColor =
    isCompleted ? 'bg-emerald-600/95'
    : status === 'pending' ? 'bg-amber-500/95'
    : 'bg-customBlue/95'

  const scheduleLine = formatScheduleLine(course)
  const slug = enrollment.course?.slug?.trim()
  const learnHref = studentLearnHref(enrollment.course.id)
  const detailHref = slug ? `/courses/${slug}` : '/dashboard/student/registrations'
  const courseId = enrollment.course.id

  // ── Payment gate — canonical backend block, never inferred from status/tab ───
  // A registration existing (even a "pending" one) is not proof of payment;
  // the backend's access.payment_completed is the only source of truth here.
  const access = enrollment.access ?? null
  const paymentBlocked = !!access && access.payment_required && !access.payment_completed

  // ── Placement logic — source of truth is placement_progress from API ─────────
  const cx = course as Record<string, unknown>
  const requiresPlacement = !!(
    course.requires_placement_test ||
    course.requires_placement ||
    cx.requires_placement_test ||
    cx.requires_placement
  )
  const placementStatus      = enrollment.placement_status       ?? null
  const writtenScore         = enrollment.placement_score        ?? null
  const writtenTotal         = enrollment.placement_total        ?? null
  const writtenPct           = enrollment.placement_percentage   ?? null
  const writtenEstLevel      = enrollment.placement_estimated_level ?? null
  const oralBookingStartsAt  = enrollment.oral_booking_starts_at ?? null
  const oralFinalLevel       = enrollment.oral_final_level       ?? null
  const oralScoreVal         = enrollment.oral_score             ?? null

  const progress = progressFromStatus(placementStatus, !!(enrollment.can_start_learning))

  const placementLocked = requiresPlacement && !progress.can_start

  type PlacementState = 'none' | 'start' | 'resume' | 'oral' | 'waiting' | 'awaiting_result' | 'done'
  const placementState: PlacementState =
    !requiresPlacement        ? 'none'
    : progress.can_start      ? 'done'
    : progress.oral_done      ? 'awaiting_result'
    : progress.oral_booked    ? 'waiting'
    : progress.written_done   ? 'oral'
    : progress.status === 'in_progress' ? 'resume'
    : 'start'

  // can_start means the student may enter the course
  const canLearn = placementState === 'none' || placementState === 'done'

  return (
    <motion.article
      layout
      whileHover={{ y: -4 }}
      className="group flex flex-col overflow-hidden rounded-3xl border border-deepBlue/[0.06] bg-white shadow-emc ring-1 ring-deepBlue/[0.03] transition-shadow duration-300 ease-emc-out hover:shadow-emc-lg"
    >
      {/* ── Image ─────────────────────────────────────────────────────── */}
      <div className="relative h-36 overflow-hidden sm:h-40">
        {showFallback ? (
          <div
            aria-hidden
            className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-deepBlue via-deepBlue to-customBlue"
          >
            <img
              src="/brand/logos/logo_full_white.png" alt="" loading="lazy" draggable={false}
              className="h-16 w-auto opacity-90 drop-shadow-lg"
              width={160} height={64}
            />
          </div>
        ) : (
          <img
            src={imageUrl!} alt="" loading="lazy"
            className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
            onError={() => setImgError(true)}
          />
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-deepBlue/85 via-deepBlue/10 to-transparent" />

        {/* Status badges */}
        <div className="absolute right-3 top-3 flex flex-wrap gap-1.5">
          <span className={`rounded-full px-3 py-1 text-[11px] font-black text-white shadow-sm backdrop-blur-[2px] ${badgeColor}`}>
            {statusArabic(enrollment)}
          </span>
          {paymentBlocked ? (
            <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-black text-white shadow-sm backdrop-blur-[2px] ${
              access?.block_reason === 'payment_failed' ? 'bg-red-600/95' : 'bg-customOrange/95'
            }`}>
              {access?.block_reason === 'payment_pending' ? (<><Hourglass className="h-3 w-3" aria-hidden /> الدفع قيد المراجعة</>)
               : access?.block_reason === 'payment_failed' ? (<><XCircle className="h-3 w-3" aria-hidden /> فشل الدفع</>)
               : (<><CreditCard className="h-3 w-3" aria-hidden /> بانتظار الدفع</>)}
            </span>
          ) : placementLocked && (
            <span className={`rounded-full px-3 py-1 text-[10px] font-black text-white shadow-sm backdrop-blur-[2px] ${
              placementState === 'awaiting_result' ? 'bg-purple-600/95'
              : placementState === 'waiting'       ? 'bg-emerald-600/95'
              : placementState === 'oral'          ? 'bg-customBlue/95'
              : 'bg-amber-500/95'
            }`}>
              {placementState === 'awaiting_result' ? 'بانتظار اعتماد المستوى'
               : placementState === 'waiting'       ? 'تم حجز المقابلة'
               : placementState === 'oral'          ? 'بانتظار المقابلة الشفوية'
               : 'اختبار تحديد المستوى'}
            </span>
          )}
        </div>

        <div className="absolute bottom-2.5 left-3 right-3">
          <h3 className="line-clamp-2 text-right text-[15px] font-black leading-snug text-white drop-shadow-sm sm:text-[16px]">
            {course.title}
          </h3>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col p-5 text-right" dir="rtl">

        {/* Instructor */}
        <p className="text-[12px] font-bold text-deepBlue/70">
          المدرب:{' '}
          <span className="font-semibold text-deepBlue">
            {course.instructor_name?.trim()
              ? course.instructor_name
              : 'لم يتم تعيين المدرب بعد'}
          </span>
        </p>

        {/* Schedule */}
        {scheduleLine ? (
          <div className="mt-3 flex items-start gap-2 rounded-2xl border border-customBlue/15 bg-customBlue/[0.05] px-3 py-2.5 text-[11px] font-bold text-deepBlue">
            <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-customBlue" aria-hidden />
            <span className="flex-1 text-right">{scheduleLine}</span>
          </div>
        ) : (
          <div className="mt-3 rounded-2xl border border-orange-200/80 bg-orange-50/80 px-3 py-2.5 text-[11px] font-bold text-deepBlue/70">
            سيتم إشعارك عند تحديد الموعد
          </div>
        )}

        {/* Progress bar */}
        <div className="mt-4 flex-1">
          <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px] font-black">
            <span className="tabular-nums text-customBlue">{pct}%</span>
            <span className="text-deepBlue/50">
              الجلسات: {completed_sessions} / {total_sessions > 0 ? total_sessions : '—'}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <motion.div
              className={`h-full rounded-full ${
                isCompleted         ? 'bg-emerald-500'
                : pct > 0           ? 'bg-gradient-to-l from-customBlue to-customBlue/80'
                :                     'bg-slate-300'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.85, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Written test score summary (after submission) */}
        {progress.written_done && writtenScore != null && (() => {
          const lvl = getLevelFromScore(writtenScore, writtenTotal ?? 70)
          const cefrCode = CEFR_CODE[writtenEstLevel ?? lvl.level] ?? CEFR_CODE[lvl.level] ?? lvl.level
          const displayPct = writtenPct ?? (writtenTotal ? Math.round((writtenScore / writtenTotal) * 100) : null)
          return (
            <div className="mt-3 rounded-2xl border border-emerald-200/70 bg-emerald-50/70 px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[11px] font-black text-emerald-700">
                  <ClipboardCheck className="h-3.5 w-3.5" aria-hidden />
                  نتيجة الاختبار الكتابي
                </div>
                <span className="font-mono text-[12px] font-black tabular-nums text-deepBlue">
                  {writtenScore}/{writtenTotal ?? 70}
                  {displayPct != null && <span className="text-deepBlue/40"> ({displayPct}%)</span>}
                </span>
              </div>
              <p className="mt-1 text-[11px] font-bold text-emerald-700/70">
                <span className="font-mono">{cefrCode}</span>
                {lvl.label && <> — {lvl.label}</>}
              </p>
            </div>
          )
        })()}

        {/* Oral booking info — shown when interview is booked */}
        {placementState === 'waiting' && oralBookingStartsAt && (
          <div className="mt-3 rounded-2xl border border-emerald-200/70 bg-emerald-50/70 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[11px] font-black text-emerald-700">
              <Calendar className="h-3.5 w-3.5" aria-hidden />
              موعد المقابلة الشفوية
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-[11px] font-bold text-deepBlue/70">
              <Clock className="h-3 w-3 shrink-0 text-emerald-600" aria-hidden />
              <span>{formatStudentDateTime(oralBookingStartsAt)}</span>
            </p>
          </div>
        )}

        {/* Final level — shown after oral is completed and level is approved */}
        {oralFinalLevel && (
          <div className="mt-3 rounded-2xl border border-violet-200/70 bg-violet-50/70 px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[11px] font-black text-violet-700">
                <CheckCircle className="h-3.5 w-3.5" aria-hidden />
                المستوى النهائي
              </div>
              <span className="font-mono text-[12px] font-black tabular-nums text-deepBlue">
                {oralFinalLevel}
                {oralScoreVal != null && <span className="text-deepBlue/40"> · {oralScoreVal}</span>}
              </span>
            </div>
          </div>
        )}

        {/* ── Primary Action Button ────────────────────────────────────── */}
        <div className="mt-4 grid gap-2">
          {paymentBlocked && <PaymentRequiredCta access={access} course={course} />}

          {!paymentBlocked && placementState === 'start' && (
            <Link
              to={`/dashboard/student/courses/${courseId}/placement-test`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-amber-500 to-amber-600 px-4 py-2.5 text-[12px] font-black text-white shadow-md shadow-amber-400/25 transition hover:brightness-105"
            >
              <PlayCircle className="h-4 w-4" aria-hidden />
              ابدأ اختبار تحديد المستوى
            </Link>
          )}

          {!paymentBlocked && placementState === 'resume' && (
            <Link
              to={`/dashboard/student/courses/${courseId}/placement-test`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-amber-500 to-amber-600 px-4 py-2.5 text-[12px] font-black text-white shadow-md shadow-amber-400/25 transition hover:brightness-105"
            >
              <ClipboardCheck className="h-4 w-4" aria-hidden />
              إكمال اختبار تحديد المستوى
            </Link>
          )}

          {!paymentBlocked && placementState === 'oral' && (
            <Link
              to={`/dashboard/student/courses/${courseId}/oral-booking`}
              state={{ courseTitle: course.title }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-customBlue to-deepBlue px-4 py-2.5 text-[12px] font-black text-white shadow-md shadow-customBlue/25 transition hover:brightness-105"
            >
              <MessageSquare className="h-4 w-4" aria-hidden />
              حجز المقابلة الشفوية
            </Link>
          )}

          {!paymentBlocked && placementState === 'waiting' && (
            <Link
              to={`/dashboard/student/courses/${courseId}/placement-result`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-emerald-600 to-emerald-700 px-4 py-2.5 text-[12px] font-black text-white shadow-md shadow-emerald-400/25 transition hover:brightness-105"
            >
              <Calendar className="h-4 w-4" aria-hidden />
              عرض موعد المقابلة
            </Link>
          )}

          {!paymentBlocked && placementState === 'awaiting_result' && (
            <div className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-purple-600 to-purple-700 px-4 py-2.5 text-[12px] font-black text-white shadow-md shadow-purple-400/20 opacity-80 cursor-default select-none">
              <Award className="h-4 w-4" aria-hidden />
              بانتظار اعتماد المستوى
            </div>
          )}

          {!paymentBlocked && canLearn && isCompleted && (
            <Link
              to={learnHref}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-emerald-600 to-emerald-700 px-4 py-2.5 text-[12px] font-black text-white shadow-md shadow-emerald-400/20 transition hover:brightness-105"
            >
              <CheckCircle className="h-4 w-4 opacity-95" aria-hidden />
              مراجعة الدورة
              <ArrowLeft className="h-4 w-4 opacity-90" aria-hidden />
            </Link>
          )}

          {!paymentBlocked && canLearn && !isCompleted && pct > 0 && (
            <Link
              to={learnHref}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-deepBlue to-[#2e4a63] px-4 py-2.5 text-[12px] font-black text-white shadow-md shadow-deepBlue/20 transition hover:brightness-[1.05]"
            >
              <BookOpen className="h-4 w-4 opacity-95" aria-hidden />
              متابعة التعلم
              <ArrowLeft className="h-4 w-4 opacity-90" aria-hidden />
            </Link>
          )}

          {!paymentBlocked && canLearn && !isCompleted && pct === 0 && (
            <Link
              to={learnHref}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-emerald-600 to-emerald-700 px-4 py-2.5 text-[12px] font-black text-white shadow-md shadow-emerald-400/25 transition hover:brightness-105"
            >
              <BookOpen className="h-4 w-4 opacity-95" aria-hidden />
              ابدأ التعلم
              <ArrowLeft className="h-4 w-4 opacity-90" aria-hidden />
            </Link>
          )}

          <Link
            to={detailHref}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-customOrange/45 bg-orange-50/50 px-4 py-2.5 text-[12px] font-black text-deepBlue transition hover:border-customOrange hover:bg-orange-50"
          >
            <LayoutList className="h-4 w-4 text-customOrange" aria-hidden />
            تفاصيل الدورة
          </Link>
        </div>
      </div>
    </motion.article>
  )
}
