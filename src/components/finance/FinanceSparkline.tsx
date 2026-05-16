type FinanceSparklineProps = {
  values: number[]
  className?: string
  strokeClass?: string
  fillClass?: string
}

export default function FinanceSparkline({
  values,
  className = '',
  strokeClass = 'stroke-customBlue',
  fillClass = 'fill-customBlue/15',
}: FinanceSparklineProps) {
  const v = values.length ? values : [0]
  const max = Math.max(...v, 1)
  const min = Math.min(...v, 0)
  const span = max - min || 1
  const w = 88
  const h = 32
  const pad = 2
  const pts = v.map((n, i) => {
    const x = pad + (i / Math.max(v.length - 1, 1)) * (w - pad * 2)
    const y = pad + (1 - (n - min) / span) * (h - pad * 2)
    return `${x},${y}`
  })
  const d = `M ${pts.join(' L ')}`
  const area = `${d} L ${w - pad},${h - pad} L ${pad},${h - pad} Z`

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={`shrink-0 ${className}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <path d={area} className={fillClass} />
      <path d={d} fill="none" strokeWidth="2" className={strokeClass} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
