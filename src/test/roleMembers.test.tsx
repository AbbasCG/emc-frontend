import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'

/**
 * Role members: ONE hook + component for the roles drawer tab and the access-control «الأدوار»
 * section, and the roles-page counter coming from the server's `users_count`.
 */

const api = vi.hoisted(() => ({
  fetchRoleMembers: vi.fn(),
  fetchRolesWithUserCounts: vi.fn(),
}))
vi.mock('@/api/roleMembersApi', async (orig) => ({
  ...(await orig<typeof import('@/api/roleMembersApi')>()),
  ...api,
}))

const member = (id: number, over: Record<string, unknown> = {}) => ({
  id,
  name: `عضو ${id}`,
  email: `m${id}@emc.test`,
  isActive: true,
  roleSource: 'primary' as const,
  ...over,
})

const page = (items: ReturnType<typeof member>[], over: Record<string, unknown> = {}) => ({
  items,
  total: items.length,
  page: 1,
  perPage: 15,
  lastPage: 1,
  ...over,
})

const { RoleMembersPanel } = await import('@/components/access-control/RoleMembersPanel')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('RoleMembersPanel', () => {
  it('lists name, email, account status and role source, and the count equals the server total', async () => {
    api.fetchRoleMembers.mockResolvedValue(
      page([member(1), member(2, { isActive: false, roleSource: 'additional' }), member(3, { roleSource: 'specialized' })]),
    )
    render(<RoleMembersPanel roleSlug="department_manager" roleLabelAr="مدير الإدارة" />)

    expect(await screen.findByText('عضو 1')).toBeInTheDocument()
    expect(screen.getByText('m1@emc.test')).toHaveAttribute('dir', 'ltr')
    expect(screen.getByText('دور أساسي')).toBeInTheDocument()
    expect(screen.getByText('دور إضافي')).toBeInTheDocument()
    expect(screen.getByText('دور متخصص')).toBeInTheDocument()
    expect(screen.getByText('غير نشط')).toBeInTheDocument()
    expect(screen.getAllByText('نشط')).toHaveLength(2)
    expect(screen.getByTestId('role-members-total')).toHaveTextContent('3 مستخدم')
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    expect(api.fetchRoleMembers).toHaveBeenCalledWith('department_manager', { search: '', page: 1, perPage: 15 })
  })

  it('shows the server total (not the page size) and paginates through the server', async () => {
    const user = userEvent.setup()
    api.fetchRoleMembers.mockImplementation(async (_slug: string, p: { page?: number }) =>
      p.page === 2 ?
        page([member(16)], { total: 16, page: 2, lastPage: 2 })
      : page(Array.from({ length: 15 }, (_, i) => member(i + 1)), { total: 16, page: 1, lastPage: 2 }),
    )
    render(<RoleMembersPanel roleSlug="student" roleLabelAr="طالب" />)

    expect(await screen.findByText('عضو 15')).toBeInTheDocument()
    expect(screen.getByTestId('role-members-total')).toHaveTextContent('16 مستخدم')
    expect(screen.getByText('صفحة 1 من 2')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /التالي/ }))

    expect(await screen.findByText('عضو 16')).toBeInTheDocument()
    expect(api.fetchRoleMembers).toHaveBeenLastCalledWith('student', { search: '', page: 2, perPage: 15 })
    expect(screen.getByText('صفحة 2 من 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /التالي/ })).toBeDisabled()
  })

  it('searches on the server (debounced) and returns to page 1', async () => {
    const user = userEvent.setup()
    api.fetchRoleMembers.mockResolvedValue(page([member(1)]))
    render(<RoleMembersPanel roleSlug="student" roleLabelAr="طالب" />)
    await screen.findByText('عضو 1')

    await user.type(screen.getByLabelText('البحث في مستخدمي الدور'), 'سارة')

    await waitFor(() =>
      expect(api.fetchRoleMembers).toHaveBeenLastCalledWith('student', { search: 'سارة', page: 1, perPage: 15 }),
    )
  })

  it('shows Arabic loading and empty states', async () => {
    api.fetchRoleMembers.mockResolvedValue(page([]))
    render(<RoleMembersPanel roleSlug="partner" roleLabelAr="شريك" />)

    expect(screen.getByText('جارٍ تحميل المستخدمين…')).toBeInTheDocument()
    expect(await screen.findByText('لا يوجد مستخدمون مرتبطون بهذا الدور حالياً')).toBeInTheDocument()
  })

  it('a load failure is a visible error with retry — never an empty list', async () => {
    const user = userEvent.setup()
    api.fetchRoleMembers.mockRejectedValueOnce(new Error('تعذّر الاتصال بالخادم'))
    api.fetchRoleMembers.mockResolvedValueOnce(page([member(7)]))
    render(<RoleMembersPanel roleSlug="partner" roleLabelAr="شريك" />)

    expect(await screen.findByRole('alert')).toHaveTextContent('تعذّر تحميل مستخدمي الدور')
    expect(screen.queryByText('لا يوجد مستخدمون مرتبطون بهذا الدور حالياً')).toBeNull()
    expect(screen.queryByTestId('role-members-total')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'إعادة المحاولة' }))
    expect(await screen.findByText('عضو 7')).toBeInTheDocument()
  })
})

describe('roles page counter', () => {
  it('uses the server users_count per role instead of tallying a partial user list', async () => {
    api.fetchRolesWithUserCounts.mockResolvedValue([
      { id: 1, name: 'super_admin', displayName: 'مدير النظام', usersCount: 2 },
      { id: 2, name: 'student', displayName: 'طالب', usersCount: 481 },
    ])
    const { default: RolesPermissionsPage } = await import('@/pages/super-admin/crud/RolesPermissionsPage')
    render(
      <MemoryRouter>
        <RolesPermissionsPage />
      </MemoryRouter>,
    )

    // 2 + 481 — a number that no first-page tally of /admin/users could reach.
    expect(await screen.findByText('483')).toBeInTheDocument()
    expect(screen.getAllByText('481 مستخدم').length).toBeGreaterThan(0)
  })

  it('shows an explicit failure instead of «0» when the counts cannot be loaded', async () => {
    api.fetchRolesWithUserCounts.mockRejectedValue(new Error('x'))
    const { default: RolesPermissionsPage } = await import('@/pages/super-admin/crud/RolesPermissionsPage')
    render(
      <MemoryRouter>
        <RolesPermissionsPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('تعذّر التحميل')).toBeInTheDocument()
  })
})
