import { memo } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import {
  BookOpen,
  Clock,
  MapPin,
  Monitor,
  Calendar,
  Sparkles,
  Target,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react'
import type { Course } from '../../types'
import { formatPrice } from '../../utils/course'
import { resolvePublicAssetUrl } from '@/utils/mediaUrl'
import CourseStatusBadge from '@/components/shared/CourseStatusBadge'
import { resolveCourseIsEnded } from '@/utils/courseEnded'
import { resolveCourseSeatMetrics } from '@/utils/courseDetailPageData'
import { seatsLine } from '@/data/webSpec'
import { staggerItem } from '@/utils/animations'
import { useNow } from '@/hooks/useNow'

type Props = { course: Course; index?: number }

function formatArabicDate(dateStr?: string | null): string | null {
  if (!dateStr) return null
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return null
    return d.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return null
  }
}

function resolveProgramTier(course: Course): { label: string; badgeCls: string; isFree: boolean } {
  const isFree = course.type === 'free' || Boolean(course.is_free) || Number(course.price) === 0
  const title = (course.title || '').toLowerCase()
  const rawCatalogType = (course as Record<string, unknown>).catalog_type as string | undefined
  const kind = ((course.program_kind || course.program_type || rawCatalogType || '') as string).toLowerCase()
  const hours = Number(course.training_hours || 0)

  if (kind === 'workshop' || title.includes('ورشة') || title.includes('ندوة') || (hours > 0 && hours <= 6)) {
    return {
      label: isFree ? 'ورشة عمل تفاعلية · مجانية' : 'ورشة عمل تطبيقية',
      badgeCls: 'bg-amber-500/10 text-amber-800 border-amber-300/60',
      isFree,
    }
  }

  if (
    course.learning_path != null ||
    Boolean(course.is_part_of_learning_path) ||
    kind === 'path' ||
    title.includes('مسار') ||
    title.includes('دبلوم') ||
    hours >= 40
  ) {
    return {
      label: 'مسار تأهيل شامل متقدم',
      badgeCls: 'bg-customBlue/10 text-customBlue border-customBlue/30',
      isFree,
    }
  }

  return {
    label: 'دورة تدريبية متخصصة',
    badgeCls: 'bg-deepBlue/10 text-deepBlue border-deepBlue/20',
    isFree,
  }
}

function resolveOutcomeHook(course: Course): string {
  if (course.short_description && course.short_description.trim().length > 0) {
    return course.short_description.trim()
  }
  const title = (course.title || '').toLowerCase()
  if (title.includes('برمج') || title.includes('كود') || title.includes('ويب') || title.includes('مطور')) {
    return 'ستبني بنهاية المحتوى: مشاريع وتطبيقات ويب حقيقية جاهزة للعمل'
  }
  if (title.includes('ذكاء') || title.includes('بيان') || title.includes('آل') || title.includes('ai')) {
    return 'ستبني بنهاية المحتوى: نماذج وتطبيقات ذكاء اصطناعي وأتمتة عملية معتمدة'
  }
  if (title.includes('إدارة') || title.includes('قياد') || title.includes('مشروع')) {
    return 'ستبني بنهاية المحتوى: خطة تشغيلية وتنفيذية لإدارة المشاريع باحترافية'
  }
  if (title.includes('تصميم') || title.includes('واجه')) {
    return 'ستبني بنهاية المحتوى: نظام تصميم وتجربة مستخدم (UI/UX) قابلة للإطلاق'
  }
  if (title.includes('لغ') || title.includes('إنجليز') || title.includes('هولند')) {
    return 'ستكتسب بنهاية المحتوى: طلاقة لغوية وتواصلاً احترافياً معتمداً'
  }
  return 'ستبني بنهاية المحتوى: مهارات تطبيقية حقيقية ومشروع تخرج عملي معتمد'
}

function resolveLevelText(course: Course, tierLabel: string): string {
  if (course.level && course.level.trim().length > 0) return course.level
  if (tierLabel.includes('ورشة')) return 'مبتدئ إلى متوسط'
  if (tierLabel.includes('مسار')) return 'متوسط إلى متقدم'
  return 'جميع المستويات'
}

