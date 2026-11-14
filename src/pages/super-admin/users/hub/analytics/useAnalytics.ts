import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { useSearchParams } from 'react-router'
import { getApiErrorMessage } from '@/api/apiErrors'
import type { UsersAnalyticsQuery } from '@/api/usersAnalyticsApi'
import {
  DEFAULT_PRESET,
  rangeFromParams,
  todayInReportingZone,
  validateRange,
  type RangePreset,
  type ResolvedRange,
} from './range'

/**
 * The window shared by the analytics tabs, kept in the URL (`?range=7d`, `?range=custom&from=…&to=…`, `?cmp=0`).
 * Tab switches in the hub keep the other query params, so both tabs show the same period; edits replace the history
 * entry (a filter change is not a navigation).
 */
export function useAnalyticsRange() {
  const [params, setParams] = useSearchParams()
  const today = todayInReportingZone()

  const rawRange = params.get('range')
  const rawFrom = params.get('from')
  const rawTo = params.get('to')
  const range: ResolvedRange = useMemo(
    () => rangeFromParams(rawRange, rawFrom, rawTo, today),
    [rawRange, rawFrom, rawTo, today],
  )
  const compare = params.get('cmp') !== '0'

  const update = useCallback(
    (mutate: (next: URLSearchParams) => void) => {
      const next = new URLSearchParams(params)
      mutate(next)
      setParams(next, { replace: true })
    },
    [params, setParams],
  )

  const setPreset = useCallback(
    (preset: Exclude<RangePreset, 'custom'>) =>
      update((next) => {
        next.delete('from')
        next.delete('to')
        if (preset === DEFAULT_PRESET) next.delete('range')
        else next.set('range', preset)
      }),
    [update],
  )

  /** Returns an error code instead of applying an invalid range. */
  const setCustom = useCallback(
    (from: string, to: string) => {
      const error = validateRange(from, to, todayInReportingZone())
      if (error) return error
      update((next) => {
        next.set('range', 'custom')
        next.set('from', from)
        next.set('to', to)
      })
      return null
    },
    [update],
  )

  const setCompare = useCallback(
    (on: boolean) =>
      update((next) => {
        if (on) next.delete('cmp')
        else next.set('cmp', '0')
      }),
    [update],
  )

  const query: UsersAnalyticsQuery = useMemo(
    () => ({ from: range.from, to: range.to, compare }),
    [range.from, range.to, compare],
  )

  return { range, compare, query, today, setPreset, setCustom, setCompare }
}

export type QueryState<T> =
  | { status: 'loading'; data: T | null; error: null; forbidden: false }
  | { status: 'ready'; data: T; error: null; forbidden: false }
  | { status: 'error'; data: T | null; error: string; forbidden: boolean }

/**
 * One request per key. A new key aborts the previous request and keeps the old data on screen (dimmed by the caller)
 * until the new data arrives, so changing the period does not flash an empty panel.
 */
export function useAnalyticsQuery<T>(key: string, load: (signal: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<QueryState<T>>({ status: 'loading', data: null, error: null, forbidden: false })
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the loading flag must flip before the request starts, whenever the period changes
    setState((prev) => ({ status: 'loading', data: prev.data, error: null, forbidden: false }))

    load(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ status: 'ready', data, error: null, forbidden: false })
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || axios.isCancel(err)) return
        const forbidden = axios.isAxiosError(err) && err.response?.status === 403
        setState((prev) => ({
          status: 'error',
          data: prev.data,
          error: forbidden ? 'لا تملك صلاحية عرض هذا القسم.' : getApiErrorMessage(err),
          forbidden,
        }))
      })

    return () => controller.abort()
    // `load` is rebuilt by the caller on every render; the key is what identifies the request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, nonce])

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  return { ...state, reload }
}
