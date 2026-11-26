import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { AxiosError } from 'axios'

/**
 * Users edit drawer: the role select is the front end's allowed set cross-checked with `GET /admin/roles/options`
 * (the roles table of THIS environment), so the UI never silently offers a role the server will refuse.
 */

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() }))
vi.mock('@/api/axios', () => ({ default: http }))
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, role: 'super_admin', permissions: [] as string[] },
    isImpersonating: false,
    startImpersonationPreview: vi.fn(),
  }),
}))
const toasts = vi.hoisted(() => ({ warning: vi.fn(), success: vi.fn(), error: vi.fn(), message: vi.fn() }))
vi.mock('@/lib/toast', () => ({ default: toasts }))

import UsersManagementPage from '@/pages/super-admin/crud/UsersManagementPage'

const httpError = (status: number, data: unknown = {}) =>
  new AxiosError('Request failed', String(status), undefined, undefined, {
    status,
    statusText: '',
    headers: {},
    config: {} as never,
    data,
  })

const MEMBER = {
  id: 39,
  name: 'نور المنتسب',
  email: 'noor@example.test',
  role: 'department_member',
  is_active: true,
  department: 'إدارة الإعلام والتسويق',
  department_id: 4,
}

const DEPARTMENTS = [
  { id: 2, name_ar: 'إدارة البرامج والمسارات', slug: 'programs-tracks' },
  { id: 4, name_ar: 'إدارة الإعلام والتسويق', slug: 'marketing-media' },
  { id: 6, name_ar: 'الإدارة المالية', slug: 'finance' },
]

type Setup = { roles?: string[] | 'fail'; user?: Record<string, unknown> }

function arrange({ roles, user = MEMBER }: Setup = {}) {
  http.get.mockImplementation((url: string) => {
    if (url === '/admin/roles/options') {
      if (roles === 'fail' || roles === undefined) return Promise.reject(httpError(500))
      return Promise.resolve({ data: { success: true, data: roles.map((value) => ({ value, label: value })) } })
    }
    if (url === '/departments/options') return Promise.resolve({ data: { success: true, data: DEPARTMENTS } })
    if (url === `/admin/users/${user.id}`) return Promise.resolve({ data: { success: true, data: user } })
    if (url === '/admin/users') {
      return Promise.resolve({
        data: {
          success: true,
          data: [user],
          meta: { total: 1, current_page: 1, per_page: 15, last_page: 1 },
        },
      })
    }
    return Promise.resolve({ data: { success: true, data: [] } })
  })
  http.put.mockResolvedValue({ data: { success: true, data: user } })
}

async function openDrawer() {
  render(
    <MemoryRouter>
      <UsersManagementPage />
    </MemoryRouter>,
  )
  const cells = await screen.findAllByText(MEMBER.name)
  await userEvent.click(cells[0])
  const dialog = await screen.findByRole('dialog')
  return await within(dialog).findByRole('combobox', { name: /^الدور/ })
}

const optionOf = (select: HTMLElement, value: string) =>
  within(select).getAllByRole('option').find((o) => (o as HTMLOptionElement).value === value) as HTMLOptionElement | undefined

