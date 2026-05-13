import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Clock3, MapPin, Monitor } from 'lucide-react'
import type { Course } from '../../types'
import { courseImages, fadeUp, formatPrice } from '../../utils/course'

type Props = { course: Course; index: number }

export default function HomeCourseCard({ course, index }: Props) {
  const image = course.course_image || courseImages[index % courseImages.length]
  const isFree = course.type === 'free'
  const isOnline = Boolean(course.is_online)

  return (
    <motion.article
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45, delay: index * 0.07 }}
      className="group flex flex-col overflow-hidden rounded-2xl bg-white text-right shadow-lg shadow-slate-200/80 ring-1 ring-slate-100 transition-all hover:-translate-y-1 hover:shadow-2xl"
    >
      <div className="relative h-48 shrink-0 overflow-hidden">
        <img
          src={image}
          alt={course.title}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-deepBlue/60 via-transparent to-transparent" />
        <span
          className={`absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-black text-white ${
            isFree ? 'bg-customBlue/90' : 'bg-customOrange/90'
          }`}
        >
          {isFree ? 'مجانية' : formatPrice(course.price)}
        </span>
        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-deepBlue">
          {isOnline ? (
            <Monitor size={12} className="text-customBlue" />
          ) : (
            <MapPin size={12} className="text-customOrange" />
          )}
          {isOnline ? 'أونلاين' : 'حضوري'}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="line-clamp-2 text-lg font-black leading-8 text-deepBlue">
          {course.title}
        </h3>
        <p className="mt-2 line-clamp-2 min-h-[3.5rem] text-sm leading-7 text-slate-500">
          {course.short_description ||
            'برنامج تدريبي متخصص يساعدك على تطوير مهاراتك بثقة ووضوح.'}
        </p>

        {course.training_hours ? (
          <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500">
            <Clock3 size={14} className="text-customBlue" />
            {course.training_hours} ساعة تدريبية
          </span>
        ) : null}

        <motion.div whileHover={{ scale: 1.02 }} className="mt-auto pt-4">
          <Link
            to={`/courses/${course.slug}`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-customBlue px-4 py-3 text-sm font-extrabold text-white transition hover:bg-[#1f7aab]"
          >
            تفاصيل الدورة
            <ArrowLeft size={16} />
          </Link>
        </motion.div>
      </div>
    </motion.article>
  )
}
