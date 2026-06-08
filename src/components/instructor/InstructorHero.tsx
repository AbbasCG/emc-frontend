import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw } from 'lucide-react'

export interface HeroPill { label: string; value: number | string }

interface Props {
  title: string
  subtitle?: string
  eyebrow?: string
  pills?: HeroPill[]
  onRefresh?: () => void
  refreshing?: boolean
  children?: ReactNode
}

export function InstructorHero({ title, subtitle, eyebrow, pills, onRefresh, refreshing, children }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-bl from-deepBlue via-[#1a2d44] to-customBlue px-6 py-6 shadow-[0_20px_50px_-20px_rgba(34,51,74,0.5)] sm:px-10"
    >
      <div aria-hidden className="pointer-events-none absolute -left-10 top-0 h-44 w-44 rounded-full bg-customOrange/15 blur-[80px]" />
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1">
          {eyebrow && (
            <p className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-white/45">{eyebrow}</p>
          )}
          <h1 className="text-[1.5rem] font-black leading-tight text-white">{title}</h1>
          {subtitle && (
            <p className="mt-1 text-[12px] font-semibold text-white/55">{subtitle}</p>
          )}
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="flex shrink-0 items-center gap-1.5 rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-[11px] font-black text-white backdrop-blur-sm transition hover:bg-white/20 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            تحديث
          </button>
        )}
      </div>
      {pills && pills.length > 0 && (
        <div className="relative mt-4 flex flex-wrap gap-3">
          {pills.map((p) => (
            <div key={p.label} className="rounded-xl bg-white/10 px-4 py-2 backdrop-blur-sm">
              <p className="font-mono text-[18px] font-black tabular-nums text-white">{p.value}</p>
              <p className="text-[9px] font-black text-white/50">{p.label}</p>
            </div>
          ))}
        </div>
      )}
      {children && <div className="relative mt-3">{children}</div>}
    </motion.div>
  )
}
