import { useEffect, useState } from 'react'
import { animate } from 'framer-motion'

export default function FinanceAnimatedNumber({
  value,
  format,
}: {
  value: number
  format: (n: number) => string
}) {
  const [n, setN] = useState(0)

  useEffect(() => {
    const c = animate(0, value, {
      duration: 0.85,
      ease: [0.22, 0.61, 0.36, 1],
      onUpdate: (v) => setN(v),
    })
    return () => c.stop()
  }, [value])

  return <span className="tabular-nums font-latin">{format(n)}</span>
}
