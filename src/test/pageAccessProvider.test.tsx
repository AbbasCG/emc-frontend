import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { act, render, renderHook, waitFor } from '@testing-library/react'
import type { EffectivePageAccessRow } from '@/api/accessControlApi'
import { PageAccessProvider, usePageAccess } from '@/contexts/PageAccessContext'

/**
 * The REAL provider (every other suite replaces it with a mock). It caches a decision the backend made; the properties that
 * matter are all about never inventing access: a failed load grants nothing, switching accounts never resolves to the
 * previous user's pages, signing out empties the cache, and nothing is written to browser storage.
 */

const fetchMyPageAccess = vi.fn()
vi.mock('@/api/accessControlApi', () => ({ fetchMyPageAccess: (...a: unknown[]) => fetchMyPageAccess(...a) }))

let auth: { isAuthenticated: boolean; user: { id: number } | null } = { isAuthenticated: true, user: { id: 1 } }
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }))

function row(key: string, allowed: boolean, routePatterns: string[]): EffectivePageAccessRow {
  return {
    key,
    allowed,
    primarySource: 'role_default',
    primarySourceLabelAr: '',
    sources: [],
    overrideState: null,
    protected: false,
    reason: '',
    labelAr: key,
    category: 'operations',
    categoryLabelAr: '',
    riskLevel: 'SAFE_DELEGATABLE',
    primaryRoute: routePatterns[0] ?? '',
    routePatterns,
  } as unknown as EffectivePageAccessRow
}

const OPEN = row('operations.tasks', true, ['/dashboard/tasks'])
const CLOSED = row('finance.expenses', false, ['/dashboard/finance/expenses'])
const manifest = (...pages: EffectivePageAccessRow[]) => ({ user: { id: 1, name: '', email: '', role: '' }, allowedKeys: [], pages })

const wrapper = ({ children }: { children: ReactNode }) => <PageAccessProvider>{children}</PageAccessProvider>

beforeEach(() => {
  fetchMyPageAccess.mockReset()
  auth = { isAuthenticated: true, user: { id: 1 } }
  localStorage.clear()
  sessionStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('PageAccessProvider', () => {
  it('refuses to be used outside its provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() => renderHook(() => usePageAccess())).toThrow(/within a PageAccessProvider/)
    spy.mockRestore()
  })

  it('stays idle and asks the backend for nothing while signed out', () => {
    auth = { isAuthenticated: false, user: null }
    const { result } = renderHook(() => usePageAccess(), { wrapper })

    expect(result.current.status).toBe('idle')
    expect(result.current.isReady).toBe(false)
    expect(result.current.pages).toEqual([])
    expect(fetchMyPageAccess).not.toHaveBeenCalled()
  })

  it('loads the manifest once signed in and answers from the backend decision only', async () => {
    fetchMyPageAccess.mockResolvedValue(manifest(OPEN, CLOSED))
    const { result } = renderHook(() => usePageAccess(), { wrapper })

    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.isReady).toBe(true))

    expect(result.current.status).toBe('ready')
    expect([...result.current.allowedKeys]).toEqual(['operations.tasks'])
    expect(result.current.canAccessKey('operations.tasks')).toBe(true)
    expect(result.current.canAccessKey('finance.expenses')).toBe(false)
    expect(result.current.canAccessKey('unknown.key')).toBe(false) // unknown is never a grant

    expect(result.current.canAccessPath('/dashboard/tasks')).toBe(true)
    expect(result.current.canAccessPath('/dashboard/tasks/42/edit')).toBe(true) // nested under an allowed capability
    expect(result.current.canAccessPath('/dashboard/finance/expenses')).toBe(false)
    expect(result.current.canAccessPath('/dashboard/not-in-catalog')).toBeNull() // no owner is not a denial
    expect(result.current.pageForPath('/dashboard/finance/expenses')?.key).toBe('finance.expenses')
    expect(result.current.pageForPath('/dashboard/not-in-catalog')).toBeNull()
  })

  it('treats a failed load as an error with an empty manifest, never as a grant', async () => {
    fetchMyPageAccess.mockRejectedValue(new Error('network'))
    const { result } = renderHook(() => usePageAccess(), { wrapper })

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.isReady).toBe(false)
    expect(result.current.pages).toEqual([])
    expect(result.current.canAccessKey('operations.tasks')).toBe(false)
    expect(result.current.canAccessPath('/dashboard/tasks')).toBeNull()
  })

  it('clears previously granted pages when a later refresh fails', async () => {
    fetchMyPageAccess.mockResolvedValueOnce(manifest(OPEN))
    const { result } = renderHook(() => usePageAccess(), { wrapper })
    await waitFor(() => expect(result.current.isReady).toBe(true))

    fetchMyPageAccess.mockRejectedValueOnce(new Error('revoked or offline'))
    await act(async () => {
      await result.current.refresh()
    })

    expect(result.current.status).toBe('error')
    expect(result.current.canAccessKey('operations.tasks')).toBe(false)
  })

  it('refresh() re-reads the manifest', async () => {
    fetchMyPageAccess.mockResolvedValueOnce(manifest(CLOSED))
    const { result } = renderHook(() => usePageAccess(), { wrapper })
    await waitFor(() => expect(result.current.isReady).toBe(true))
    expect(result.current.canAccessKey('finance.expenses')).toBe(false)

    fetchMyPageAccess.mockResolvedValueOnce(manifest(row('finance.expenses', true, ['/dashboard/finance/expenses'])))
    await act(async () => {
      await result.current.refresh()
    })
    expect(result.current.canAccessKey('finance.expenses')).toBe(true)
  })

  it('empties the cache and goes idle when the user signs out', async () => {
    fetchMyPageAccess.mockResolvedValue(manifest(OPEN))
    const { result, rerender } = renderHook(() => usePageAccess(), { wrapper })
    await waitFor(() => expect(result.current.isReady).toBe(true))

    auth = { isAuthenticated: false, user: null }
    rerender()

    await waitFor(() => expect(result.current.status).toBe('idle'))
    expect(result.current.pages).toEqual([])
    expect(result.current.canAccessKey('operations.tasks')).toBe(false)
  })

  it('never lets a slow answer for the previous account overwrite the new account', async () => {
    let releaseFirst!: (v: unknown) => void
    fetchMyPageAccess
      .mockReturnValueOnce(new Promise((resolve) => (releaseFirst = resolve)))
      .mockResolvedValueOnce(manifest(row('finance.expenses', true, ['/dashboard/finance/expenses'])))

    const { result, rerender } = renderHook(() => usePageAccess(), { wrapper })

    auth = { isAuthenticated: true, user: { id: 2 } } // another account signs in while the first request is still pending
    rerender()
    await waitFor(() => expect(result.current.isReady).toBe(true))
    expect(result.current.canAccessKey('finance.expenses')).toBe(true)

    await act(async () => {
      releaseFirst(manifest(OPEN)) // the first account's late response
    })

    expect(result.current.canAccessKey('operations.tasks')).toBe(false)
    expect(result.current.canAccessKey('finance.expenses')).toBe(true)
  })

  it('persists nothing to browser storage', async () => {
    fetchMyPageAccess.mockResolvedValue(manifest(OPEN, CLOSED))
    const { result } = renderHook(() => usePageAccess(), { wrapper })
    await waitFor(() => expect(result.current.isReady).toBe(true))

    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
  })

  it('renders its children', async () => {
    fetchMyPageAccess.mockResolvedValue(manifest(OPEN))
    const { getByText } = render(
      <PageAccessProvider>
        <p>inside</p>
      </PageAccessProvider>,
    )
    await waitFor(() => expect(fetchMyPageAccess).toHaveBeenCalled())
    expect(getByText('inside')).toBeInTheDocument()
  })
})

