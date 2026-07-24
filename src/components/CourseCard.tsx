import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, BookOpen, Building2, Clock3, MapPin, Monitor } from 'lucide-react'
import type { Course } from '../types'
import { fadeUp, formatPrice } from '../utils/course'
import { resolveCourseCoverImageUrl } from '@/utils/publicCourseDisplay'
import CourseStatusBadge from '@/components/shared/CourseStatusBadge'
import { resolveCourseIsEnded } from '@/utils/courseEnded'
import { formatPublicCount } from '@/utils/publicDetailFormat'

type CourseCardProps = {
  course: Course
  index: number
}

export default function CourseCard({ course, index }: CourseCardProps) {
  const isOnline = Boolean(course.is_online)
  const image = resolveCourseCoverImageUrl(course)
  const isFree = course.type === 'free'
  const isEnded = resolveCourseIsEnded(course)

  return (
    <motion.article
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -6 }}
      transition={{ duration: 0.45, delay: index * 0.05 }}
      className="group overflow-hidden rounded-2xl bg-white text-right shadow-lg shadow-slate-200/80 ring-1 ring-slate-100 transition-shadow hover:shadow-2xl hover:shadow-slate-200"
    >
      <div className="relative h-52 overflow-hidden">
        {image ? (
          <img
            src={image}
            alt={course.title}
            className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-deepBlue via-[#0E5A8A] to-customBlue">
            <BookOpen className="h-14 w-14 text-white/25" aria-hidden />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-deepBlue/60 via-transparent to-transparent" />

        {isEnded ?
          <div className="absolute left-4 top-4 z-10">
            <CourseStatusBadge isEnded placement="overlay" />
          </div>
        : null}

        <span
          className={`absolute right-4 top-4 rounded-full px-4 py-1.5 text-xs font-black text-white backdrop-blur-sm ${
            isFree ? 'bg-customBlue/90' : 'bg-customOrange/90'
          }`}
        >
          {isFree ? 'مجانية' : formatPrice(course.price)}
        </span>

        <span className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-black text-deepBlue shadow">
          {isOnline ? (
            <Monitor size={13} className="text-customBlue" />
          ) : (
            <MapPin size={13} className="text-customOrange" />
          )}
          {isOnline ? 'أونلاين' : 'حضوري'}
        </span>
      </div>

      <div className="flex min-h-[256px] flex-col p-6">
        <h3 className="line-clamp-2 text-xl font-black leading-8 text-deepBlue">{course.title}</h3>
        <p className="mt-3 line-clamp-3 min-h-[66px] text-sm leading-7 text-slate-500">
          {course.short_description || 'دورة تدريبية مصممة لمساعدتك على تطوير مهاراتك بثقة ووضوح.'}
        </p>

        <div className="mt-4 grid gap-2 text-sm font-semibold text-slate-500">
          {course.training_hours ? (
            <span className="inline-flex items-center gap-2">
              <Clock3 size={15} className="text-customBlue" />
              {formatPublicCount(Number(course.training_hours), 'ساعة تدريبية')}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-2">
            <Building2 size={15} className="text-customBlue" />
            {course.capacity ?
              formatPublicCount(Number(course.capacity), 'مقعد متاح')
            : 'مقاعد محدودة'}
          </span>
          {course.level ? (
            <span className="inline-flex items-center gap-2">
              <BookOpen size={15} className="text-customOrange" />
              {course.level}
            </span>
          ) : null}
        </div>

        <motion.div whileHover={{ scale: 1.02 }} className="mt-auto pt-5">
          <Link
            to={`/courses/${course.slug}`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-customBlue px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#1f7aab]"
          >
            تفاصيل الدورة
            <ArrowLeft size={17} />
          </Link>
        </motion.div>
      </div>
    </motion.article>
  )
}
