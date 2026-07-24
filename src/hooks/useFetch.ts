import { useCallback, useEffect, useRef, useState } from 'react'

export type UseFetchResult<T> = {
  /** Last successful payload — `null` before the first resolution and after a failure. */
  data: T | null
  loading: boolean
  /** Rejection reason of the latest attempt — `null` while loading and after success. */
  error: unknown
  /** Imperative re-run (aborts any in-flight request first). */
  refetch: () => Promise<void>
}

/**
 * Generic hardened loader for the common `useEffect + setState` fetch pattern.
 *
 * Discipline (mirrors `useTasksWorkspace`, kept small and generic):
 * - aborts the in-flight request on dep change and on unmount (AbortController);
 * - ignores stale resolutions — only the latest request may commit state;
 * - never updates state after unmount;
 * - clears `data` when a request fails, matching the hand-rolled
 *   `catch { setRows(empty) }` convention used across the app.
 *
 * `fn` receives the request's AbortSignal; pass it through to the API call when
 * the endpoint supports it (stale results are discarded either way).
 */
export function useFetch<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  deps: unknown[],
): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  // Latest-callback ref so `refetch` stays referentially stable while always
  // invoking the most recent `fn`. Updated in an effect (declared before the
  // fetch effect below, so it is fresh by the time a dep-change run starts).
  const fnRef = useRef(fn)
  useEffect(() => {
    fnRef.current = fn
  })

  const controllerRef = useRef<AbortController | null>(null)
  const runIdRef = useRef(0)

  const run = useCallback(async () => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    const runId = ++runIdRef.current

    setLoading(true)
    setError(null)
    try {
      const result = await fnRef.current(controller.signal)
      if (runId !== runIdRef.current || controller.signal.aborted) return
      setData(result)
    } catch (err) {
      if (runId !== runIdRef.current || controller.signal.aborted) return
      setData(null)
      setError(err)
    } finally {
      if (runId === runIdRef.current && !controller.signal.aborted) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    void run()
    return () => {
      controllerRef.current?.abort()
    }
  }, deps)

  return { data, loading, error, refetch: run }
}