const SERVER_ROLES = [
  'student',
  'instructor',
  'volunteer',
  'partner',
  'support_agent',
  'admin',
  'super_admin',
  'tech_admin',
  'executive_admin',
  'department_manager',
  'department_member',
  'hr_manager', // exists on the server but is not part of the front end's allowed set
]

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open')
  }
  Element.prototype.scrollIntoView ??= () => {}
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('role select of the edit drawer follows the roles table of the server', () => {
  it('lists (server list ∩ allowed set) with Arabic labels, asks the server silently, and shows no warning', async () => {
    arrange({ roles: SERVER_ROLES })
    const select = await openDrawer()

    expect(http.get).toHaveBeenCalledWith('/admin/roles/options', expect.objectContaining({ skipErrorToast: true }))
    expect(optionOf(select, 'student')).toMatchObject({ textContent: 'طالب', disabled: false })
    expect(optionOf(select, 'department_member')?.textContent).toBe('عضو إدارة / فريق')
    // A server role outside the allowed set is not offered.
    expect(optionOf(select, 'hr_manager')).toBeUndefined()
    expect(screen.queryByText(/تعذّر جلب قائمة الأدوار المفعّلة/)).not.toBeInTheDocument()
    expect(within(select).queryByText(/غير مفعّل في هذه البيئة/)).not.toBeInTheDocument()
  })

  it('shows a catalogue role the server lacks as disabled with the hint, so it cannot be picked', async () => {
    arrange({ roles: SERVER_ROLES.filter((r) => r !== 'partner') })
    const select = await openDrawer()

    await waitFor(() => expect(optionOf(select, 'partner')?.disabled).toBe(true))
    expect(optionOf(select, 'partner')?.textContent).toBe('شريك — غير مفعّل في هذه البيئة')

    await userEvent.selectOptions(select, 'partner')
    expect(select).toHaveValue('department_member')
  })

  it('keeps the current role visible and enabled even when the server list lacks it', async () => {
    arrange({ roles: SERVER_ROLES.filter((r) => r !== 'department_member') })
    const select = await openDrawer()

    await waitFor(() => expect(optionOf(select, 'student')).toBeDefined())
    const current = optionOf(select, 'department_member')
    expect(current).toBeDefined()
    expect(current?.disabled).toBe(false)
    expect(current?.textContent).toContain('عضو إدارة / فريق')
    expect(select).toHaveValue('department_member')
  })

  it('falls back to the static catalogue with a non-blocking amber notice when the options request fails', async () => {
    arrange({ roles: 'fail' })
    const select = await openDrawer()

    expect(await screen.findByText('تعذّر جلب قائمة الأدوار المفعّلة من الخادم؛ قد يرفض الخادم بعض الأدوار')).toBeInTheDocument()
    expect(optionOf(select, 'partner')).toMatchObject({ disabled: false, textContent: 'شريك' })
    expect(screen.getByRole('button', { name: 'حفظ التغييرات' })).toBeEnabled()
  })

  it('applies the specialised-manager auto-map only when the mapped role is in the server list', async () => {
    arrange({
      roles: [...SERVER_ROLES, 'programs_manager'],
      user: { ...MEMBER, role: 'department_manager', department: 'إدارة الإعلام والتسويق', department_id: 4 },
    })
    const first = await openDrawer()
    const dept = await screen.findByRole('combobox', { name: /الإدارة التي يديرها/ })
    await userEvent.selectOptions(dept, '2')
    await waitFor(() => expect(first).toHaveValue('programs_manager'))
    expect(screen.getByText(/تم الربط التلقائي بالدور التخصصي الفعلي/)).toBeInTheDocument()
  })

  it('keeps «مدير إدارة» and explains why when the mapped specialised role is not activated on the server', async () => {
    arrange({
      roles: SERVER_ROLES, // no programs_manager row
      user: { ...MEMBER, role: 'department_manager', department: 'إدارة الإعلام والتسويق', department_id: 4 },
    })
    const select = await openDrawer()
    const dept = await screen.findByRole('combobox', { name: /الإدارة التي يديرها/ })
    await waitFor(() => expect(optionOf(select, 'student')).toBeDefined())

    await userEvent.selectOptions(dept, '2')

    expect(select).toHaveValue('department_manager')
    expect(await screen.findByText(/الدور التخصصي «مدير البرامج والمسارات» غير مفعّل في هذه البيئة/)).toBeInTheDocument()
  })
})

