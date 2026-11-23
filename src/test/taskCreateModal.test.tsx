import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'

const api = vi.hoisted(() => ({
  createAdvancedBoardTask: vi.fn(),
  fetchWorkspaceDepartments: vi.fn(),
  fetchDepartmentMembers: vi.fn(),
}))
vi.mock('@/api/operationsBoardApi', () => ({ createAdvancedBoardTask: api.createAdvancedBoardTask }))
vi.mock('@/api/operationsApi', () => ({ fetchWorkspaceDepartments: api.fetchWorkspaceDepartments }))
vi.mock('@/api/operationsReportsApi', () => ({ fetchDepartmentMembers: api.fetchDepartmentMembers }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

import TaskCreateModal from '@/components/operations/TaskCreateModal'

function mount(onClose = vi.fn(), onCreated = vi.fn()) {
  render(<TaskCreateModal open onClose={onClose} onCreated={onCreated} />)

  return { onClose, onCreated }
}

const scope = () => screen.getByLabelText(/حجم المهمة/) as HTMLSelectElement
const points = () => screen.getByLabelText(/نقاط المهمة/) as HTMLInputElement
const duration = () => screen.getByLabelText('المدة التقريبية') as HTMLInputElement

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute('open') }
})

beforeEach(() => {
  vi.clearAllMocks()
  api.fetchWorkspaceDepartments.mockResolvedValue({ items: [{ id: '3', title: 'الإعلام' }] })
  api.fetchDepartmentMembers.mockResolvedValue([])
  api.createAdvancedBoardTask.mockResolvedValue({})
})

describe('TaskCreateModal: same behaviour on the shared estimate fields', () => {
  it('starts as a simple task of 25 points and 2 hours, with the scope range card', async () => {
    mount()
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(scope().value).toBe('simple')
    expect(points().value).toBe('25')
    expect(duration().value).toBe('2')
    expect(screen.getByTestId('scope-card')).toHaveTextContent('النطاق المعتمد: 25 - 50 نقطة')
  })

  it('choosing a size fills the points with its minimum and shows its range', async () => {
    mount()
    await userEvent.selectOptions(scope(), 'medium')
    expect(points().value).toBe('75')
    expect(screen.getByTestId('scope-card')).toHaveTextContent('75 - 150')
    await userEvent.selectOptions(scope(), 'large')
    expect(points().value).toBe('200')
    expect(screen.getByTestId('scope-card')).toHaveTextContent('200 - 300')
  })

  it('strategic is open: the exceptional switch appears and accepts any value from 300', async () => {
    api.createAdvancedBoardTask.mockResolvedValue({})
    const { onCreated } = mount()
    await userEvent.type(screen.getByLabelText(/عنوان المهمة/), 'مبادرة')
    await userEvent.selectOptions(scope(), 'strategic')
    expect(points().value).toBe('300')
    await userEvent.click(screen.getByLabelText('أثر استثنائي (مفتوح)'))
    await userEvent.clear(points())
    await userEvent.type(points(), '900')
    await userEvent.click(screen.getByRole('button', { name: /إسناد المهمة الآن/ }))
    await waitFor(() => expect(onCreated).toHaveBeenCalled())
    const form = api.createAdvancedBoardTask.mock.calls[0][0] as FormData
    expect(form.get('task_scope')).toBe('strategic')
    expect(form.get('points')).toBe('900')
  })

  it('minutes are converted to decimal hours; hours are sent as typed', async () => {
    mount()
    await userEvent.type(screen.getByLabelText(/عنوان المهمة/), 'مهمة')
    await userEvent.click(screen.getByRole('button', { name: 'دقائق' }))
    await userEvent.clear(duration())
    await userEvent.type(duration(), '30')
    await userEvent.click(screen.getByRole('button', { name: /إسناد المهمة الآن/ }))
    await waitFor(() => expect(api.createAdvancedBoardTask).toHaveBeenCalled())
    const form = api.createAdvancedBoardTask.mock.calls[0][0] as FormData
    expect(form.get('estimated_hours')).toBe('0.5')
    expect(form.get('points')).toBe('25')
    expect(form.get('priority')).toBe('medium')
  })

  it('the «حرجة» priority is sent as the server\'s urgent', async () => {
    mount()
    await userEvent.type(screen.getByLabelText(/عنوان المهمة/), 'مهمة')
    await userEvent.selectOptions(screen.getByLabelText('الأولوية'), 'critical')
    await userEvent.click(screen.getByRole('button', { name: /إسناد المهمة الآن/ }))
    await waitFor(() => expect(api.createAdvancedBoardTask).toHaveBeenCalled())
    expect((api.createAdvancedBoardTask.mock.calls[0][0] as FormData).get('priority')).toBe('urgent')
  })

  it('points outside the size range are refused before any request, under the field', async () => {
    mount()
    await userEvent.type(screen.getByLabelText(/عنوان المهمة/), 'مهمة')
    await userEvent.clear(points())
    await userEvent.type(points(), '60')
    await userEvent.click(screen.getByRole('button', { name: /إسناد المهمة الآن/ }))
    expect(api.createAdvancedBoardTask).not.toHaveBeenCalled()
    expect(await screen.findByText('النقاط لهذا الحجم يجب أن تكون بين 25 و 50 نقطة')).toBeInTheDocument()
    expect(points()).toHaveAttribute('aria-invalid', 'true')
  })

  it('a server 422 on the points shows under the points field', async () => {
    api.createAdvancedBoardTask.mockRejectedValue(
      new AxiosError('x', '422', undefined, undefined, { status: 422, statusText: '', headers: {}, config: {} as never, data: { success: false, message: 'x', errors: { points: ['النقاط خارج النطاق المسموح.'] } } }),
    )
    mount()
    await userEvent.type(screen.getByLabelText(/عنوان المهمة/), 'مهمة')
    await userEvent.click(screen.getByRole('button', { name: /إسناد المهمة الآن/ }))
    expect(await screen.findByText('النقاط خارج النطاق المسموح.')).toBeInTheDocument()
  })
})

describe('TaskCreateModal: one scroll area, pinned footer, keyboard', () => {
  it('has exactly one scroll container; the header and the action footer are outside it', async () => {
    mount()
    const dialog = await screen.findByRole('dialog')
    const scrollers = dialog.querySelectorAll('.overflow-y-auto')
    expect(scrollers).toHaveLength(1)
    const submit = screen.getByRole('button', { name: /إسناد المهمة الآن/ })
    const footer = submit.closest('footer')
    expect(footer).not.toBeNull()
    expect(scrollers[0].contains(footer)).toBe(false)
    expect(within(footer as HTMLElement).getByRole('button', { name: 'إلغاء' })).toBeInTheDocument()
    expect(dialog.querySelector('header')).not.toBeNull()
    expect(scrollers[0].contains(dialog.querySelector('header'))).toBe(false)
    // the footer button still submits the form that lives in the scroll area
    expect(submit).toHaveAttribute('form', 'task-create-form')
    expect(document.getElementById('task-create-form')).not.toBeNull()
  })

  it('Escape closes it, and focus is inside the dialog', async () => {
    const { onClose } = mount()
    const dialog = await screen.findByRole('dialog')
    expect(dialog.contains(document.activeElement)).toBe(true)
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('asks before throwing away what was typed', async () => {
    const { onClose } = mount()
    await userEvent.type(screen.getByLabelText(/عنوان المهمة/), 'مسودة')
    await userEvent.keyboard('{Escape}')
    expect(onClose).not.toHaveBeenCalled()
    expect(await screen.findByText('تجاهل التغييرات؟')).toBeInTheDocument()
  })
})
