import { motion } from 'framer-motion'
import { Brain, BarChart3, Rocket, BookOpen, Megaphone, Shield, Clock, ChevronLeft } from 'lucide-react'
import type { TrackItem } from '@/services/coursesApi'
import { formatEuroInteger } from '@/utils/currency'

type TrackCardProps = {
  track: TrackItem
  index?: number
}

const iconMap: Record<string, typeof Brain> = {
  Brain,
  BarChart3,
  Rocket,
  BookOpen,
  Megaphone,
  Shield,
}

const levelConfig: Record<string, { label: string; cls: string }> = {
  beginner:     { label: 'مبتدئ',  cls: 'text-brand-400 bg-brand-50 border-brand-100' },
  intermediate: { label: 'متوسط', cls: 'text-customBlue bg-brand-50 border-brand-200/60' },
  advanced:     { label: 'متقدم', cls: 'text-deepBlue bg-brand-100/70 border-brand-200/70' },
}

// Calm hover wash — sea-family tints only (never the rainbow).
const accentGradients = [
  'from-customBlue/12 to-customBlue/4',
  'from-brand-400/12 to-brand-400/4',
  'from-ocean/12 to-ocean/4',
]

export default function TrackCard({ track, index = 0 }: TrackCardProps) {
  const Icon = iconMap[track.icon] ?? Brain
  const level = levelConfig[track.level] ?? levelConfig.beginner
  const gradient = accentGradients[index % accentGradients.length]
  const discount = track.original_price
    ? Math.round(((track.original_price - track.price) / track.original_price) * 100)
    : 0

  return (
    <motion.div
      initial={{ opacity: 0, x: -36 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay: index * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -6 }}
      className="group relative bg-white rounded-2xl border border-line hover:border-brand-200 transition-all duration-300 ease-emc-out p-5 flex flex-col cursor-pointer min-w-[290px] md:min-w-0 shadow-emc hover:shadow-emc-lg"
    >
      {/* Gradient accent overlay */}
      <div
        className={`absolute inset-0 rounded-xl bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}
      />

      <div className="relative z-10 flex flex-col h-full">
        {/* Header: icon + level + duration */}
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 rounded-xl bg-deepBlue group-hover:bg-customBlue transition-colors duration-300 flex items-center justify-center shadow-md">
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${level.cls}`}>
              {level.label}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-500">
              <Clock className="w-3 h-3" />
              {track.duration_months} أشهر
            </span>
          </div>
        </div>

        {/* Name */}
        <h3 className="font-display font-black tracking-tight text-deepBlue text-lg mb-1.5 leading-snug group-hover:text-customBlue transition-colors duration-200">
          {track.name}
        </h3>

        {/* Description */}
        <p className="text-xs text-muted-500 mb-4 leading-relaxed line-clamp-2">
          {track.description}
        </p>

        {/* Stats */}
        <div className="flex items-center gap-5 mb-4 pb-4 border-b border-slate-100">
          <div className="text-center">
            <p className="text-lg font-black text-customBlue">{track.courses_count}</p>
            <p className="text-xs text-muted-500 -mt-0.5">دورة</p>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="text-center">
            <p className="text-lg font-black text-accent-700">{track.workshops_count}</p>
            <p className="text-xs text-muted-500 -mt-0.5">ورشة</p>
          </div>
          {discount > 0 && (
            <>
              <div className="w-px h-8 bg-slate-200" />
              <div className="text-center">
                <p className="text-lg font-black text-emerald-600">{discount}%</p>
                <p className="text-xs text-muted-500 -mt-0.5">خصم</p>
              </div>
            </>
          )}
        </div>

        {/* Price + CTA */}
        <div className="mt-auto flex items-center justify-between">
          <div>
            {track.original_price && (
              <span className="text-xs line-through text-muted-500 block mb-0.5">
                {formatEuroInteger(track.original_price, 'ar')}
              </span>
            )}
            <span className="font-black text-deepBlue text-base">
              {formatEuroInteger(track.price, 'ar')}
            </span>
          </div>

          <button className="flex items-center gap-1 text-customBlue text-sm font-bold group-hover:text-white group-hover:bg-customBlue px-3 py-1.5 rounded-lg transition-all duration-200">
            عرض المسار
            <ChevronLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}
