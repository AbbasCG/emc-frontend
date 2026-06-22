import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import TrackCard from './TrackCard'
import type { TrackItem } from '@/services/coursesApi'

type TracksSectionProps = {
  tracks: TrackItem[]
  loading: boolean
}

function TrackSkeleton() {
  return (
    <div className="min-w-[290px] md:min-w-0 bg-white rounded-2xl border border-line p-5 animate-pulse">
      <div className="flex justify-between mb-4">
        <div className="w-12 h-12 bg-slate-200 rounded-xl" />
        <div className="flex flex-col items-end gap-2">
          <div className="w-16 h-5 bg-slate-100 rounded-full" />
          <div className="w-14 h-4 bg-slate-100 rounded" />
        </div>
      </div>
      <div className="h-5 bg-slate-200 rounded mb-2 w-3/4" />
      <div className="h-4 bg-slate-100 rounded mb-4 w-full" />
      <div className="flex gap-4 pb-4 border-b border-slate-100 mb-4">
        <div className="text-center"><div className="w-8 h-6 bg-slate-200 rounded mx-auto mb-1" /><div className="w-6 h-3 bg-slate-100 rounded mx-auto" /></div>
        <div className="w-px bg-slate-200" />
        <div className="text-center"><div className="w-8 h-6 bg-slate-200 rounded mx-auto mb-1" /><div className="w-6 h-3 bg-slate-100 rounded mx-auto" /></div>
      </div>
      <div className="flex justify-between items-center">
        <div className="w-20 h-5 bg-slate-200 rounded" />
        <div className="w-24 h-8 bg-slate-100 rounded-lg" />
      </div>
    </div>
  )
}

export default function TracksSection({ tracks, loading }: TracksSectionProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-60px' })

  return (
    <section ref={sectionRef} className="bg-white py-20 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="mb-10"
        >
          <span className="text-xs font-bold text-accent-700 uppercase tracking-widest mb-2 block">
            المسارات المهنية
          </span>
          <h2 className="emc-title-arc font-display text-2xl md:text-3xl font-black tracking-tight text-deepBlue">
            المسارات الاحترافية
          </h2>
          <p className="text-muted-500 mt-5 text-sm md:text-base max-w-lg">
            كل مسار مجموعة متكاملة من الدورات والورش تأخذك من المبتدئ إلى المحترف بشهادة معتمدة.
          </p>
        </motion.div>

        {/* Mobile: horizontal scroll | Desktop: 3-col grid */}
        {loading ? (
          <div className="flex md:grid md:grid-cols-3 gap-5 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
            {Array.from({ length: 3 }).map((_, i) => (
              <TrackSkeleton key={i} />
            ))}
          </div>
        ) : tracks.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center text-sm text-muted-500">
            لا تتوفر مسارات من الخادم حالياً. يمكنك تصفح الدورات أعلاه أو زيارة صفحة المسارات لاحقاً.
          </p>
        ) : (
          <div className="flex md:grid md:grid-cols-3 gap-5 overflow-x-auto md:overflow-visible pb-2 md:pb-0" style={{ scrollbarWidth: 'none' }}>
            {tracks.map((track, i) => (
              <TrackCard key={track.id} track={track} index={i} />
            ))}
          </div>
        )}

        {/* View all tracks button */}
        {!loading && tracks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.45, delay: 0.5 }}
            className="flex justify-center mt-10"
          >
            <Link
              to="/tracks"
              className="flex items-center gap-2 rounded-xl border-2 border-deepBlue px-7 py-3 text-sm font-bold text-deepBlue transition-all duration-200 hover:bg-deepBlue hover:text-white"
            >
              عرض جميع المسارات
            </Link>
          </motion.div>
        )}
      </div>
    </section>
  )
}
