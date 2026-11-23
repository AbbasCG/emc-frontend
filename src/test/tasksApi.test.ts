import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AxiosError } from 'axios'

const http = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn(), post: vi.fn() }))
vi.mock('@/api/axios', () => ({ default: http }))

import { acceptMyTask, fetchMyTasks, fetchTasks, rejectMyTask, updateTask } from '@/api/tasksApi'
import { normalizeOpsTask, normalizeTaskPriority, serverTaskPriority } from '@/api/normalizers/opsTask'

const resource = {
  id: 4, title: 'مهمة', description: null, priority: 'urgent', task_scope: 'medium', points: 100, estimated_hours: '2.50',
  status: 'needs_evaluation', acceptance_status: 'accepted', due_date: '2026-11-30', parent_task_id: 2,
  department: { id: 9, name: 'الإعلام' }, assigned_to: { id: 7, name: 'سلمى' }, checklist_items: [{ id: 1, label: 'خطوة', done: true }],
}

const forbidden = () => new AxiosError('no', '403', undefined, undefined, { status: 403, statusText: '', headers: {}, config: {} as never, data: {} })
const serverDown = () => new AxiosError('no', '500', undefined, undefined, { status: 500, statusText: '', headers: {}, config: {} as never, data: {} })

beforeEach(() => vi.clearAllMocks())

describe('normalizeOpsTask', () => {
  it('reads the fields the server really sends', () => {
    const t = normalizeOpsTask(resource)
    expect(t).toMatchObject({
      id: 4, status: 'needs_evaluation', priority: 'critical', department_id: '9', department_name: 'الإعلام',
      assignee_id: 7, assignee_name: 'سلمى', due_at: '2026-11-30', task_scope: 'medium', points: 100, estimated_hours: 2.5,
      acceptance_status: 'accepted', parent_task_id: 2, checklist_total: 1, checklist_done: 1,
    })
  })

  it('priority urgent <-> critical', () => {
    expect(normalizeTaskPriority('urgent')).toBe('critical')
    expect(serverTaskPriority('critical')).toBe('urgent')
    expect(serverTaskPriority('high')).toBe('high')
  })

  it('an unknown status is kept visible (planning), not lost', () => {
    expect(normalizeOpsTask({ id: 1, status: 'weird' }).status).toBe('planning')
  })
})

describe('fetchMyTasks: the own-only endpoint, the same for every role', () => {
  it('reads the own tasks in every acceptance state, with the server meta', async () => {
    http.get.mockResolvedValue({ data: { success: true, data: [resource, { ...resource, id: 5, acceptance_status: 'pending' }], meta: { total: 2, truncated: false } } })
    const out = await fetchMyTasks()
    expect(http.get).toHaveBeenCalledTimes(1)
    expect(http.get.mock.calls[0][0]).toBe('/my-work/tasks')
    expect(out.tasks.map((t) => t.acceptance_status)).toEqual(['accepted', 'pending'])
    expect(out).toMatchObject({ total: 2, truncated: false })
  })

  it('reports a capped list', async () => {
    http.get.mockResolvedValue({ data: { success: true, data: [resource], meta: { total: 450, truncated: true } } })
    expect(await fetchMyTasks()).toMatchObject({ total: 450, truncated: true })
  })

  it('a 403 is an error now, not a silent fallback to another endpoint', async () => {
    http.get.mockRejectedValue(forbidden())
    await expect(fetchMyTasks()).rejects.toBeTruthy()
    expect(http.get).toHaveBeenCalledTimes(1)
  })

  it('any other failure is thrown, never turned into an empty list', async () => {
    http.get.mockRejectedValue(serverDown())
    await expect(fetchMyTasks()).rejects.toBeTruthy()
  })

  it('accept and decline go to the own-only endpoints', async () => {
    http.post.mockResolvedValue({ data: { success: true } })
    await acceptMyTask(4)
    await rejectMyTask(4, 'ضغط مهام')
    expect(http.post.mock.calls[0][0]).toBe('/my-work/tasks/4/accept')
    expect(http.post.mock.calls[1]).toEqual(['/my-work/tasks/4/reject', { reason: 'ضغط مهام' }])
  })
})

describe('fetchTasks (management)', () => {
  it('all = every task of the board, flattened from its columns', async () => {
    http.get.mockResolvedValue({ data: { success: true, data: { idea: [{ ...resource, id: 1, status: 'idea' }], completed: [{ ...resource, id: 2, status: 'completed' }] } } })
    const out = await fetchTasks({ scope: 'all' })
    expect(http.get.mock.calls[0][0]).toBe('/operations/board')
    expect(out.map((t) => t.status)).toEqual(['idea', 'completed'])
  })

  it('overdue uses the server overdue rule, tolerating the paginated shape', async () => {
    http.get.mockResolvedValue({ data: { success: true, data: { data: [resource] } } })
    const out = await fetchTasks({ scope: 'overdue' })
    expect(http.get.mock.calls[0][0]).toBe('/admin/tasks/overdue')
    expect(out).toHaveLength(1)
  })
})

describe('updateTask', () => {
  it('sends the server priority vocabulary', async () => {
    http.patch.mockResolvedValue({ data: { success: true, data: resource } })
    await updateTask(4, { priority: 'critical', status: 'in_progress' })
    expect(http.patch.mock.calls[0][1]).toEqual({ priority: 'urgent', status: 'in_progress' })
  })
})
