import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
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

  useEffect(() => {
    setFilters(parseFiltersFromUrl(searchParams))
  }, [searchParams])

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

export function useTransactions(apiFilters: Pick<TransactionFilterState, 'from' | 'to' | 'status' | 'type'>) {
  const [rows, setRows] = useState<FinancialTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [forbidden, setForbidden] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'initial') setLoading(true)
      else setRefreshing(true)
      setError(null)
      setForbidden(false)
      try {
        const apiStatus = apiFilters.status !== 'all' && apiFilters.status !== 'refunded' ? apiFilters.status : undefined
        const apiType = apiFilters.type !== 'all' ? apiFilters.type : undefined
        const items = await fetchAllFinanceTransactions({
          from: apiFilters.from || undefined,
          to: apiFilters.to || undefined,
          status: apiStatus,
          type: apiType,
        })
        setRows(items)
        setLastSync(new Date())
      } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status === 403) {
          setForbidden(true)
          setRows([])
        } else {
          setError('تعذّر تحميل المعاملات المالية. تحقق من الاتصال وأعد المحاولة.')
          setRows([])
        }
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [apiFilters.from, apiFilters.to, apiFilters.status, apiFilters.type],
  )

  useEffect(() => {
    void load('initial')
  }, [load])

  return { rows, loading, refreshing, error, forbidden, lastSync, reload: () => load('refresh') }
}
