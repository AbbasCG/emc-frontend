import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import axios from 'axios'
import { Search } from 'lucide-react'
import apiClient from '../api/axios'
import CourseCard from '../components/CourseCard'
import PageHeader from '../components/PageHeader'
import StateMessage from '../components/StateMessage'
import type { Course, CourseFilter } from '../types'

const filters: { label: string; value: CourseFilter }[] = [
  { label: 'الكل', value: 'all' },
  { label: 'مجانية', value: 'free' },
  { label: 'مدفوعة', value: 'paid' },
  { label: 'أونلاين', value: 'online' },
  { label: 'حضوري', value: 'offline' },
]

let cachedCourses: Course[] | null = null
let coursesRequest: Promise<Course[]> | null = null

function normalizeCoursesResponse(responseData: Course[] | { data?: Course[] }) {
  if (Array.isArray(responseData)) return responseData
  if (Array.isArray(responseData.data)) return responseData.data
  return []
}

async function loadCourses() {
  if (cachedCourses) return cachedCourses

  coursesRequest ??= apiClient
    .get<Course[] | { data?: Course[] }>('/courses')
    .then((response) => {
      const courses = normalizeCoursesResponse(response.data)
      cachedCourses = courses
      return courses
    })
    .finally(() => {
      coursesRequest = null
    })

  return coursesRequest
}

export default function Courses() {
  const [courses, setCourses] = useState<Course[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState<CourseFilter>('all')

  useEffect(() => {
    let isMounted = true

    async function fetchCourses() {
      try {
        setIsLoading(true)
        setError('')
        const coursesData = await loadCourses()
        if (!isMounted) return
        setCourses(coursesData)
      } catch (err) {
        if (!isMounted || axios.isCancel(err)) return
        setError('تعذر الاتصال بالخادم. يرجى المحاولة مرة أخرى.')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    fetchCourses()

    return () => {
      isMounted = false
    }
  }, [])

  const filteredCourses = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return courses.filter((course) => {
      const matchesSearch =
        !normalizedSearch ||
        [course.title, course.short_description, course.instructor_name, course.location]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(normalizedSearch))

      const isOnline = Boolean(course.is_online)
      const matchesFilter =
        activeFilter === 'all' ||
        (activeFilter === 'free' && course.type === 'free') ||
        (activeFilter === 'paid' && course.type === 'paid') ||
        (activeFilter === 'online' && isOnline) ||
        (activeFilter === 'offline' && !isOnline)

      return matchesSearch && matchesFilter
    })
  }, [activeFilter, courses, searchTerm])

  return (
    <main className="bg-slate-50 pt-20">
      <PageHeader
        title="الدورات وورش العمل"
        subtitle="اختر الدورة المناسبة لك وابدأ رحلتك التعليمية"
        breadcrumbs={[
          { label: 'الرئيسية', href: '/' },
          { label: 'الدورات' },
        ]}
      />

      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl bg-white p-5 shadow-xl shadow-slate-200/70 ring-1 ring-slate-100">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <label className="relative block">
                <Search
                  size={20}
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="ابحث عن دورة..."
                  className="h-14 w-full rounded-lg border border-slate-200 bg-slate-50 pr-12 pl-4 text-right text-base font-semibold text-deepBlue outline-none transition focus:border-customBlue focus:bg-white focus:ring-4 focus:ring-sky-100"
                />
              </label>

              <div className="flex flex-wrap gap-3">
                {filters.map((filter) => (
                  <motion.button
                    key={filter.value}
                    type="button"
                    whileHover={{ scale: 1.04 }}
                    onClick={() => setActiveFilter(filter.value)}
                    className={`h-12 rounded-lg px-5 text-sm font-black transition ${
                      activeFilter === filter.value
                        ? 'bg-customOrange text-white shadow-lg shadow-orange-100'
                        : 'bg-slate-100 text-deepBlue hover:bg-sky-50 hover:text-customBlue'
                    }`}
                  >
                    {filter.label}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-10">
            {isLoading && <CoursesLoading />}
            {!isLoading && error && <StateMessage type="error" title="حدث خطأ" message={error} />}
            {!isLoading && !error && filteredCourses.length === 0 && (
              <StateMessage
                type="empty"
                title="لا توجد دورات مطابقة"
                message="جرّب تعديل البحث أو اختيار فلتر آخر لعرض المزيد من الدورات."
              />
            )}
            {!isLoading && !error && filteredCourses.length > 0 && (
              <div className="grid gap-7 sm:grid-cols-2 xl:grid-cols-4">
                {filteredCourses.map((course, index) => (
                  <CourseCard key={course.id} course={course} index={index} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}

function CoursesLoading() {
  return (
    <div className="grid gap-7 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-lg bg-white shadow-xl shadow-slate-200 ring-1 ring-slate-100">
          <div className="h-52 animate-pulse bg-slate-200" />
          <div className="space-y-4 p-6">
            <div className="h-6 animate-pulse rounded bg-slate-200" />
            <div className="h-20 animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
            <div className="h-11 animate-pulse rounded-lg bg-slate-200" />
          </div>
        </div>
      ))}
    </div>
  )
}
