import { useEffect, useState } from 'react'

/** `value`, but only after it has stopped changing for `delay` ms. The first value passes straight through. */
export function useDebouncedValue<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delay)

    return () => window.clearTimeout(t)
  }, [value, delay])

  return debounced
}
