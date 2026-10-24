import { describe, it, expect, vi, beforeEach } from 'vitest'

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn() }))
vi.mock('@/api/axios', () => ({ default: api }))

import {
  apiMessage,
  bulkUpdateTickets,
  changeTicketPriority,
  fetchAssignmentSuggestions,
  fetchTicketAnalytics,
  fetchTicketBoard,
  fetchTicketDetail,
  fetchTicketInsights,
  fetchTicketList,
  fetchTicketStats,
  httpStatus,
  isCancelled,
} from '@/services/ticketOpsService'

beforeEach(() => {
  Object.values(api).forEach((m) => m.mockReset())
})

describe('normalizing what the server sends', () => {
  it('a missing or partial statistics payload becomes zeros and nulls, never NaN or a crash', async () => {
    api.get.mockResolvedValue({ data: { success: true, data: { counts: { total: '12', overdue: 'x' } } } })

    const s = await fetchTicketStats({})

    expect(s.counts.total).toBe(12)
    expect(s.counts.overdue).toBe(0)
    expect(s.counts.pendingApproval).toBe(0)
    expect(s.timings.avgResponseHours).toBeNull()
    expect(s.timings.avgResolutionHours).toBeNull()
    expect(s.timings.windowDays).toBe(30)
  })

  it('keeps an average of zero hours distinct from "no data"', async () => {
    api.get.mockResolvedValue({ data: { data: { counts: {}, timings: { avg_response_hours: 0, response_sample: 3, avg_resolution_hours: null } } } })

    const s = await fetchTicketStats({})

    expect(s.timings.avgResponseHours).toBe(0)
    expect(s.timings.avgResolutionHours).toBeNull()
  })

  it('an empty or malformed list payload is an empty list', async () => {
    api.get.mockResolvedValue({ data: null })
    expect(await fetchTicketList({})).toMatchObject({ items: [], total: 0, currentPage: 1, lastPage: 1 })

    api.get.mockResolvedValue({ data: { data: { data: 'nope', total: 'x', last_page: 0 } } })
    expect(await fetchTicketList({})).toMatchObject({ items: [], total: 0, lastPage: 1 })
  })

  it('sends the query and the abort signal', async () => {
    api.get.mockResolvedValue({ data: { data: { data: [] } } })
    const signal = new AbortController().signal

    await fetchTicketList({ status: 'ASSIGNED', lite: 1 }, { signal })

    expect(api.get).toHaveBeenCalledWith('/v1/tickets', expect.objectContaining({ params: { status: 'ASSIGNED', lite: 1 }, signal, skipErrorToast: true }))
  })

  it('board and analytics requests carry the extra parameter and tolerate gaps', async () => {
    api.get.mockResolvedValue({ data: { data: { columns: [{ status: 'ASSIGNED', count: '4', tickets: [{ id: 1 }] }, null] } } })
    const cols = await fetchTicketBoard({ department_id: '3' }, 8)

    expect(api.get).toHaveBeenCalledWith('/v1/tickets/board', expect.objectContaining({ params: { department_id: '3', per_column: 8 } }))
    expect(cols[0]).toMatchObject({ status: 'ASSIGNED', count: 4 })
    expect(cols[1].tickets).toEqual([])

    api.get.mockResolvedValue({ data: { data: {} } })
    const a = await fetchTicketAnalytics({}, 7)
    expect(api.get).toHaveBeenLastCalledWith('/v1/tickets/analytics', expect.objectContaining({ params: { days: 7 } }))
    expect(a.volume).toEqual([])
    expect(a.assignment.unassignedOpen).toBe(0)
    expect(a.window.days).toBe(7)
  })

  it('insights: an unknown severity is "info", and only an internal ticket link is ever followed', async () => {
    api.get.mockResolvedValue({
      data: { data: [
        { ticket_id: 1, ticket_number: 'E-1', severity: 'weird', url: 'https://evil.example/x', suggested_priority: null },
        { ticket_id: 2, ticket_number: 'E-2', severity: 'critical', url: '/dashboard/tickets/2', suggested_priority: { value: 'HIGH', label: 'عالية', current: 'LOW', reason: 'متأخرة' } },
        { ticket_id: 3, severity: 'high', url: '//evil.example', suggested_priority: [] },
        { ticket_id: 4, severity: 'high', url: '/dashboard/tickets/4/../../x' },
      ] },
    })

    const list = await fetchTicketInsights({})

    expect(list[0].severity).toBe('info')
    expect(list[0].url).toBe('/dashboard/tickets/admin')
    expect(list[1]).toMatchObject({ severity: 'critical', url: '/dashboard/tickets/2', suggestedPriority: { value: 'HIGH', current: 'LOW' } })
    expect(list[2].url).toBe('/dashboard/tickets/admin')
    expect(list[2].suggestedPriority).toBeNull()
    expect(list[3].url).toBe('/dashboard/tickets/admin')
  })

  it('suggestions are normalized and flags are strictly boolean', async () => {
    api.get.mockResolvedValue({ data: { data: { basis: 'b', scope: 'unit', candidates: [{ id: '5', name: 'سلمى', open_tickets: '2', is_current: 'yes', recommended: true }], message: null } } })

    const s = await fetchAssignmentSuggestions(9)

    expect(api.get).toHaveBeenCalledWith('/v1/tickets/9/assignment-suggestions', expect.anything())
    expect(s.scope).toBe('unit')
    expect(s.candidates[0]).toMatchObject({ id: 5, openTickets: 2, isCurrent: false, recommended: true })
    expect(s.message).toBeNull()
  })

  it('refuses an empty ticket payload', async () => {
    api.get.mockResolvedValue({ data: { data: {} } })

    await expect(fetchTicketDetail(5)).rejects.toThrow()
  })
})

