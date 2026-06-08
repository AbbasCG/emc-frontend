import {
  ArrowLeft,
  Award,
  BookOpen,
  Calendar,
  CalendarClock,
  ClipboardCheck,
  LayoutList,
  MessageSquare,
  PlayCircle,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import logo from '@/assets/logo.png'
import type { Course, Enrollment } from '@/types'
import { studentLearnHref } from '@/utils/studentLearnNavigation'
import { resolveCourseCoverImageUrl } from '@/utils/publicCourseDisplay'
import { getLevelFromScore } from '@/api/placementApi'

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

function formatScheduleLine(course: Course): string | null {
  if (!hasScheduledDate(course)) return null
  const d = String(course.start_date).slice(0, 10)
  const cx = course as Record<string, unknown>
  if (cx.start_time) return `${d} — ${String(cx.start_time)}`
  return d
}

function statusArabic(enrollment: Enrollment): string {
  if (enrollment.status === 'completed') return 'مكتملة'
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

  const isCompleted = status === 'completed'
  const badgeColor =
    isCompleted ? 'bg-emerald-600/95'
    : status === 'pending' ? 'bg-amber-500/95'
    : 'bg-customBlue/95'

  const scheduleLine = formatScheduleLine(course)
  const slug = enrollment.course?.slug?.trim()
  const learnHref = studentLearnHref(enrollment.course.id)
  const detailHref = slug ? `/courses/${slug}` : '/dashboard/student/registrations'
  const courseId = enrollment.course.id

  // ── Placement logic ──────────────────────────────────────────────────────────
  // Read from typed Enrollment/Course fields (now preserved through normalization pipeline)
  // Fall back to Record cast in case of pass-through extras from older code paths
  const cx = course as Record<string, unknown>
  const requiresPlacement = !!(
    course.requires_placement_test ||
    course.requires_placement ||
    cx.requires_placement_test ||
    cx.requires_placement
  )
  const placementStatus   = enrollment.placement_status ?? (enrollment as Record<string, unknown>).placement_status as string | undefined
  const writtenScore      = enrollment.placement_score  ?? (enrollment as Record<string, unknown>).placement_score  as number | undefined
  const writtenTotal      = enrollment.placement_total  ?? (enrollment as Record<string, unknown>).placement_total  as number | undefined

  const placementDone = placementStatus === 'completed'
  const inProgress    = placementStatus === 'in_progress'

  // Written test done — match canonical status AND common backend aliases
  const writtenSubmitted =
    placementStatus === 'written_submitted' ||
    placementStatus === 'waiting_oral'      ||
    placementStatus === 'oral_pending'      ||
    placementStatus === 'pending_oral'      ||
    placementStatus === 'pending_interview' ||
    placementStatus === 'test_completed'    ||
    placementStatus === 'written_completed'

  const oralBooked = placementStatus === 'oral_booked' || placementStatus === 'oral_completed'

  // 'placement_required' / 'not_started' = no attempt yet
  const needsStart = placementStatus === 'placement_required' || placementStatus === 'not_started'

  // Fallback: if we have a score but status is some unknown string (not in_progress, not booked, not done)
  // treat it as written-submitted rather than defaulting to 'start'
  const hasWrittenScore = writtenScore != null
  const testDoneByScore = hasWrittenScore && !inProgress && !oralBooked && !placementDone && !needsStart && !writtenSubmitted

  // True if placement is required but not yet fully done
  const placementLocked = requiresPlacement && !placementDone

  // Which primary action to show
  type PlacementState = 'none' | 'start' | 'resume' | 'oral' | 'waiting' | 'done'
  const placementState: PlacementState =
    !requiresPlacement                     ? 'none'
    : placementDone                        ? 'done'
    : oralBooked                           ? 'waiting'
    : (writtenSubmitted || testDoneByScore) ? 'oral'
    : inProgress                           ? 'resume'
    : needsStart                           ? 'start'
    :                                        'start'

  return (
    <motion.article
      layout
      whileHover={{ y: -4 }}
      className="group flex flex-col overflow-hidden rounded-3xl border border-deepBlue/[0.06] bg-white shadow-[0_18px_50px_-24px_rgba(34,51,74,0.45)] ring-1 ring-deepBlue/[0.04] transition-shadow duration-300 hover:shadow-[0_24px_60px_-20px_rgba(38,145,194,0.35)]"
    >
      {/* ── Image ─────────────────────────────────────────────────────── */}
      <div className="relative h-36 overflow-hidden sm:h-40">
        {showFallback ? (
          <div
            aria-hidden
            className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-deepBlue via-deepBlue to-customBlue"
          >
            <img
              src={logo} alt="" loading="lazy" draggable={false}
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
          {placementLocked && (
            <span className={`rounded-full px-3 py-1 text-[10px] font-black text-white shadow-sm backdrop-blur-[2px] ${
              placementState === 'waiting' ? 'bg-emerald-600/95'
              : placementState === 'oral'  ? 'bg-customBlue/95'
              : 'bg-amber-500/95'
            }`}>
              {placementState === 'waiting' ? 'تم حجز المقابلة'
               : placementState === 'oral'  ? 'بانتظار المقابلة الشفوية'
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
            <span dir="ltr" className="flex-1 text-right">{scheduleLine}</span>
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
        {(writtenSubmitted || oralBooked || placementDone) && writtenScore != null && (() => {
          const lvl = getLevelFromScore(writtenScore, writtenTotal ?? 70)
          const cefrCode = CEFR_CODE[lvl.level] ?? lvl.level
          return (
            <div className="mt-3 rounded-2xl border border-emerald-200/70 bg-emerald-50/70 px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[11px] font-black text-emerald-700">
                  <ClipboardCheck className="h-3.5 w-3.5" aria-hidden />
                  نتيجة الاختبار الكتابي
                </div>
                <span className="font-mono text-[12px] font-black tabular-nums text-deepBlue">
                  {writtenScore}/{writtenTotal ?? 70}
                </span>
              </div>
              <p className="mt-1 text-[11px] font-bold text-emerald-700/70">
                <span className="font-mono">{cefrCode}</span>
                {lvl.label && <> — {lvl.label}</>}
              </p>
            </div>
          )
        })()}

        {/* ── Primary Action Button ────────────────────────────────────── */}
        <div className="mt-4 grid gap-2">
          {placementState === 'start' && (
            <Link
              to={`/dashboard/student/courses/${courseId}/placement-test`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-amber-500 to-amber-600 px-4 py-2.5 text-[12px] font-black text-white shadow-md shadow-amber-400/25 transition hover:brightness-105"
            >
              <PlayCircle className="h-4 w-4" aria-hidden />
              ابدأ اختبار تحديد المستوى
            </Link>
          )}

          {placementState === 'resume' && (
            <Link
              to={`/dashboard/student/courses/${courseId}/placement-test`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-amber-500 to-amber-600 px-4 py-2.5 text-[12px] font-black text-white shadow-md shadow-amber-400/25 transition hover:brightness-105"
            >
              <ClipboardCheck className="h-4 w-4" aria-hidden />
              إكمال اختبار تحديد المستوى
            </Link>
          )}

          {placementState === 'oral' && (
            <Link
              to={`/dashboard/student/courses/${courseId}/oral-booking`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-customBlue to-deepBlue px-4 py-2.5 text-[12px] font-black text-white shadow-md shadow-customBlue/25 transition hover:brightness-105"
            >
              <MessageSquare className="h-4 w-4" aria-hidden />
              حجز المقابلة الشفوية
            </Link>
          )}

          {placementState === 'waiting' && (
            <Link
              to={`/dashboard/student/courses/${courseId}/placement-result`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-emerald-600 to-emerald-700 px-4 py-2.5 text-[12px] font-black text-white shadow-md shadow-emerald-400/25 transition hover:brightness-105"
            >
              <Calendar className="h-4 w-4" aria-hidden />
              عرض موعد المقابلة
            </Link>
          )}

          {(placementState === 'none' || placementState === 'done') && (
            <Link
              to={learnHref}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-deepBlue to-[#2e4a63] px-4 py-2.5 text-[12px] font-black text-white shadow-md shadow-deepBlue/20 transition hover:brightness-[1.05]"
            >
              <BookOpen className="h-4 w-4 opacity-95" aria-hidden />
              متابعة التعلم
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