describe('PageAccessProvider quiet refresh when the tab returns', () => {
  function setVisibility(state: 'visible' | 'hidden') {
    Object.defineProperty(document, 'visibilityState', { value: state, configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
  }

  beforeEach(() => vi.useFakeTimers({ toFake: ['Date'] }))
  afterEach(() => {
    vi.useRealTimers()
    setVisibility('visible')
  })

  it('picks up a changed grant after a minute, without flipping the status to loading', async () => {
    fetchMyPageAccess.mockResolvedValueOnce(manifest(CLOSED))
    const { result } = renderHook(() => usePageAccess(), { wrapper })
    await waitFor(() => expect(result.current.isReady).toBe(true))

    fetchMyPageAccess.mockResolvedValueOnce(manifest(row('finance.expenses', true, ['/dashboard/finance/expenses'])))
    vi.setSystemTime(Date.now() + 61_000)
    const statuses: string[] = []

    await act(async () => {
      setVisibility('visible')
      statuses.push(result.current.status)
    })
    await waitFor(() => expect(result.current.canAccessKey('finance.expenses')).toBe(true))

    expect(statuses).toEqual(['ready']) // the menu is never blanked by a quiet refresh
    expect(result.current.status).toBe('ready')
  })

  it('does not refetch when the tab returns within a minute or while hidden', async () => {
    fetchMyPageAccess.mockResolvedValue(manifest(OPEN))
    const { result } = renderHook(() => usePageAccess(), { wrapper })
    await waitFor(() => expect(result.current.isReady).toBe(true))
    expect(fetchMyPageAccess).toHaveBeenCalledTimes(1)

    setVisibility('visible') // too soon
    vi.setSystemTime(Date.now() + 120_000)
    setVisibility('hidden') // not visible

    expect(fetchMyPageAccess).toHaveBeenCalledTimes(1)
  })

  it('keeps the last decision when the quiet refresh fails', async () => {
    fetchMyPageAccess.mockResolvedValueOnce(manifest(OPEN))
    const { result } = renderHook(() => usePageAccess(), { wrapper })
    await waitFor(() => expect(result.current.isReady).toBe(true))

    fetchMyPageAccess.mockRejectedValueOnce(new Error('offline'))
    vi.setSystemTime(Date.now() + 61_000)
    await act(async () => {
      setVisibility('visible')
    })

    expect(fetchMyPageAccess).toHaveBeenCalledTimes(2)
    expect(result.current.status).toBe('ready')
    expect(result.current.canAccessKey('operations.tasks')).toBe(true)
  })
})
