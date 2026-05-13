import { motion } from 'framer-motion'
import { Brain, BarChart3, Rocket, BookOpen, Megaphone, Shield, Clock, ChevronLeft } from 'lucide-react'
import type { TrackItem } from '@/services/coursesApi'

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
  beginner:     { label: 'مبتدئ',  cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  intermediate: { label: 'متوسط', cls: 'text-customBlue bg-blue-50 border-customBlue/20' },
  advanced:     { label: 'متقدم', cls: 'text-purple-700 bg-purple-50 border-purple-200' },
}

const accentGradients = [
  'from-customBlue/15 to-customBlue/5',
  'from-emerald-500/15 to-emerald-500/5',
  'from-customOrange/15 to-customOrange/5',
  'from-purple-500/15 to-purple-500/5',
  'from-teal-500/15 to-teal-500/5',
  'from-rose-500/15 to-rose-500/5',
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
      className="group relative bg-white rounded-xl border-2 border-slate-100 hover:border-customOrange/50 transition-all duration-300 p-5 flex flex-col cursor-pointer min-w-[290px] md:min-w-0 shadow-sm hover:shadow-xl"
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
            <span className="flex items-center gap-1 text-xs text-[#73777B]">
              <Clock className="w-3 h-3" />
              {track.duration_months} أشهر
            </span>
          </div>
        </div>

        {/* Name */}
        <h3 className="font-black text-deepBlue text-lg mb-1.5 leading-snug group-hover:text-customBlue transition-colors duration-200">
          {track.name}
        </h3>

        {/* Description */}
        <p className="text-xs text-[#73777B] mb-4 leading-relaxed line-clamp-2">
          {track.description}
        </p>

        {/* Stats */}
        <div className="flex items-center gap-5 mb-4 pb-4 border-b border-slate-100">
          <div className="text-center">
            <p className="text-lg font-black text-customBlue">{track.courses_count}</p>
            <p className="text-xs text-[#73777B] -mt-0.5">دورة</p>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="text-center">
            <p className="text-lg font-black text-customOrange">{track.workshops_count}</p>
            <p className="text-xs text-[#73777B] -mt-0.5">ورشة</p>
          </div>
          {discount > 0 && (
            <>
              <div className="w-px h-8 bg-slate-200" />
              <div className="text-center">
                <p className="text-lg font-black text-emerald-600">{discount}%</p>
                <p className="text-xs text-[#73777B] -mt-0.5">خصم</p>
              </div>
            </>
          )}
        </div>

        {/* Price + CTA */}
        <div className="mt-auto flex items-center justify-between">
          <div>
            {track.original_price && (
              <span className="text-xs line-through text-[#73777B] block mb-0.5">
                {track.original_price.toLocaleString('ar-EG')} ر.س
              </span>
            )}
            <span className="font-black text-deepBlue text-base">
              {track.price.toLocaleString('ar-EG')} ر.س
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
