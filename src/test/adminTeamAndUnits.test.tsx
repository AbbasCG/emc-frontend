import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { render, screen, waitFor, within, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import TeamMembersPage from '@/pages/admin/TeamMembersPage'
import DepartmentUnitsPage from '@/pages/admin/DepartmentUnitsPage'
import type { DepartmentalUnitRow, MemberPage, TeamMemberRow, UnitList } from '@/api/unitMembersApi'

const api = vi.hoisted(() => ({
  listUnits: vi.fn(),
  listUnitsScoped: vi.fn(),
  listMembersPage: vi.fn(),
  listMembers: vi.fn(),
  createUnit: vi.fn(),
  updateUnit: vi.fn(),
  setMemberUnit: vi.fn(),
  createMember: vi.fn(),
  updateMember: vi.fn(),
}))
vi.mock('@/api/unitMembersApi', () => ({ unitMembersApi: api }))

const access = vi.hoisted(() => ({
  current: {
    manifest: { primary_department_id: null } as { primary_department_id: number | null } | null,
    loading: false,
    error: false,
    soleDepartmentId: null,
    readableDepartments: [] as { id: number; name: string }[],
    canViewMultipleDepartments: true,
  },
}))
vi.mock('@/hooks/useDepartmentAccess', () => ({ useDepartmentAccess: () => access.current }))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 7, name: 'مدير' } }) }))
vi.mock('@/lib/toast', () => ({ default: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), message: vi.fn() } }))
vi.mock('@/components/admin/MemberSearchSelect', () => ({ default: () => <div data-testid="member-picker" /> }))
vi.mock('@/components/tickets/AssigneeSearchSelect', () => ({ default: () => <div data-testid="assignee-picker" /> }))

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute('open') }
})

const DEPTS = [
  { id: 3, name: 'التقنية' },
  { id: 5, name: 'التسويق' },
  { id: 8, name: 'المالية' },
]

function member(id: number, over: Partial<TeamMemberRow> = {}): TeamMemberRow {
  return {
    id,
    user: { id: 100 + id, name: `عضو ${id}`, email: `m${id}@x.com`, role: 'support_agent' },
    department: { id: 3, name: 'التقنية' },
    section: null,
    unit: { id: 11, name_ar: 'التطوير', name_en: null },
    role_title: 'مهندس',
    status: 'active',
    created_at: '2026-10-01T00:00:00Z',
    ...over,
  }
}

const stats = (over = {}) => ({ total: 40, active: 30, inactive: 4, on_leave: 6, without_unit: 9, ...over })
function page(rows: TeamMemberRow[], over: Partial<MemberPage['meta']> = {}): MemberPage {
  return { rows, meta: { total: rows.length, current_page: 1, last_page: 1, per_page: 25, stats: stats(), ...over } }
}
const unit = (id: number, over: Partial<DepartmentalUnitRow> = {}): DepartmentalUnitRow => ({ id, department_id: 3, code: `U${id}`, name_ar: `وحدة ${id}`, name_en: null, description: null, is_active: true, member_count: 2, ...over })
const unitList = (rows: DepartmentalUnitRow[], canManage = true): UnitList => ({ rows, canManage })

function Probe() {
  const l = useLocation()

  return <span data-testid="url">{l.search}</span>
}
function renderPage(el: React.ReactElement, entry = '/') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Probe />
      {el}
    </MemoryRouter>,
  )
}
const url = () => new URLSearchParams(screen.getByTestId('url').textContent ?? '')
const lastQuery = () => api.listMembersPage.mock.calls.at(-1)![0] as Record<string, unknown>

beforeEach(() => {
  localStorage.clear()
  Object.values(api).forEach((m) => m.mockReset())
  access.current = { manifest: { primary_department_id: null }, loading: false, error: false, soleDepartmentId: null, readableDepartments: DEPTS, canViewMultipleDepartments: true }
  api.listMembersPage.mockResolvedValue(page([member(1), member(2, { status: 'on_leave', unit: null })], { total: 40, last_page: 2 }))
  api.listUnits.mockResolvedValue([unit(11, { department_id: 3 }), unit(12, { department_id: 3 })])
  api.listUnitsScoped.mockResolvedValue(unitList([unit(11), unit(12, { is_active: false })]))
})

