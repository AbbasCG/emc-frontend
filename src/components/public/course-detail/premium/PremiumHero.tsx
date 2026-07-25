import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import {
  BadgeCheck, Heart, Play, Share2, Star,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Course } from '@/types'
import type { CourseDetailDerived } from '@/utils/courseDetailDerived'
import type { CourseGalleryItem } from '@/utils/courseDetailPageData'
import { resolveCertificateAvailability } from '@/utils/programCertificateAvailability'
import { formatPublicText } from '@/utils/publicDetailFormat'

const AVATAR_PLACEHOLDER =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><circle cx="40" cy="40" r="40" fill="#0077B6"/><circle cx="40" cy="30" r="13" fill="rgba(255,255,255,0.35)"/><path fill="rgba(255,255,255,0.25)" d="M10 74c7-18 17-26 30-26s23 8 30 26"/></svg>`,
  )

type Props = {
  course: Course
  derived: CourseDetailDerived
  coverUrl: string
  gallery: CourseGalleryItem[]
  videoUrl: string | null
  category: string | null
  level: string | null
  rating: number | null
  reviewCount: number
  wishlisted: boolean
  onToggleWishlist: () => void
  onShare: () => void
  onVideoPreview?: () => void
  cta: ReactNode
}

export default function PremiumHero({
  course,
  derived,
  coverUrl,
  gallery,
  videoUrl,
  category,
  level,
  rating,
  reviewCount,
  wishlisted,
  onToggleWishlist,
  onShare,
  onVideoPreview,
  cta,
}: Props) {
  const [activeImg, setActiveImg] = useState(coverUrl)

  // Re-sync the previewed image when the course cover changes (adjust state during render).
  const [seenCoverUrl, setSeenCoverUrl] = useState(coverUrl)
  if (seenCoverUrl !== coverUrl) {
    setSeenCoverUrl(coverUrl)
    setActiveImg(coverUrl)
  }

  const cert = resolveCertificateAvailability(course)
  const showCert = cert.hasCertificate && Boolean(cert.badgeLabel)

  return (
    <section className="emc-dawn relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 right-1/4 h-[420px] w-[420px] rounded-full bg-sky/15 blur-[100px]" />
        <div className="absolute -bottom-24 left-[12%] h-[300px] w-[300px] rounded-full bg-customOrange/10 blur-[110px]" />
      </div>

      <div className="relative mx-auto flex max-w-[88rem] flex-col items-center gap-6 px-4 py-7 sm:px-6 lg:flex-row lg:items-center lg:gap-10 lg:px-10 lg:py-8 xl:px-12">

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-1 flex-col gap-3.5 text-right"
        >
          <nav className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.02em] text-ice/80">
            <Link to="/" className="transition-colors hover:text-white">الرئيسية</Link>
            <span className="text-white/35">/</span>
            <Link to="/courses" className="transition-colors hover:text-white">الدورات</Link>
            {category && (
              <>
                <span className="text-white/35">/</span>
                <span className="max-w-[140px] truncate text-white">{category}</span>
              </>
            )}
          </nav>

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full border border-white/30 bg-white/15 px-3 py-1 text-[11px] font-black text-white backdrop-blur-sm">
              {derived.L.badge}
            </span>
            {level && (
              <span className="inline-flex items-center rounded-full border border-customOrange/45 bg-customOrange/20 px-3 py-1 text-[11px] font-black text-sand backdrop-blur-sm">
                {level}
              </span>
            )}
            {showCert && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-ice/35 bg-sky/15 px-3 py-1 text-[11px] font-black text-ice backdrop-blur-sm">
                <BadgeCheck className="h-3 w-3" />
                {cert.badgeLabel}
              </span>
            )}
            {derived.registration.open && !derived.seatsFull && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/40 bg-emerald-300/20 px-3 py-1 text-[11px] font-black text-white backdrop-blur-sm">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-100" />
                التسجيل مفتوح
              </span>
            )}
          </div>

          <h1 className="font-display text-[1.75rem] font-black leading-[1.12] tracking-tight text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.38)] sm:text-[2rem] lg:text-[2.5rem]">
            {course.title}
          </h1>

          {course.short_description && (
            <p className="max-w-[540px] text-[14px] leading-[1.8] text-ice/85 sm:text-[15px]">
              {course.short_description}
            </p>
          )}

          {rating != null && (
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      'h-3.5 w-3.5',
                      i < Math.round(rating) ? 'fill-amber text-amber' : 'fill-white/12 text-white/20',
                    )}
                  />
                ))}
              </div>
              <span className="font-latin text-sm font-black tabular-nums text-white">{formatPublicText(rating)}</span>
              {reviewCount > 0 && (
                <span className="font-latin text-xs tabular-nums text-ice/80">({formatPublicText(reviewCount)} تقييم)</span>
              )}
            </div>
          )}

          {derived.instructor.name && (
            <div className="flex items-center gap-2.5 rounded-2xl border border-white/22 bg-white/[0.12] px-3.5 py-2.5 backdrop-blur-md">
              <img
                src={derived.instructor.avatarUrl ?? AVATAR_PLACEHOLDER}
                alt=""
                loading="eager"
                className="h-10 w-10 shrink-0 rounded-full border border-white/30 object-cover ring-2 ring-sky/25"
              />
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-ice/70">المدرب</p>
                <p className="text-sm font-black text-white">{derived.instructor.name}</p>
                {derived.instructor.title && (
                  <p className="text-[11px] text-ice/85">{derived.instructor.title}</p>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {cta}
            <button
              type="button"
              onClick={onShare}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/25 bg-white/[0.14] px-3.5 text-sm font-bold text-white backdrop-blur-sm transition duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:border-white/40 hover:bg-white/25"
            >
              <Share2 className="h-4 w-4" />
              مشاركة
            </button>
            <button
              type="button"
              onClick={onToggleWishlist}
              aria-label={wishlisted ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
              className={cn(
                'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border backdrop-blur-sm transition duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)]',
                wishlisted
                  ? 'border-rose-300/35 bg-rose-400/18 text-rose-100'
                  : 'border-white/25 bg-white/[0.14] text-white hover:border-white/40 hover:bg-white/25',
              )}
            >
              <Heart className={cn('h-4 w-4', wishlisted && 'fill-current')} />
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -20, scale: 0.98 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.06 }}
          className="hidden shrink-0 flex-col gap-2 lg:flex lg:w-[400px] xl:w-[460px]"
        >
          <div className="group relative overflow-hidden rounded-2xl border border-white/12 ring-1 ring-white/5 shadow-[0_28px_70px_-20px_rgba(6,24,44,0.6)]">
            <img
              src={activeImg}
              alt=""
              loading="eager"
              className="aspect-[16/10] w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:scale-[1.02]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-night/55 via-transparent to-transparent" />

            {videoUrl && (
              <button
                type="button"
                onClick={onVideoPreview}
                aria-label="معاينة الفيديو"
                className="absolute inset-0 flex items-center justify-center bg-night/0 opacity-0 transition-opacity duration-200 group-hover:bg-night/10 group-hover:opacity-100"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-2xl ring-4 ring-white/25 transition-transform duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:scale-105">
                  <Play className="ms-0.5 h-5 w-5 fill-customBlue text-customBlue" />
                </span>
              </button>
            )}
          </div>

          {gallery.length > 1 && (
            <div className="flex gap-1.5">
              {gallery.slice(0, 4).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveImg(item.url)}
                  className={cn(
                    'h-12 flex-1 overflow-hidden rounded-lg border-2 transition-all duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)]',
                    activeImg === item.url
                      ? 'border-customOrange shadow-[0_0_0_2px_rgba(242,140,0,0.2)]'
                      : 'border-white/20 hover:border-white/40',
                  )}
                >
                  <img src={item.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </section>
  )
}
