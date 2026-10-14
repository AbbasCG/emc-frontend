import { useEffect, useState } from 'react'

/** Live `matchMedia`. Where it is unavailable (tests, old browsers) the answer is `fallback`. */
export function useMediaQuery(query: string, fallback = true): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : fallback,
  )

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia(query)
    const on = () => setMatches(mq.matches)
    mq.addEventListener('change', on)

    return () => mq.removeEventListener('change', on)
  }, [query])

  return matches
}
