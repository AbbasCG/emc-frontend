import { memo } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import type { WorkshopItem } from '@/services/coursesApi'
import { EMC_COURSE_COVER_PLACEHOLDER } from '@/utils/publicCourseDisplay'

type WorkshopSpotlightProps = {
  workshops: WorkshopItem[]
  loading: boolean
}

const workshopDateFormatter = new Intl.DateTimeFormat('ar-EG', {
  day: 'numeric',
  month: 'long',
  numberingSystem: 'latn',
})

function formatDate(dateStr: string): string {
  return workshopDateFormatter.format(new Date(dateStr))
}

/** Meta-line separator — a quiet dot, not a chip. */
function Dot() {
  return (
    <span aria-hidden className="mx-2 text-ink-200">
      ·
    </span>
  )
}

/** Design Language 2.0 — de-boxed editorial skeleton: pulsing lines on a hairline seat. */
function WorkshopRowSkeleton() {
  return (
    <div className="emc-row animate-pulse">
      <div className="flex flex-col gap-4 py-6 ps-3 sm:flex-row sm:items-center sm:gap-6 sm:py-7 sm:ps-4">
        <div className="emc-page-clip-sm aspect-video w-32 shrink-0 bg-paper2 sm:w-44" />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="h-5 w-2/3 rounded bg-paper2" />
          <div className="h-4 w-1/2 rounded bg-ink-50" />
        </div>
        <div className="h-10 w-40 rounded-xl bg-paper2 sm:self-end" />
      </div>
    </div>
  )
}

/** Design Language 2.0 — the workshops spotlight is an editorial LIST, not a card rail:
 *  each workshop sits on an emc-row hairline seat (hover: paper tint + sliding sky bar),
 *  with a flying-page thumbnail, serif title, ONE calm meta line and the price/seats/CTA
 *  column at the row baseline. The only box left is the money action «سجل في الورشة». */
function WorkshopSpotlight({ workshops, loading }: WorkshopSpotlightProps) {
  return (
    <section className="bg-white py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="mb-8 flex items-end justify-between md:mb-10"
        >
          <div>
            <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-accent-700">
              ورش العمل المجانية
            </span>
            <h2 className="emc-title-arc font-display text-2xl font-black tracking-tight text-deepBlue md:text-3xl">
              ورش قادمة — سجّل مجاناً
            </h2>
          </div>

          <Link to="/workshops" className="emc-cta-line hidden text-sm sm:inline-flex">
            كل الورش
            <ArrowLeft className="h-4 w-4" aria-hidden />
          </Link>
        </motion.div>

        {/* Editorial rows */}
        <div>
          {loading
            ? Array.from({ length: 3 }).map((_, i) => <WorkshopRowSkeleton key={i} />)
            : workshops.map((workshop, i) => (
                <WorkshopRow key={workshop.id} workshop={workshop} index={i} />
              ))}
        </div>

        {/* Mobile "see all" */}
        <div className="mt-8 flex justify-center sm:hidden">
          <Link to="/workshops" className="emc-cta-line text-sm">
            كل الورش
            <ArrowLeft className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  )
}

type WorkshopRowProps = {
  workshop: WorkshopItem
  index: number
}

const WorkshopRow = memo(function WorkshopRow({ workshop, index }: WorkshopRowProps) {
  const total = workshop.total_spots
  const remaining = workshop.spots_remaining
  // Same semantics the old spotsColor used: unknown capacity (total = 0) reads as comfy/open.
  const soldOut = total > 0 && remaining <= 0
  const lowSeats = !soldOut && total > 0 && remaining / total <= 0.2

  const detailHref = `/workshops/${workshop.slug}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.5, delay: (index % 4) * 0.06, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <article className="emc-row group relative">
        {/* Invisible cover link — the whole row navigates while the CTAs keep focus semantics */}
        <Link
          to={detailHref}
          className="absolute inset-0 z-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-customBlue focus-visible:ring-offset-2"
          aria-hidden="true"
          tabIndex={-1}
        />

        <div className="relative flex flex-col gap-4 py-6 pe-1 ps-3 text-start sm:flex-row sm:items-center sm:gap-6 sm:py-7 sm:ps-4">
          {/* Thumbnail — flying-page clip, not a rounded box */}
          <div className="emc-page-clip-sm relative aspect-video w-32 shrink-0 sm:w-44">
            <img
              src={EMC_COURSE_COVER_PLACEHOLDER}
              alt={workshop.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          </div>

          {/* Content — serif title + ONE calm meta line */}
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 font-display text-lg font-black leading-snug tracking-tight text-ink-900 transition-colors duration-200 group-hover:text-brand-600 sm:text-xl">
              {workshop.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-400">
              <span>مع {workshop.trainer_name}</span>
              <Dot />
              <span>
                {workshop.date ? formatDate(workshop.date) : 'الموعد لم يحدد بعد'}
                {workshop.date && workshop.time && (
                  <>
                    {' '}
                    <span dir="ltr" className="tabular-nums">
                      {workshop.time}
                    </span>
                  </>
                )}
              </span>
              <Dot />
              <span>
                <span dir="ltr" className="tabular-nums">
                  {workshop.duration_hours.toLocaleString('en-US')}
                </span>{' '}
                ساعات
              </span>
              <Dot />
              <span>{workshop.is_online ? 'أونلاين' : 'حضوري'}</span>
            </p>
          </div>

          {/* End column — price + seats above, actions seated on the row baseline */}
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3 sm:w-56 sm:shrink-0 sm:flex-col sm:items-end sm:justify-end">
            <div className="text-start sm:text-end">
              <p className="emc-stat-num font-display text-xl text-success">مجاناً</p>
              {soldOut ? (
                <p className="mt-1 text-xs font-bold text-ink-300">اكتمل التسجيل</p>
              ) : total > 0 ? (
                <p className={`mt-1 text-xs font-semibold ${lowSeats ? 'text-ember' : 'text-ink-400'}`}>
                  تبقّى{' '}
                  <span dir="ltr" className="tabular-nums">
                    {remaining.toLocaleString('en-US')}
                  </span>{' '}
                  من{' '}
                  <span dir="ltr" className="tabular-nums">
                    {total.toLocaleString('en-US')}
                  </span>
                </p>
              ) : null}
            </div>

            <div className="relative z-10 flex items-center gap-5">
              <Link to={detailHref} className="emc-cta-line text-sm focus-visible:outline-none">
                عرض التفاصيل
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
              {soldOut ? (
                <button
                  type="button"
                  disabled
                  className="cursor-not-allowed rounded-xl bg-paper2 px-4 py-2.5 text-sm font-black text-ink-300"
                >
                  سجل في الورشة
                </button>
              ) : (
                <Link
                  to={detailHref}
                  className="rounded-xl bg-accent-500 px-4 py-2.5 text-sm font-black text-white transition duration-200 hover:bg-accent-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300 focus-visible:ring-offset-1"
                >
                  سجل في الورشة
                </Link>
              )}
            </div>
          </div>
        </div>
      </article>
    </motion.div>
  )
})

export default memo(WorkshopSpotlight)
