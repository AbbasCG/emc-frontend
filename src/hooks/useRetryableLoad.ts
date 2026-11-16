import { useCallback, useEffect, useRef, useState } from 'react'

export interface RetryableLoad<T> {
  data: T | null
  /** True from the moment the inputs change (or `retry()` is called) until the answer, success or failure, arrives. */
  loading: boolean
  /** True when the latest request failed: the caller must show it and offer `retry`. */
  error: boolean
  retry: () => void
}

/**
 * Load one resource per `key`, and never hide a failure.
 *
 *  - `loading` and `error` are DERIVED from which request the stored answer belongs to, so no state is set
 *    synchronously from the effect (the answer is stored only after the request settles).
 *  - A late answer from a superseded request (key changed, `retry()` pressed, unmounted) is dropped.
 *  - `enabled=false` loads nothing and reports neither loading nor error; keep it true once a view has been
 *    opened, so switching away and back does not repeat the request.
 *
 * `key` must capture every input of `load`.
 */
export function useRetryableLoad<T>(load: () => Promise<T>, key: string, enabled = true): RetryableLoad<T> {
  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState<{ token: string; data: T | null; failed: boolean } | null>(null)
  const loadRef = useRef(load)

  useEffect(() => {
    loadRef.current = load
  })

  const token = `${key}#${attempt}`

  useEffect(() => {
    if (!enabled) return
    let alive = true
    void (async () => {
      try {
        const data = await loadRef.current()
        if (alive) setSettled({ token, data, failed: false })
      } catch {
        if (alive) setSettled({ token, data: null, failed: true })
      }
    })()

    return () => {
      alive = false
    }
  }, [enabled, token])

  const current = enabled && settled?.token === token ? settled : null
  const retry = useCallback(() => setAttempt((n) => n + 1), [])

  return {
    data: current && !current.failed ? current.data : null,
    loading: enabled && current == null,
    error: current?.failed ?? false,
    retry,
  }
}
