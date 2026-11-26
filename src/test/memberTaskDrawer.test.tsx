import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { AxiosError } from 'axios'

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() }))
vi.mock('@/api/axios', () => ({ default: http }))

const mocks = vi.hoisted(() => ({ getMyWork: vi.fn(), toastError: vi.fn(), toastSuccess: vi.fn() }))
vi.mock('@/services/ticketService', () => ({ ticketService: { getMyWork: mocks.getMyWork, acceptTask: vi.fn(), rejectTask: vi.fn() } }))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 7, name: 'سلمى' } }) }))
vi.mock('@/contexts/PageAccessContext', () => ({ usePageAccess: () => ({ canAccessPath: () => false }) }))
vi.mock('react-hot-toast', () => ({ default: { success: mocks.toastSuccess, error: mocks.toastError } }))
vi.mock('@/lib/toast', () => ({ default: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), message: vi.fn() } }))

import OpsTasksMyPage from '@/pages/operations/admin/OpsTasksMyPage'
import OpsTasksKanbanPage from '@/pages/operations/admin/OpsTasksKanbanPage'
import { acceptMyTask, commentOnMyTask, fetchMyTask, fetchMyTasks, setMyTaskStatus, toggleMyChecklist } from '@/api/tasksApi'
import { taskApiMessage } from '@/api/taskErrors'

const httpError = (status: number, data: unknown = {}) =>
  new AxiosError('Request failed', String(status), undefined, undefined, { status, statusText: '', headers: {}, config: {} as never, data })

/** A task as the server serializes it (TaskResource, with comments / checklist_items). */
const resource = (over: Record<string, unknown> = {}) => ({
  id: 12, title: 'تصميم منشور', description: 'وصف', priority: 'high', status: 'in_progress', acceptance_status: 'accepted', task_scope: 'medium', points: 100,
  estimated_hours: '2.00', due_date: '2099-01-01T00:00:00.000000Z', parent_task_id: null, department: { id: 3, name: 'الإعلام' }, assigned_to: { id: 7, name: 'سلمى' },
  comments: [{ id: 1, comment: 'ابدأ بالمسودة', user: { id: 2, name: 'مدير' }, created_at: '2026-11-20T10:00:00Z' }],
  checklist_items: [{ id: 5, title: 'خطوة أولى', is_completed: false, sort_order: 1 }],
  ...over,
})

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute('open') }
  Element.prototype.scrollIntoView ??= () => {}
})

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getMyWork.mockResolvedValue({ tickets: [], meta: { open_total: 0, closed_total: 0, truncated: false } })
})

describe('own-only task endpoints (the real api layer)', () => {
  it('reads one of the member\'s tasks in full, with the comments and checklist the server really sends', async () => {
    http.get.mockResolvedValue({ data: { success: true, data: resource() } })
    const t = await fetchMyTask(12)
    expect(http.get.mock.calls[0][0]).toBe('/my-work/tasks/12')
    expect(t.comments?.[0]).toMatchObject({ body: 'ابدأ بالمسودة', author_name: 'مدير' })
    expect(t.checklist?.[0]).toMatchObject({ id: 5, label: 'خطوة أولى', done: false })
  })

  it('comments with { comment }, ticks with { is_completed }, moves with PATCH /my-work/tasks/{id}/status', async () => {
    http.post.mockResolvedValue({ data: { success: true } })
    http.put.mockResolvedValue({ data: { success: true } })
    http.patch.mockResolvedValue({ data: { success: true } })
    await commentOnMyTask(12, 'تم')
    await toggleMyChecklist(12, 5, true)
    await setMyTaskStatus(12, 'needs_evaluation')
    expect(http.post.mock.calls[0].slice(0, 2)).toEqual(['/my-work/tasks/12/comments', { comment: 'تم' }])
    expect(http.put.mock.calls[0].slice(0, 2)).toEqual(['/my-work/tasks/12/checklist/5', { is_completed: true }])
    expect(http.patch.mock.calls[0].slice(0, 2)).toEqual(['/my-work/tasks/12/status', { status: 'needs_evaluation' }])
  })

  it('403 / 404 / 409 / 423 become Arabic, never the framework text', async () => {
    http.get.mockRejectedValue(httpError(403, { message: 'Forbidden' }))
    await expect(fetchMyTask(12)).rejects.toThrow('ليست لديك صلاحية لهذا الإجراء على هذه المهمة.')
    http.get.mockRejectedValue(httpError(404, { message: 'Not Found' }))
    await expect(fetchMyTask(12)).rejects.toThrow('هذه المهمة غير موجودة أو لم تعد مسندة إليك.')
    http.patch.mockRejectedValue(httpError(409, { message: 'Conflict' }))
    await expect(setMyTaskStatus(12, 'planning')).rejects.toThrow('اقبل المهمة أولًا قبل تحريك حالتها.')
    http.patch.mockRejectedValue(httpError(423, { message: 'Locked' }))
    await expect(setMyTaskStatus(12, 'planning')).rejects.toThrow('هذه المهمة مقفلة ولا يمكن تحريكها.')
    http.post.mockRejectedValue(httpError(409, { message: 'Conflict' }))
    await expect(acceptMyTask(12)).rejects.toThrow('لم تعد هذه المهمة بانتظار ردّك')
  })

  it('the server\'s own Arabic reason wins over the generic one', () => {
    expect(taskApiMessage(httpError(423, { message: 'هذه المهمة مقفلة ولا يمكن تحريكها.' }), 'x')).toBe('هذه المهمة مقفلة ولا يمكن تحريكها.')
    expect(taskApiMessage(httpError(403, { message: 'لا يمكن للعضو إكمال المهمة؛ انقلها إلى بانتظار التقييم.' }), 'x')).toBe('لا يمكن للعضو إكمال المهمة؛ انقلها إلى بانتظار التقييم.')
  })

  it('a validation error shows the Arabic field errors, never the English top-level message', () => {
    const e = httpError(422, { success: false, message: 'Validation failed.', errors: { comment: ['حقل التعليق مطلوب.'] } })
    expect(taskApiMessage(e, 'تعذّر')).toBe('حقل التعليق مطلوب.')
    expect(taskApiMessage(httpError(500, { message: 'Server Error' }), 'تعذّر الحفظ.')).toBe('تعذّر الحفظ.')
    expect(taskApiMessage(new AxiosError('Network Error'), 'x')).toContain('تعذّر الاتصال')
  })

  it('«مهامي» reads /my-work/tasks, the management lists do not', async () => {
    http.get.mockResolvedValue({ data: { success: true, data: [resource()], meta: { total: 1, truncated: false } } })
    await fetchMyTasks()
    expect(http.get.mock.calls[0][0]).toBe('/my-work/tasks')
  })
})