function HomeCourseCard({ course }: Props) {
  const nowMs = useNow()
  const rawImg =
    course.course_image ||
    course.image_url ||
    course.thumbnail ||
    course.image ||
    course.cover_image

  const imgSrc = rawImg ? (resolvePublicAssetUrl(rawImg) ?? rawImg) : null

  const isFree = course.type === 'free' || Boolean(course.is_free) || Number(course.price) === 0
  const isOnline = Boolean(course.is_online)

  const instructorName = course.instructor?.name || course.instructor_name || null
  const hours = course.training_hours ? Math.round(Number(course.training_hours)) : null

  const isWorkshop = course.program_type === 'workshop' || Boolean((course as Record<string, unknown>).is_workshop)
  const isEnded =
    resolveCourseIsEnded(course) ||
    Boolean(
      isWorkshop &&
        course.start_date &&
        Date.parse(course.start_date) + 24 * 60 * 60 * 1000 < nowMs,
    )
  const detailHref = isWorkshop ? `/workshops/${course.slug}` : `/courses/${course.slug}`
  const detailLabel = isWorkshop ? 'تفاصيل الورشة والتسجيل' : 'تفاصيل البرنامج والتسجيل'

  const tier = resolveProgramTier(course)
  const formattedDate = formatArabicDate(course.start_date)
  const outcomeHook = resolveOutcomeHook(course)
  const levelText = resolveLevelText(course, tier.label)

  const seatMetrics = resolveCourseSeatMetrics(course)
  const seatsUrgency = isEnded ? null : seatsLine(seatMetrics.remaining)
  const isHighDemand = !isEnded && seatMetrics.remaining != null && seatMetrics.remaining <= 5 && seatMetrics.remaining > 0
  const isFullCapacity = !isEnded && seatMetrics.remaining === 0

  return (
    <motion.article
      variants={staggerItem}
      aria-label={course.title}
      className={`group relative flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm transition-all duration-300 hover:border-customBlue/40 hover:shadow-xl ${
        isEnded ? 'opacity-85 grayscale-[0.2]' : ''
      }`}
    >
      <div>
        {/* 1. Top Classification Bar (3-Second Rule) */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Primary Tier Badge */}
            <span
              className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1 text-xs font-black shadow-xs ${tier.badgeCls}`}
            >
              <Sparkles size={12} className="shrink-0" />
              <span>{tier.label}</span>
            </span>

            {/* Chronological Status */}
            {isEnded ? (
              <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                برنامج منتهٍ
              </span>
            ) : formattedDate ? (
              <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-300/70 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                <Calendar size={11} className="text-emerald-600" />
                <span>يبدأ {formattedDate}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-lg border border-sky-300/70 bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-800">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" />
                <span>متاح للتسجيل الفوري</span>
              </span>
            )}
          </div>

          {/* Price Tag */}
          <div className="shrink-0">
            {isFree ? (
              <span className="inline-block rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-black text-white shadow-xs">
                مجاناً بالكامل
              </span>
            ) : (
              <span className="font-latin text-base font-black text-deepBlue" dir="ltr">
                {formatPrice(course.price)}
              </span>
            )}
          </div>
        </div>

        {/* Thumbnail & Title Layout */}
        <div className="flex items-start gap-4 mb-4">
          <div className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-2xl bg-slate-100 border border-slate-100 sm:w-32">
            {imgSrc ? (
              <img
                src={imgSrc}
                alt={course.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-deepBlue to-customBlue text-white/30">
                <BookOpen size={24} />
              </div>
            )}

            {isEnded && (
              <div className="absolute top-1 right-1 z-10">
                <CourseStatusBadge isEnded placement="overlay" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 text-right">
            {instructorName && (
              <p className="text-[11px] font-bold text-customBlue mb-1">
                تقديم: {instructorName}
              </p>
            )}

            <h3 className="line-clamp-2 font-display text-base font-black leading-snug text-deepBlue transition group-hover:text-customBlue sm:text-lg">
              <Link to={detailHref}>
                {course.title}
              </Link>
            </h3>

            {/* Dynamic Demand / Seats Indicator */}
            {isHighDemand && seatsUrgency ? (
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-black text-customOrange border border-amber-300/60">
                  <span className="h-1.5 w-1.5 rounded-full bg-customOrange animate-ping" />
                  <span>{seatsUrgency}</span>
                </span>
              </div>
            ) : seatsUrgency ? (
              <p className="mt-1 text-[11px] font-black text-customOrange">
                {seatsUrgency}
              </p>
            ) : isFullCapacity ? (
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-black text-rose-700 border border-rose-200">
                  اكتملت المقاعد
                </span>
              </div>
            ) : seatMetrics.enrolled != null && seatMetrics.enrolled >= 5 ? (
              <p className="mt-1 text-[11px] font-bold text-slate-500">
                +{seatMetrics.enrolled} مسجل في الدفعة
              </p>
            ) : null}
          </div>
        </div>

        {/* 2. Practical Outcome Hook (مؤشر القيمة التطبيقية) */}
        <div className="mb-4 rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 text-right">
          <div className="flex items-start gap-2">
            <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600" />
            <p className="text-xs font-bold leading-relaxed text-slate-700">
              {outcomeHook}
            </p>
          </div>
        </div>

        {/* 3. Triad Metadata Tokens (شريط البيانات الثلاثي) */}
        <div className="grid grid-cols-3 gap-2 py-3 border-t border-slate-100 text-center text-[11px] font-bold text-slate-600">
          {/* Duration */}
          <div className="flex items-center justify-center gap-1.5 rounded-lg bg-slate-50 py-1.5 px-2">
            <Clock size={13} className="text-customBlue shrink-0" />
            <span className="truncate">{hours ? `${hours} ساعة` : 'مرن'}</span>
          </div>

          {/* Modality */}
          <div className="flex items-center justify-center gap-1.5 rounded-lg bg-slate-50 py-1.5 px-2">
            {isOnline ? (
              <Monitor size={13} className="text-customBlue shrink-0" />
            ) : (
              <MapPin size={13} className="text-customBlue shrink-0" />
            )}
            <span className="truncate">{isOnline ? 'عن بُعد' : 'حضوري'}</span>
          </div>

          {/* Level */}
          <div className="flex items-center justify-center gap-1.5 rounded-lg bg-slate-50 py-1.5 px-2">
            <Target size={13} className="text-customBlue shrink-0" />
            <span className="truncate">{levelText}</span>
          </div>
        </div>
      </div>

      {/* 4. Full-Width Direct CTA (10% Accent Orange, min 44px touch target) */}
      <div className="mt-4 pt-3 border-t border-slate-100">
        <Link
          to={detailHref}
          className="flex h-11 sm:h-12 w-full items-center justify-center gap-2 rounded-xl bg-customOrange px-4 text-xs sm:text-sm font-black text-white shadow-md shadow-customOrange/20 transition-all duration-200 hover:bg-customOrange/90 hover:shadow-lg active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-customOrange focus:ring-offset-2"
        >
          <span>{detailLabel}</span>
          <ArrowLeft size={16} />
        </Link>
      </div>
    </motion.article>
  )
}

export default memo(HomeCourseCard)
