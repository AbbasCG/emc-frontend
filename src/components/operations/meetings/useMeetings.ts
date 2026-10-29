import { useCallback, useEffect, useMemo, useState } from 'react'
import { describeMeetingError, fetchMeetings, type MeetingError, type MeetingsPage, type MeetingsQuery } from '@/api/meetingsApi'
import type { OpsMeeting } from '@/types/operations'

type Result = { key: string; data?: MeetingsPage; error?: MeetingError }

/**
 * Loads the meetings list for a query and keeps it fresh after a write.
 *
 * - `settled` follows the request key, so loading/error are DERIVED rather than
 *   set synchronously in an effect.
 * - While a new query is in flight the previous rows stay on screen (`refreshing`),
 *   so changing a filter never blanks the list.
 * - `reload()` refetches (after saving a meeting, or the retry button).
 * - `patchMeeting()` swaps one row in place, so a card flips to "تم رفع التقرير"
 *   the instant the server confirms, before the background refetch lands.
 */
export function useMeetings(query: MeetingsQuery) {
  const [nonce, setNonce] = useState(0)
  const [result, setResult] = useState<Result | null>(null)

  const key = useMemo(() => JSON.stringify([query, nonce]), [query, nonce])

  useEffect(() => {
    let alive = true
    void fetchMeetings(query)
      .then((data) => {
        if (alive) setResult({ key, data })
      })
      .catch((e: unknown) => {
        if (alive) setResult({ key, error: describeMeetingError(e) })
      })
    return () => {
      alive = false
    }
  }, [query, key])

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  const patchMeeting = useCallback((meeting: OpsMeeting) => {
    setResult((r) =>
      r?.data ? { ...r, data: { ...r.data, rows: r.data.rows.map((m) => (m.id === meeting.id ? meeting : m)) } } : r,
    )
  }, [])

  const settled = result?.key === key
  const error = settled ? result?.error : undefined
  const data = result?.data

  return {
    data,
    error,
    initialLoading: !result || (!settled && !data),
    refreshing: !settled && !!result,
    reload,
    patchMeeting,
  }
}

/** Debounces typing so each keystroke is not a request. */
export function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}