describe('Team Members', () => {
  it('shows the server counts for the whole scope, not for the rows on screen', async () => {
    renderPage(<TeamMembersPage />)

    expect(await screen.findAllByTestId('member-row')).toHaveLength(2)
    expect(screen.getByTestId('kpi-total')).toHaveTextContent('40')
    expect(screen.getByTestId('kpi-active')).toHaveTextContent('30')
    expect(screen.getByTestId('kpi-on-leave')).toHaveTextContent('6')
    expect(screen.getByTestId('kpi-inactive')).toHaveTextContent('4')
    expect(screen.getByTestId('kpi-without-unit')).toHaveTextContent('9')
    expect(screen.getByTestId('result-count')).toHaveTextContent('40 عضو')
  })

  it('asks the server for sorted, paged data and keeps every filter in the URL', async () => {
    renderPage(<TeamMembersPage />, '/?dept=3&status=active&role=support_agent&sort=unit&dir=desc&page=2&per=10&q=sal')
    await screen.findAllByTestId('member-row')

    expect(lastQuery()).toMatchObject({ departmentId: 3, status: 'active', role: 'support_agent', sort: 'unit', dir: 'desc', page: 2, perPage: 10, search: 'sal' })
  })

  it('a KPI card filters by that status and a second press clears it; the counts do not collapse', async () => {
    renderPage(<TeamMembersPage />)
    await screen.findAllByTestId('member-row')
    const card = () => screen.getByTestId('kpi-on-leave').closest('button')!

    await userEvent.click(card())
    await waitFor(() => expect(url().get('status')).toBe('on_leave'))
    expect(lastQuery()).toMatchObject({ status: 'on_leave', page: 1 })
    expect(card()).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('kpi-active')).toHaveTextContent('30')

    await userEvent.click(card())
    await waitFor(() => expect(url().has('status')).toBe(false))
  })

  it('"no unit" is a filter the server understands', async () => {
    renderPage(<TeamMembersPage />)
    await screen.findAllByTestId('member-row')

    await userEvent.click(screen.getByRole('button', { name: /بدون وحدة/ }))

    await waitFor(() => expect(lastQuery().unitId).toBe('null'))
    expect(url().get('unit')).toBe('none')
  })

  it('waits for typing to pause before searching, then returns to page 1', async () => {
    renderPage(<TeamMembersPage />, '/?page=2')
    await screen.findAllByTestId('member-row')
    api.listMembersPage.mockClear()

    await userEvent.type(screen.getByRole('searchbox', { name: 'بحث' }), 'سلمى')
    expect(api.listMembersPage).not.toHaveBeenCalled()

    await waitFor(() => expect(lastQuery()).toMatchObject({ search: 'سلمى', page: 1 }), { timeout: 2000 })
    expect(api.listMembersPage).toHaveBeenCalledTimes(1)
  })

  it('changing the department drops a unit chosen for the previous one', async () => {
    renderPage(<TeamMembersPage />, '/?dept=3&unit=11')
    await screen.findAllByTestId('member-row')

    await userEvent.selectOptions(screen.getByLabelText('الإدارة'), '5')

    await waitFor(() => expect(url().get('dept')).toBe('5'))
    expect(url().has('unit')).toBe(false)
  })

  it('sorts by a column header and flips direction on a second press', async () => {
    renderPage(<TeamMembersPage />)
    await screen.findAllByTestId('member-row')

    await userEvent.click(screen.getByRole('button', { name: 'الإدارة' }))
    await waitFor(() => expect(lastQuery()).toMatchObject({ sort: 'department', dir: 'asc' }))
    await userEvent.click(screen.getByRole('button', { name: 'الإدارة' }))
    await waitFor(() => expect(lastQuery()).toMatchObject({ sort: 'department', dir: 'desc' }))
  })

  it('pages through the server and shows the range', async () => {
    renderPage(<TeamMembersPage />)
    await screen.findAllByTestId('member-row')

    await userEvent.click(screen.getByRole('button', { name: /التالي/ }))

    await waitFor(() => expect(lastQuery()).toMatchObject({ page: 2 }))
  })

  it('explains an empty result with filters, and offers to clear them', async () => {
    api.listMembersPage.mockResolvedValue(page([], { total: 0, stats: stats({ total: 0 }) }))
    renderPage(<TeamMembersPage />, '/?status=inactive')

    expect(await screen.findByText('لا يوجد أعضاء مطابقون')).toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('button', { name: 'مسح الفلاتر' })[0])
    await waitFor(() => expect(url().has('status')).toBe(false))
  })

  it('shows an error with a retry, and a forbidden state without one', async () => {
    api.listMembersPage.mockRejectedValueOnce(new Error('boom'))
    renderPage(<TeamMembersPage />)

    expect(await screen.findByText('تعذّر تحميل الأعضاء')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }))
    expect(await screen.findAllByTestId('member-row')).toHaveLength(2)
  })

  it('403 from the server: no list, no action', async () => {
    api.listMembersPage.mockRejectedValue(Object.assign(new Error('403'), { isAxiosError: true, response: { status: 403, data: {} } }))
    renderPage(<TeamMembersPage />)

    expect(await screen.findByText('لا تملك صلاحية عرض أعضاء الإدارات')).toBeInTheDocument()
    expect(screen.queryByTestId('member-row')).not.toBeInTheDocument()
  })

  it('edits unit and status once (a second press while saving does nothing), and keeps the filters', async () => {
    let finish!: (v: unknown) => void
    api.updateMember.mockReturnValue(new Promise((r) => { finish = r }))
    renderPage(<TeamMembersPage />, '/?status=active&dept=3')
    const row = (await screen.findAllByTestId('member-row'))[0]

    await userEvent.click(within(row).getByRole('button', { name: /إجراءات عضو 1/ }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'تعديل الوحدة والحالة' }))
    const dlg = await screen.findByRole('dialog', { name: 'تعديل بيانات العضو' })
    expect(within(dlg).getByTestId('member-identity')).toHaveTextContent('عضو 1')
    await within(dlg).findByRole('option', { name: 'وحدة 12' })
    await userEvent.selectOptions(within(dlg).getByLabelText('الوحدة (اختياري)'), '12')
    const save = within(dlg).getByRole('button', { name: 'حفظ التعديلات' })
    await userEvent.click(save)
    await userEvent.click(save)

    expect(api.updateMember).toHaveBeenCalledTimes(1)
    expect(api.updateMember).toHaveBeenCalledWith(1, { unit_id: 12, status: 'active' })

    api.listMembersPage.mockClear()
    await act(async () => finish({}))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'تعديل بيانات العضو' })).not.toBeInTheDocument())
    await waitFor(() => expect(api.listMembersPage).toHaveBeenCalled())
    expect(url().get('status')).toBe('active')
    expect(url().get('dept')).toBe('3')
  })

  it('deactivating asks first and does nothing if cancelled', async () => {
    api.updateMember.mockResolvedValue({})
    renderPage(<TeamMembersPage />)
    const row = (await screen.findAllByTestId('member-row'))[0]

    await userEvent.click(within(row).getByRole('button', { name: /إجراءات عضو 1/ }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'تعطيل العضو' }))
    expect(await screen.findByText('تعطيل العضو', { selector: 'h2, h3, [id="confirm-dialog-title"]' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'إلغاء' }))
    expect(api.updateMember).not.toHaveBeenCalled()

    await userEvent.click(within(row).getByRole('button', { name: /إجراءات عضو 1/ }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'تعطيل العضو' }))
    await userEvent.click(await screen.findByRole('button', { name: 'تعطيل' }))
    await waitFor(() => expect(api.updateMember).toHaveBeenCalledWith(1, { status: 'inactive' }))
  })

  it('shows a server refusal inside the form and keeps what was typed', async () => {
    const err = Object.assign(new Error('422'), { isAxiosError: true, response: { status: 422, data: { message: 'الوحدة التقنية المختارة لا تتبع الإدارة المحددة.' } } })
    api.updateMember.mockRejectedValue(err)
    renderPage(<TeamMembersPage />)
    const row = (await screen.findAllByTestId('member-row'))[0]
    await userEvent.click(within(row).getByRole('button', { name: /إجراءات عضو 1/ }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'تعديل الوحدة والحالة' }))
    const dlg = await screen.findByRole('dialog', { name: 'تعديل بيانات العضو' })
    await userEvent.selectOptions(within(dlg).getByLabelText('الحالة'), 'on_leave')

    await userEvent.click(within(dlg).getByRole('button', { name: 'حفظ التعديلات' }))

    expect(await within(dlg).findByRole('alert')).toHaveTextContent('لا تتبع الإدارة المحددة')
    expect(within(dlg).getByLabelText('الحالة')).toHaveValue('on_leave')
  })

  it('ignores a slow answer for filters the user has already left', async () => {
    let slow!: (v: MemberPage) => void
    api.listMembersPage.mockReset()
    api.listMembersPage.mockReturnValueOnce(new Promise<MemberPage>((r) => { slow = r }))
    api.listMembersPage.mockResolvedValue(page([member(2, { user: { id: 102, name: 'الجديد', email: 'n@x.com', role: 'student' } })]))
    renderPage(<TeamMembersPage />)

    await userEvent.click(await screen.findByRole('button', { name: /نشطون/ }))
    expect(await screen.findByText('الجديد')).toBeInTheDocument()

    await act(async () => slow(page([member(1)])))
    expect(screen.queryByText('عضو 1')).not.toBeInTheDocument()
    expect(screen.getByText('الجديد')).toBeInTheDocument()
  })
})

