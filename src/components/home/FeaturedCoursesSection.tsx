import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, BookOpen } from 'lucide-react'
import apiClient from '../../api/axios'
import HomeCourseCard from './HomeCourseCard'
import type { Course } from '../../types'
import { extractList } from '../../utils/course'

export default function FeaturedCoursesSection() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    apiClient
      .get<Course[] | { data?: Course[] }>('/courses')
      .then((res) => {
        if (!active) return
        setCourses(extractList(res.data).slice(0, 4))
      })
      .catch(() => {
        if (active) setCourses([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="text-right">
            <h2 className="text-3xl font-black text-deepBlue sm:text-4xl">برامج ودورات مميزة</h2>
            <span className="mt-4 block h-1 w-20 rounded-full bg-customOrange" />
            <p className="mt-5 max-w-xl text-base leading-8 text-slate-500">
              ابدأ من البرنامج الأنسب لاحتياجك، وتابع التفاصيل أو سجّل مباشرة من صفحة الدورة.
            </p>
          </div>
          <motion.div whileHover={{ scale: 1.04 }} className="shrink-0">
            <Link
              to="/courses"
              className="inline-flex items-center gap-2 rounded-xl bg-deepBlue px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-[#1c2e42]"
            >
              عرض جميع الدورات
              <ArrowLeft size={17} />
            </Link>
          </motion.div>
        </div>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-80 animate-pulse rounded-2xl bg-slate-200" />
            ))}
          </div>
        ) : courses.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {courses.map((course, i) => (
              <HomeCourseCard key={course.id} course={course} index={i} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl bg-slate-50 py-20 text-center ring-1 ring-slate-200">
            <BookOpen size={48} className="text-slate-300" aria-hidden="true" />
            <p className="text-lg font-bold text-slate-500">لا توجد دورات متاحة حالياً</p>
            <p className="text-sm text-slate-400">سيتم إضافة البرامج قريباً — تابعنا!</p>
          </div>
        )}
      </div>
    </section>
  )
}
