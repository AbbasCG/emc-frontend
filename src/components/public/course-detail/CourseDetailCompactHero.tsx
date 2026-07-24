import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Heart, Play, Share2, Star } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import CourseStatusBadge from '@/components/shared/CourseStatusBadge'
import { resolveCourseIsEnded } from '@/utils/courseEnded'
import { mapCourseStatusArabic } from '@/utils/publicCourseDisplay'
import { formatPublicText } from '@/utils/publicDetailFormat'
import type { Course } from '@/types'
import type { CourseDetailDerived } from '@/utils/courseDetailDerived'
import type { CourseGalleryItem } from '@/utils/courseDetailPageData'

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

export default function CourseDetailCompactHero({
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
  const ended = resolveCourseIsEnded(course)
  const status = ended ? null : mapCourseStatusArabic(course.status, course.is_published)
  const thumbs = gallery.slice(0, 4)
  const [activeImage, setActiveImage] = useState(coverUrl)

  useEffect(() => {
    setActiveImage(coverUrl)
  }, [coverUrl])

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="emc-dawn relative max-h-[400px] overflow-hidden rounded-[1.5rem] border border-white/10 text-white shadow-emc-lg"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -end-12 top-0 h-48 w-48 rounded-full bg-[#0077B6]/25 blur-3xl" />
        <div className="absolute -bottom-8 start-6 h-36 w-36 rounded-full bg-[#F28C00]/18 blur-3xl" />
      </div>

      <div className="relative grid max-h-[400px] gap-2.5 p-3 sm:p-4 lg:grid-cols-[2fr_3fr] lg:gap-4 lg:p-5">
        <div className="flex min-h-0 flex-col gap-1.5">
          <div className="group relative h-[120px] overflow-hidden rounded-xl ring-1 ring-white/20 sm:h-[130px] lg:h-[min(200px,calc(400px-4rem))]">
            <img src={activeImage} alt="" loading="eager" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0C2A4B]/60 to-transparent" />
            {ended ?
              <div className="absolute left-2 top-2 z-10">
                <CourseStatusBadge isEnded placement="overlay" />
              </div>
            : null}
            {videoUrl ?
              <button
                type="button"
                onClick={onVideoPreview}
                className="absolute inset-0 flex items-center justify-center bg-black/15 transition hover:bg-black/25"
                aria-label="معاينة الفيديو"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-[#0077B6] shadow-lg">
                  <Play className="h-4 w-4 fill-current" />
                </span>
              </button>
            : null}
          </div>
          {thumbs.length > 1 ?
            <div className="flex gap-1 overflow-x-auto scrollbar-hide">
              {thumbs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveImage(t.url)}
                  className={cn(
                    'h-9 w-11 shrink-0 overflow-hidden rounded-md ring-2 transition',
                    activeImage === t.url ? 'ring-[#F28C00]' : 'ring-white/25',
                  )}
                  aria-label={t.label ?? 'صورة المعرض'}
                >
                  <img src={t.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          : null}
        </div>

        <div className="flex min-h-0 flex-col text-right">
          <nav className="mb-1 flex items-center gap-1 text-[9px] font-bold text-white/40">
            <Link to="/" className="hover:text-white/70">الرئيسية</Link>
            <span>/</span>
            <Link to="/courses" className="hover:text-white/70">الدورات</Link>
          </nav>

          <div className="mb-1.5 flex flex-wrap gap-1">
            <span className="rounded-full bg-[#0077B6]/25 px-2 py-0.5 text-[9px] font-black text-[#7dd3fc] ring-1 ring-[#0077B6]/35">
              {derived.L.badge}
            </span>
            {category ?
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-black ring-1 ring-white/15">{category}</span>
            : null}
            {level ?
              <span className="rounded-full bg-[#F28C00]/25 px-2 py-0.5 text-[9px] font-black text-[#fcd9b0] ring-1 ring-[#F28C00]/30">{level}</span>
            : null}
            {ended ?
              <CourseStatusBadge isEnded placement="inline" />
            : status ?
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-black">{status}</span>
            : null}
          </div>

          <h1 className="line-clamp-2 font-display text-lg font-black leading-tight tracking-tight sm:text-xl lg:text-[1.45rem]">{course.title}</h1>

          {course.short_description ?
            <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-white/65 sm:text-xs">{course.short_description}</p>
          : null}

          {rating != null ?
            <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-white/60">
              <Star className="h-3 w-3 fill-[#F28C00] text-[#F28C00]" />
              <span className="tabular-nums">{formatPublicText(rating)}</span>
              {reviewCount > 0 ?
                <span className="tabular-nums text-white/45">({formatPublicText(reviewCount)} تقييم)</span>
              : null}
            </div>
          : null}

          <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2">
            {cta}
            <button
              type="button"
              onClick={onShare}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-2.5 text-[10px] font-black backdrop-blur-sm"
            >
              <Share2 className="h-3 w-3" />
              مشاركة
            </button>
            <button
              type="button"
              onClick={onToggleWishlist}
              className={cn(
                'inline-flex h-8 w-8 items-center justify-center rounded-lg border backdrop-blur-sm',
                wishlisted ? 'border-rose-400/40 bg-rose-500/20 text-rose-100' : 'border-white/20 bg-white/10',
              )}
              aria-label={wishlisted ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
            >
              <Heart className={cn('h-3.5 w-3.5', wishlisted && 'fill-current')} />
            </button>
          </div>
        </div>
      </div>
    </motion.section>
  )
}
