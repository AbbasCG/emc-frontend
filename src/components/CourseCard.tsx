import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Building2, CalendarDays, MapPin, Monitor } from 'lucide-react'
import type { Course } from '../types'
import { courseImages, fadeUp, formatPrice, formatSchedule } from '../utils/course'

type CourseCardProps = {
  course: Course
  index: number
}

export default function CourseCard({ course, index }: CourseCardProps) {
  const isOnline = Boolean(course.is_online)
  const image = courseImages[index % courseImages.length]
  const schedule = formatSchedule(course.start_date, course.end_date)

  return (
    <motion.article
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -8 }}
      transition={{ duration: 0.45, delay: index * 0.05 }}
      className="overflow-hidden rounded-lg bg-white text-right shadow-xl shadow-slate-200 ring-1 ring-slate-100"
    >
      <div className="relative h-52 overflow-hidden">
        <img src={image} alt="" className="h-full w-full object-cover transition duration-500 hover:scale-105" />
        <span
          className={`absolute right-4 top-4 rounded-full px-4 py-1.5 text-xs font-black text-white ${
            course.type === 'free' ? 'bg-customBlue' : 'bg-customOrange'
          }`}
        >
          {course.type === 'free' ? 'مجانية' : formatPrice(course.price)}
        </span>
      </div>

      <div className="flex min-h-[290px] flex-col p-6">
        <h3 className="line-clamp-2 text-xl font-black leading-8 text-deepBlue">{course.title}</h3>
        <p className="mt-3 line-clamp-3 min-h-[78px] leading-7 text-slate-600">
          {course.short_description || 'دورة تدريبية مصممة لمساعدتك على تطوير مهاراتك بثقة ووضوح.'}
        </p>

        <div className="mt-5 grid gap-3 text-sm font-semibold text-slate-500">
          <span className="inline-flex items-center gap-2">
            {isOnline ? <Monitor size={17} className="text-customBlue" /> : <MapPin size={17} className="text-customBlue" />}
            {isOnline ? 'أونلاين' : course.location || 'حضوري'}
          </span>
          <span className="inline-flex items-center gap-2">
            <CalendarDays size={17} className="text-customOrange" />
            {schedule}
          </span>
          <span className="inline-flex items-center gap-2">
            <Building2 size={17} className="text-customBlue" />
            {course.capacity ? `${course.capacity} مقعد` : 'مقاعد محدودة'}
          </span>
        </div>

        <motion.div whileHover={{ scale: 1.03 }} className="mt-auto pt-6">
          <Link
            to={`/courses/${course.slug}`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-customBlue px-5 py-3 text-sm font-extrabold text-white"
          >
            تفاصيل الدورة
            <ArrowLeft size={18} />
          </Link>
        </motion.div>
      </div>
    </motion.article>
  )
}
