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
    ['approveCompletion', () => ticketService.approveCompletion(5, { actual_minutes: 75 }), '/v1/tickets/5/approve-completion'],
    ['approveForDeploy', () => ticketService.approveForDeploy(5, { task_scope: 'medium', task_points: 100, actual_minutes: 75 }), '/v1/tickets/5/approve-for-deploy'],
    ['markDeployed', () => ticketService.markDeployed(5, { live_url: 'https://emc.example' }), '/v1/tickets/5/mark-deployed'],
    ['verifyResolved', () => ticketService.verifyResolved(5, 'اختبار ناجح'), '/v1/tickets/5/verify-resolved'],
    ['verifyFailed', () => ticketService.verifyFailed(5, 'لا يعمل'), '/v1/tickets/5/verify-failed'],
    ['returnForRework', () => ticketService.returnForRework(5, 'سبب كافٍ'), '/v1/tickets/5/return-for-rework'],
  ])('%s posts to its endpoint with the toast skipped', async (_name, call, path) => {
    await call()
    expect(api.post).toHaveBeenCalledWith(path, expect.anything(), expect.objectContaining({ skipErrorToast: true }))
  })
})
