import { useCallback, useEffect, useRef, useState } from 'react'
import { isCancelled } from '@/services/ticketOpsService'

export interface ResourceState<T> {
  data: T | null
  /** True while a request is in flight (the previous `data` stays available meanwhile). */
  loading: boolean
  error: unknown
}

/**
 * Load a resource whenever `key` changes, safely:
 *  - the previous request is aborted, and a late answer from it can never overwrite a newer one;
 *  - the previous data stays on screen while the next loads (no flash of emptiness);
 *  - `reload()` repeats the request without changing the key (after a mutation);
 *  - `enabled=false` loads nothing (a view that is not visible does not hit the API).
 *
 * `key` must capture every input of `load`. The request runs once per distinct key, so a re-render
 * with the same inputs never makes a second request.
 */
export function useAbortableResource<T>(load: (signal: AbortSignal) => Promise<T>, key: string, enabled = true) {
  const [state, setState] = useState<ResourceState<T>>({ data: null, loading: enabled, error: null })
  const [tick, setTick] = useState(0)
  const loadRef = useRef(load)
  const seq = useRef(0)

  useEffect(() => {
    loadRef.current = load
  })

  useEffect(() => {
    if (!enabled) return
    const id = ++seq.current
    const controller = new AbortController()

    // eslint-disable-next-line react-hooks/set-state-in-effect -- the loading flag must flip before the request starts, whenever the inputs change
    setState((s) => ({ ...s, loading: true, error: null }))
    loadRef
      .current(controller.signal)
      .then((data) => {
        if (id === seq.current) setState({ data, loading: false, error: null })
      })
      .catch((error) => {
        if (id !== seq.current || isCancelled(error)) return
        setState((s) => ({ ...s, loading: false, error }))
      })

    return () => controller.abort()
  }, [key, enabled, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])

  return { ...state, reload }
}
