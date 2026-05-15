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
    <section className="border-y border-deepBlue/[0.05] bg-white px-4 py-16 sm:px-6 lg:px-10 lg:py-24" dir="rtl">
      <div className="mx-auto max-w-[1540px]">
        <div className="mb-12 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="text-right">
            <p className="text-xs font-black text-customBlue">اختصارات من البرامج المميزة</p>
            <h2 className="mt-3 text-3xl font-black text-deepBlue sm:text-4xl xl:text-[2.5rem]">ورش ودورات عالية التأثير</h2>
            <span className="mt-5 block h-1 w-16 rounded-full bg-customOrange" />
            <p className="mt-5 max-w-xl text-base leading-8 text-foreground/70">
                ابدأ من البرنامج الأنسب لمسارك، واطّلع على التفاصيل أو أكمِل التسجيل من صفحة الدورة نفسها — البيانات تُقرأ من
                لوحة إدارتكم.
            </p>
          </div>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} className="shrink-0">
            <Link
              to="/courses"
              className="inline-flex items-center gap-2 rounded-2xl bg-deepBlue px-6 py-3.5 text-sm font-black text-white shadow-emc-md transition hover:brightness-105"
            >
              عرض جميع الدورات
              <ArrowLeft size={17} />
            </Link>
          </motion.div>
        </div>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-96 animate-pulse rounded-[1.25rem] bg-brand-50/90 ring-1 ring-deepBlue/[0.04]"
              />
            ))}
          </div>
        ) : courses.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {courses.map((course, i) => (
              <HomeCourseCard key={course.id} course={course} index={i} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 rounded-[1.5rem] border border-dashed border-deepBlue/[0.12] bg-emcBg py-20 text-center">
            <BookOpen size={48} className="text-customBlue/35" aria-hidden="true" />
            <p className="text-lg font-black text-deepBlue">عرض البرامج يأتي مباشرةً من الخادم</p>
            <p className="max-w-md text-sm font-semibold leading-7 text-foreground/60">
              عند تشغيل واجهة البرمجة تُحمَّل أحدث البرامج هنا آلياً. انتقل إلى صفحة البرامج والدورات لاستعراض القائمة
              الكاملة والتصفية حسب احتياجك.
            </p>
            <Link to="/courses" className="text-sm font-black text-customBlue underline-offset-8 hover:underline">
              فتح صفحة الدورات
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
