import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  fetchAdminAuditLogStats,
  fetchAdminAuditLogsPage,
  type AdminAuditLogQuery,
} from '@/api/adminAuditLogsApi'
import { getApiErrorMessage } from '@/api/apiErrors'
import type { AdminAuditLogEntry, AdminAuditLogStats } from '@/types/adminAudit'
import {
  AUDIT_LOGS_PER_PAGE_KEY,
  DEFAULT_PER_PAGE,
  EMPTY_STATS,
  type AuditLogFilterState,
  type AuditLogsPageResult,
} from './constants'
import { datePresetToRange } from './formatters'

const DEFAULT_DATE_PRESET = 'last_7'

function readStoredPerPage(): number {
  try {
    const v = Number(localStorage.getItem(AUDIT_LOGS_PER_PAGE_KEY))
    if ([25, 50, 100].includes(v)) return v
  } catch { /* ignore */ }
  return DEFAULT_PER_PAGE
}

function parseFilters(params: URLSearchParams): AuditLogFilterState {
  return {
    search: params.get('q') ?? '',
    action: params.get('action') ?? 'all',
    role: params.get('role') ?? '',
    user: params.get('user') ?? '',
    entity_type: params.get('entity') ?? 'all',
    date_preset: params.get('preset') ?? DEFAULT_DATE_PRESET,
    date_from: params.get('from') ?? '',
    date_to: params.get('to') ?? '',
    ip_address: params.get('ip') ?? '',
    method: params.get('method') ?? 'all',
    status: params.get('status') ?? 'all',
    page: Math.max(1, Number(params.get('page')) || 1),
    per_page: Number(params.get('per_page')) || readStoredPerPage(),
  }
}

function filtersToUrl(f: AuditLogFilterState): Record<string, string> {
  const next: Record<string, string> = {}
  if (f.search.trim()) next.q = f.search.trim()
  if (f.action !== 'all') next.action = f.action
  if (f.role.trim()) next.role = f.role.trim()
  if (f.user.trim()) next.user = f.user.trim()
  if (f.entity_type !== 'all') next.entity = f.entity_type
  if (f.date_preset !== DEFAULT_DATE_PRESET && f.date_preset !== 'all') next.preset = f.date_preset
  if (f.date_from) next.from = f.date_from
  if (f.date_to) next.to = f.date_to
  if (f.ip_address.trim()) next.ip = f.ip_address.trim()
  if (f.method !== 'all') next.method = f.method
  if (f.status !== 'all') next.status = f.status
  if (f.page > 1) next.page = String(f.page)
  if (f.per_page !== DEFAULT_PER_PAGE) next.per_page = String(f.per_page)
  return next
}

export function buildApiQuery(f: AuditLogFilterState, debouncedSearch: string): AdminAuditLogQuery {
  const presetRange = f.date_preset !== 'custom' && f.date_preset !== 'all'
    ? datePresetToRange(f.date_preset)
    : {}

  const searchParts = [debouncedSearch.trim(), f.user.trim()].filter(Boolean)
  const search = searchParts.join(' ').trim() || undefined

  return {
    page: f.page,
    per_page: f.per_page,
    search,
    action: f.action !== 'all' ? f.action : undefined,
    role: f.role.trim() || undefined,
    entity_type: f.entity_type !== 'all' ? f.entity_type : undefined,
    date_from: f.date_preset === 'custom' ? (f.date_from || undefined) : presetRange.from,
    date_to: f.date_preset === 'custom' ? (f.date_to || undefined) : presetRange.to,
    ip_address: f.ip_address.trim() || undefined,
    method: f.method !== 'all' ? f.method : undefined,
    status: f.status !== 'all' ? f.status : undefined,
    sort: 'created_at',
    direction: 'desc',
  }
}

