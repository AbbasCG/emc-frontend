import { BookOpen } from 'lucide-react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { courseImages } from '../../utils/course'
import type { Enrollment } from '../../types'

export default function EnrolledCourseCard({ enrollment }: { enrollment: Enrollment }) {
  const { course, completed_sessions, total_sessions, status } = enrollment
  const pct = total_sessions > 0 ? Math.round((completed_sessions / total_sessions) * 100) : 0
  const isCompleted = status === 'completed'

  const barColor = isCompleted ? 'bg-emerald-500' : pct > 0 ? 'bg-customBlue' : 'bg-slate-300'
  const badgeColor = isCompleted ? 'bg-emerald-500' : 'bg-customBlue/90'
  const badgeLabel = isCompleted ? 'مكتملة' : status === 'pending' ? 'معلقة' : 'جارية'

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
          <p className="mt-0.5 truncate text-xs text-slate-400">{course.instructor_name}</p>
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
          to={`/courses/${course.slug}`}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2 text-xs font-black text-deepBlue transition hover:border-customBlue hover:text-customBlue"
        >
          <BookOpen size={12} />
          عرض الدورة
        </Link>
      </div>
    </motion.div>
  )
}