describe('saving from the edit drawer', () => {
  it('saves an unchanged role without a validation error', async () => {
    arrange({ roles: SERVER_ROLES })
    const select = await openDrawer()
    await waitFor(() => expect(optionOf(select, 'student')).toBeDefined())

    await userEvent.click(screen.getByRole('button', { name: 'حفظ التغييرات' }))

    await waitFor(() => expect(http.put).toHaveBeenCalledTimes(1))
    expect(http.put.mock.calls[0][0]).toBe('/admin/users/39')
    expect(http.put.mock.calls[0][1]).toMatchObject({ role: 'department_member' })
    expect(toasts.success).toHaveBeenCalledWith('تم الحفظ')
    expect(toasts.warning).not.toHaveBeenCalled()
  })

  it('sends the allowed role the admin selected', async () => {
    arrange({ roles: SERVER_ROLES })
    const select = await openDrawer()
    await waitFor(() => expect(optionOf(select, 'student')).toBeDefined())

    await userEvent.selectOptions(select, 'instructor')
    await userEvent.click(screen.getByRole('button', { name: 'حفظ التغييرات' }))

    await waitFor(() => expect(http.put).toHaveBeenCalledTimes(1))
    expect(http.put.mock.calls[0][1]).toMatchObject({ role: 'instructor' })
  })

  it('renders the server\'s Arabic 422 role message next to the role field, without a duplicate toast', async () => {
    const arabic =
      'الدور «department_member» معرَّف في النظام لكنه غير مُفعَّل في قاعدة بيانات هذه البيئة بعد، لذلك لا يمكن إسناده الآن. اطلب من فريق التقنية تشغيل الترحيلات (php artisan migrate) أو مزامنة الأدوار (php artisan roles:sync-system --apply) ثم أعد المحاولة.'
    arrange({ roles: SERVER_ROLES })
    http.put.mockRejectedValue(httpError(422, { message: 'The given data was invalid.', errors: { role: [arabic] } }))
    const select = await openDrawer()
    await waitFor(() => expect(optionOf(select, 'student')).toBeDefined())

    await userEvent.click(screen.getByRole('button', { name: 'حفظ التغييرات' }))

    const alert = (await screen.findAllByText(arabic))[0]
    expect(alert.closest('label')).toContainElement(select)
    expect(select).toHaveAttribute('aria-invalid', 'true')
    expect(toasts.warning).toHaveBeenCalledTimes(1)
    expect(toasts.warning.mock.calls[0][0]).toContain('راجع الحقول')

    // The message belongs to the value that was sent: changing the role clears it.
    await userEvent.selectOptions(select, 'student')
    expect(screen.queryByText(arabic)).not.toBeInTheDocument()
  })

  it('turns an old server\'s English "selected role is invalid" into a clear Arabic sentence under the field', async () => {
    arrange({ roles: SERVER_ROLES })
    http.put.mockRejectedValue(httpError(422, { message: 'The given data was invalid.', errors: { role: ['The selected role is invalid.'] } }))
    const select = await openDrawer()
    await waitFor(() => expect(optionOf(select, 'student')).toBeDefined())

    await userEvent.click(screen.getByRole('button', { name: 'حفظ التغييرات' }))

    expect(await screen.findByText('الدور المختار غير مقبول من الخادم.')).toBeInTheDocument()
    expect(toasts.warning).toHaveBeenCalledTimes(1)
    expect(toasts.warning.mock.calls[0][0]).toContain('راجع الحقول')
  })

  it('renders a department error next to the department field and still toasts errors of other fields', async () => {
    arrange({ roles: SERVER_ROLES })
    http.put.mockRejectedValue(
      httpError(422, {
        message: 'The given data was invalid.',
        errors: { department_id: ['الإدارة المختارة غير موجودة.'], email: ['The email has already been taken.'] },
      }),
    )
    const select = await openDrawer()
    await waitFor(() => expect(optionOf(select, 'student')).toBeDefined())

    await userEvent.click(screen.getByRole('button', { name: 'حفظ التغييرات' }))

    const deptSelect = await screen.findByRole('combobox', { name: /الإدارة التابع لها/ })
    const msg = await screen.findByText('الإدارة المختارة غير موجودة.')
    expect(msg.closest('label')).toContainElement(deptSelect)
    expect(toasts.warning).toHaveBeenCalledTimes(1)
    expect(toasts.warning.mock.calls[0][0]).toContain('البريد الإلكتروني')
    expect(toasts.warning.mock.calls[0][0]).not.toContain('الإدارة')
  })
})
