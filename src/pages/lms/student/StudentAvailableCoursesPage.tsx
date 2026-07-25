import { BookOpen, Calendar, MapPin, Users } from 'lucide-react'
import { motion } from 'framer-motion'
import { Link } from 'react-router'
import { useState } from 'react'
import { useStudentDashboardData } from '@/hooks/useStudentDashboardData'
import { StudentBackButton } from '@/components/shared/StudentBackButton'
import {
  resolveCourseCoverImageUrl,
  EMC_COURSE_COVER_PLACEHOLDER,
  mapDeliveryTypeArabic,
  mapRegistrationOpen,
} from '@/utils/publicCourseDisplay'
import { formatPrice } from '@/utils/course'
import type { Course } from '@/types'

function AvailableCourseCard({
  course,
  isEnrolled,
}: {
  course: Course
  isEnrolled: boolean
}) {
  const imageUrl = resolveCourseCoverImageUrl(course)
  const [imgError, setImgError] = useState(false)
  const src = !imageUrl || imgError ? EMC_COURSE_COVER_PLACEHOLDER : imageUrl

  const isFree = course.type === 'free' || Number(course.price) === 0 || course.price == null
  const priceLabel = isFree ? 'مجاني' : formatPrice(course.price)
  const deliveryType = mapDeliveryTypeArabic(course, course as unknown as Record<string, unknown>)
  const regStatus = mapRegistrationOpen(course)
  const slug = course.slug?.trim()
  const href = slug ? `/courses/${slug}` : '/courses'
  const hasDate =
    course.start_date != null &&
    String(course.start_date).trim() !== '' &&
    String(course.start_date) !== '—'

  return (
    <motion.article
      layout
      whileHover={{ y: -4 }}
      className="group flex flex-col overflow-hidden rounded-3xl border border-deepBlue/[0.06] bg-white shadow-[0_18px_50px_-24px_rgba(12,42,75,0.45)] transition-shadow duration-300 hover:shadow-[0_28px_60px_-20px_rgba(0,119,182,0.35)]"
    >
      {/* Image */}
      <div className="relative h-44 overflow-hidden">
        <img
          src={src}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
          onError={() => setImgError(true)}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-deepBlue/85 via-deepBlue/15 to-transparent" />

        {/* Status badge — top right */}
        <div className="absolute right-3 top-3">
          {isEnrolled ? (
            <span className="rounded-full bg-emerald-600/95 px-3 py-1 text-[11px] font-black text-white shadow-sm backdrop-blur-[2px]">
              مسجّل بالفعل
            </span>
          ) : (
            <span className={`rounded-full px-3 py-1 text-[11px] font-black text-white shadow-sm backdrop-blur-[2px] ${regStatus.open ? 'bg-customBlue/95' : 'bg-slate-600/85'}`}>
              {regStatus.labelAr}
            </span>
          )}
        </div>

        {/* Price badge — top left */}
        <div className="absolute left-3 top-3">
          <span className={`rounded-full px-3 py-1 text-[11px] font-black text-white shadow-sm backdrop-blur-[2px] ${isFree ? 'bg-emerald-600/95' : 'bg-customOrange/95'}`}>
            {priceLabel}
          </span>
        </div>

        {/* Title overlay — bottom */}
        <div className="absolute bottom-3 left-3 right-3">
          <h4 className="line-clamp-2 text-right text-[15px] font-black leading-snug text-white drop-shadow-sm">
            {course.title}
          </h4>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-5 text-right" dir="rtl">
        {/* Instructor */}
        <p className="text-[12px] font-bold text-deepBlue/75">
          المدرب:{' '}
          <span className="font-semibold text-deepBlue">
            {course.instructor_name?.trim() || 'يحدد قريباً'}
          </span>
        </p>

        {/* Meta chips */}
        <div className="flex flex-wrap gap-2">
          {hasDate ? (
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-customBlue/15 bg-customBlue/[0.06] px-2.5 py-1.5 text-[11px] font-bold text-deepBlue">
              <Calendar className="h-3.5 w-3.5 text-customBlue" aria-hidden />
              <span dir="ltr">{String(course.start_date).slice(0, 10)}</span>
            </span>
          ) : (
            <span className="inline-flex items-center rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold text-amber-800">
              موعد يحدد قريباً
            </span>
          )}

          {deliveryType && (
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-700">
              <MapPin className="h-3.5 w-3.5 text-slate-500" aria-hidden />
              {deliveryType}
            </span>
          )}

          {course.capacity != null && Number(course.capacity) > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-700">
              <Users className="h-3.5 w-3.5 text-slate-500" aria-hidden />
              {course.capacity} مقعد
            </span>
          )}
        </div>

        {/* CTA */}
        <div className="mt-auto pt-1">
          {isEnrolled ? (
            <Link
              to="/dashboard/student/courses"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-emerald-400/50 bg-emerald-50 px-4 py-2.5 text-[12px] font-black text-emerald-800 transition hover:bg-emerald-100"
            >
              انتقل إلى دوراتي
            </Link>
          ) : (
            <Link
              to={href}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-customOrange px-4 py-2.5 text-[12px] font-black text-white shadow-md shadow-orange-900/20 transition hover:brightness-105"
            >
              التسجيل الآن
            </Link>
          )}
        </div>
      </div>
    </motion.article>
  )
}

