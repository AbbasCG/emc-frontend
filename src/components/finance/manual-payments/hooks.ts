import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import axios from 'axios'
import apiClient from '@/api/axios'
import {
  fetchAllManualPayments,
  fetchFinanceAccounts,
} from '@/api/financeApi'
import { fetchActiveCourses } from '@/api/adminCoursesApi'
import { fetchPublicWorkshopsPage } from '@/api/workshopsApi.public'
import { fetchAdminLearningPaths } from '@/api/learningPathsApi'
import type { FinanceAccount, ManualPayment, ManualPaymentPurchasableType } from '@/types/intelligence'
import { defaultDateRange } from './constants'
import type { ManualPaymentFilterState } from './filterRows'

function parseFiltersFromUrl(params: URLSearchParams): ManualPaymentFilterState {
  const defaults = defaultDateRange()
  return {
    search: params.get('q') ?? '',
    status: params.get('status') ?? 'all',
    paymentMethod: params.get('method') ?? 'all',
    entityType: params.get('entity') ?? 'all',
    accountId: params.get('account') ?? 'all',
    from: params.get('from') ?? defaults.from,
    to: params.get('to') ?? defaults.to,
    minAmount: params.get('min') ?? '',
    maxAmount: params.get('max') ?? '',
    page: Math.max(1, Number(params.get('page')) || 1),
  }
}

function filtersToUrl(f: ManualPaymentFilterState): Record<string, string> {
  const next: Record<string, string> = {}
  if (f.search.trim()) next.q = f.search.trim()
  if (f.status !== 'all') next.status = f.status
  if (f.paymentMethod !== 'all') next.method = f.paymentMethod
  if (f.entityType !== 'all') next.entity = f.entityType
  if (f.accountId !== 'all') next.account = f.accountId
  if (f.from) next.from = f.from
  if (f.to) next.to = f.to
  if (f.minAmount.trim()) next.min = f.minAmount.trim()
  if (f.maxAmount.trim()) next.max = f.maxAmount.trim()
  if (f.page > 1) next.page = String(f.page)
  return next
}

export function useManualPaymentFilters() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filters, setFilters] = useState<ManualPaymentFilterState>(() => parseFiltersFromUrl(searchParams))
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search)

  useEffect(() => {
    setFilters(parseFiltersFromUrl(searchParams))
  }, [searchParams])

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(filters.search), 320)
    return () => window.clearTimeout(t)
  }, [filters.search])

  const syncUrl = useCallback(
    (next: ManualPaymentFilterState) => {
      setSearchParams(filtersToUrl(next), { replace: false })
    },
    [setSearchParams],
  )

  const patchFilters = useCallback(
    (patch: Partial<ManualPaymentFilterState>) => {
      const next = { ...filters, ...patch }
      if (!('page' in patch)) next.page = 1
      setFilters(next)
      syncUrl(next)
    },
    [filters, syncUrl],
  )

  const resetFilters = useCallback(() => {
    const defaults = defaultDateRange()
    const next: ManualPaymentFilterState = {
      search: '',
      status: 'all',
      paymentMethod: 'all',
      entityType: 'all',
      accountId: 'all',
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
    filters.paymentMethod !== 'all' ||
    filters.entityType !== 'all' ||
    filters.accountId !== 'all' ||
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

export function useManualPayments(apiFilters: Pick<ManualPaymentFilterState, 'from' | 'to' | 'status' | 'paymentMethod' | 'accountId' | 'search'>) {
  const [rows, setRows] = useState<ManualPayment[]>([])
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
        const items = await fetchAllManualPayments({
          status: apiFilters.status !== 'all' ? apiFilters.status : undefined,
          payment_method: apiFilters.paymentMethod !== 'all' ? apiFilters.paymentMethod : undefined,
          finance_account_id: apiFilters.accountId !== 'all' ? Number(apiFilters.accountId) : undefined,
          date_from: apiFilters.from || undefined,
          date_to: apiFilters.to || undefined,
          search: apiFilters.search.trim() || undefined,
        })
        setRows(items)
        setLastSync(new Date())
      } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status === 403) {
          setForbidden(true)
          setRows([])
        } else {
          setError('تعذر تحميل المدفوعات اليدوية')
          setRows([])
        }
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [apiFilters.from, apiFilters.to, apiFilters.status, apiFilters.paymentMethod, apiFilters.accountId, apiFilters.search],
  )

  useEffect(() => {
    void load('initial')
  }, [load])

  return { rows, loading, refreshing, error, forbidden, lastSync, reload: () => load('refresh') }
}

export function useFinanceAccountsList() {
  const [accounts, setAccounts] = useState<FinanceAccount[]>([])
  useEffect(() => {
    void fetchFinanceAccounts().then(setAccounts).catch(() => setAccounts([]))
  }, [])
  return accounts
}

export type StudentSearchResult = {
  id: number
  name: string
  email: string
  phone?: string | null
  role?: string | null
}

export function useStudentSearch(query: string) {
  const [results, setResults] = useState<StudentSearchResult[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      return
    }
    const timer = window.setTimeout(async () => {
      setLoading(true)
      try {
        const res = await apiClient.get<unknown>('/finance/students/search', {
          params: { q: query.trim() },
          skipErrorToast: true,
        })
        const d = res.data as { data?: StudentSearchResult[] }
        setResults(Array.isArray(d?.data) ? d.data : [])
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 350)
    return () => window.clearTimeout(timer)
  }, [query])

  return { results, loading }
}

export type PurchasableOption = {
  id: number
  title: string
  price: number | null
  subtitle?: string | null
}

export function usePurchasableSearch(type: ManualPaymentPurchasableType, query: string) {
  const [results, setResults] = useState<PurchasableOption[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      return
    }
    const q = query.trim().toLowerCase()
    const timer = window.setTimeout(async () => {
      setLoading(true)
      try {
        if (type === 'course') {
          const courses = await fetchActiveCourses()
          setResults(
            courses
              .filter((c) => c.title.toLowerCase().includes(q))
              .slice(0, 20)
              .map((c) => ({ id: c.id, title: c.title, price: null, subtitle: c.instructor_name })),
          )
        } else if (type === 'workshop') {
          const res = await fetchPublicWorkshopsPage({ search: query.trim(), per_page: 20 })
          setResults(
            res.workshops.map((w) => ({
              id: w.id,
              title: w.title,
              price: w.price,
              subtitle: w.instructor_name ?? null,
            })),
          )
        } else {
          const res = await fetchAdminLearningPaths({ search: query.trim(), per_page: 20 })
          setResults(
            res.data.map((lp) => ({
              id: lp.id,
              title: lp.title,
              price: lp.price ?? null,
              subtitle: lp.status ?? null,
            })),
          )
        }
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 400)
    return () => window.clearTimeout(timer)
  }, [type, query])

  return { results, loading }
}
