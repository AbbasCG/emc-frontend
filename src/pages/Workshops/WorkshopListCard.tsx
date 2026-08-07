import { motion } from 'framer-motion'
import { ArrowUpRight, BookOpen, Calendar, Clock, GraduationCap, Users } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
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

type Props = {
  workshop: PublicWorkshop
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

/** "18:00:00" / "18:00" → "18:00" */
function formatTime(t: string | null): string | null {
  if (!t) return null
  const m = /^(\d{1,2}):(\d{2})/.exec(t.trim())
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : null
}

export default function WorkshopListCard({ workshop, index = 0 }: Props) {
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()

  const imgSrc =
    workshop.cover_image ?
      (resolvePublicAssetUrl(workshop.cover_image) ?? workshop.cover_image)
    : null

  const dateLabel = formatStartAr(workshop.start_date)
  const timeLabel = formatTime(workshop.start_time)

  const deliveryLabel =
    workshop.is_online ? 'أونلاين'
    : workshop.location_type === 'offline' ? 'حضوري'
    : 'مختلط'

  const price = workshop.price ?? 0
  const priceLabel = workshop.is_free ? 'مجاناً' : toLatinDigits(formatEuroInteger(price, 'ar'))

  const seatsTotal = workshop.seats_total
  const seatsRemaining = workshop.seats_remaining
  const capacityRatio =
    seatsTotal != null && seatsTotal > 0 && seatsRemaining != null ?
      Math.min(1, Math.max(0, seatsRemaining / seatsTotal))
    : null
  const lowSeats = capacityRatio != null && capacityRatio < 0.2

  const soldOut = seatsRemaining === 0 || !workshop.registration_open

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.45, delay: (index % 3) * 0.06, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-emc transition-[transform,box-shadow,border-color,background-color] duration-300 hover:-translate-y-1 hover:border-brand-200 hover:bg-sky-50/30 hover:shadow-emc-lg"
    >
      {/* Cover */}
      <div className="relative aspect-video w-full shrink-0 overflow-hidden">
        <img
          src={imgSrc ?? EMC_COURSE_COVER_PLACEHOLDER}
          alt={workshop.title}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy/65 via-navy/10 to-transparent" />

        <span className="absolute start-3 top-3 rounded-md bg-navy/70 px-2 py-1 text-[10px] font-black text-white backdrop-blur">
          {deliveryLabel}
        </span>
        {workshop.is_free && (
          <span className="absolute bottom-3 start-3 rounded-md bg-white/95 px-2 py-1 text-[10px] font-black text-brand-700 shadow-sm">
            مجاناً
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex min-w-0 flex-1 flex-col p-5 text-right">
        <h3 className="line-clamp-2 font-display text-lg font-black leading-snug tracking-tight text-deepBlue transition-colors duration-200 group-hover:text-customBlue">
          {workshop.title}
        </h3>

        {workshop.instructor_name && (
          <p className="mt-1.5 flex items-center gap-1.5 text-[12px] font-bold text-slate-500">
            <GraduationCap className="h-3.5 w-3.5 shrink-0 text-customBlue" aria-hidden />
            <span className="truncate">{workshop.instructor_name}</span>
          </p>
        )}

        {workshop.short_description && (
          <p className="mt-2 line-clamp-2 text-[13px] leading-6 text-slate-500">
            {workshop.short_description}
          </p>
        )}

        {/* Date+time and duration — one clean chip each */}
        <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-bold text-deepBlue">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1 ring-1 ring-slate-100">
            <Calendar className="h-3 w-3 shrink-0 text-customBlue" aria-hidden />
            <span>{dateLabel ?? 'الموعد يُحدَّد لاحقاً'}</span>
            {dateLabel && timeLabel && (
              <>
                <span className="text-slate-300">·</span>
                <span dir="ltr" className="tabular-nums">
                  {timeLabel}
                </span>
              </>
            )}
          </span>
          {workshop.duration_hours != null && workshop.duration_hours > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1 ring-1 ring-slate-100">
              <Clock className="h-3 w-3 shrink-0 text-customBlue" aria-hidden />
              <span dir="ltr" className="tabular-nums">
                {String(workshop.duration_hours)}
              </span>
              ساعات
            </span>
          )}
        </div>

        {/* Capacity meter */}
        {capacityRatio != null ?
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold">
              <span className="text-slate-500">المقاعد المتبقية</span>
              <span
                dir="ltr"
                className={`tabular-nums ${lowSeats ? 'text-ember' : 'text-brand-600'}`}
              >
                {(seatsRemaining ?? 0).toLocaleString('en-US')} / {(seatsTotal ?? 0).toLocaleString('en-US')}
              </span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-[width] duration-300 ${lowSeats ? 'bg-ember' : 'bg-sky-400'}`}
                style={{
                  width: `${String(Math.max(capacityRatio * 100, (seatsRemaining ?? 0) > 0 ? 4 : 0))}%`,
                }}
              />
            </div>
          </div>
        : seatsRemaining != null && seatsRemaining > 0 ?
          <p className="mt-4 flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
            <Users className="h-3 w-3 shrink-0 text-customBlue" aria-hidden />
            <span dir="ltr" className="tabular-nums">
              {seatsRemaining.toLocaleString('en-US')}
            </span>
            مقعد متاح
          </p>
        : null}

        {/* Footer — pinned CTA row */}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-400">الرسوم</p>
            {workshop.is_free ?
              <p className="text-base font-black text-customBlue">مجاناً</p>
            : <p dir="ltr" className="text-right text-base font-black tabular-nums text-deepBlue">
                {priceLabel}
              </p>
            }
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to={`/workshops/${workshop.slug}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-black text-deepBlue transition-colors duration-200 hover:border-brand-300 hover:bg-brand-50"
            >
              تفاصيل
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
            {soldOut ?
              <span className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-xl bg-slate-100 px-3.5 py-2.5 text-xs font-black text-slate-400">
                اكتمل التسجيل
              </span>
            : <button
                type="button"
                onClick={() => {
                  gatePublicEnrollClick({
                    isAuthenticated,
                    role: user?.role,
                    redirectPath: buildWorkshopDetailEnrollHref(workshop.slug),
                    navigate,
                    onStudent: () => navigate(buildWorkshopDetailEnrollHref(workshop.slug)),
                  })
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-customBlue px-3.5 py-2.5 text-xs font-black text-white shadow-md shadow-customBlue/25 transition-colors duration-200 hover:bg-brand-600"
              >
                <BookOpen className="h-3.5 w-3.5" aria-hidden />
                سجل في الورشة
              </button>
            }
          </div>
        </div>
      </div>
    </motion.article>
  )
}
