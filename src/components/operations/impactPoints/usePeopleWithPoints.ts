import { useCallback, useEffect, useState } from 'react'
import { fetchPointsMembers, type PointsMembersPage, type PointsMembersQuery } from '@/api/volunteerPointsApi'

export type PeopleState =
  | { status: 'loading'; page: PointsMembersPage | null }
  | { status: 'ready'; page: PointsMembersPage }
  | { status: 'error'; page: PointsMembersPage | null }

const DEFAULT_QUERY: PointsMembersQuery = { sort: 'points', page: 1, per_page: 10 }

/**
 * Server-driven people list. Searching and filtering are the backend's job so
 * pagination and the KPI strip always agree with the rows. The previous page
 * stays on screen while the next one loads, so the list never flashes empty.
 *
 * `enabled` must come from the server's capabilities (can_view_all) — when it
 * is false nothing is requested at all.
 */
export function usePeopleWithPoints(enabled: boolean) {
  const [query, setQuery] = useState<PointsMembersQuery>(DEFAULT_QUERY)
  const [state, setState] = useState<PeopleState>({ status: 'loading', page: null })
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    if (!enabled) return
    let alive = true

    void fetchPointsMembers(query)
      .then((page) => {
        if (alive) setState({ status: 'ready', page })
      })
      .catch(() => {
        if (alive) setState((prev) => ({ status: 'error', page: prev.page }))
      })

    return () => {
      alive = false
    }
  }, [enabled, query, nonce])

  /** A filter change returns to page 1; a bare page change keeps the filters. */
  const update = useCallback((patch: Partial<PointsMembersQuery>) => {
    setState((prev) => ({ status: 'loading', page: prev.page }))
    setQuery((prev) => ({ ...prev, page: 1, ...patch }))
  }, [])

  const reload = useCallback(() => {
    setState((prev) => ({ status: 'loading', page: prev.page }))
    setNonce((n) => n + 1)
  }, [])

  const reset = useCallback(() => {
    setState((prev) => ({ status: 'loading', page: prev.page }))
    setQuery(DEFAULT_QUERY)
  }, [])

  const hasFilters = Boolean(query.search || query.department_id || query.level)

  return { query, state, update, reload, reset, hasFilters }
}
