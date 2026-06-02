import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Clock3, MapPin, Monitor } from 'lucide-react'
import type { Course } from '../../types'
import { courseImages, formatPrice } from '../../utils/course'
import { staggerItem } from '@/utils/animations'

type Props = { course: Course; index: number }

export default function HomeCourseCard({ course, index }: Props) {
  const image = course.course_image || courseImages[index % courseImages.length]
  const isFree = course.type === 'free'
  const isOnline = Boolean(course.is_online)

  return (
    <motion.article
      variants={staggerItem}
      className="group flex flex-col overflow-hidden rounded-[1.5rem] border border-deepBlue/[0.07] bg-white text-right shadow-emc-sm ring-1 ring-deepBlue/[0.03] transition-all duration-300 hover:-translate-y-1 hover:border-customBlue/20 hover:shadow-emc-lg"
    >
      {/* Image */}
      <div className="relative h-[200px] shrink-0 overflow-hidden rounded-t-[1.5rem]">
        <img
          src={image}
          alt={course.title}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
          loading="lazy"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-deepBlue/70 via-deepBlue/10 to-transparent" />

        {/* Price badge */}
        <div className="absolute right-3.5 top-3.5">
          <span
            className={`inline-flex rounded-full px-3.5 py-1.5 text-[11px] font-black text-white shadow-lg ${
              isFree
                ? 'bg-customBlue/90 shadow-customBlue/30'
                : 'bg-customOrange/90 shadow-customOrange/30'
            }`}
          >
            {isFree ? 'مجانية' : formatPrice(course.price)}
          </span>
        </div>

        {/* Delivery badge */}
        <div className="absolute bottom-3.5 left-3.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-black text-deepBlue shadow">
            {isOnline ? (
              <Monitor size={11} className="text-customBlue" aria-hidden />
            ) : (
              <MapPin size={11} className="text-customOrange" aria-hidden />
            )}
            {isOnline ? 'أونلاين' : 'حضوري'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-6">
        {/* Training hours */}
        {course.training_hours ? (
          <div className="mb-3 flex items-center justify-end gap-1.5 text-xs font-semibold text-foreground/50">
            <Clock3 size={12} className="text-customBlue" aria-hidden />
            {course.training_hours} ساعة تدريبية
          </div>
        ) : null}

        {/* Title */}
        <h3 className="line-clamp-2 text-lg font-black leading-snug text-deepBlue transition-colors group-hover:text-customBlue">
          {course.title}
        </h3>

        {/* Description */}
        <p className="mt-2.5 line-clamp-2 text-sm font-medium leading-7 text-foreground/60">
          {course.short_description || 'برنامج تدريبي متخصص يساعدك على تطوير مهاراتك بثقة ووضوح.'}
        </p>

        {/* CTA */}
        <div className="mt-auto pt-5">
          <Link
            to={`/courses/${course.slug}`}
            className="group/link flex items-center justify-between gap-3 rounded-xl border border-deepBlue/[0.08] bg-emcBg px-4 py-3 transition-all duration-200 hover:border-customBlue/30 hover:bg-customBlue/5"
          >
            <span className="text-sm font-black text-deepBlue transition-colors group-hover/link:text-customBlue">
              تفاصيل الدورة
            </span>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-customBlue/10 text-customBlue transition-all duration-200 group-hover/link:bg-customBlue group-hover/link:text-white">
              <ArrowLeft size={14} aria-hidden />
            </span>
          </Link>
        </div>
      </div>
    </motion.article>
  )
}
