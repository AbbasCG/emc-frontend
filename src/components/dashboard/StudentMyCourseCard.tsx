import { ArrowLeft, CalendarClock, BookOpen, LayoutList } from 'lucide-react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import logo from '@/assets/logo.png'
import type { Course, Enrollment } from '@/types'
import { studentLearnHref } from '@/utils/studentLearnNavigation'
import { resolveCourseCoverImageUrl } from '@/utils/publicCourseDisplay'

function hasScheduledDate(course: Course): boolean {
  const d = course.start_date
  if (d == null) return false
  const s = String(d).trim()
  if (s === '' || s === '—') return false
  return true
}

function formatScheduleLine(course: Course): string | null {
  if (!hasScheduledDate(course)) return null
  const d = String(course.start_date).slice(0, 10)
  if (course.start_time) return `${d} — ${course.start_time}`
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

  return (
    <motion.article
      layout
      whileHover={{ y: -4 }}
      className="group flex flex-col overflow-hidden rounded-3xl border border-deepBlue/[0.06] bg-white shadow-[0_18px_50px_-24px_rgba(34,51,74,0.45)] ring-1 ring-deepBlue/[0.04] transition-shadow duration-300 hover:shadow-[0_24px_60px_-20px_rgba(38,145,194,0.35)]"
    >
      {/* Media */}
      <div className="relative h-36 overflow-hidden sm:h-40">
        {showFallback ? (
          <div
            aria-hidden
            className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-deepBlue via-deepBlue to-customBlue"
          >
            <img
              src={logo}
              alt=""
              className="h-16 w-auto opacity-92 drop-shadow-lg"
              width={160}
              height={64}
              loading="lazy"
              draggable={false}
            />
          </div>
        ) : (
          <img
            src={imageUrl!}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
            onError={() => setImgError(true)}
          />
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-deepBlue/85 via-deepBlue/10 to-transparent" />

        <div className="absolute right-3 top-3 flex flex-wrap gap-2">
          <span className={`rounded-full px-3 py-1 text-[11px] font-black text-white shadow-sm backdrop-blur-[2px] ${badgeColor}`}>
            {statusArabic(enrollment)}
          </span>
        </div>

        <div className="absolute bottom-2.5 left-3 right-3">
          <h3 className="line-clamp-2 text-right text-[15px] font-black leading-snug text-white drop-shadow-sm sm:text-[16px]">
            {course.title}
          </h3>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5 text-right" dir="rtl">
        <p className="text-[12px] font-bold text-deepBlue/80">
          المدرب:{' '}
          <span className="font-semibold text-deepBlue">
            {course.instructor_name && String(course.instructor_name).trim() !== '' ?
              course.instructor_name
            : 'لم يتم تعيين مدرب بعد'}
          </span>
        </p>

        {scheduleLine ? (
          <div className="mt-3 flex items-start gap-2 rounded-2xl border border-customBlue/15 bg-customBlue/[0.06] px-3 py-2.5 text-[11px] font-bold leading-relaxed text-deepBlue">
            <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-customBlue" aria-hidden />
            <span dir="ltr" className="flex-1 text-right">{scheduleLine}</span>
          </div>
        ) : (
          <div className="mt-3 rounded-2xl border border-orange-200/90 bg-orange-50/90 px-3 py-2.5 text-[11px] font-bold leading-relaxed text-deepBlue">
            سيتم إشعارك عند تحديد الموعد
          </div>
        )}

        {/* Progress */}
        <div className="mt-4 flex-1">
          <div className="mb-2 flex items-center justify-between gap-2 text-[11px] font-black">
            <span className="text-customBlue">{pct}%</span>
            <span className="text-deepBlue/55">
              الجلسات: {completed_sessions} / {total_sessions > 0 ? total_sessions : '—'}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <motion.div
              className={`h-full rounded-full ${
                isCompleted ? 'bg-emerald-500'
                : pct > 0 ? 'bg-gradient-to-l from-customBlue to-customBlue/80'
                : 'bg-slate-300'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.85, ease: 'easeOut' }}
            />
          </div>
        </div>

        <div className="mt-5 grid gap-2.5">
          <Link
            to={learnHref}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-deepBlue to-[#2e4a63] px-4 py-2.5 text-[12px] font-black text-white shadow-md shadow-deepBlue/20 transition hover:brightness-[1.05]"
          >
            <BookOpen className="h-4 w-4 opacity-95" aria-hidden />
            متابعة التعلم
            <ArrowLeft className="h-4 w-4 opacity-90" aria-hidden />
          </Link>
          <Link
            to={detailHref}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-customOrange/50 bg-orange-50/50 px-4 py-2.5 text-[12px] font-black text-deepBlue transition hover:border-customOrange hover:bg-orange-50"
          >
            <LayoutList className="h-4 w-4 text-customOrange" aria-hidden />
            تفاصيل الدورة
          </Link>
        </div>
      </div>
    </motion.article>
  )
}
