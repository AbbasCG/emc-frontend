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
import type { PublicWorkshop } from '@/api/workshopsApi.public'
import { formatEuroInteger } from '@/utils/currency'
import { toLatinDigits } from '@/utils/publicDetailFormat'
import { resolvePublicAssetUrl } from '@/utils/mediaUrl'
import { useAuth } from '@/contexts/AuthContext'
import { EMC_COURSE_COVER_PLACEHOLDER } from '@/utils/publicCourseDisplay'
import {
  buildWorkshopDetailEnrollHref,
  gatePublicEnrollClick,
} from '@/utils/publicEnrollAuth'

type WorkshopCardProps = {
  workshop: PublicWorkshop
  viewMode?: 'grid' | 'list'
  index?: number
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

export default function WorkshopCard({ workshop, viewMode = 'grid', index = 0 }: WorkshopCardProps) {
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()

  const imgSrc = workshop.cover_image
    ? (resolvePublicAssetUrl(workshop.cover_image) ?? workshop.cover_image)
    : null

  const startLabel = formatStartAr(workshop.start_date)

  const seatsLine =
    workshop.seats_remaining != null && workshop.seats_total != null
      ? `${workshop.seats_remaining.toLocaleString('en-US')} / ${workshop.seats_total.toLocaleString('en-US')} مقعداً`
      : workshop.seats_remaining != null
        ? `${workshop.seats_remaining.toLocaleString('en-US')} مقعد متاح`
        : workshop.seats_total != null
          ? `${workshop.seats_total.toLocaleString('en-US')} مقعد`
          : null

  const deliveryLabel = workshop.is_online
    ? 'أونلاين'
    : workshop.location_type === 'offline'
      ? 'حضوري'
      : 'مختلط'

  const durationLabel = workshop.duration_hours ? `${workshop.duration_hours} ساعات` : null

  const price = workshop.price ?? 0
  const priceLabel = workshop.is_free ? 'مجاناً' : toLatinDigits(formatEuroInteger(price, 'ar'))

  return (
    <motion.article
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.18 } }}
      transition={{ duration: 0.45, delay: index * 0.05, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -6 }}
      className={`group flex overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-emc-md ring-1 ring-slate-100/90 transition-all duration-300 hover:border-brand-300/50 hover:shadow-emc-lg ${
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
            alt={workshop.title}
            className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
          />
        ) : (
          <img
            src={EMC_COURSE_COVER_PLACEHOLDER}
            alt={workshop.title}
            className="h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900/55 via-transparent to-transparent opacity-90" />

        <div className="absolute right-3 top-3 flex flex-wrap items-center justify-end gap-1.5">
          {workshop.registration_open && (
            <span className="rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-black text-deepBlue shadow-sm backdrop-blur">
              التسجيل مفتوح
            </span>
          )}
          <span className="rounded-full border border-white/30 bg-ink-900/55 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur">
            ورشة تدريبية
          </span>
        </div>

        <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-end justify-between gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-black shadow-sm ${
              workshop.is_free ? 'bg-emerald-500 text-white' : 'bg-white/95 text-brand-700'
            }`}
          >
            {priceLabel}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex min-w-0 flex-1 flex-col p-6 text-right">
        {/* Mode + duration row */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-[#2691C2]/30 bg-[#2691C2]/8 px-2.5 py-0.5 text-[11px] font-bold text-[#2691C2]">
            {deliveryLabel}
          </span>
          {durationLabel && (
            <span className="text-[11px] font-semibold text-muted-500">{durationLabel}</span>
          )}
        </div>

        <h3 className="mb-2 line-clamp-2 text-lg font-black leading-snug text-ink-900 transition group-hover:text-brand-600 md:text-xl">
          {workshop.title}
        </h3>

        {workshop.short_description && (
          <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-muted-600">
            {workshop.short_description}
          </p>
        )}

        {/* Trainer / delivery / duration chips */}
        <div className="mb-4 flex flex-wrap gap-2 text-[11px] text-muted-600">
          {workshop.instructor_name && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 font-semibold text-deepBlue">
              <GraduationCap className="h-3.5 w-3.5 text-brand-500" />
              {workshop.instructor_name}
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 font-medium">
            {workshop.is_online ? (
              <Monitor className="h-3.5 w-3.5 text-brand-500" />
            ) : (
              <Building2 className="h-3.5 w-3.5 text-accent-500" />
            )}
            {deliveryLabel}
          </span>
          {durationLabel && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 font-medium">
              <Sparkles className="h-3.5 w-3.5 text-violet-500" />
              {durationLabel}
            </span>
          )}
        </div>

        {/* Date + seats */}
        <div className="mb-5 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4 text-xs text-muted-500">
          <span className="flex items-center gap-1.5 font-medium">
            <Calendar className="h-3.5 w-3.5 shrink-0 text-brand-500" />
            {startLabel ?? 'الموعد يُحدَّد لاحقاً'}
          </span>
          {seatsLine && (
            <span className="flex items-center gap-1.5 font-medium">
              <Users className="h-3.5 w-3.5 shrink-0 text-accent-500" />
              {seatsLine}
            </span>
          )}
        </div>

        {/* Price + CTA row */}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div>
            <p className="text-[10px] font-bold text-muted-400">الرسوم</p>
            <p className={`text-lg font-black ${workshop.is_free ? 'text-emerald-600' : 'text-ink-900'}`}>
              {workshop.is_free ? 'مجاناً بالكامل' : priceLabel}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={`/workshops/${workshop.slug}`}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-deepBlue transition hover:border-brand-300 hover:bg-brand-50"
            >
              تفاصيل
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
            <button
              type="button"
              disabled={!workshop.registration_open}
              onClick={() => {
                if (!workshop.registration_open) return
                gatePublicEnrollClick({
                  isAuthenticated,
                  role: user?.role,
                  redirectPath: buildWorkshopDetailEnrollHref(workshop.slug),
                  navigate,
                  onStudent: () => navigate(buildWorkshopDetailEnrollHref(workshop.slug)),
                })
              }}
              className={`inline-flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-xs font-black shadow-md transition ${
                !workshop.registration_open
                  ? 'cursor-not-allowed bg-slate-200 text-slate-500 shadow-none'
                  : 'bg-brand-500 text-white shadow-brand-500/25 hover:bg-brand-600'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              سجل في الورشة
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  )
}
