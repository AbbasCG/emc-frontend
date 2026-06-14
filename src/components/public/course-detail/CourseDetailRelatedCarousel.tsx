import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Course } from '@/types'
import { resolveCourseCoverImageUrl, EMC_COURSE_COVER_PLACEHOLDER } from '@/utils/publicCourseDisplay'
import { formatPrice } from '@/utils/course'

type Props = {
  courses: Course[]
  currentSlug: string
}

export default function CourseDetailRelatedCarousel({ courses, currentSlug }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)

  const related = useMemo(
    () => courses.filter((c) => c.slug && c.slug !== currentSlug).slice(0, 3),
    [courses, currentSlug],
  )

  const updateArrows = useCallback(() => {
    const el = scrollerRef.current
    if (!el) return
    setCanPrev(el.scrollLeft > 4)
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  useEffect(() => {
    if (related.length === 0) return
    updateArrows()
    const el = scrollerRef.current
    if (!el) return
    el.addEventListener('scroll', updateArrows, { passive: true })
    return () => el.removeEventListener('scroll', updateArrows)
  }, [related.length, updateArrows])

  if (related.length === 0) return null

  function scrollBy(dx: number) {
    scrollerRef.current?.scrollBy({ left: dx, behavior: 'smooth' })
  }

  return (
    <section className="mt-4" aria-label="دورات ذات صلة">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-black text-[#22334A]">دورات ذات صلة</h2>
        <div className="flex gap-1">
          <button
            type="button"
            disabled={!canPrev}
            onClick={() => scrollBy(-280)}
            className="rounded-xl border border-[#22334A]/10 bg-white/90 p-2 shadow-sm transition hover:border-[#2691C2]/30 disabled:opacity-30"
            aria-label="السابق"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={!canNext}
            onClick={() => scrollBy(280)}
            className="rounded-xl border border-[#22334A]/10 bg-white/90 p-2 shadow-sm transition hover:border-[#2691C2]/30 disabled:opacity-30"
            aria-label="التالي"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div ref={scrollerRef} className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {related.map((course) => {
          const cover = resolveCourseCoverImageUrl(course) ?? EMC_COURSE_COVER_PLACEHOLDER
          const isFree = course.type === 'free'
          return (
            <Link
              key={course.id}
              to={`/courses/${course.slug}`}
              className="group w-[min(100%,280px)] shrink-0 overflow-hidden rounded-[1.5rem] border border-white/80 bg-white/90 shadow-[0_8px_30px_-12px_rgba(34,51,74,0.15)] backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-14px_rgba(34,51,74,0.2)]"
            >
              <div className="relative h-32 overflow-hidden">
                <img
                  src={cover}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#22334A]/50 to-transparent" />
                <span className="absolute right-2.5 top-2.5 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-black tabular-nums text-[#22334A] shadow-sm">
                  {isFree ? 'مجانية' : formatPrice(course.price)}
                </span>
              </div>
              <div className="p-3 text-right">
                <p className="line-clamp-2 text-sm font-black text-[#22334A] transition group-hover:text-[#2691C2]">
                  {course.title}
                </p>
                {course.short_description ?
                  <p className="mt-1 line-clamp-2 text-[11px] font-medium text-slate-500">
                    {course.short_description}
                  </p>
                : null}
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
