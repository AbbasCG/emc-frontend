import { describe, it, expect, vi, beforeEach } from 'vitest'
import apiClient from '@/api/axios'
import {
  fetchSupportTickets,
  fetchSupportTicket,
  fetchSupportTicketAssignees,
  fetchTicketActivity,
  submitSupportTicket,
  replySupportTicket,
  updateSupportTicket,
  assignSupportTicket,
  resolveSupportTicket,
  deleteSupportTicket,
} from '@/api/supportApi'
import type { SupportTicket, SupportTicketDetail, TicketActivity } from '@/types/operations'

vi.mock('@/api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockedApi = vi.mocked(apiClient, true)

beforeEach(() => {
  vi.clearAllMocks()
})

const ticket: SupportTicket = {
  id: 1,
  subject: 'مشكلة في تأكيد الدفع',
  status: 'new',
  full_name: 'محمد عبد الله',
  priority: 'high',
}

describe('fetchSupportTickets — list normalization', () => {
  it('handles the paginator shape and coerces string stats to numbers', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        data: { data: [ticket], meta: { current_page: 2, last_page: 4, per_page: 15, total: 50 } },
        stats: { total: '50', open: 12 },
      },
    })
    const out = await fetchSupportTickets({ status: 'new' })
    expect(mockedApi.get).toHaveBeenCalledWith('/operations/support-tickets', { params: { status: 'new' } })
    expect(out.data).toEqual([ticket])
    expect(out.meta).toEqual({ current_page: 2, last_page: 4, per_page: 15, total: 50 })
    expect(out.stats).toEqual({ total: 50, open: 12, unassigned: 0, resolved: 0, high: 0 })
  })

  it('handles a bare-array inner payload with empty meta', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: [ticket], stats: { high: 1 } } })
    const out = await fetchSupportTickets()
    expect(out.data).toEqual([ticket])
    expect(out.meta).toEqual({})
    expect(out.stats.high).toBe(1)
  })

  it('never derives NaN: garbage stats and missing payload normalize to zeros', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { stats: { total: 'abc', open: null } } })
    const out = await fetchSupportTickets()
    expect(out.data).toEqual([])
    expect(out.stats).toEqual({ total: 0, open: 0, unassigned: 0, resolved: 0, high: 0 })
    expect(out.meta).toEqual({})
  })

  it('handles a completely null body', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: null })
    const out = await fetchSupportTickets()
    expect(out).toEqual({
      data: [],
      stats: { total: 0, open: 0, unassigned: 0, resolved: 0, high: 0 },
      meta: {},
    })
  })

  it('propagates errors (no internal catch)', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('Network Error'))
    await expect(fetchSupportTickets()).rejects.toThrow('Network Error')
  })
})

describe('fetchSupportTicket — avatar normalization', () => {
  it('picks the first available avatar field for the assignee', async () => {
    const detail = {
      ...ticket,
      message: 'لم يصلني تأكيد الدفع',
      assigned_to: { id: 2, name: 'منى حسن', profile_photo_url: 'https://cdn.example.com/p.jpg' },
    } as unknown as SupportTicketDetail
    mockedApi.get.mockResolvedValueOnce({ data: { data: detail } })
    const out = await fetchSupportTicket(1)
    expect(mockedApi.get).toHaveBeenCalledWith('/operations/support-tickets/1')
    expect(out.assigned_to?.avatar).toBe('https://cdn.example.com/p.jpg')
  })

  it('sets avatar to null when the assignee has no avatar-ish field', async () => {
    const detail = { ...ticket, assigned_to: { id: 2, name: 'منى حسن' } } as SupportTicketDetail
    mockedApi.get.mockResolvedValueOnce({ data: { data: detail } })
    const out = await fetchSupportTicket(1)
    expect(out.assigned_to?.avatar).toBeNull()
  })

  it('does not crash for an unassigned ticket', async () => {
    const detail = { ...ticket, assigned_to: null } as SupportTicketDetail
    mockedApi.get.mockResolvedValueOnce({ data: { data: detail } })
    const out = await fetchSupportTicket(1)
    expect(out.assigned_to).toBeNull()
  })
})