describe('«مهامي» drawer, as a plain member', () => {
  const mount = () => render(<MemoryRouter><OpsTasksMyPage /></MemoryRouter>)

  /** The list comes from /my-work/tasks; everything else the drawer asks for is answered here. */
  function serve(task: Record<string, unknown> = resource()) {
    http.get.mockImplementation(async (url: string) => {
      if (url === '/my-work/tasks') return { data: { success: true, data: [task], meta: { total: 1, truncated: false } } }
      if (url === `/my-work/tasks/${task.id}`) return { data: { success: true, data: task } }
      throw httpError(403, { message: 'Forbidden' }) // any management endpoint
    })
  }

  async function openDrawer() {
    mount()
    await userEvent.click(await screen.findByRole('button', { name: /تصميم منشور/ }))

    return screen.findByRole('complementary')
  }

  it('opens from the own-only endpoint: no management call, no Forbidden toast', async () => {
    serve()
    const drawer = await openDrawer()
    expect(await within(drawer).findByText('ابدأ بالمسودة')).toBeInTheDocument()
    expect(within(drawer).getByText('خطوة أولى')).toBeInTheDocument()
    const urls = http.get.mock.calls.map((c) => c[0])
    expect(urls).toContain('/my-work/tasks/12')
    expect(urls.some((u) => String(u).startsWith('/operations/tasks'))).toBe(false)
    expect(mocks.toastError).not.toHaveBeenCalled()
  })

  it('does not offer priority edits; the status offers no «مكتملة»', async () => {
    serve()
    const drawer = await openDrawer()
    await within(drawer).findByText('ابدأ بالمسودة')
    expect(within(drawer).getByTestId('priority-readonly')).toHaveTextContent('مرتفعة')
    expect(within(drawer).queryByRole('combobox', { name: 'الأولوية' })).not.toBeInTheDocument()
    const status = within(drawer).getByRole('combobox', { name: 'الحالة' })
    const options = within(status).getAllByRole('option').map((o) => o.textContent)
    expect(options).not.toContain('مكتملة')
    expect(options).toContain('بحاجة لتقييم')
  })

  it('moving the stage uses the own-only status endpoint', async () => {
    serve()
    http.patch.mockResolvedValue({ data: { success: true } })
    const drawer = await openDrawer()
    await userEvent.selectOptions(within(drawer).getByRole('combobox', { name: 'الحالة' }), 'needs_evaluation')
    await waitFor(() => expect(http.patch).toHaveBeenCalled())
    expect(http.patch.mock.calls[0].slice(0, 2)).toEqual(['/my-work/tasks/12/status', { status: 'needs_evaluation' }])
  })

  it('a refused move says why in Arabic (423 locked) and puts the old stage back', async () => {
    serve()
    http.patch.mockRejectedValue(httpError(423, { message: 'Locked' }))
    const drawer = await openDrawer()
    await userEvent.selectOptions(within(drawer).getByRole('combobox', { name: 'الحالة' }), 'needs_evaluation')
    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith('هذه المهمة مقفلة ولا يمكن تحريكها.'))
    expect((within(drawer).getByRole('combobox', { name: 'الحالة' }) as HTMLSelectElement).value).toBe('in_progress')
  })

  it('a completed task: the status is read-only, with a hint', async () => {
    serve(resource({ status: 'completed' }))
    const drawer = await openDrawer()
    await within(drawer).findByText('ابدأ بالمسودة')
    expect(within(drawer).queryByRole('combobox', { name: 'الحالة' })).not.toBeInTheDocument()
    expect(within(drawer).getByTestId('status-readonly')).toHaveTextContent('مكتملة')
    expect(within(drawer).getByTestId('status-hint')).toHaveTextContent('ولا يغيّر العضو حالتها')
  })

  it('comments through the own-only endpoint', async () => {
    serve()
    http.post.mockResolvedValue({ data: { success: true } })
    const drawer = await openDrawer()
    await userEvent.type(await within(drawer).findByPlaceholderText('أضف تعليقاً...'), 'تم الإنجاز')
    await userEvent.click(within(drawer).getByRole('button', { name: 'إرسال' }))
    await waitFor(() => expect(http.post).toHaveBeenCalled())
    expect(http.post.mock.calls[0].slice(0, 2)).toEqual(['/my-work/tasks/12/comments', { comment: 'تم الإنجاز' }])
  })

  it('a failed comment says so in Arabic and is NOT shown as if it were saved', async () => {
    serve()
    http.post.mockRejectedValue(httpError(403, { message: 'Forbidden' }))
    const drawer = await openDrawer()
    await userEvent.type(await within(drawer).findByPlaceholderText('أضف تعليقاً...'), 'لن يُحفظ')
    await userEvent.click(within(drawer).getByRole('button', { name: 'إرسال' }))
    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith('ليست لديك صلاحية لهذا الإجراء على هذه المهمة.'))
    expect(within(drawer).queryByText('لن يُحفظ')).not.toBeInTheDocument()
  })

  it('ticks a checklist item through the own-only endpoint', async () => {
    serve()
    http.put.mockResolvedValue({ data: { success: true } })
    const drawer = await openDrawer()
    await userEvent.click(await within(drawer).findByRole('checkbox', { name: 'خطوة أولى' }))
    await waitFor(() => expect(http.put).toHaveBeenCalled())
    expect(http.put.mock.calls[0].slice(0, 2)).toEqual(['/my-work/tasks/12/checklist/5', { is_completed: true }])
  })

  it('a task that is no longer theirs (404) is explained in Arabic, with the row snapshot kept', async () => {
    http.get.mockImplementation(async (url: string) => {
      if (url === '/my-work/tasks') return { data: { success: true, data: [resource()], meta: { total: 1, truncated: false } } }
      throw httpError(404, { message: 'Not Found' })
    })
    mount()
    await userEvent.click(await screen.findByRole('button', { name: /تصميم منشور/ }))
    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith('هذه المهمة غير موجودة أو لم تعد مسندة إليك.'))
  })

  it('a task waiting for the member\'s answer cannot be moved: read-only status, accept first', async () => {
    serve(resource({ acceptance_status: 'pending', status: 'planning' }))
    mocks.toastError.mockClear()
    mount()
    await userEvent.click(within(await screen.findByTestId('work-item')).getAllByRole('button')[0])
    const drawer = await screen.findByRole('complementary')
    expect(await within(drawer).findByTestId('status-hint')).toHaveTextContent('اقبل المهمة أولًا')
  })
})

