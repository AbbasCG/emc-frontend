import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import { Calendar, Clock, MapPin, Wifi, Users, ArrowLeft } from 'lucide-react'
import type { WorkshopItem } from '@/services/coursesApi'

type WorkshopSpotlightProps = {
  workshops: WorkshopItem[]
  loading: boolean
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('ar-EG', {
    day: 'numeric',
    month: 'long',
    numberingSystem: 'latn',
  }).format(new Date(dateStr))
}

function spotsColor(remaining: number, total: number): string {
  const ratio = remaining / total
  if (ratio <= 0.2) return 'text-red-600 bg-red-50 border-red-200'
  if (ratio <= 0.5) return 'text-amber-600 bg-amber-50 border-amber-200'
  return 'text-emerald-600 bg-emerald-50 border-emerald-200'
}

function WorkshopSkeleton() {
  return (
    <div className="min-w-[300px] bg-white rounded-xl border border-slate-100 p-5 animate-pulse">
      <div className="h-5 bg-slate-200 rounded mb-3 w-3/4" />
      <div className="h-4 bg-slate-100 rounded mb-5 w-1/2" />
      <div className="flex gap-3 mb-4">
        <div className="h-6 bg-slate-100 rounded-full w-20" />
        <div className="h-6 bg-slate-100 rounded-full w-16" />
      </div>
      <div className="h-10 bg-slate-200 rounded-lg" />
    </div>
  )
}

export default function WorkshopSpotlight({ workshops, loading }: WorkshopSpotlightProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-60px' })

  return (
    <section ref={sectionRef} className="bg-slate-50 py-20 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="flex items-end justify-between mb-10"
        >
          <div>
            <span className="text-xs font-bold text-customOrange uppercase tracking-widest mb-2 block">
              ورش العمل المجانية
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-deepBlue">
              ورش قادمة — سجّل مجاناً
            </h2>
            <div className="w-12 h-1 bg-customOrange rounded-full mt-2" />
          </div>

          <Link
            to="/workshops"
            className="hidden sm:flex items-center gap-1.5 text-sm font-bold text-customBlue hover:text-deepBlue transition-colors"
          >
            كل الورش
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </motion.div>

        {/* Scrollable cards */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="flex gap-5 overflow-x-auto pb-4"
          style={{ scrollbarWidth: 'none' }}
        >
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <WorkshopSkeleton key={i} />)
            : workshops.map((workshop, i) => (
                <WorkshopCard key={workshop.id} workshop={workshop} index={i} isVisible={isInView} />
              ))}
        </motion.div>

        {/* Mobile "see all" */}
        <div className="flex sm:hidden justify-center mt-6">
          <Link to="/workshops" className="flex items-center gap-1.5 text-sm font-bold text-customBlue">
            كل الورش
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}

type WorkshopCardProps = {
  workshop: WorkshopItem
  index: number
  isVisible: boolean
}

function WorkshopCard({ workshop, index, isVisible }: WorkshopCardProps) {
  const spotsStyle = spotsColor(workshop.spots_remaining, workshop.total_spots)
  const spotsPercent = Math.round((workshop.spots_remaining / workshop.total_spots) * 100)

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={isVisible ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.09, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -4, boxShadow: '0 16px 48px rgba(34,51,74,0.10)' }}
      className="min-w-[300px] max-w-[300px] bg-white rounded-xl border border-slate-200 p-5 flex flex-col transition-shadow duration-300"
    >
      <Link to={`/workshops/${workshop.slug}`} className="flex flex-col flex-1">
      {/* Mode badge */}
      <div className="flex items-center justify-between mb-3">
        <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg ${
          workshop.is_online
            ? 'bg-customBlue/10 text-customBlue'
            : 'bg-amber-50 text-amber-700'
        }`}>
          {workshop.is_online
            ? <><Wifi className="w-3.5 h-3.5" />أونلاين</>
            : <><MapPin className="w-3.5 h-3.5" />حضوري</>}
        </span>

        <span className={`text-xs font-bold px-2 py-1 rounded-lg border ${spotsStyle}`}>
          <Users className="w-3 h-3 inline ms-0.5" />
          {' '}{workshop.spots_remaining} مقعد
        </span>
      </div>

      {/* Title */}
      <h3 className="font-bold text-deepBlue text-base leading-snug mb-3 line-clamp-2">
        {workshop.title}
      </h3>

      {/* Meta */}
      <div className="flex flex-col gap-1.5 mb-4">
        <div className="flex items-center gap-2 text-xs text-[#73777B]">
          <Calendar className="w-3.5 h-3.5 text-customBlue shrink-0" />
          <span>{formatDate(workshop.date)} · {workshop.time}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#73777B]">
          <Clock className="w-3.5 h-3.5 text-customOrange shrink-0" />
          <span>{workshop.duration_hours} ساعات · {workshop.trainer_name}</span>
        </div>
      </div>

      {/* Spots progress */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-[#73777B]">المقاعد المتاحة</span>
          <span className="font-bold text-deepBlue">{spotsPercent}%</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              spotsPercent <= 20 ? 'bg-red-500' : spotsPercent <= 50 ? 'bg-amber-400' : 'bg-emerald-500'
            }`}
            style={{ width: `${spotsPercent}%` }}
          />
        </div>
      </div>

      {/* CTA */}
      <span className="mt-auto w-full bg-customOrange text-white font-bold py-2.5 rounded-xl text-sm text-center block">
        عرض التفاصيل
      </span>
      </Link>
    </motion.div>
  )
}
