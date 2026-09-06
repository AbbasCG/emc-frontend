import { BookOpen, CalendarClock, Users } from 'lucide-react'
import { motion } from 'framer-motion'
import { Link } from 'react-router'
import { resolveCourseCoverImageUrl } from '@/utils/publicCourseDisplay'
import type { ClassAssignment, Course, Enrollment } from '../../types'

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

function locationLabel(type: string | null | undefined): string {
  if (type === 'in_person') return 'حضوري'
  if (type === 'hybrid') return 'هجين'
  return 'أونلاين'
}

function ClassAssignmentCard({ ca }: { ca: ClassAssignment }) {
  const schedParts = [ca.schedule_day, ca.schedule_time].filter(Boolean)
  return (
    <div className="mt-2 rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-3 py-2 text-right">
      <div className="flex items-center gap-1.5">
        <Users size={12} className="shrink-0 text-emerald-600" aria-hidden />
        <span className="text-[11px] font-black text-emerald-800">{ca.name}</span>
        {ca.level_code && (
          <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-black text-emerald-700">
            {ca.level_code}
          </span>
        )}
      </div>
      {ca.instructor_name && (
        <p className="mt-0.5 text-[10px] font-bold text-slate-500">المدرب: {ca.instructor_name}</p>
      )}
      <div className="mt-0.5 flex flex-wrap gap-x-2 text-[10px] font-bold text-slate-500">
        {schedParts.length > 0 && <span>{schedParts.join(' - ')}</span>}
        <span>{locationLabel(ca.location_type)}</span>
        {ca.start_date && <span dir="ltr">{ca.start_date}</span>}
      </div>
    </div>
  )
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
  const { course, completed_sessions, total_sessions, status, placement_status, class_assignment } = enrollment
  const pct = total_sessions > 0 ? Math.round((completed_sessions / total_sessions) * 100) : 0

  const placementDone = placement_status === 'completed'
  const hasPlacement  = course.requires_placement_test || (placement_status != null && placement_status !== 'none')

  // Badge: placement-done > completed enrollment > active > pending
  const isCompleted = status === 'completed' || placementDone
  const badgeLabel =
    isCompleted     ? 'مكتملة'
    : hasPlacement  ? 'جارية'
    : status === 'pending' ? 'معلقة'
    : 'جارية'

  const badgeColor =
    isCompleted               ? 'bg-emerald-500'
    : status === 'pending'    ? 'bg-slate-400'
    : 'bg-customBlue/90'

  const barColor = isCompleted ? 'bg-emerald-500' : pct > 0 ? 'bg-customBlue' : 'bg-slate-300'
  const scheduleLine = formatScheduleLine(course)

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="overflow-hidden rounded-2xl border border-deepBlue/[0.06] bg-white shadow-emc ring-1 ring-deepBlue/[0.03] transition-shadow duration-300 ease-emc-out hover:shadow-emc-md"
    >
      {/* Course image */}
      <div className="relative h-32 overflow-hidden">
        {resolveCourseCoverImageUrl(course) ? (
          <img
            src={resolveCourseCoverImageUrl(course)!}
            alt={course.title}
            className="h-full w-full object-cover transition duration-500 hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-deepBlue via-[#0E5A8A] to-customBlue" />
        )}
        <div className="absolute inset-0 bg-deepBlue/25" />
        <span className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-xs font-black text-white ${badgeColor}`}>
          {badgeLabel}
        </span>
      </div>

      {/* Content */}
      <div className="p-4 text-right">
        <h3 className="line-clamp-2 text-sm font-black leading-6 text-deepBlue">{course.title}</h3>
        <p className="mt-0.5 truncate text-xs text-slate-400">
          المدرب:{' '}
          {course.instructor_name && String(course.instructor_name).trim() !== '' ?
            course.instructor_name
          : 'لم يتم تعيين مدرب بعد'}
        </p>

        {/* Class assignment (highest priority) */}
        {class_assignment ? (
          <ClassAssignmentCard ca={class_assignment} />
        ) : placementDone ? (
          <p className="mt-2 rounded-xl border border-amber-200/80 bg-amber-50/[0.85] px-3 py-2 text-[11px] font-bold leading-relaxed text-amber-900">
            بانتظار توزيعك على فصل دراسي
          </p>
        ) : scheduleLine ? (
          <p className="mt-2 flex items-start gap-1.5 text-[11px] font-bold leading-relaxed text-slate-600">
            <CalendarClock size={14} className="mt-0.5 shrink-0 text-customBlue" aria-hidden />
            <span dir="ltr" className="text-right">
              {scheduleLine}
            </span>
          </p>
        ) : (
          <p className="mt-2 rounded-xl border border-sky-200/80 bg-sky-50/[0.85] px-3 py-2 text-[11px] font-bold leading-relaxed text-sky-950">
            سيتم إشعارك عند تحديد الموعد
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
