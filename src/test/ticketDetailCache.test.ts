import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

const fetchTicketDetail = vi.hoisted(() => vi.fn())
vi.mock('@/services/ticketOpsService', async (orig) => ({ ...(await orig<typeof import('@/services/ticketOpsService')>()), fetchTicketDetail }))

import { hasFreshTicketDetail, invalidateTicketDetail, loadTicketDetail } from '@/services/ticketDetailCache'
import { useTicketDetail } from '@/hooks/useTicketDetail'

const detail = (id: number, over = {}) => ({ id, title: `t${id}`, ...over }) as never
const forbidden = () => Object.assign(new Error('403'), { isAxiosError: true, response: { status: 403, data: {} } })

beforeEach(() => {
  fetchTicketDetail.mockReset()
  invalidateTicketDetail()
})
afterEach(() => vi.useRealTimers())

describe('ticket detail cache', () => {
  it('shares one request between a prefetch and the open', async () => {
    fetchTicketDetail.mockResolvedValue(detail(1))
    await Promise.all([loadTicketDetail(7, 1), loadTicketDetail(7, 1)])
    expect(fetchTicketDetail).toHaveBeenCalledTimes(1)
  })

  it('never serves one user what another user fetched, and forgets it on the switch', async () => {
    fetchTicketDetail.mockResolvedValueOnce(detail(1, { secret: 'a' })).mockResolvedValueOnce(detail(1, { secret: 'b' }))
    await loadTicketDetail(7, 1)
    expect(hasFreshTicketDetail(8, 1)).toBe(false)

    const other = await loadTicketDetail(8, 1)

    expect(fetchTicketDetail).toHaveBeenCalledTimes(2)
    expect((other as unknown as { secret: string }).secret).toBe('b')
    expect(hasFreshTicketDetail(7, 1)).toBe(false)
  })

  it('a signed-out caller gets a direct request and leaves nothing behind', async () => {
    fetchTicketDetail.mockResolvedValue(detail(1))
    await loadTicketDetail(7, 1)
    await loadTicketDetail(null, 1)

    expect(hasFreshTicketDetail(7, 1)).toBe(false)
  })

  it('expires after its short lifetime and does not keep failures', async () => {
    vi.useFakeTimers()
    fetchTicketDetail.mockResolvedValue(detail(1))
    await loadTicketDetail(7, 1)
    vi.advanceTimersByTime(21_000)
    await loadTicketDetail(7, 1)
    expect(fetchTicketDetail).toHaveBeenCalledTimes(2)

    fetchTicketDetail.mockRejectedValueOnce(new Error('boom'))
    await expect(loadTicketDetail(7, 2)).rejects.toThrow('boom')
    await Promise.resolve()
    expect(hasFreshTicketDetail(7, 2)).toBe(false)
  })

  it('invalidate forgets one ticket or all', async () => {
    fetchTicketDetail.mockResolvedValue(detail(1))
    await loadTicketDetail(7, 1)
    await loadTicketDetail(7, 2)
    invalidateTicketDetail(1)
    expect(hasFreshTicketDetail(7, 1)).toBe(false)
    expect(hasFreshTicketDetail(7, 2)).toBe(true)
    invalidateTicketDetail()
    expect(hasFreshTicketDetail(7, 2)).toBe(false)
  })
})

describe('useTicketDetail after a change', () => {
  it('reload bypasses the cache so the change is visible', async () => {
    fetchTicketDetail.mockResolvedValueOnce(detail(1, { status: 'OLD' })).mockResolvedValueOnce(detail(1, { status: 'NEW' }))
    const { result } = renderHook(() => useTicketDetail(7, 1))
    await waitFor(() => expect((result.current.data as unknown as { status: string })?.status).toBe('OLD'))

    act(() => result.current.reload())

    await waitFor(() => expect((result.current.data as unknown as { status: string })?.status).toBe('NEW'))
  })

  it('a refresh that fails with 403 leaves none of the ticket on screen; other failures keep it', async () => {
    fetchTicketDetail.mockResolvedValueOnce(detail(1)).mockRejectedValueOnce(new Error('net')).mockRejectedValueOnce(forbidden())
    const { result } = renderHook(() => useTicketDetail(7, 1))
    await waitFor(() => expect(result.current.data).not.toBeNull())

    act(() => result.current.reload())
    await waitFor(() => expect(result.current.error).toBeTruthy())
    expect(result.current.data).not.toBeNull()

    act(() => result.current.reload())
    await waitFor(() => expect(result.current.data).toBeNull())
  })

  it('never exposes another ticket\'s data while a new id loads', async () => {
    let release!: (v: unknown) => void
    fetchTicketDetail.mockResolvedValueOnce(detail(1)).mockReturnValueOnce(new Promise((r) => { release = r }))
    const { result, rerender } = renderHook(({ id }) => useTicketDetail(7, id), { initialProps: { id: 1 } })
    await waitFor(() => expect(result.current.data).not.toBeNull())

    rerender({ id: 2 })
    expect(result.current.data?.id).not.toBe(1)
    await act(async () => release(detail(2)))
    await waitFor(() => expect(result.current.data?.id).toBe(2))
  })
})
