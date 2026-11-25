import { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import apiClient from '@/api/axios'
import HrTasksPage from '@/pages/hr/HrTasksPage'

vi.mock('@/api/axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))
const auth = vi.hoisted(() => ({ user: { id: 100 } as { id: number } | null }))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: auth.user }) }))

const get = vi.mocked(apiClient.get)

const EMPTY_TITLE = 'لا توجد مهام بانتظار الاعتماد حاليًا'
const FORBIDDEN_TEXT = /لا تملك صلاحية عرض مهام الموارد البشرية/
const task = { id: 5, title: 'مهمة كبيرة', task_scope: 'large', points: 10, estimated_hours: 4, assigned_to: { name: 'علي' }, department: { name: 'الإعلام' } }

function httpError(status: number) {
  const config = { headers: {} } as InternalAxiosRequestConfig
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, {}, { status, statusText: '', headers: {}, config, data: { message: 'Forbidden' } })
}
const networkError = () => new AxiosError('Network Error', 'ERR_NETWORK')

function route(pending: () => Promise<unknown>, all: () => Promise<unknown> = async () => ({ data: { data: [] } })) {
  get.mockImplementation(((url: string) => {
    const u = String(url)
    if (u.includes('pending-hr-approval')) return pending()
    if (u.includes('/operations/tasks')) return all()
    return Promise.resolve({ data: {} })
  }) as never)
}
const renderPage = () => render(<MemoryRouter><HrTasksPage /></MemoryRouter>)

describe('HrTasksPage load states', () => {
  beforeEach(() => { get.mockReset(); auth.user = { id: 100 } })

  it('empty success shows only the empty message', async () => {
    route(async () => ({ data: { data: [] } }))
    renderPage()
    expect(await screen.findByText(EMPTY_TITLE)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('success with items shows the list and no empty text', async () => {
    route(async () => ({ data: { data: [task] } }))
    renderPage()
    expect(await screen.findByText('مهمة كبيرة')).toBeInTheDocument()
    expect(screen.queryByText(EMPTY_TITLE)).toBeNull()
  })

  it('403 shows one Arabic permission message, no empty text, no retry, and the request opts out of the global toast', async () => {
    route(async () => { throw httpError(403) })
    renderPage()
    expect(await screen.findByText(FORBIDDEN_TEXT)).toBeInTheDocument()
    expect(screen.getAllByRole('alert')).toHaveLength(1)
    expect(screen.queryByText(EMPTY_TITLE)).toBeNull()
    expect(screen.queryByText(/Forbidden/)).toBeNull()
    expect(screen.queryByRole('button', { name: 'إعادة المحاولة' })).toBeNull()
    expect(get).toHaveBeenCalledWith('/admin/tasks/pending-hr-approval', expect.objectContaining({ skipErrorToast: true }))
  })

  it.each([['network', networkError], ['500', () => httpError(500)]])('%s failure shows a retry state that re-requests and recovers', async (_n, make) => {
    let calls = 0
    route(async () => { calls += 1; if (calls === 1) throw make(); return { data: { data: [task] } } })
    renderPage()
    const retry = await screen.findByRole('button', { name: 'إعادة المحاولة' })
    expect(screen.getAllByRole('alert')).toHaveLength(1)
    expect(screen.queryByText(EMPTY_TITLE)).toBeNull()
    await userEvent.click(retry)
    expect(await screen.findByText('مهمة كبيرة')).toBeInTheDocument()
    expect(calls).toBe(2)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('log tab: 403, retryable failure, empty and list are distinct', async () => {
    route(async () => ({ data: { data: [] } }), async () => { throw httpError(403) })
    renderPage()
    await screen.findByText(EMPTY_TITLE)
    await userEvent.click(screen.getByRole('button', { name: 'سجل المهام العام' }))
    expect(await screen.findByText(FORBIDDEN_TEXT)).toBeInTheDocument()
    expect(screen.queryByText('لا توجد مهام في السجل حاليًا')).toBeNull()
    expect(screen.queryByRole('button', { name: 'إعادة المحاولة' })).toBeNull()
  })

  it('log tab: network failure retries, then shows the empty message or rows', async () => {
    let calls = 0
    route(async () => ({ data: { data: [] } }), async () => { calls += 1; if (calls === 1) throw networkError(); return { data: { data: [] } } })
    renderPage()
    await screen.findByText(EMPTY_TITLE)
    await userEvent.click(screen.getByRole('button', { name: 'سجل المهام العام' }))
    await userEvent.click(await screen.findByRole('button', { name: 'إعادة المحاولة' }))
    await waitFor(() => expect(screen.getByText('لا توجد مهام في السجل حاليًا')).toBeInTheDocument())
    expect(get).toHaveBeenCalledWith('/operations/tasks', expect.objectContaining({ skipErrorToast: true }))
  })

  it('log tab reads the nested assignee and department and shows Arabic status labels', async () => {
    route(async () => ({ data: { data: [] } }), async () => ({
      data: { data: [
        { id: 1, title: 'م1', status: 'waiting_approval', assigned_to: { id: 7, name: 'سلمى' }, department: { id: 2, name: 'الإعلام' }, points: 5, estimated_hours: 2 },
        { id: 2, title: 'م2', status: 'in_progress', assignee_name: 'خالد', department_name: 'التقنية' },
        { id: 3, title: 'م3', status: 'mystery_state' },
      ] },
    }))
    renderPage()
    await screen.findByText(EMPTY_TITLE)
    await userEvent.click(screen.getByRole('button', { name: 'سجل المهام العام' }))
    const table = await screen.findByRole('table')
    const rows = within(table).getAllByRole('row')
    expect(rows[1]).toHaveTextContent('سلمى')
    expect(rows[1]).toHaveTextContent('الإعلام')
    expect(rows[1]).toHaveTextContent('بانتظار الاعتماد')
    expect(rows[1]).not.toHaveTextContent('waiting_approval')
    expect(rows[2]).toHaveTextContent('خالد')
    expect(rows[2]).toHaveTextContent('التقنية')
    expect(rows[2]).toHaveTextContent('قيد التنفيذ')
    // an unknown status is shown as its raw key, not mislabelled
    expect(rows[3]).toHaveTextContent('mystery_state')
  })

  it('hides the approve button on a task assigned to the current user, keeps it on others', async () => {
    auth.user = { id: 100 }
    route(async () => ({ data: { data: [
      { ...task, id: 5, title: 'مسندة لي', assigned_to: { id: 100, name: 'أنا' } },
      { ...task, id: 6, title: 'لغيري', assigned_to: { id: 8, name: 'علي' } },
    ] } }))
    renderPage()
    await screen.findByText('مسندة لي')
    expect(screen.getAllByRole('button', { name: /اعتماد المهمة/ })).toHaveLength(1)
    expect(screen.getByText('هذه المهمة مسندة إليك، لذلك لا يمكنك اعتمادها.')).toBeInTheDocument()
  })
})
