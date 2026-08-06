import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, RefreshCw } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

export interface HeroPill { label: string; value: number | string }

interface Props {
  title: string
  subtitle?: string
  eyebrow?: string
  pills?: HeroPill[]
  onRefresh?: () => void
  refreshing?: boolean
  /** If set, renders a back button above the title */
  backTo?: string
  backLabel?: string
  children?: ReactNode
  /** Extra buttons rendered before the refresh button, in the header row. */
  actions?: ReactNode
}

export function InstructorHero({
  title,
  subtitle,
  eyebrow,
  pills,
  onRefresh,
  refreshing,
  backTo,
  backLabel = 'الدورات',
  children,
  actions,
}: Props) {
  const navigate = useNavigate()

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-bl from-[#22334A] via-[#1a2d44] to-[#2691C2] px-5 py-5 shadow-[0_16px_40px_-18px_rgba(34,51,74,0.45)] sm:px-8 sm:py-5"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -left-10 top-0 h-28 w-28 rounded-full bg-[#EC943C]/15 blur-[60px]"
      />

      {/* Back button */}
      {(backTo || backTo === '') && (
        <div className="relative mb-3">
          {backTo ? (
            <Link
              to={backTo}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-[11px] font-black text-white/70 transition hover:bg-white/20 hover:text-white"
            >
              <ArrowRight className="h-3.5 w-3.5" />
              {backLabel}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-[11px] font-black text-white/70 transition hover:bg-white/20 hover:text-white"
            >
              <ArrowRight className="h-3.5 w-3.5" />
              {backLabel}
            </button>
          )}
        </div>
      )}

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
        {(actions || onRefresh) && (
          <div className="flex shrink-0 items-center gap-2">
            {actions}
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
        )}
      </div>

      {pills && pills.length > 0 && (
        <div className="relative mt-3 flex flex-wrap gap-2.5">
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
