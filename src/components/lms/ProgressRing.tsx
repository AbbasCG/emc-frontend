import { motion } from 'framer-motion'

type Props = {
  percent: number
  size?: number
  stroke?: number
  label?: string
  sublabel?: string
}

export default function ProgressRing({
  percent,
  size = 120,
  stroke = 10,
  label,
  sublabel,
}: Props) {
  const p = Math.min(100, Math.max(0, percent))
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (p / 100) * c

  return (
    <div className="relative inline-flex flex-col items-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(12, 42, 75,0.08)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--customBlue)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-xl font-black text-deepBlue">{Math.round(p)}%</span>
        {label && <span className="text-[10px] font-bold text-slate-400">{label}</span>}
      </div>
      {sublabel && (
        <p className="mt-2 max-w-[140px] text-center text-[11px] font-semibold text-slate-500">{sublabel}</p>
      )}
    </div>
  )
}
