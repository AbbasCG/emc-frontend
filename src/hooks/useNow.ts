import { useEffect, useState } from 'react'

/**
 * Returns a "current time" timestamp (ms) that is safe to read during render.
 *
 * Calling `Date.now()` directly in a component/`useMemo` body is impure and is flagged by
 * `react-hooks/purity` (React Compiler) because it produces unstable results across renders.
 * This hook captures the time once at mount (lazy `useState` initializer runs outside render)
 * and, when `intervalMs` is provided, refreshes it on a timer.
 *
 * @param intervalMs optional refresh interval in ms; omit for a stable mount-time snapshot.
 */
export function useNow(intervalMs?: number): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!intervalMs) return
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])

  return now
}