export function useAuditLogFilters() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filters, setFilters] = useState<AuditLogFilterState>(() => parseFilters(searchParams))
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search)

  // Re-read the filters from the URL during render (react.dev "adjusting state when a
  // prop changes") — the lazy initialiser above already covers the first pass, so this
  // only reacts to later navigations.
  const [seenParams, setSeenParams] = useState(searchParams)
  if (seenParams !== searchParams) {
    setSeenParams(searchParams)
    setFilters(parseFilters(searchParams))
  }

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(filters.search), 350)
    return () => window.clearTimeout(t)
  }, [filters.search])

  const syncUrl = useCallback(
    (next: AuditLogFilterState) => {
      setSearchParams(filtersToUrl(next), { replace: false })
    },
    [setSearchParams],
  )

  const patchFilters = useCallback(
    (patch: Partial<AuditLogFilterState>) => {
      const next = { ...filters, ...patch }
      if (!('page' in patch)) next.page = 1
      setFilters(next)
      syncUrl(next)
    },
    [filters, syncUrl],
  )

  const resetFilters = useCallback(() => {
    const next: AuditLogFilterState = {
      search: '',
      action: 'all',
      role: '',
      user: '',
      entity_type: 'all',
      date_preset: DEFAULT_DATE_PRESET,
      date_from: '',
      date_to: '',
      ip_address: '',
      method: 'all',
      status: 'all',
      page: 1,
      per_page: readStoredPerPage(),
    }
    setFilters(next)
    // Keep preset in URL so the 7-day default is explicit after reset
    setSearchParams({ preset: DEFAULT_DATE_PRESET }, { replace: true })
  }, [setSearchParams])

  const hasActiveFilters =
    filters.search.trim() !== '' ||
    filters.user.trim() !== '' ||
    filters.role.trim() !== '' ||
    filters.ip_address.trim() !== '' ||
    filters.action !== 'all' ||
    filters.entity_type !== 'all' ||
    filters.method !== 'all' ||
    filters.status !== 'all' ||
    (filters.date_preset !== DEFAULT_DATE_PRESET && filters.date_preset !== 'all') ||
    !!filters.date_from ||
    !!filters.date_to

  return { filters, debouncedSearch, patchFilters, resetFilters, hasActiveFilters }
}

type AuditLogsOutcome =
  | { ok: true; page: AuditLogsPageResult; stats: AdminAuditLogStats }
  | { ok: false; error: string }

/** Pure I/O — kept outside the hook so the effect and `reload` share it without either
 *  having to call a state-mutating callback. */
async function loadAuditLogsOutcome(query: AdminAuditLogQuery): Promise<AuditLogsOutcome> {
  try {
    const [pageResult, statsResult] = await Promise.all([
      fetchAdminAuditLogsPage(query),
      fetchAdminAuditLogStats(query),
    ])
    return { ok: true, page: pageResult, stats: statsResult }
  } catch (e) {
    return { ok: false, error: getApiErrorMessage(e) }
  }
}

export function useAuditLogsData(apiQuery: AdminAuditLogQuery) {
  const [entries, setEntries] = useState<AdminAuditLogEntry[]>([])
  const [stats, setStats] = useState<AdminAuditLogStats>(EMPTY_STATS)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE)
  const [lastPage, setLastPage] = useState(1)
  const [from, setFrom] = useState<number | null>(null)
  const [to, setTo] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const queryKey = useMemo(() => JSON.stringify(apiQuery), [apiQuery])

  // Return to the loading state during render when the query changes (react.dev
  // "adjusting state when a prop changes"), so the new query never paints the previous
  // query's rows as if they were settled. `loading` already starts `true` on mount.
  const [seenQueryKey, setSeenQueryKey] = useState(queryKey)
  if (seenQueryKey !== queryKey) {
    setSeenQueryKey(queryKey)
    setLoading(true)
    setError(null)
  }

  useEffect(() => {
    let alive = true
    void (async () => {
      const outcome = await loadAuditLogsOutcome(apiQuery)
      if (!alive) return
      if (outcome.ok) {
        setEntries(outcome.page.entries)
        setTotal(outcome.page.total)
        setPage(outcome.page.page)
        setPerPage(outcome.page.perPage)
        setLastPage(outcome.page.lastPage)
        setFrom(outcome.page.from)
        setTo(outcome.page.to)
        setStats(outcome.stats)
      } else {
        setEntries([])
        setStats(EMPTY_STATS)
        setError(outcome.error)
      }
      setLoading(false)
      setRefreshing(false)
    })()
    return () => {
      alive = false
    }
  }, [queryKey, apiQuery])

  /** Imperative refresh from an event handler — outside the effect, so it may flip to
   *  the refreshing state synchronously. */
  const reload = useCallback(async () => {
    setRefreshing(true)
    setError(null)
    const outcome = await loadAuditLogsOutcome(apiQuery)
    if (outcome.ok) {
      setEntries(outcome.page.entries)
      setTotal(outcome.page.total)
      setPage(outcome.page.page)
      setPerPage(outcome.page.perPage)
      setLastPage(outcome.page.lastPage)
      setFrom(outcome.page.from)
      setTo(outcome.page.to)
      setStats(outcome.stats)
    } else {
      setEntries([])
      setStats(EMPTY_STATS)
      setError(outcome.error)
    }
    setLoading(false)
    setRefreshing(false)
  }, [apiQuery])

  return {
    entries,
    stats,
    total,
    page,
    perPage,
    lastPage,
    from,
    to,
    loading,
    refreshing,
    error,
    reload,
  }
}
