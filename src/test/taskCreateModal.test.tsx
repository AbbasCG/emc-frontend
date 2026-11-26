import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'

const api = vi.hoisted(() => ({
  createAdvancedBoardTask: vi.fn(),
  scopeDepartments: vi.fn(),
  scopeMembers: vi.fn(),
  editable: vi.fn(),
  update: vi.fn(),
}))
vi.mock('@/api/operationsBoardApi', () => ({ createAdvancedBoardTask: api.createAdvancedBoardTask }))
// The form reads ONLY the task-scope endpoints (what this viewer may write to), never the role-gated department readers.
vi.mock('@/api/taskScopeApi', () => ({
  fetchTaskScopeDepartments: api.scopeDepartments,
  fetchTaskScopeMembers: api.scopeMembers,
  fetchEditableTask: api.editable,
  updateTaskFields: api.update,
}))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

import toast from 'react-hot-toast'
import TaskCreateModal from '@/components/operations/TaskCreateModal'

function mount(onClose = vi.fn(), onCreated = vi.fn(), extra: { canAssign?: boolean; editTaskId?: number | null } = {}) {
  render(<TaskCreateModal open onClose={onClose} onCreated={onCreated} canAssign {...extra} />)

  return { onClose, onCreated }
}

const refusal = (status: number, message: string) =>
  new AxiosError('x', String(status), undefined, undefined, { status, statusText: '', headers: {}, config: {} as never, data: { success: false, message } })

const scope = () => screen.getByLabelText(/حجم المهمة/) as HTMLSelectElement
const points = () => screen.getByLabelText(/نقاط المهمة/) as HTMLInputElement
const duration = () => screen.getByLabelText('المدة التقريبية') as HTMLInputElement

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute('open') }
})