describe('the management pages keep the management endpoints and editable details', () => {
  it('opening a task on the management kanban reads /operations/tasks/{id} and offers the priority control', async () => {
    http.get.mockImplementation(async (url: string) => {
      if (url === '/operations/board') return { data: { success: true, data: { in_progress: [resource()] } } }
      if (url === '/operations/tasks/12') return { data: { success: true, data: resource() } }
      throw httpError(404)
    })
    render(<MemoryRouter><OpsTasksKanbanPage /></MemoryRouter>)
    await userEvent.click(await screen.findByRole('button', { name: /تصميم منشور/ }))
    const drawer = await screen.findByRole('complementary')
    expect(await within(drawer).findByRole('combobox', { name: 'الأولوية' })).toBeInTheDocument()
    expect(http.get.mock.calls.map((c) => c[0])).toContain('/operations/tasks/12')
    const status = within(drawer).getByRole('combobox', { name: 'الحالة' })
    // the manager picks among the statuses the server accepts by hand: «مكتملة» and «بانتظار الاعتماد» are the evaluation's and the HR approval's results
    const labels = within(status).getAllByRole('option').map((o) => o.textContent)
    expect(labels).toContain('بحاجة لتقييم')
    expect(labels).not.toContain('مكتملة')
    expect(labels).not.toContain('بانتظار الاعتماد')
  })
})

