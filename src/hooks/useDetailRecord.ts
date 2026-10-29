import axios from 'axios'
import { useCallback, useEffect, useState } from 'react'

export type DetailLoadState = 'idle' | 'loading' | 'ready' | 'forbidden' | 'not_found' | 'error'

/** 403 / 404 / anything else, from a failed detail request. */
export function classifyDetailError(e: unknown): 'forbidden' | 'not_found' | 'error' {
  if (axios.isAxiosError(e)) {
    const s = e.response?.status
    if (s === 403 || s === 401) return 'forbidden'
    if (s === 404) return 'not_found'
  }

  return 'error'
}

/**
 * The record behind an open detail window (`?view=<id>`).
 *
 * When the record is in the list that is already loaded, it is used as it is. When it is not (a filter or another
 * page hides it, or the link was opened directly), exactly that one record is requested from its own detail
 * endpoint, which the server authorizes like any other request. Nothing else is loaded, and nothing is guessed:
 * a refusal (403), a missing or deleted record (404) and a failure are each reported as such, never as an empty
 * window. A late answer for a record the user already left is discarded.
 */
export function useDetailRecord<T extends { id: number }>(id: number | null, fromList: T | null, fetcher: (id: number) => Promise<T>) {
  const [fetched, setFetched] = useState<{ id: number; data: T } | null>(null)
  const [failure, setFailure] = useState<{ id: number; kind: 'forbidden' | 'not_found' | 'error' } | null>(null)
  const [attempt, setAttempt] = useState(0)
  const needsFetch = id !== null && fromList === null

  useEffect(() => {
    if (!needsFetch || id === null) return
    let alive = true
    fetcher(id)
      .then((data) => {
        if (alive) setFetched({ id, data })
      })
      .catch((e) => {
        if (alive) setFailure({ id, kind: classifyDetailError(e) })
      })

    return () => {
      alive = false
    }
    // `fetcher` is a stable module function; only the id (or an explicit retry) starts a request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, needsFetch, attempt])

  const record: T | null = id === null ? null : (fromList ?? (fetched?.id === id ? fetched.data : null))
  const failed = id !== null && failure?.id === id ? failure.kind : null
  const state: DetailLoadState = id === null ? 'idle' : record ? 'ready' : (failed ?? 'loading')

  const retry = useCallback(() => {
    setFailure(null)
    setAttempt((n) => n + 1)
  }, [])
  /** Keep a fetched record current after a change made in the window (a record from the list is updated by the list itself). */
  const replace = useCallback((next: T) => setFetched({ id: next.id, data: next }), [])

  return { record, state, retry, replace }
}
