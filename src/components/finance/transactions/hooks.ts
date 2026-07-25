import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import axios from 'axios'
import { fetchAllFinanceTransactions } from '@/api/financeApi'
import type { FinancialTransaction } from '@/types/intelligence'
import { defaultDateRange } from './constants'
import type { TransactionFilterState } from './filterRows'

function parseFiltersFromUrl(params: URLSearchParams): TransactionFilterState {
  const defaults = defaultDateRange()
  return {
    search: params.get('q') ?? '',
    status: params.get('status') ?? 'all',
    type: params.get('type') ?? 'all',
    from: params.get('from') ?? defaults.from,
    to: params.get('to') ?? defaults.to,
    minAmount: params.get('min') ?? '',
    maxAmount: params.get('max') ?? '',
    page: Math.max(1, Number(params.get('page')) || 1),
  }
}

function filtersToUrl(f: TransactionFilterState): Record<string, string> {
  const next: Record<string, string> = {}
  if (f.search.trim()) next.q = f.search.trim()
  if (f.status !== 'all') next.status = f.status
  if (f.type !== 'all') next.type = f.type
  if (f.from) next.from = f.from
  if (f.to) next.to = f.to
  if (f.minAmount.trim()) next.min = f.minAmount.trim()
  if (f.maxAmount.trim()) next.max = f.maxAmount.trim()
  if (f.page > 1) next.page = String(f.page)
  return next
}

export function useTransactionFilters() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filters, setFilters] = useState<TransactionFilterState>(() => parseFiltersFromUrl(searchParams))
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search)

  // Re-read the filters from the URL during render (react.dev "adjusting state when a
  // prop changes") instead of after commit, so a back/forward navigation never paints
  // the previous query's filters. The lazy initial state covers the first render.
  const [seenParams, setSeenParams] = useState(searchParams)
  if (seenParams !== searchParams) {
    setSeenParams(searchParams)
    setFilters(parseFiltersFromUrl(searchParams))
  }

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(filters.search), 320)
    return () => window.clearTimeout(t)
  }, [filters.search])

  const syncUrl = useCallback(
    (next: TransactionFilterState) => {
      setSearchParams(filtersToUrl(next), { replace: false })
    },
    [setSearchParams],
  )

  const patchFilters = useCallback(
    (patch: Partial<TransactionFilterState>) => {
      const next = { ...filters, ...patch }
      if (!('page' in patch)) next.page = 1
      setFilters(next)
      syncUrl(next)
    },
    [filters, syncUrl],
  )

  const resetFilters = useCallback(() => {
    const defaults = defaultDateRange()
    const next: TransactionFilterState = {
      search: '',
      status: 'all',
      type: 'all',
      from: defaults.from,
      to: defaults.to,
      minAmount: '',
      maxAmount: '',
      page: 1,
    }
    setFilters(next)
    setSearchParams({}, { replace: true })
  }, [setSearchParams])

  const filtersWithDebouncedSearch = useMemo(
    () => ({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch],
  )

  const hasActiveFilters =
    filters.status !== 'all' ||
    filters.type !== 'all' ||
    filters.search.trim() !== '' ||
    filters.minAmount.trim() !== '' ||
    filters.maxAmount.trim() !== ''

  return {
    filters,
    filtersWithDebouncedSearch,
    debouncedSearch,
    patchFilters,
    resetFilters,
    hasActiveFilters,
  }
}

type TransactionApiFilters = Pick<TransactionFilterState, 'from' | 'to' | 'status' | 'type'>

/** Pure I/O — no state — shared by the mount effect and the imperative `reload`. */
function fetchTransactionsFor(f: TransactionApiFilters): Promise<FinancialTransaction[]> {
  return fetchAllFinanceTransactions({
    from: f.from || undefined,
    to: f.to || undefined,
    status: f.status !== 'all' && f.status !== 'refunded' ? f.status : undefined,
    type: f.type !== 'all' ? f.type : undefined,
  })
}

/** Pure classification of a load failure, so both call sites below produce identical
 *  state without duplicating the axios check. */
function classifyLoadFailure(e: unknown): { forbidden: boolean; message: string | null } {
  if (axios.isAxiosError(e) && e.response?.status === 403) return { forbidden: true, message: null }
  return { forbidden: false, message: 'تعذّر تحميل المعاملات المالية. تحقق من الاتصال وأعد المحاولة.' }
}

export function useTransactions(apiFilters: TransactionApiFilters) {
  const [rows, setRows] = useState<FinancialTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [forbidden, setForbidden] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)

  // Re-arm the loading state during render when the query changes (react.dev "adjusting
  // state when a prop changes"), so the new filters never paint the previous result set
  // as settled. The initial state already covers the first run.
  const { from, to, status, type } = apiFilters
  const [seenQuery, setSeenQuery] = useState({ from, to, status, type })
  if (
    seenQuery.from !== from
    || seenQuery.to !== to
    || seenQuery.status !== status
    || seenQuery.type !== type
  ) {
    setSeenQuery({ from, to, status, type })
    setLoading(true)
    setError(null)
    setForbidden(false)
  }

  /** Imperative refresh from an event handler — outside the effect, so it may flip to
   *  the refreshing state synchronously. */
  const reload = useCallback(async () => {
    setRefreshing(true)
    setError(null)
    setForbidden(false)
    try {
      setRows(await fetchTransactionsFor({ from, to, status, type }))
      setLastSync(new Date())
    } catch (e) {
      const failure = classifyLoadFailure(e)
      setForbidden(failure.forbidden)
      setError(failure.message)
      setRows([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [from, to, status, type])

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const items = await fetchTransactionsFor({ from, to, status, type })
        if (!alive) return
        setRows(items)
        setLastSync(new Date())
      } catch (e) {
        if (!alive) return
        const failure = classifyLoadFailure(e)
        setForbidden(failure.forbidden)
        setError(failure.message)
        setRows([])
      } finally {
        if (alive) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    })()
    return () => {
      alive = false
    }
  }, [from, to, status, type])

  return { rows, loading, refreshing, error, forbidden, lastSync, reload }
}