beforeEach(() => {
  vi.clearAllMocks()
  api.scopeDepartments.mockResolvedValue({ items: [{ id: 3, name: 'Media', name_ar: 'الإعلام' }], manageableDepartmentIds: null })
  api.scopeMembers.mockResolvedValue([])
  api.createAdvancedBoardTask.mockResolvedValue({})
  api.update.mockResolvedValue(undefined)
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

const editableTask = (over: Record<string, unknown> = {}) => ({
  id: 8, title: 'تقرير الأسبوع', description: 'تفاصيل', notes: null, department_id: 5, section_id: null, assigned_to: { id: 21, name: 'منى' }, priority: 'urgent',
  task_scope: 'medium', points: 100, estimated_hours: 3, status: 'planning', start_date: null, due_date: '2026-12-01', due_datetime: '2026-12-01T16:30:00+03:00', is_locked: false,
  capabilities: { can_edit: true, can_reassign: true }, ...over,
})
const SCOPED = { items: [{ id: 3, name: 'Media', name_ar: 'الإعلام' }, { id: 5, name: 'Tech', name_ar: 'التقنية' }], manageableDepartmentIds: [3, 5] }
const MEMBERS = [{ id: 21, user_id: 21, name: 'منى', role: 'عضو', role_title: null, kind: 'team' }, { id: 22, user_id: 22, name: 'ليلى', role: 'عضو', role_title: null, kind: 'team' }]

describe('TaskCreateModal: only the departments and members the server allows', () => {
  it('lists exactly the departments of the task-scope endpoint, preselects none when there are several, and reads that department\'s scoped members', async () => {
    api.scopeDepartments.mockResolvedValue(SCOPED)
    api.scopeMembers.mockResolvedValue(MEMBERS)
    mount(vi.fn(), vi.fn(), { canAssign: true })
    const dept = (await screen.findByLabelText('الإدارة التابعة')) as HTMLSelectElement
    await waitFor(() => expect(within(dept).getAllByRole('option').map((o) => o.textContent)).toEqual(['-- اختر الإدارة --', 'الإعلام', 'التقنية']))
    expect(dept.value).toBe('')
    expect(api.scopeMembers).not.toHaveBeenCalled()

    await userEvent.selectOptions(dept, '5')
    await waitFor(() => expect(api.scopeMembers).toHaveBeenCalledWith(5))
    const assignee = await screen.findByLabelText('العضو المكلف')
    await waitFor(() => expect(within(assignee).getAllByRole('option').map((o) => o.textContent)).toEqual(['-- اختر العضو المكلف --', 'منى (عضو)', 'ليلى (عضو)']))
  })

  it('preselects the department when the viewer has exactly one', async () => {
    api.scopeDepartments.mockResolvedValue({ items: [{ id: 5, name: 'Tech', name_ar: 'التقنية' }], manageableDepartmentIds: [5] })
    api.scopeMembers.mockResolvedValue(MEMBERS)
    mount(vi.fn(), vi.fn(), { canAssign: true })
    await waitFor(() => expect((screen.getByLabelText('الإدارة التابعة') as HTMLSelectElement).value).toBe('5'))
    await waitFor(() => expect(api.scopeMembers).toHaveBeenCalledWith(5))
  })

  it('submits the chosen department and member to the create endpoint', async () => {
    api.scopeDepartments.mockResolvedValue(SCOPED)
    api.scopeMembers.mockResolvedValue(MEMBERS)
    const { onCreated } = mount(vi.fn(), vi.fn(), { canAssign: true })
    await userEvent.type(screen.getByLabelText(/عنوان المهمة/), 'مهمة جديدة')
    await screen.findByRole('option', { name: 'التقنية' })
    await userEvent.selectOptions(screen.getByLabelText('الإدارة التابعة'), '5')
    await screen.findByRole('option', { name: 'ليلى (عضو)' })
    await userEvent.selectOptions(screen.getByLabelText('العضو المكلف'), '22')
    await userEvent.click(screen.getByRole('button', { name: /إسناد المهمة الآن/ }))
    await waitFor(() => expect(onCreated).toHaveBeenCalled())
    const form = api.createAdvancedBoardTask.mock.calls[0][0] as FormData
    expect(form.get('department_id')).toBe('5')
    expect(form.get('assigned_to')).toBe('22')
  })

  it('a leader who picked no department is told so before any request', async () => {
    api.scopeDepartments.mockResolvedValue(SCOPED)
    mount(vi.fn(), vi.fn(), { canAssign: true })
    await userEvent.type(screen.getByLabelText(/عنوان المهمة/), 'مهمة')
    await screen.findByRole('option', { name: 'التقنية' })
    await userEvent.click(screen.getByRole('button', { name: /إسناد المهمة الآن/ }))
    expect(api.createAdvancedBoardTask).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('اختر الإدارة التي تنتمي إليها المهمة')
  })

  it('says why when the departments cannot be read (never an empty list without a word)', async () => {
    api.scopeDepartments.mockRejectedValue(refusal(403, 'ليست لديك صلاحية إدارة المهام.'))
    mount()
    expect(await screen.findByTestId('task-departments-error')).toHaveTextContent('ليست لديك صلاحية إدارة المهام.')
  })

  it('shows the server\'s Arabic refusal of a create, inline and as a toast, and keeps the form open', async () => {
    api.createAdvancedBoardTask.mockRejectedValue(refusal(403, 'هذه الإدارة خارج نطاق الإدارات التي تقودها.'))
    const { onClose } = mount(vi.fn(), vi.fn(), { canAssign: false })
    await userEvent.type(screen.getByLabelText(/عنوان المهمة/), 'مهمة')
    await userEvent.click(screen.getByRole('button', { name: /إنشاء المهمة الآن/ }))
    expect(await screen.findByTestId('task-form-error')).toHaveTextContent('هذه الإدارة خارج نطاق الإدارات التي تقودها.')
    expect(toast.error).toHaveBeenCalledWith('هذه الإدارة خارج نطاق الإدارات التي تقودها.')
    expect(onClose).not.toHaveBeenCalled()
  })
})

describe('TaskCreateModal: may create but not assign', () => {
  it('hides every assignee control, says why, never reads the members, and sends no assignee', async () => {
    api.scopeDepartments.mockResolvedValue({ items: [{ id: 5, name: 'Tech', name_ar: 'التقنية' }], manageableDepartmentIds: [5] })
    const { onCreated } = mount(vi.fn(), vi.fn(), { canAssign: false })
    await waitFor(() => expect((screen.getByLabelText('الإدارة التابعة') as HTMLSelectElement).value).toBe('5'))

    expect(screen.queryByLabelText('العضو المكلف')).toBeNull()
    for (const name of [/عضو محدد/, /مهمة جماعية/, /للإدارة \(بلا عضو محدد\)/]) expect(screen.queryByRole('button', { name })).toBeNull()
    expect(screen.getByTestId('no-assign-note')).toHaveTextContent('يمكنك إنشاء المهمة دون إسنادها')

    await userEvent.type(screen.getByLabelText(/عنوان المهمة/), 'مهمة بلا مكلّف')
    await userEvent.click(screen.getByRole('button', { name: /إنشاء المهمة الآن/ }))
    await waitFor(() => expect(onCreated).toHaveBeenCalled())
    const form = api.createAdvancedBoardTask.mock.calls[0][0] as FormData
    expect(form.has('assigned_to')).toBe(false)
    expect(form.has('assigned_users[]')).toBe(false)
    expect(form.get('department_id')).toBe('5')
    expect(api.scopeMembers).not.toHaveBeenCalled()
  })
})

describe('TaskCreateModal: the same form edits a task', () => {
  it('pre-fills from the editable endpoint and saves with PATCH, sending the new assignee only when it changed', async () => {
    api.scopeDepartments.mockResolvedValue(SCOPED)
    api.scopeMembers.mockResolvedValue(MEMBERS)
    api.editable.mockResolvedValue(editableTask())
    const { onCreated, onClose } = mount(vi.fn(), vi.fn(), { canAssign: true, editTaskId: 8 })

    expect(((await screen.findByLabelText(/عنوان المهمة/)) as HTMLInputElement).value).toBe('تقرير الأسبوع')
    expect(api.editable).toHaveBeenCalledWith(8)
    expect((screen.getByLabelText('الأولوية') as HTMLSelectElement).value).toBe('critical')
    await waitFor(() => expect((screen.getByLabelText('الإدارة التابعة') as HTMLSelectElement).value).toBe('5'))
    expect((screen.getByLabelText('التاريخ') as HTMLInputElement).value).toBe('2026-12-01')
    expect((screen.getByLabelText(/الوقت/) as HTMLInputElement).value).toBe('16:30')
    expect(screen.queryByText(/إرفاق ملفات/)).toBeNull()
    await waitFor(() => expect((screen.getByLabelText('العضو المكلف') as HTMLSelectElement).value).toBe('21'))

    await userEvent.clear(screen.getByLabelText(/عنوان المهمة/))
    await userEvent.type(screen.getByLabelText(/عنوان المهمة/), 'تقرير الأسبوع (معدّل)')
    await userEvent.click(screen.getByRole('button', { name: 'حفظ التعديلات' }))
    await waitFor(() => expect(onCreated).toHaveBeenCalled())
    expect(onClose).toHaveBeenCalled()

    expect(api.update).toHaveBeenCalledTimes(1)
    const [id, body] = api.update.mock.calls[0]
    expect(id).toBe(8)
    expect(body).toMatchObject({ title: 'تقرير الأسبوع (معدّل)', department_id: 5, priority: 'urgent', due_date: '2026-12-01' })
    // The estimate was not touched: it is not sent again.
    expect(body).not.toHaveProperty('points')
    // The date and time did not change: they are not sent again.
    expect(body).not.toHaveProperty('due_datetime')
    // The assignee did not change: it is not sent (that would be an assignment).
    expect(body).not.toHaveProperty('assigned_to')
  })

  it('sends the assignee when the editor picked someone else', async () => {
    api.scopeDepartments.mockResolvedValue(SCOPED)
    api.scopeMembers.mockResolvedValue(MEMBERS)
    api.editable.mockResolvedValue(editableTask())
    mount(vi.fn(), vi.fn(), { canAssign: true, editTaskId: 8 })
    await screen.findByDisplayValue('تقرير الأسبوع')
    await screen.findByRole('option', { name: 'ليلى (عضو)' })
    await userEvent.selectOptions(screen.getByLabelText('العضو المكلف'), '22')
    await userEvent.click(screen.getByRole('button', { name: 'حفظ التعديلات' }))
    await waitFor(() => expect(api.update).toHaveBeenCalled())
    expect(api.update.mock.calls[0][1]).toMatchObject({ assigned_to: 22 })
  })

  it('without permission to assign there is no assignee field and none is ever sent', async () => {
    api.scopeDepartments.mockResolvedValue(SCOPED)
    api.editable.mockResolvedValue(editableTask())
    const { onCreated } = mount(vi.fn(), vi.fn(), { canAssign: false, editTaskId: 8 })
    await screen.findByDisplayValue('تقرير الأسبوع')

    expect(screen.queryByLabelText('العضو المكلف')).toBeNull()
    expect(screen.getByTestId('no-assign-note')).toHaveTextContent('المكلّف الحالي: منى')
    await userEvent.click(screen.getByRole('button', { name: 'حفظ التعديلات' }))
    await waitFor(() => expect(onCreated).toHaveBeenCalled())
    expect(api.update.mock.calls[0][1]).not.toHaveProperty('assigned_to')
    expect(api.scopeMembers).not.toHaveBeenCalled()
  })

  it('shows the server\'s 403 inline and as a toast, and does not close or refresh', async () => {
    api.scopeDepartments.mockResolvedValue(SCOPED)
    api.editable.mockResolvedValue(editableTask())
    api.update.mockRejectedValue(refusal(403, 'هذه المهمة خارج نطاق الإدارات التي تقودها، فلا يمكنك تعديلها.'))
    const { onCreated, onClose } = mount(vi.fn(), vi.fn(), { editTaskId: 8 })
    await screen.findByDisplayValue('تقرير الأسبوع')
    await userEvent.click(screen.getByRole('button', { name: 'حفظ التعديلات' }))

    expect(await screen.findByTestId('task-form-error')).toHaveTextContent('هذه المهمة خارج نطاق الإدارات التي تقودها، فلا يمكنك تعديلها.')
    expect(toast.error).toHaveBeenCalledWith('هذه المهمة خارج نطاق الإدارات التي تقودها، فلا يمكنك تعديلها.')
    expect(onCreated).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('a task the viewer may not edit (403 / locked) shows the reason and offers no form', async () => {
    api.editable.mockRejectedValue(refusal(403, 'لا يمكنك تعديل هذه المهمة.'))
    mount(vi.fn(), vi.fn(), { editTaskId: 8 })
    expect(await screen.findByTestId('task-edit-load-error')).toHaveTextContent('لا يمكنك تعديل هذه المهمة.')
    expect(screen.queryByLabelText(/عنوان المهمة/)).toBeNull()
    expect(screen.getByRole('button', { name: 'حفظ التعديلات' })).toBeDisabled()
  })
})

describe('TaskCreateModal: no orphan tasks, no stale members', () => {
  const SEVERAL_GLOBAL = { items: [{ id: 3, name: 'Media', name_ar: 'الإعلام' }, { id: 5, name: 'Tech', name_ar: 'التقنية' }], manageableDepartmentIds: null }

  it('a GLOBAL actor with several departments who names nobody must pick a department first (nothing is sent)', async () => {
    api.scopeDepartments.mockResolvedValue(SEVERAL_GLOBAL)
    const { onCreated } = mount(vi.fn(), vi.fn(), { canAssign: true })
    await screen.findByRole('option', { name: 'التقنية' })
    await userEvent.type(screen.getByLabelText(/عنوان المهمة/), 'مهمة للإدارة')
    await userEvent.click(screen.getByRole('button', { name: 'للإدارة (بلا عضو محدد)' }))
    await userEvent.click(screen.getByRole('button', { name: /إسناد المهمة الآن/ }))

    expect(api.createAdvancedBoardTask).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('اختر الإدارة التي تنتمي إليها المهمة')

    await userEvent.selectOptions(screen.getByLabelText('الإدارة التابعة'), '3')
    await userEvent.click(screen.getByRole('button', { name: /إسناد المهمة الآن/ }))
    await waitFor(() => expect(onCreated).toHaveBeenCalled())
    expect((api.createAdvancedBoardTask.mock.calls[0][0] as FormData).get('department_id')).toBe('3')
  })

  it('the same rule when the viewer may not assign at all (global actor, several departments)', async () => {
    api.scopeDepartments.mockResolvedValue(SEVERAL_GLOBAL)
    mount(vi.fn(), vi.fn(), { canAssign: false })
    await screen.findByRole('option', { name: 'التقنية' })
    await userEvent.type(screen.getByLabelText(/عنوان المهمة/), 'مهمة')
    await userEvent.click(screen.getByRole('button', { name: /إنشاء المهمة الآن/ }))
    expect(api.createAdvancedBoardTask).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('اختر الإدارة التي تنتمي إليها المهمة')
  })

  it('switching department empties the member list at once (loading state, nobody from the old department) and drops the chosen assignee', async () => {
    api.scopeDepartments.mockResolvedValue(SEVERAL_GLOBAL)
    api.scopeMembers.mockResolvedValueOnce(MEMBERS)
    mount(vi.fn(), vi.fn(), { canAssign: true })
    await screen.findByRole('option', { name: 'التقنية' })
    await userEvent.selectOptions(screen.getByLabelText('الإدارة التابعة'), '3')
    await screen.findByRole('option', { name: 'منى (عضو)' })
    await userEvent.selectOptions(screen.getByLabelText('العضو المكلف'), '21')

    let release: (m: unknown[]) => void = () => {}
    api.scopeMembers.mockReturnValueOnce(new Promise((resolve) => { release = resolve }))
    await userEvent.selectOptions(screen.getByLabelText('الإدارة التابعة'), '5')

    const select = screen.getByLabelText('العضو المكلف') as HTMLSelectElement
    await waitFor(() => expect(select).toBeDisabled())
    expect(within(select).getAllByRole('option').map((o) => o.textContent)).toEqual(['جارٍ تحميل الأعضاء…'])
    expect(select.value).toBe('')

    release([{ id: 30, user_id: 30, name: 'سارة', role: 'عضو', role_title: null, kind: 'team' }])
    await screen.findByRole('option', { name: 'سارة (عضو)' })
    expect(screen.queryByRole('option', { name: 'منى (عضو)' })).toBeNull()
    expect(select).not.toBeDisabled()
  })

  it('emptying the department does not leave the member select stuck on «loading»', async () => {
    api.scopeDepartments.mockResolvedValue(SEVERAL_GLOBAL)
    api.scopeMembers.mockReturnValue(new Promise(() => {}))
    mount(vi.fn(), vi.fn(), { canAssign: true })
    await screen.findByRole('option', { name: 'التقنية' })
    await userEvent.selectOptions(screen.getByLabelText('الإدارة التابعة'), '3')
    await waitFor(() => expect(screen.getByLabelText('العضو المكلف')).toBeDisabled())
    await userEvent.selectOptions(screen.getByLabelText('الإدارة التابعة'), '')
    expect(screen.getByLabelText('العضو المكلف')).not.toBeDisabled()
  })
})

describe('TaskCreateModal edit: only what changed is sent', () => {
  it('a task with only a date keeps it that way: no 17:00 is invented, and a chosen time is sent', async () => {
    api.scopeDepartments.mockResolvedValue(SCOPED)
    api.editable.mockResolvedValue(editableTask({ due_datetime: null }))
    mount(vi.fn(), vi.fn(), { editTaskId: 8 })
    await screen.findByDisplayValue('تقرير الأسبوع')
    await userEvent.click(screen.getByRole('button', { name: 'حفظ التعديلات' }))
    await waitFor(() => expect(api.update).toHaveBeenCalledTimes(1))
    expect(api.update.mock.calls[0][1]).toMatchObject({ due_date: '2026-12-01' })
    expect(api.update.mock.calls[0][1]).not.toHaveProperty('due_datetime')
  })

  it('a task that had a date and time sends it again only when the date or time changed', async () => {
    api.scopeDepartments.mockResolvedValue(SCOPED)
    api.editable.mockResolvedValue(editableTask())
    mount(vi.fn(), vi.fn(), { editTaskId: 8 })
    await screen.findByDisplayValue('تقرير الأسبوع')
    await userEvent.click(screen.getByRole('button', { name: 'حفظ التعديلات' }))
    await waitFor(() => expect(api.update).toHaveBeenCalledTimes(1))
    expect(api.update.mock.calls[0][1]).not.toHaveProperty('due_datetime')
  })

  it('changing the time of a task with a date sends the full date-time; clearing the date clears both', async () => {
    api.scopeDepartments.mockResolvedValue(SCOPED)
    api.editable.mockResolvedValue(editableTask({ due_datetime: null }))
    const { onCreated } = mount(vi.fn(), vi.fn(), { editTaskId: 8 })
    await screen.findByDisplayValue('تقرير الأسبوع')
    fireEvent.change(screen.getByLabelText(/الوقت/), { target: { value: '09:15' } })
    await userEvent.click(screen.getByRole('button', { name: 'حفظ التعديلات' }))
    await waitFor(() => expect(onCreated).toHaveBeenCalled())
    expect(api.update.mock.calls[0][1]).toMatchObject({ due_date: '2026-12-01', due_datetime: '2026-12-01 09:15:00' })
  })

  it('a legacy task (no size, no points) saves a title fix without any estimate error, and sends no estimate', async () => {
    api.scopeDepartments.mockResolvedValue(SCOPED)
    api.editable.mockResolvedValue(editableTask({ task_scope: null, points: null, estimated_hours: null }))
    const { onCreated } = mount(vi.fn(), vi.fn(), { editTaskId: 8 })
    await screen.findByDisplayValue('تقرير الأسبوع')
    await userEvent.type(screen.getByLabelText(/عنوان المهمة/), ' (مصحّح)')
    await userEvent.click(screen.getByRole('button', { name: 'حفظ التعديلات' }))
    await waitFor(() => expect(onCreated).toHaveBeenCalled())
    const body = api.update.mock.calls[0][1]
    expect(body.title).toBe('تقرير الأسبوع (مصحّح)')
    for (const k of ['task_scope', 'points', 'estimated_hours']) expect(body).not.toHaveProperty(k)
  })

  it('a touched estimate is still validated: half-filled is refused before any request', async () => {
    api.scopeDepartments.mockResolvedValue(SCOPED)
    api.editable.mockResolvedValue(editableTask({ task_scope: null, points: null, estimated_hours: null }))
    mount(vi.fn(), vi.fn(), { editTaskId: 8 })
    await screen.findByDisplayValue('تقرير الأسبوع')
    await userEvent.type(screen.getByLabelText('المدة التقريبية'), '2')
    await userEvent.click(screen.getByRole('button', { name: 'حفظ التعديلات' }))
    expect(api.update).not.toHaveBeenCalled()
    expect(await screen.findByText('اختر حجم المهمة.')).toBeInTheDocument()
  })
})
