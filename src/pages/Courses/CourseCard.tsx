import { motion } from 'framer-motion'
import {
  BookOpen,
  Users,
  Calendar,
  Monitor,
  Building2,
  Sparkles,
  ArrowUpRight,
  GraduationCap,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import type { CourseItem } from '@/services/coursesApi'
import { formatEuroInteger } from '@/utils/currency'
import { toLatinDigits } from '@/utils/publicDetailFormat'
import { resolvePublicAssetUrl } from '@/utils/mediaUrl'
import { useAuth } from '@/contexts/AuthContext'
import {
  buildCourseDetailEnrollHref,
  gatePublicEnrollClick,
} from '@/utils/publicEnrollAuth'

type CourseCardProps = {
  course: CourseItem
  viewMode?: 'grid' | 'list'
  index?: number
}

function accentFromKey(label: string) {
  let h = 0
  for (let i = 0; i < label.length; i++) h = (h + label.charCodeAt(i) * (i + 1)) % 1000000
  const palettes = [
    { chip: 'bg-brand-50 text-brand-700 border-brand-200/60' },
    { chip: 'bg-emerald-50 text-emerald-800 border-emerald-200/60' },
    { chip: 'bg-accent-50 text-accent-800 border-accent-200/60' },
    { chip: 'bg-violet-50 text-violet-800 border-violet-200/60' },
    { chip: 'bg-rose-50 text-rose-800 border-rose-200/60' },
    { chip: 'bg-amber-50 text-amber-800 border-amber-200/60' },
  ]
  return palettes[h % palettes.length]
}

function formatStartAr(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return new Intl.DateTimeFormat('ar-SA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    numberingSystem: 'latn',
  }).format(d)
}

export default function CourseCard({ course, viewMode = 'grid', index = 0 }: CourseCardProps) {
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const accent = accentFromKey(course.category_label)
  const imgSrc = course.thumbnail
    ? resolvePublicAssetUrl(course.thumbnail) ?? course.thumbnail
    : null

  const startLabel = formatStartAr(course.start_date)
  const seatsLine =
    course.seats_count != null
      ? `${course.registrations_count.toLocaleString('en-US')} / ${course.seats_count.toLocaleString('en-US')} مقعداً`
      : `${course.registrations_count.toLocaleString('en-US')} تسجيل`

  const statusBadge =
    course.status === 'upcoming'
      ? 'قادمة'
      : course.status_label_ar ??
        (course.status === 'archived' ? 'مؤرشفة' : course.status === 'active' ? 'متاحة' : null)

  return (
    <motion.article
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.18 } }}
      transition={{ duration: 0.45, delay: index * 0.05, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -6 }}
      className={`group flex overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-emc-md transition-all duration-300 hover:border-brand-300/50 hover:shadow-emc-lg ${
        viewMode === 'list' ? 'flex-row-reverse' : 'flex-col'
      }`}
    >
      {/* Image */}
      <div
        className={`relative shrink-0 overflow-hidden ${
          viewMode === 'list' ? 'w-56 md:w-64' : 'h-52 w-full'
        }`}
      >
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={course.title}
            className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
          />
        ) : (
          <img
            src={course.cover_placeholder}
            alt={course.title}
            className="h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900/55 via-transparent to-transparent opacity-90" />

        <div className="absolute right-3 top-3 flex flex-wrap items-center justify-end gap-1.5">
          {statusBadge && (
            <span className="rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-black text-deepBlue shadow-sm backdrop-blur">
              {statusBadge}
            </span>
          )}
          <span className="rounded-full border border-white/30 bg-ink-900/55 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur">
            {course.catalog_type_label_ar ?? (course.catalog_type === 'workshop' ? 'ورشة' : 'دورة')}
          </span>
        </div>

        <div className="absolute bottom-3 right-3 left-3 flex flex-wrap items-end justify-between gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-black shadow-sm ${
              course.is_free ? 'bg-emerald-500 text-white' : 'bg-white/95 text-brand-700'
            }`}
          >
            {course.is_free ? 'مجاناً' : toLatinDigits(formatEuroInteger(course.price, 'ar'))}
          </span>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-6 text-right">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${accent.chip}`}
          >
            {course.category_label}
          </span>
          <span className="text-[11px] font-semibold text-muted-500">{course.level_label_ar}</span>
          {course.language && (
            <span className="text-[11px] text-muted-400">· {course.language}</span>
          )}
        </div>

        <h3 className="mb-2 line-clamp-2 text-lg font-black leading-snug text-ink-900 transition group-hover:text-brand-600 md:text-xl">
          {course.title}
        </h3>

        <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-muted-600">{course.short_description}</p>

        <div className="mb-4 flex flex-wrap gap-2 text-[11px] text-muted-600">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 font-semibold text-deepBlue">
            <GraduationCap className="h-3.5 w-3.5 text-brand-500" />
            {course.trainer.name}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 font-medium">
            {course.delivery_key === 'online' ? (
              <Monitor className="h-3.5 w-3.5 text-brand-500" />
            ) : (
              <Building2 className="h-3.5 w-3.5 text-accent-500" />
            )}
            {course.delivery_label_ar}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 font-medium">
            <Sparkles className="h-3.5 w-3.5 text-violet-500" />
            {course.duration_label}
          </span>
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4 text-xs text-muted-500">
          <span className="flex items-center gap-1.5 font-medium">
            <Calendar className="h-3.5 w-3.5 shrink-0 text-brand-500" />
            {startLabel ?? 'انضم إلى الدورة القادمة'}
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <Users className="h-3.5 w-3.5 shrink-0 text-accent-500" />
            {seatsLine}
          </span>
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div>
            <p className="text-[10px] font-bold text-muted-400">الاستثمار</p>
            <p className={`text-lg font-black ${course.is_free ? 'text-emerald-600' : 'text-ink-900'}`}>
              {course.is_free ? 'مجاناً بالكامل' : toLatinDigits(formatEuroInteger(course.price, 'ar'))}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={`/courses/${course.slug}`}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-deepBlue transition hover:border-brand-300 hover:bg-brand-50"
            >
              تفاصيل
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
            <button
              type="button"
              onClick={() => {
                gatePublicEnrollClick({
                  isAuthenticated,
                  role: user?.role,
                  redirectPath: buildCourseDetailEnrollHref(course.slug),
                  navigate,
                  onStudent: () => navigate(buildCourseDetailEnrollHref(course.slug)),
                })
              }}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-brand-500 px-4 py-2.5 text-xs font-black text-white shadow-md shadow-brand-500/25 transition hover:bg-brand-600"
            >
              <BookOpen className="h-3.5 w-3.5" />
              سجل الآن
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  )
}