describe('fetchSupportTicketAssignees', () => {
  it('maps raw users into AssigneeUser rows with avatar fallback chain', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        data: [
          { id: 2, name: 'منى حسن', email: 'mona@example.com', role: 'support', department: 'العمليات', active_tickets: 3, avatar_url: 'a.jpg' },
          { id: 3, name: 'خالد سعد', email: null, role: null, department: null },
        ],
      },
    })
    const out = await fetchSupportTicketAssignees()
    expect(mockedApi.get).toHaveBeenCalledWith('/operations/support-tickets/assignees')
    expect(out).toEqual([
      { id: 2, name: 'منى حسن', email: 'mona@example.com', role: 'support', department: 'العمليات', active_tickets: 3, avatar: 'a.jpg' },
      { id: 3, name: 'خالد سعد', email: null, role: null, department: null, active_tickets: undefined, avatar: null },
    ])
  })

  it('returns [] when the payload has no data array', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: {} })
    expect(await fetchSupportTicketAssignees()).toEqual([])
  })
})

describe('fetchTicketActivity', () => {
  it('returns the activity list', async () => {
    const activity: TicketActivity[] = [
      { id: 1, action: 'status_changed', user: { id: 2, name: 'منى حسن' }, created_at: '2026-03-01T10:00:00Z' },
    ]
    mockedApi.get.mockResolvedValueOnce({ data: { data: activity } })
    expect(await fetchTicketActivity(1)).toEqual(activity)
    expect(mockedApi.get).toHaveBeenCalledWith('/operations/support-tickets/1/activity')
  })

  it('falls back to [] on a missing payload', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: null })
    expect(await fetchTicketActivity(1)).toEqual([])
  })
})

describe('mutations', () => {
  it('submitSupportTicket posts the public form payload', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: {} })
    const payload = {
      full_name: 'محمد عبد الله',
      email: 'm@example.com',
      phone: '+201001234567',
      request_type: 'payment',
      subject: 'مشكلة في تأكيد الدفع',
      message: 'دفعت ولم يتم تفعيل التسجيل.',
    }
    await submitSupportTicket(payload)
    expect(mockedApi.post).toHaveBeenCalledWith('/support-tickets', payload)
  })

  it('replySupportTicket normalizes the email flags', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { email_queued: true, email_warning: 'SMTP بطيء' } })
    const out = await replySupportTicket(1, { message: 'تم حل المشكلة', is_internal_note: false })
    expect(mockedApi.post).toHaveBeenCalledWith('/operations/support-tickets/1/replies', {
      message: 'تم حل المشكلة',
      is_internal_note: false,
    })
    expect(out).toEqual({ email_queued: true, email_warning: 'SMTP بطيء' })
  })

  it('replySupportTicket defaults missing flags to false / null', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: {} })
    expect(await replySupportTicket(1, { message: 'ملاحظة داخلية' })).toEqual({
      email_queued: false,
      email_warning: null,
    })
  })

  it('updateSupportTicket patches partial fields', async () => {
    mockedApi.patch.mockResolvedValueOnce({ data: {} })
    await updateSupportTicket(1, { status: 'in_progress', assigned_to: 2 })
    expect(mockedApi.patch).toHaveBeenCalledWith('/operations/support-tickets/1', {
      status: 'in_progress',
      assigned_to: 2,
    })
  })

  it('assignSupportTicket patches the assign endpoint', async () => {
    mockedApi.patch.mockResolvedValueOnce({ data: {} })
    await assignSupportTicket(1, 2)
    expect(mockedApi.patch).toHaveBeenCalledWith('/operations/support-tickets/1/assign', { assigned_to: 2 })
  })

  it('resolveSupportTicket patches the resolve endpoint with no body', async () => {
    mockedApi.patch.mockResolvedValueOnce({ data: {} })
    await resolveSupportTicket(1)
    expect(mockedApi.patch).toHaveBeenCalledWith('/operations/support-tickets/1/resolve')
  })

  it('deleteSupportTicket calls DELETE', async () => {
    mockedApi.delete.mockResolvedValueOnce({ data: {} })
    await deleteSupportTicket(1)
    expect(mockedApi.delete).toHaveBeenCalledWith('/operations/support-tickets/1')
  })

  it('mutation errors propagate', async () => {
    mockedApi.patch.mockRejectedValueOnce(new Error('403'))
    await expect(resolveSupportTicket(1)).rejects.toThrow('403')
  })
})