describe('writes', () => {
  it('priority sends only the fields it needs, trimming an empty reason away', async () => {
    api.patch.mockResolvedValue({ data: {} })

    await changeTicketPriority(7, 'HIGH', '   ')
    expect(api.patch).toHaveBeenLastCalledWith('/v1/tickets/7/priority', { priority: 'HIGH' }, expect.anything())

    await changeTicketPriority(7, 'LOW', ' سبب ')
    expect(api.patch).toHaveBeenLastCalledWith('/v1/tickets/7/priority', { priority: 'LOW', reason: 'سبب' }, expect.anything())
  })

  it('bulk maps both actions to the server vocabulary and reads per-ticket results', async () => {
    api.post.mockResolvedValue({ data: { data: { requested: 2, succeeded: 1, failed: 1, results: [{ id: 1, ticket_number: 'E-1', ok: true, message: 'تم' }, { id: 2, ticket_number: null, ok: false, message: 'x' }] } } })

    const r = await bulkUpdateTickets({ action: 'reassign', ticketIds: [1, 2], assignedToId: 9, unitId: 4 })

    expect(api.post).toHaveBeenCalledWith('/v1/tickets/bulk', { action: 'reassign', ticket_ids: [1, 2], assigned_to_id: 9, unit_id: 4, reason: undefined }, expect.anything())
    expect(r).toMatchObject({ requested: 2, succeeded: 1, failed: 1 })
    expect(r.results[1]).toEqual({ id: 2, ticketNumber: null, ok: false, message: 'x' })

    await bulkUpdateTickets({ action: 'priority', ticketIds: [3], priority: 'LOW' })
    expect(api.post).toHaveBeenLastCalledWith('/v1/tickets/bulk', { action: 'priority', ticket_ids: [3], priority: 'LOW', reason: undefined }, expect.anything())
  })
})

describe('error helpers', () => {
  const axiosErr = (status: number, data: unknown) => Object.assign(new Error('x'), { isAxiosError: true, response: { status, data } })

  it('reads the first validation message, then the general message, then the fallback', () => {
    expect(apiMessage(axiosErr(422, { message: 'عام', errors: { priority: ['الأولوية غير صالحة.'] } }), 'احتياطي')).toBe('الأولوية غير صالحة.')
    expect(apiMessage(axiosErr(409, { message: 'لا يمكن' }), 'احتياطي')).toBe('لا يمكن')
    expect(apiMessage(axiosErr(500, {}), 'احتياطي')).toBe('احتياطي')
    expect(apiMessage(new Error('plain'), 'احتياطي')).toBe('احتياطي')
  })

  it('exposes the HTTP status and recognises a cancelled request', () => {
    expect(httpStatus(axiosErr(403, {}))).toBe(403)
    expect(httpStatus(new Error('x'))).toBeNull()
    expect(isCancelled(new DOMException('aborted', 'AbortError'))).toBe(true)
    expect(isCancelled(new Error('x'))).toBe(false)
  })
})
