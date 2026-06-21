import { useEffect, useState } from 'react'
import axios from 'axios'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, BookOpen, UserPlus } from 'lucide-react'
import api from '../api/axios'
import { unwrapPublicCoursePayload } from '@/utils/publicCourseNormalize'
import { resolveItemType } from '@/utils/publicCourseDisplay'
import StateMessage from '../components/StateMessage'
import PageHeader from '../components/PageHeader'
import EnrollmentForm from '@/components/enrollment/EnrollmentForm'
import type { Course } from '../types'
import { formatPrice } from '../utils/course'
import Signup from './Signup'
import { safeEnrollmentRedirect } from '@/utils/enrollmentRedirect'
import { useAuth } from '@/contexts/AuthContext'
import {
  buildPublicLoginHref,
  isStudentUser,
  PUBLIC_ENROLL_STUDENT_ONLY_MSG,
} from '@/utils/publicEnrollAuth'
import toast from '@/lib/toast'

export default function Register() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  const [searchParams] = useSearchParams()
  const accountRedirect = safeEnrollmentRedirect(searchParams.get('redirect'))

  const [course, setCourse] = useState<Course | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [apiError, setApiError] = useState('')

  useEffect(() => {
    if (!slug) return
    if (!isAuthenticated) {
      navigate(buildPublicLoginHref(`/courses/${slug}`), { replace: true })
      return
    }
    if (!isStudentUser(user?.role)) {
      toast.error(PUBLIC_ENROLL_STUDENT_ONLY_MSG)
      navigate(`/courses/${slug}`, { replace: true })
    }
  }, [slug, isAuthenticated, user?.role, navigate])

  useEffect(() => {
    if (accountRedirect && !slug) return

    const controller = new AbortController()

    async function fetchData() {
      try {
        setIsLoading(true)
        setApiError('')

        if (slug) {
          const response = await api.get<Course | { data?: Course }>(`/courses/${encodeURIComponent(slug)}`, {
            signal: controller.signal,
            skipErrorToast: true,
          })
          const item =
            unwrapPublicCoursePayload(response.data) ??
            (typeof response.data === 'object' && response.data !== null && 'slug' in response.data ?
              (response.data as Course)
            : null)
          setCourse(item?.slug ? item : null)
          return
        }

        const response = await api.get<Course[] | { data?: Course[] }>('/courses', {
          signal: controller.signal,
        })
        const list = Array.isArray(response.data) ? response.data
          : Array.isArray(response.data?.data) ? response.data.data
          : []
        setCourses(Array.isArray(list) ? list : [])
      } catch (err) {
        if (axios.isCancel(err)) return
        setApiError('تعذر تحميل بيانات الدورات. يرجى المحاولة مرة أخرى.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
    return () => controller.abort()
  }, [slug, accountRedirect])

  if (accountRedirect && !slug) {
    return <Signup />
  }

  const isPaid = course?.type === 'paid'
  const itemType = course ? resolveItemType(course) : 'course'

  if (isLoading) {
    return (
      <main className="bg-slate-50 px-4 pb-20 pt-32 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-2xl bg-white p-8 shadow-xl ring-1 ring-slate-100">
          <div className="h-8 w-64 animate-pulse rounded bg-slate-200" />
          <div className="mt-8 grid gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        </div>
      </main>
    )
  }

  if (slug && !course && apiError) {
    return (
      <main className="bg-slate-50 px-4 pb-20 pt-32 sm:px-6 lg:px-8">
        <StateMessage type="error" title="حدث خطأ" message={apiError} />
      </main>
    )
  }

  return (
    <main className="bg-slate-50 pt-20">
      <PageHeader
        title="سجل الآن"
        breadcrumbs={[
          { label: 'الرئيسية', href: '/' },
          { label: course?.title || 'سجل الآن' },
        ]}
      />

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <motion.div
          className="mx-auto max-w-4xl rounded-2xl bg-white p-6 text-right shadow-2xl shadow-slate-200/80 ring-1 ring-slate-100 sm:p-8"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          {/* Header */}
          <div className="flex flex-col justify-between gap-5 border-b border-slate-100 pb-6 lg:flex-row lg:items-center">
            <div>
              <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-sky-50 px-4 py-2 text-sm font-black text-customBlue">
                <UserPlus size={17} />
                نموذج التسجيل
              </span>
              <h1 className="text-3xl font-black text-deepBlue">
                {course?.title || 'التسجيل في الدورة'}
              </h1>
              <span className="mt-4 block h-1 w-20 rounded-full bg-customOrange" />
              {course?.short_description && (
                <p className="mt-4 max-w-2xl leading-8 text-slate-600">{course.short_description}</p>
              )}
            </div>

            {course && (
              <div className="rounded-2xl bg-slate-50 px-6 py-4 ring-1 ring-slate-100">
                <span className="block text-xs font-black text-slate-400">السعر</span>
                <strong className={`mt-1 block text-2xl font-black ${isPaid ? 'text-customOrange' : 'text-customBlue'}`}>
                  {isPaid ? formatPrice(course.price) : 'مجانية'}
                </strong>
              </div>
            )}
          </div>

          {/* Course picker when no slug */}
          {!slug && (
            <div className="mt-8 grid gap-2 text-sm font-black text-deepBlue">
              اختر الدورة
              <span className="relative block">
                <BookOpen size={20} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={selectedCourseId}
                  onChange={(e) => {
                    setSelectedCourseId(e.target.value)
                    setCourse(courses.find((c) => String(c.id) === e.target.value) ?? null)
                  }}
                  className="h-14 w-full rounded-xl border border-slate-200 bg-slate-50 pr-12 pl-4 text-right font-semibold text-deepBlue outline-none transition focus:border-customBlue focus:bg-white focus:ring-4 focus:ring-sky-100"
                >
                  <option value="">اختر الدورة</option>
                  {courses.map((c) => (
                    <option key={c.id} value={String(c.id)}>{c.title}</option>
                  ))}
                </select>
              </span>
            </div>
          )}

          {/* Locked course display when slug is present */}
          {slug && course && (
            <div className="mt-8 grid gap-2 text-sm font-black text-deepBlue">
              {itemType === 'workshop' ? 'الورشة المختارة' : itemType === 'program' ? 'البرنامج المختار' : 'الدورة المختارة'}
              <span className="relative block">
                <BookOpen size={20} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={course.title}
                  disabled
                  className="h-14 w-full rounded-xl border border-slate-200 bg-slate-100 pr-12 pl-4 text-right font-semibold text-deepBlue outline-none"
                />
              </span>
            </div>
          )}

          {/* Form — only when a course is selected */}
          {course ? (
            <div className="mt-8">
              <EnrollmentForm
                course={course}
                itemType={itemType}
                onSuccess={() => navigate(`/courses/${slug}?enrolled=1`, { replace: true })}
              />
            </div>
          ) : !slug ? (
            <p className="mt-8 text-sm font-bold text-slate-500">اختر الدورة أعلاه لعرض نموذج التسجيل.</p>
          ) : null}

          <div className="mt-6">
            <Link
              to="/courses"
              className="inline-flex items-center gap-2 text-sm font-extrabold text-customBlue transition hover:text-accent-700"
            >
              <ArrowLeft size={17} />
              العودة إلى الدورات
            </Link>
          </div>
        </motion.div>
      </section>
    </main>
  )
}
