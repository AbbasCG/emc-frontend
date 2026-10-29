import { useLayoutEffect, useRef, useState } from 'react'

/**
 * The rendered width of an element, kept live. A dashboard page's usable width is the window minus the
 * sidebar, which a viewport media query cannot see, so layout choices that depend on how much room the
 * CONTENT has (table or cards) read this instead. 0 means "not measured yet" (first paint, or no
 * ResizeObserver, as in tests): callers should fall back to a sensible default then.
 */
export function useContainerWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)

  // Layout effect: the first measurement lands before the browser paints, so there is no flash of the wrong layout.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    setWidth(Math.round(el.getBoundingClientRect().width))
    const ro = new ResizeObserver((entries) => {
      const w = Math.round(entries[0]?.contentRect.width ?? 0)
      setWidth((prev) => (Math.abs(prev - w) > 1 ? w : prev))
    })
    ro.observe(el)

    return () => ro.disconnect()
  }, [])

  return [ref, width] as const
}
