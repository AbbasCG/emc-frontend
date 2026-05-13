import { motion } from 'framer-motion'

export default function QualityScoreRing({
  score,
  max = 100,
  label,
  size = 96,
}: {
  score: number
  max?: number
  label: string
  size?: number
}) {
  const pct = Math.min(100, Math.max(0, (score / max) * 100))
  const stroke = 8
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const dash = (pct / 100) * c

  return (
    <div className="flex flex-col items-center text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative"
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="url(#qcGrad)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c}`}
            initial={{ strokeDasharray: `0 ${c}` }}
            animate={{ strokeDasharray: `${dash} ${c}` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
          <defs>
            <linearGradient id="qcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#2691C2" />
              <stop offset="100%" stopColor="#ec943c" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-black text-deepBlue">{Math.round(score)}</span>
          <span className="text-[9px] font-bold text-slate-400">/ {max}</span>
        </div>
      </motion.div>
      {label ? (
        <p className="mt-3 max-w-[140px] text-[11px] font-black leading-snug text-deepBlue">{label}</p>
      ) : null}
    </div>
  )
}
