import { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import apiClient from '@/api/axios'
import OpsConsultantApplicationsPage from '@/pages/operations/admin/OpsConsultantApplicationsPage'

vi.mock('@/api/axios', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() } }))
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn() }))
vi.mock('react-hot-toast', () => ({ default: toastMock }))
vi.mock('@/lib/toast', () => ({ default: toastMock }))

const get = vi.mocked(apiClient.get)
const put = vi.mocked(apiClient.put)

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute('open') }
})

function httpError(status: number) {
  const config = { headers: {} } as InternalAxiosRequestConfig
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, {}, { status, statusText: '', headers: {}, config, data: { message: 'Forbidden' } })
}
const row = (over: Record<string, unknown> = {}) => ({
  id: 4, full_name: 'سارة المستشارة', email: 'sara@example.com', phone: null, country: null, city: null, specialty: 'البيانات',
  desired_department: 'التقنية', years_experience: 5, linkedin_url: null, motivation: null, availability: null, status: 'new',
  reviewer_note: null, cv_view_url: null, created_at: '2026-10-01T09:00:00Z', ...over,
})
const list = (rows: unknown[], meta: Record<string, unknown> = {}) => () => ({ data: { data: { data: rows, total: rows.length }, meta: { counts: {}, ...meta } } })
const mount = (entry = '/x') => render(<MemoryRouter initialEntries={[entry]}><OpsConsultantApplicationsPage /></MemoryRouter>)
const STATUS_BUTTONS = ['مقابلة', 'مقبول', 'مرفوض', 'قيد المراجعة']
const statusButtonsIn = (root: HTMLElement) => STATUS_BUTTONS.filter((n) => within(root).queryByRole('button', { name: n }))

function route(listAnswer: () => unknown, showAnswer?: () => unknown) {
  get.mockImplementation(((url: string) => Promise.resolve().then(/consultant-applications\/\d+/.test(String(url)) && showAnswer ? showAnswer : listAnswer)) as never)
}

describe('consultant applications: status actions follow the server flag', () => {
  beforeEach(() => { get.mockReset(); put.mockReset(); vi.clearAllMocks() })

  it('a row without can_update_status (and no meta flag) shows no status buttons in the list or the window', async () => {
    route(list([row()]))
    mount('/x?view=4')
    const dlg = await screen.findByTestId('consultant-application-modal')
    expect(statusButtonsIn(dlg)).toEqual([])
    expect(screen.getByLabelText(/ملاحظة المراجعة/)).toBeDisabled()
    expect(screen.getByRole('button', { name: 'عرض التفاصيل' })).toBeInTheDocument()
    expect(within(screen.getByRole('table')).queryAllByRole('button', { name: 'مقابلة' })).toHaveLength(0)
  })

  it('can_update_status true on the row shows the buttons in the list and the window', async () => {
    route(list([row({ can_update_status: true })]))
    mount('/x?view=4')
    const dlg = await screen.findByTestId('consultant-application-modal')
    expect(statusButtonsIn(dlg)).toEqual(STATUS_BUTTONS)
    expect(within(screen.getByRole('table')).getAllByRole('button', { name: 'مقابلة' })).toHaveLength(1)
  })

  it('the row flag wins over meta.can_update_status; meta alone covers a row without the flag', async () => {
    route(list([row({ id: 1, full_name: 'أ', can_update_status: false }), row({ id: 2, full_name: 'ب' })], { can_update_status: true }))
    mount()
    await screen.findByText('ب')
    // only the second row (meta fallback) has the "interview" button
    expect(within(screen.getByRole('table')).getAllByRole('button', { name: 'مقابلة' })).toHaveLength(1)
  })

  it('a record fetched by id carries its own flag into the window', async () => {
    route(list([]), () => ({ data: { data: row({ id: 9, can_update_status: true }) } }))
    mount('/x?view=9')
    const dlg = await screen.findByTestId('consultant-application-modal')
    expect(statusButtonsIn(dlg)).toEqual(STATUS_BUTTONS)
  })

  it('a 403 on a status update is an Arabic permission message, not the generic failure', async () => {
    route(list([row({ can_update_status: true })]))
    put.mockRejectedValue(httpError(403))
    mount()
    await screen.findByRole('table')
    await userEvent.click(within(screen.getByRole('table')).getByRole('button', { name: 'مقابلة' }))
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('لا تملك صلاحية تغيير حالة طلبات الاستشاريين.'))
    expect(toastMock.error).toHaveBeenCalledTimes(1)
    expect(put).toHaveBeenCalledWith('/admin/consultant-applications/4/status', expect.anything(), expect.objectContaining({ skipErrorToast: true }))
  })

  it('a 403 on a status update from the window shows the same Arabic message', async () => {
    route(list([row({ can_update_status: true })]))
    put.mockRejectedValue(httpError(403))
    mount('/x?view=4')
    const dlg = await screen.findByTestId('consultant-application-modal')
    await userEvent.click(within(dlg).getByRole('button', { name: 'مقبول' }))
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('لا تملك صلاحية تغيير حالة طلبات الاستشاريين.'))
  })
})

describe('consultant applications: load states', () => {
  beforeEach(() => { get.mockReset(); vi.clearAllMocks() })

  it('403 on the list: Arabic permission message only, no empty text, no toast, no retry', async () => {
    route(() => { throw httpError(403) })
    mount()
    expect(await screen.findByText('لا تملك صلاحية عرض طلبات الاستشاريين. اطلب منح «عرض طلبات الاستشاريين».')).toBeInTheDocument()
    expect(screen.queryByText('لا توجد طلبات مطابقة بعد')).toBeNull()
    expect(screen.getAllByRole('alert')).toHaveLength(1)
    expect(screen.queryByRole('button', { name: 'إعادة المحاولة' })).toBeNull()
    expect(toastMock.error).not.toHaveBeenCalled()
    expect(get).toHaveBeenCalledWith('/admin/consultant-applications', expect.objectContaining({ skipErrorToast: true }))
  })

  it('network failure: retry state (not the empty text); retry re-requests and recovers', async () => {
    let calls = 0
    route(() => { calls += 1; if (calls === 1) throw new AxiosError('Network Error', 'ERR_NETWORK'); return list([row()])() })
    mount()
    await userEvent.click(await screen.findByRole('button', { name: 'إعادة المحاولة' }))
    expect(await screen.findByText('سارة المستشارة')).toBeInTheDocument()
    expect(calls).toBe(2)
    expect(toastMock.error).not.toHaveBeenCalled()
  })

  it('the empty text appears only after a successful empty answer', async () => {
    route(list([]))
    mount()
    expect(await screen.findByText('لا توجد طلبات مطابقة بعد')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
