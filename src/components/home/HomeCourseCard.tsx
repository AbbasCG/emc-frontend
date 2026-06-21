import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, BookOpen, Calendar, Clock, GraduationCap, MapPin, Monitor } from 'lucide-react'
import type { Course } from '../../types'
import { courseImages, formatPrice } from '../../utils/course'
import { resolvePublicAssetUrl } from '@/utils/mediaUrl'
import { formatPublicDate } from '@/utils/publicDetailFormat'
import { staggerItem } from '@/utils/animations'

type Props = { course: Course; index: number }

export default function HomeCourseCard({ course, index }: Props) {
  const rawImg =
    course.course_image ||
    course.image_url ||
    course.thumbnail ||
    course.image ||
    course.cover_image

  const imgSrc = rawImg ? (resolvePublicAssetUrl(rawImg) ?? rawImg) : null
  const fallbackSrc = courseImages[index % courseImages.length]

  const isFree = course.type === 'free' || Boolean(course.is_free) || Number(course.price) === 0
  const isOnline = Boolean(course.is_online)

  const instructorName = course.instructor?.name || course.instructor_name || null
  const instructorAvatar = course.instructor?.image
    ? (resolvePublicAssetUrl(course.instructor.image) ?? null)
    : null

  const startDate = formatPublicDate(course.start_date)
  const hours = course.training_hours ? Math.round(Number(course.training_hours)) : null

  return (
    <motion.article
      variants={staggerItem}
      whileHover={{ y: -6 }}
      className="group flex h-full flex-col overflow-hidden rounded-[1.375rem] border border-slate-200/80 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-all duration-300 hover:border-customBlue/25 hover:shadow-[0_12px_40px_rgba(0,0,0,0.09)]"
    >
      {/* Cover image */}
      <div className="relative aspect-[16/10] shrink-0 overflow-hidden">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={course.title}
            className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.06]"
            loading="lazy"
          />
        ) : fallbackSrc ? (
          <img
            src={fallbackSrc}
            alt=""
            className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.06]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-deepBlue via-[#1a3a5c] to-customBlue">
            <BookOpen className="h-14 w-14 text-white/25" aria-hidden />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-[#0d1b2a]/70 via-[#0d1b2a]/8 to-transparent" />

        {/* Badges — top-start (right in RTL) */}
        <div className="absolute start-3 top-3 flex flex-wrap gap-1.5">
          <span
            className={`rounded-lg px-2.5 py-1 text-[10px] font-black text-white shadow-sm ${
              isFree ? 'bg-customBlue/90' : 'bg-customOrange/90'
            }`}
          >
            {isFree ? 'مجاناً' : formatPrice(course.price)}
          </span>
          <span className="rounded-lg bg-white/90 px-2.5 py-1 text-[10px] font-black text-deepBlue backdrop-blur-sm">
            {isOnline ? 'أونلاين' : 'حضوري'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5 text-right">
        {/* Certificate label */}
        {course.certificate && (
          <p className="mb-1.5 text-[10px] font-bold tracking-wide text-customBlue">
            {course.certificate}
          </p>
        )}

        {/* Title */}
        <h3 className="line-clamp-2 text-base font-black leading-snug text-deepBlue transition group-hover:text-customBlue md:text-[17px]">
          {course.title}
        </h3>

        {/* Short description */}
        {course.short_description && (
          <p className="mt-2 line-clamp-2 text-[11px] font-medium leading-[1.65] text-foreground/60">
            {course.short_description}
          </p>
        )}

        {/* Instructor */}
        {instructorName && (
          <div className="mt-3 flex items-center justify-end gap-2">
            {instructorAvatar ? (
              <img
                src={instructorAvatar}
                alt={instructorName}
                className="h-5 w-5 rounded-full object-cover ring-1 ring-white shadow-sm"
              />
            ) : (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-customBlue/10">
                <GraduationCap size={10} className="text-customBlue" aria-hidden />
              </span>
            )}
            <p className="text-[11px] font-semibold text-foreground/55">مع {instructorName}</p>
          </div>
        )}

        {/* Metadata rows */}
          <div className="mt-3.5 space-y-1.5 border-t border-slate-100 pt-3.5 text-[11px] font-semibold text-slate-500">
            {startDate && (
              <p className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 shrink-0 text-customBlue" aria-hidden />
                {startDate}
              </p>
            )}
            {hours != null && (
              <p className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 shrink-0 text-customOrange" aria-hidden />
                {String(hours)} ساعة تدريبية
              </p>
            )}
            <p className="flex items-center gap-2">
              {isOnline ? (
                <Monitor className="h-3.5 w-3.5 shrink-0 text-customBlue" aria-hidden />
              ) : (
                <MapPin className="h-3.5 w-3.5 shrink-0 text-customOrange" aria-hidden />
              )}
              {isOnline ? 'عن بُعد' : course.location || 'حضوري في المركز'}
            </p>
          </div>

        {/* CTA — full-width button */}
        <div className="mt-auto pt-5">
          <Link
            to={`/courses/${course.slug}`}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-deepBlue px-5 py-3.5 text-sm font-black text-white shadow-sm transition-all duration-200 hover:bg-customBlue"
          >
            تفاصيل الدورة
            <ArrowLeft size={14} aria-hidden />
          </Link>
        </div>
      </div>
    </motion.article>
  )
}
