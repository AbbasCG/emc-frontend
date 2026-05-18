import { BookOpen, CalendarClock } from 'lucide-react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { courseImages } from '../../utils/course'
import type { Course, Enrollment } from '../../types'

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

export default function EnrolledCourseCard({
  enrollment,
  actionLabel,
  actionTo,
}: {
  enrollment: Enrollment
  actionLabel?: string
  actionTo?: string
}) {
  const { course, completed_sessions, total_sessions, status } = enrollment
  const pct = total_sessions > 0 ? Math.round((completed_sessions / total_sessions) * 100) : 0
  const isCompleted = status === 'completed'

  const barColor = isCompleted ? 'bg-emerald-500' : pct > 0 ? 'bg-customBlue' : 'bg-slate-300'
  const badgeColor = isCompleted ? 'bg-emerald-500' : 'bg-customBlue/90'
  const badgeLabel = isCompleted ? 'مكتملة' : status === 'pending' ? 'معلقة' : 'جارية'
  const scheduleLine = formatScheduleLine(course)

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100"
    >
      {/* Course image */}
      <div className="relative h-32 overflow-hidden">
        <img
          src={course.course_image || courseImages[course.id % courseImages.length]}
          alt={course.title}
          className="h-full w-full object-cover transition duration-500 hover:scale-105"
        />
        <div className="absolute inset-0 bg-deepBlue/25" />
        <span className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-xs font-black text-white ${badgeColor}`}>
          {badgeLabel}
        </span>
      </div>

      {/* Content */}
      <div className="p-4 text-right">
        <h3 className="line-clamp-2 text-sm font-black leading-6 text-deepBlue">{course.title}</h3>
        {course.instructor_name && (
          <p className="mt-0.5 truncate text-xs text-slate-400">المدرب: {course.instructor_name}</p>
        )}

        {scheduleLine ?
          <p className="mt-2 flex items-start gap-1.5 text-[11px] font-bold leading-relaxed text-slate-600">
            <CalendarClock size={14} className="mt-0.5 shrink-0 text-customBlue" aria-hidden />
            <span dir="ltr" className="text-right">
              {scheduleLine}
            </span>
          </p>
        : (
          <p className="mt-2 rounded-xl border border-sky-200/80 bg-sky-50/[0.85] px-3 py-2 text-[11px] font-bold leading-relaxed text-sky-950">
            انضممت إلى الدورة القادمة — سيتم إشعارك عند تحديد الموعد
          </p>
        )}

        {/* Progress bar */}
        <div className="mt-3">
          <div className="mb-1.5 flex items-center justify-between text-xs font-bold">
            <span className="font-black text-customBlue">{pct}%</span>
            <span className="text-slate-400">{completed_sessions} / {total_sessions} جلسة</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <motion.div
              className={`h-full rounded-full ${barColor}`}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' as const }}
            />
          </div>
        </div>

        <Link
          to={actionTo ?? `/courses/${course.slug}`}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2 text-xs font-black text-deepBlue transition hover:border-customBlue hover:text-customBlue"
        >
          <BookOpen size={12} />
          {actionLabel ?? 'عرض الدورة'}
        </Link>
      </div>
    </motion.div>
  )
}
