import { describe, it, expect, vi, beforeEach } from 'vitest'

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn() }))
vi.mock('@/api/axios', () => ({ default: api }))

import { ticketService } from '@/services/ticketService'

beforeEach(() => {
  Object.values(api).forEach((m) => m.mockReset())
  api.post.mockResolvedValue({ data: { success: true } })
})

describe('the ticket actions that show their own error', () => {
  it('complete-task does not let the interceptor toast as well (one toast, from the caller)', async () => {
    await ticketService.completeTask(5, new FormData())
    expect(api.post).toHaveBeenCalledWith('/v1/tickets/5/complete-task', expect.any(FormData), expect.objectContaining({ skipErrorToast: true }))
  })

  it.each([
    ['confirmReview', () => ticketService.confirmReview(5), '/v1/tickets/5/confirm-review'],
    ['markDeployed', () => ticketService.markDeployed(5, { live_url: 'https://emc.example' }), '/v1/tickets/5/mark-deployed'],
    ['verifyResolved', () => ticketService.verifyResolved(5, 'اختبار ناجح'), '/v1/tickets/5/verify-resolved'],
    ['verifyFailed', () => ticketService.verifyFailed(5, 'لا يعمل'), '/v1/tickets/5/verify-failed'],
    ['returnForRework', () => ticketService.returnForRework(5, 'سبب كافٍ'), '/v1/tickets/5/return-for-rework'],
  ])('%s posts to its endpoint with the toast skipped', async (_name, call, path) => {
    await call()
    expect(api.post).toHaveBeenCalledWith(path, expect.anything(), expect.objectContaining({ skipErrorToast: true }))
  })
})

describe('confirm-review sends no values, ever', () => {
  it('posts an EMPTY body (no size, points or durations), or only the note', async () => {
    await ticketService.confirmReview(5)
    expect(api.post).toHaveBeenLastCalledWith('/v1/tickets/5/confirm-review', {}, expect.objectContaining({ skipErrorToast: true }))
    await ticketService.confirmReview(5, undefined, 2)
    expect(api.post).toHaveBeenLastCalledWith('/v1/tickets/5/confirm-review', { review_round: 2 }, expect.objectContaining({ skipErrorToast: true }))
    await ticketService.confirmReview(5, '  ملاحظة  ')
    expect(api.post).toHaveBeenLastCalledWith('/v1/tickets/5/confirm-review', { note: 'ملاحظة' }, expect.objectContaining({ skipErrorToast: true }))
  })
})