describe('Department Units: which department opens', () => {
  const requested = () => api.listUnitsScoped.mock.calls.map((c) => c[0])

  it('1. one authorized department opens by itself', async () => {
    access.current = { ...access.current, readableDepartments: [DEPTS[1]] }
    renderPage(<DepartmentUnitsPage />)

    expect(await screen.findAllByTestId('unit-card')).toHaveLength(2)
    expect(requested()).toEqual([5])
    expect(screen.getByTestId('department-note')).toHaveTextContent('إدارتك الوحيدة')
  })

  it('2. several with a reliable primary open on the primary, not on the first in the list', async () => {
    access.current = { ...access.current, manifest: { primary_department_id: 8 } }
    renderPage(<DepartmentUnitsPage />)

    await screen.findAllByTestId('unit-card')
    expect(requested()).toEqual([8])
    expect(screen.getByLabelText('الإدارة')).toHaveValue('8')
  })

  it('3. several, no primary: restores the department this user picked last time', async () => {
    localStorage.setItem('emc.admin.department.7', '5')
    renderPage(<DepartmentUnitsPage />)

    await screen.findAllByTestId('unit-card')
    expect(requested()).toEqual([5])
    expect(screen.getByTestId('department-note')).toHaveTextContent('آخر إدارة')
  })

  it('3b. a remembered department that is no longer authorized is not used', async () => {
    localStorage.setItem('emc.admin.department.7', '99')
    renderPage(<DepartmentUnitsPage />)

    expect(await screen.findByText('اختر إدارة', { selector: 'h2' })).toBeInTheDocument()
    expect(api.listUnitsScoped).not.toHaveBeenCalled()
  })

  it('4. several and nothing to go on: asks the user, and loads nothing until they choose', async () => {
    renderPage(<DepartmentUnitsPage />)

    expect(await screen.findByText('اختر إدارة', { selector: 'h2' })).toBeInTheDocument()
    expect(api.listUnitsScoped).not.toHaveBeenCalled()
    expect(api.listMembersPage).not.toHaveBeenCalled()

    await userEvent.selectOptions(screen.getByLabelText('الإدارة'), '8')
    expect(await screen.findAllByTestId('unit-card')).toHaveLength(2)
    expect(requested()).toEqual([8])
    expect(localStorage.getItem('emc.admin.department.7')).toBe('8')
  })

  it('5. none: a clear access state and no request', async () => {
    access.current = { ...access.current, readableDepartments: [] }
    renderPage(<DepartmentUnitsPage />)

    expect(await screen.findByText('لا توجد إدارات متاحة لك')).toBeInTheDocument()
    expect(api.listUnitsScoped).not.toHaveBeenCalled()
  })

  it('a failed access lookup says so instead of guessing a department', async () => {
    access.current = { ...access.current, manifest: null, error: true, readableDepartments: [] }
    renderPage(<DepartmentUnitsPage />)

    expect(await screen.findByText('تعذّر تحميل إداراتك')).toBeInTheDocument()
    expect(api.listUnitsScoped).not.toHaveBeenCalled()
  })
})

