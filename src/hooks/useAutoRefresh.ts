import { useEffect, useRef } from 'react'

/**
 * Calls `refresh` when the tab regains focus or becomes visible again, and every `everyMs` while it is visible, so a
 * board never shows work that changed elsewhere (a reassignment, an acceptance in another tab). Bursts closer than
 * `minGapMs` are collapsed into one call.
 */
export function useAutoRefresh(refresh: () => void, { everyMs = 60_000, minGapMs = 5_000 }: { everyMs?: number; minGapMs?: number } = {}) {
  const ref = useRef(refresh)
  const last = useRef(0)

  useEffect(() => {
    ref.current = refresh
  })

  useEffect(() => {
    last.current = Date.now()
    const run = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      const now = Date.now()
      if (now - last.current < minGapMs) return
      last.current = now
      ref.current()
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') run()
    }
    window.addEventListener('focus', run)
    document.addEventListener('visibilitychange', onVisible)
    const timer = window.setInterval(run, everyMs)

    return () => {
      window.removeEventListener('focus', run)
      document.removeEventListener('visibilitychange', onVisible)
      window.clearInterval(timer)
    }
  }, [everyMs, minGapMs])
}
