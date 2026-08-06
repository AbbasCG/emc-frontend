import { animate, useInView } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

type Options = {
  duration?: number
}

export function useImpactCountUp(end: number, { duration = 1.85 }: Options = {}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.3 })
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!inView) return
    const controls = animate(0, end, {
      duration,
      ease: [0.22, 0.61, 0.36, 1],
      onUpdate: (latest) => {
        setCount(Math.round(latest))
      },
    })
    return () => controls.stop()
  }, [inView, end, duration])

  return { ref, count }
}
