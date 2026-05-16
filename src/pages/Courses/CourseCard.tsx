import { motion } from 'framer-motion'
import { Star, Clock, Users, Play, TrendingUp, BookOpen } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { CourseItem } from '@/services/coursesApi'
import { formatEuroInteger } from '@/utils/currency'

type CourseCardProps = {
  course: CourseItem
  viewMode?: 'grid' | 'list'
  index?: number
}

const categoryConfig: Record<string, { bg: string; text: string; gradient: string; icon: string }> = {
  'AI & Tech':    { bg: 'bg-blue-50',    text: 'text-customBlue',  gradient: 'from-customBlue/90 to-deepBlue',    icon: '🤖' },
  'Languages':    { bg: 'bg-emerald-50', text: 'text-emerald-700', gradient: 'from-emerald-500/90 to-emerald-900', icon: '🌐' },
  'Business':     { bg: 'bg-orange-50',  text: 'text-customOrange',gradient: 'from-customOrange/90 to-amber-900',  icon: '💼' },
  'Academic':     { bg: 'bg-purple-50',  text: 'text-purple-700',  gradient: 'from-purple-500/90 to-purple-900',  icon: '🎓' },
  'Personal Dev': { bg: 'bg-teal-50',    text: 'text-teal-700',    gradient: 'from-teal-500/90 to-teal-900',      icon: '✨' },
}

const levelLabels: Record<string, string> = {
  beginner:     'مبتدئ',
  intermediate: 'متوسط',
  advanced:     'متقدم',
}

export default function CourseCard({ course, viewMode = 'grid', index = 0 }: CourseCardProps) {
  const config = categoryConfig[course.category] ?? categoryConfig['AI & Tech']
  const isEnrolled = course.progress !== undefined

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.18 } }}
      transition={{ duration: 0.48, delay: index * 0.07, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -5 }}
      className={`group bg-white rounded-xl border-2 border-slate-100 shadow-sm hover:shadow-xl hover:border-customOrange/40 transition-all duration-300 overflow-hidden ${
        viewMode === 'list' ? 'flex flex-row-reverse' : 'flex flex-col'
      }`}
    >
      {/* Thumbnail */}
      <div className={`relative overflow-hidden shrink-0 ${
        viewMode === 'list' ? 'w-52 rounded-l-xl' : 'h-44'
      }`}>
        {course.thumbnail ? (
          <img
            src={course.thumbnail}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${config.gradient} flex items-center justify-center`}>
            <span className="text-6xl opacity-75 select-none">{config.icon}</span>
          </div>
        )}

        {/* Price badge */}
        <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm ${
          course.is_free ? 'bg-emerald-500 text-white' : 'bg-white/95 backdrop-blur-sm text-customBlue'
        }`}>
          {course.is_free ? 'مجاني' : formatEuroInteger(course.price, 'ar')}
        </div>

        {course.status === 'upcoming' && (
          <div className="absolute bottom-3 right-3 px-2.5 py-1 bg-customOrange/90 text-white text-xs rounded-lg font-semibold">
            قريباً
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-deepBlue/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/40">
            <Play className="w-6 h-6 text-white fill-white ms-0.5" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-5">
        {/* Category + Level */}
        <div className="flex items-center justify-between mb-2.5">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${config.bg} ${config.text}`}>
            {course.category}
          </span>
          <span className="text-xs text-[#73777B]">{levelLabels[course.level]}</span>
        </div>

        {/* Title */}
        <h3 className="font-bold text-deepBlue text-base leading-snug line-clamp-2 mb-1.5 group-hover:text-customBlue transition-colors duration-200">
          {course.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-[#73777B] line-clamp-2 mb-3.5 leading-relaxed">
          {course.description}
        </p>

        {/* Instructor */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-customBlue/40 to-customBlue flex items-center justify-center shrink-0">
            <span className="text-xs text-white font-black select-none">
              {course.trainer.name.split(' ').at(-1)?.charAt(0) ?? '؟'}
            </span>
          </div>
          <span className="text-xs text-[#73777B] font-medium">{course.trainer.name}</span>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-[#73777B] mb-3">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-customBlue shrink-0" />
            {course.duration_weeks} أسابيع · {course.sessions_count} جلسة
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-customOrange shrink-0" />
            {course.enrolled_count.toLocaleString('ar-EG')}
          </span>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-1.5 mb-3">
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(star => (
              <Star
                key={star}
                className={`w-3.5 h-3.5 ${
                  star <= Math.round(course.rating)
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-slate-200 fill-slate-200'
                }`}
              />
            ))}
          </div>
          <span className="text-xs font-bold text-deepBlue">{course.rating}</span>
        </div>

        {/* Progress bar */}
        {isEnrolled && course.progress !== undefined && (
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-[#73777B]">تقدمك في الدورة</span>
              <span className="font-bold text-customBlue">{course.progress}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-customBlue to-customBlue/70 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${course.progress}%` }}
                transition={{ duration: 1.2, ease: 'easeOut', delay: index * 0.07 + 0.4 }}
              />
            </div>
          </div>
        )}

        {/* Footer */}
          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3.5 border-t border-slate-100">
          <div className="text-right">
            {!course.is_free && course.original_price && (
              <span className="text-xs line-through text-[#73777B] block leading-none mb-0.5">
                {formatEuroInteger(course.original_price, 'ar')}
              </span>
            )}
            <span className={`font-black text-sm ${course.is_free ? 'text-emerald-600' : 'text-deepBlue'}`}>
              {course.is_free ? 'مجاني تماماً' : formatEuroInteger(course.price, 'ar')}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={`/courses/${course.slug}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-deepBlue/15 bg-white px-3 py-2 text-xs font-black text-deepBlue transition hover:border-customBlue/40 hover:bg-sky-50"
            >
              عرض التفاصيل
            </Link>
            {isEnrolled ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-customBlue/10 px-3 py-2 text-xs font-black text-customBlue">
                <TrendingUp className="w-3.5 h-3.5" />
                متابعة التعلم
              </span>
            ) : (
              <Link
                to={`/courses/${course.slug}/register`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-customBlue px-3 py-2 text-xs font-black text-white shadow-sm transition hover:bg-deepBlue"
              >
                <BookOpen className="w-3.5 h-3.5" />
                التسجيل
              </Link>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