describe('Department Units: one department at a time', () => {
  it('clears the old department at once on a switch and ignores its late answer', async () => {
    let lateFor3!: (v: UnitList) => void
    api.listUnitsScoped.mockImplementation((id: number) =>
      id === 3 ? new Promise<UnitList>((r) => { lateFor3 = r }) : Promise.resolve(unitList([unit(51, { name_ar: 'وحدة التسويق', department_id: 5 })])),
    )
    api.listMembersPage.mockResolvedValue(page([]))
    localStorage.setItem('emc.admin.department.7', '3')
    renderPage(<DepartmentUnitsPage />)

    await userEvent.selectOptions(screen.getByLabelText('الإدارة'), '5')
    expect(await screen.findByText('وحدة التسويق')).toBeInTheDocument()

    await act(async () => lateFor3(unitList([unit(31, { name_ar: 'وحدة التقنية' })])))
    expect(screen.queryByText('وحدة التقنية')).not.toBeInTheDocument()
    expect(screen.getByText('وحدة التسويق')).toBeInTheDocument()
  })

  it('shows no previous department\'s units while the next one loads', async () => {
    api.listUnitsScoped.mockImplementation((id: number) => (id === 3 ? Promise.resolve(unitList([unit(31, { name_ar: 'وحدة التقنية' })])) : new Promise(() => {})))
    api.listMembersPage.mockResolvedValue(page([]))
    localStorage.setItem('emc.admin.department.7', '3')
    renderPage(<DepartmentUnitsPage />)
    await screen.findByText('وحدة التقنية')

    await userEvent.selectOptions(screen.getByLabelText('الإدارة'), '8')

    expect(screen.queryByText('وحدة التقنية')).not.toBeInTheDocument()
    expect(screen.getByTestId('admin-loading')).toBeInTheDocument()
  })

  it('reads the members once for the department (no second request when everyone fits on the page)', async () => {
    localStorage.setItem('emc.admin.department.7', '3')
    api.listMembersPage.mockResolvedValue(page([member(1), member(2, { unit: null })], { total: 2, stats: stats({ total: 2, without_unit: 1 }) }))
    renderPage(<DepartmentUnitsPage />)

    expect(await screen.findAllByTestId('unassigned-member')).toHaveLength(1)
    expect(api.listMembersPage).toHaveBeenCalledTimes(1)
  })

  it('asks for the unit-less members separately only when the department is larger than the page', async () => {
    localStorage.setItem('emc.admin.department.7', '3')
    api.listMembersPage.mockImplementation(async (q: { unitId?: unknown }) => (q.unitId === 'null' ? page([member(9, { unit: null })], { total: 9 }) : page([member(1)], { total: 150, stats: stats({ total: 150, without_unit: 9 }) })))
    renderPage(<DepartmentUnitsPage />)

    expect(await screen.findAllByTestId('unassigned-member')).toHaveLength(1)
    expect(api.listMembersPage).toHaveBeenCalledTimes(2)
  })
})