export default function StudentAvailableCoursesPage() {
  const {
    loading,
    refreshing,
    loadError,
    refresh,
    browseCourses,
    registrations,
    registeredCourseIds,
  } = useStudentDashboardData()

  return (
    <div className="space-y-8 text-right" dir="rtl">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[1.65rem] bg-gradient-to-bl from-[#0077B6] to-[#0C2A4B] p-6 text-white shadow-lg sm:p-8"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/5 blur-[60px]"
        />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/60">استكشاف</p>
            <h1 className="mt-1 text-xl font-black sm:text-2xl">الدورات المتاحة</h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold text-white/80">
              {registrations.length > 0
                ? `مسجّل في ${registrations.length} دورة — اكتشف المزيد وأضف إلى مساراتك`
                : 'ابدأ رحلتك التعليمية — اختر دورتك وسجّل الآن'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading || refreshing}
            className="rounded-2xl border border-white/25 bg-white/15 px-4 py-2 text-[11px] font-black backdrop-blur transition hover:bg-white/25 disabled:opacity-60"
          >
            {refreshing ? 'جارٍ التحديث…' : 'تحديث'}
          </button>
        </div>
      </motion.header>

      {loadError && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] font-bold text-amber-950">
          {loadError}
        </p>
      )}

      <StudentBackButton fallback="/dashboard/student/courses" label="العودة إلى دوراتي" />

      {/* Course grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={`sk-${String(i)}`}
              className="h-[26rem] animate-pulse rounded-3xl bg-slate-200/90"
            />
          ))}
        </div>
      ) : browseCourses.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-deepBlue/[0.08] bg-gradient-to-br from-white via-sky-50/30 to-orange-50/25 px-8 py-16 text-center shadow-[0_28px_60px_-32px_rgba(0,119,182,0.35)] ring-1 ring-deepBlue/[0.04]"
        >
          <BookOpen className="mx-auto h-14 w-14 text-customBlue opacity-85" aria-hidden />
          <h2 className="mt-6 text-xl font-black text-deepBlue">
            {registrations.length === 0 ? 'لا توجد دورات متاحة حالياً' : 'جميع الدورات الحالية في قائمتك'}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[14px] font-semibold leading-relaxed text-deepBlue/60">
            جرّب تصفّح الكتالوج العام للعثور على دورات مناسبة لك.
          </p>
          <Link
            to="/courses"
            className="mx-auto mt-8 inline-flex items-center gap-2 rounded-2xl bg-customOrange px-8 py-3.5 text-[13px] font-black text-white shadow-lg transition hover:brightness-105"
          >
            فتح الكتالوج العام
          </Link>
        </motion.div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {browseCourses.slice(0, 48).map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: Math.min(i * 0.06, 0.55) }}
              >
                <AvailableCourseCard
                  course={c}
                  isEnrolled={registeredCourseIds.has(c.id)}
                />
              </motion.div>
            ))}
          </div>

          <p className="text-center text-[12px] font-bold text-slate-500">
            لا تجد ما تبحث عنه؟{' '}
            <Link to="/courses" className="font-black text-customBlue hover:underline">
              تصفّح الكتالوج العام
            </Link>
          </p>
        </>
      )}
    </div>
  )
}