describe('Department Units: what the server allows', () => {
  beforeEach(() => localStorage.setItem('emc.admin.department.7', '3'))

  it('shows create / edit / disable only when the server says this user can manage the department', async () => {
    api.listMembersPage.mockResolvedValue(page([]))
    renderPage(<DepartmentUnitsPage />)
    await screen.findAllByTestId('unit-card')
    expect(screen.getAllByRole('button', { name: 'وحدة جديدة' }).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /إجراءات الوحدة وحدة 11/ })).toBeInTheDocument()
  })

  it('read-only: no create, no menus, and the members window is view-only', async () => {
    api.listUnitsScoped.mockResolvedValue(unitList([unit(11)], false))
    api.listMembersPage.mockResolvedValue(page([member(1)]))
    renderPage(<DepartmentUnitsPage />)
    await screen.findAllByTestId('unit-card')

    expect(screen.queryByRole('button', { name: 'وحدة جديدة' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /إجراءات الوحدة/ })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'عرض موظفي الوحدة' }))
    const dlg = await screen.findByRole('dialog')
    expect(within(dlg).getByText(/عرض فقط/)).toBeInTheDocument()
    expect(within(dlg).queryByRole('button', { name: /إزالة/ })).not.toBeInTheDocument()
    expect(within(dlg).queryByTestId('assignee-picker')).not.toBeInTheDocument()
  })

  it('403 for a department: a clear message, no data', async () => {
    api.listUnitsScoped.mockRejectedValue(Object.assign(new Error('403'), { isAxiosError: true, response: { status: 403, data: {} } }))
    api.listMembersPage.mockResolvedValue(page([]))
    renderPage(<DepartmentUnitsPage />)

    expect(await screen.findByText('لا تملك صلاحية عرض وحدات هذه الإدارة')).toBeInTheDocument()
    expect(screen.queryByTestId('unit-card')).not.toBeInTheDocument()
  })

  it('creates a unit and shows the server\'s field errors under the right inputs', async () => {
    api.listMembersPage.mockResolvedValue(page([]))
    api.createUnit.mockRejectedValueOnce(Object.assign(new Error('422'), { isAxiosError: true, response: { status: 422, data: { errors: { code: ['الرمز مستخدم من قبل.'] } } } }))
    api.createUnit.mockResolvedValueOnce({})
    renderPage(<DepartmentUnitsPage />)
    await screen.findAllByTestId('unit-card')

    await userEvent.click(screen.getAllByRole('button', { name: 'وحدة جديدة' })[0])
    const dlg = await screen.findByRole('dialog', { name: 'وحدة تقنية جديدة' })
    await userEvent.click(within(dlg).getByRole('button', { name: 'إنشاء الوحدة' }))
    expect(within(dlg).getByText('الرمز مطلوب.')).toBeInTheDocument()
    expect(within(dlg).getByText('اسم الوحدة بالعربية مطلوب.')).toBeInTheDocument()
    expect(api.createUnit).not.toHaveBeenCalled()

    await userEvent.type(within(dlg).getByLabelText(/الرمز/), 'ops')
    await userEvent.type(within(dlg).getByLabelText(/الاسم بالعربية/), 'العمليات')
    await userEvent.click(within(dlg).getByRole('button', { name: 'إنشاء الوحدة' }))
    expect(await within(dlg).findByText('الرمز مستخدم من قبل.')).toBeInTheDocument()
    expect(within(dlg).getByLabelText(/الرمز/)).toHaveAttribute('aria-invalid', 'true')

    await userEvent.click(within(dlg).getByRole('button', { name: 'إنشاء الوحدة' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'وحدة تقنية جديدة' })).not.toBeInTheDocument())
    expect(api.createUnit).toHaveBeenLastCalledWith({ department_id: 3, code: 'OPS', name_ar: 'العمليات' })
  })

  it('disabling a unit asks first; enabling does not', async () => {
    api.listMembersPage.mockResolvedValue(page([]))
    api.updateUnit.mockResolvedValue({})
    renderPage(<DepartmentUnitsPage />)
    await screen.findAllByTestId('unit-card')

    await userEvent.click(screen.getByRole('button', { name: /إجراءات الوحدة وحدة 11/ }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'تعطيل الوحدة' }))
    await userEvent.click(await screen.findByRole('button', { name: 'تعطيل' }))
    await waitFor(() => expect(api.updateUnit).toHaveBeenCalledWith(11, { is_active: false }))

    await userEvent.click(screen.getByRole('button', { name: /إجراءات الوحدة وحدة 12/ }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'تفعيل الوحدة' }))
    await waitFor(() => expect(api.updateUnit).toHaveBeenCalledWith(12, { is_active: true }))
  })

  it('moves and removes members from the unit window, one change at a time', async () => {
    api.listMembersPage.mockResolvedValue(page([member(1)]))
    api.setMemberUnit.mockResolvedValue({})
    renderPage(<DepartmentUnitsPage />)
    await screen.findAllByTestId('unit-card')

    await userEvent.click(screen.getAllByRole('button', { name: 'إدارة موظفي الوحدة' })[0])
    const dlg = await screen.findByRole('dialog')
    expect(within(dlg).getAllByTestId('unit-member')).toHaveLength(1)

    await userEvent.click(within(dlg).getByRole('button', { name: 'إزالة عضو 1 من الوحدة' }))
    await waitFor(() => expect(api.setMemberUnit).toHaveBeenCalledWith(1, null))
  })

  it('filters the units by search and status without another request', async () => {
    api.listMembersPage.mockResolvedValue(page([]))
    renderPage(<DepartmentUnitsPage />)
    await screen.findAllByTestId('unit-card')
    api.listUnitsScoped.mockClear()

    await userEvent.selectOptions(screen.getByLabelText('الحالة'), 'inactive')
    expect(screen.getAllByTestId('unit-card')).toHaveLength(1)
    expect(screen.getByText('وحدة 12')).toBeInTheDocument()

    await userEvent.selectOptions(screen.getByLabelText('الحالة'), 'all')
    await userEvent.type(screen.getByRole('searchbox', { name: 'بحث في الوحدات' }), '11')
    expect(screen.getAllByTestId('unit-card')).toHaveLength(1)
    expect(api.listUnitsScoped).not.toHaveBeenCalled()
  })
})
