import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'

/** Contract tests for the action-permission / role-member clients and the preview's `action_permissions`. */

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock('@/api/axios', () => ({ default: http }))

const {
  fetchUserActionPermissions,
  grantUserActionPermission,
  revokeUserActionPermission,
  fetchPermissionHolders,
} = await import('@/api/actionPermissionsApi')
const { fetchRoleMembers, fetchRolesWithUserCounts } = await import('@/api/roleMembersApi')
const { fetchUserEffectivePageAccess } = await import('@/api/accessControlApi')
const { EffectiveAccessPreview } = await import('@/components/access-control/EffectiveAccessPreview')

const rawRow = (over: Record<string, unknown> = {}) => ({
  key: 'tickets.review_participated',
  label_ar: 'اعتماد التذاكر التي أشارك فيها',
  description_ar: 'وصف',
  group: 'tickets',
  effective: true,
  source: 'direct',
  sources: [{ type: 'direct_allow', label_ar: 'منح مباشر' }, { type: 'bogus', label_ar: 'x' }],
  direct_state: 'allow',
  direct_expires_at: null,
  granted_by: { id: 9, name: 'Root' },
  role_grants: false,
  still_effective_after_revoke: false,
  explicit_only: true,
  can_grant: false,
  can_revoke: true,
  ...over,
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('action permissions client', () => {
  it('reads groups and rows, dropping unknown source types', async () => {
    http.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          user: { id: 5, name: 'عباس', email: 'a@x', role: 'admin', is_active: true },
          groups: [{ key: 'tickets', label_ar: 'التذاكر', permissions: [rawRow()] }],
        },
      },
    })
    const res = await fetchUserActionPermissions(5, { search: ' مراجعة ', group: 'tickets' })

    expect(http.get).toHaveBeenCalledWith(
      '/admin/access/users/5/action-permissions',
      expect.objectContaining({ params: { search: 'مراجعة', group: 'tickets' } }),
    )
    const row = res.groups[0].permissions[0]
    expect(row).toMatchObject({
      key: 'tickets.review_participated',
      effective: true,
      source: 'direct',
      directState: 'allow',
      explicitOnly: true,
      canGrant: false,
      canRevoke: true,
      grantedBy: { id: 9, name: 'Root' },
    })
    expect(row.sources).toEqual([{ type: 'direct_allow', labelAr: 'منح مباشر' }])
  })

  it('grant / revoke accept data.permission, a bare data row, and send expires_at only when given', async () => {
    http.post.mockResolvedValueOnce({ data: { success: true, data: { permission: rawRow() } } })
    const a = await grantUserActionPermission(5, 'tickets.review_participated', '2026-12-01')
    expect(http.post).toHaveBeenLastCalledWith(
      '/admin/access/users/5/action-permissions/tickets.review_participated/grant',
      { expires_at: '2026-12-01' },
      expect.anything(),
    )
    expect(a.effective).toBe(true)

    http.post.mockResolvedValueOnce({ data: { success: true, data: rawRow({ effective: false, can_grant: true }) } })
    const b = await revokeUserActionPermission(5, 'tickets.review_participated')
    expect(http.post).toHaveBeenLastCalledWith(
      '/admin/access/users/5/action-permissions/tickets.review_participated/revoke',
      {},
      expect.anything(),
    )
    expect(b.canGrant).toBe(true)

    http.post.mockResolvedValueOnce({ data: { success: true, data: rawRow({ key: 'x.y' }) } })
    await grantUserActionPermission(5, 'x.y')
    http.post.mockResolvedValueOnce({ data: { success: true, data: {} } })
    await expect(grantUserActionPermission(5, 'x.y')).rejects.toThrow()
    http.post.mockResolvedValueOnce({ data: { success: true, data: rawRow({ key: 'x.y' }) } })
    await grantUserActionPermission(5, 'x.y')
    expect(http.post).toHaveBeenLastCalledWith('/admin/access/users/5/action-permissions/x.y/grant', {}, expect.anything())
  })

  it('holders: maps roles, direct users and the effective page', async () => {
    http.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          permission: { key: 'k.v', label_ar: 'ل', description_ar: 'و', group: 'g', explicit_only: true },
          roles: [{ id: 1, name: 'admin', display_name: 'مدير', users_count: 3, source: 'system' }],
          direct_users: { items: [{ id: 2, name: 'س', email: 'e', role: 'admin', state: 'deny', expires_at: null, granted_by: 'Root' }], total: 1 },
          effective_users: { items: [], total: 0, page: 1, per_page: 15, last_page: 1 },
        },
      },
    })
    const res = await fetchPermissionHolders('k.v', { search: 'a', page: 2, perPage: 15 })

    expect(http.get).toHaveBeenCalledWith(
      '/admin/permissions/k.v/holders',
      expect.objectContaining({ params: { search: 'a', page: 2, per_page: 15 } }),
    )
    expect(res.roles[0]).toMatchObject({ displayName: 'مدير', usersCount: 3, source: 'system' })
    expect(res.directUsers.items[0]).toMatchObject({ state: 'deny', grantedBy: 'Root' })
    expect(res.permission.explicitOnly).toBe(true)
  })
})

describe('role members client', () => {
  it('reads users_count from /admin/roles (list, data.roles and data.items shapes)', async () => {
    const roles = [{ id: 1, name: 'student', display_name: 'طالب', users_count: 481 }, { id: 2, name: '', users_count: 9 }]
    for (const data of [roles, { roles }, { items: roles }]) {
      http.get.mockResolvedValueOnce({ data: { success: true, data } })
      expect(await fetchRolesWithUserCounts()).toEqual([{ id: 1, name: 'student', displayName: 'طالب', usersCount: 481 }])
    }
  })

  it('reads a members page with server pagination metadata', async () => {
    http.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          items: [{ id: 1, name: 'عضو', email: 'm@x', is_active: false, role_source: 'specialized' }],
          total: 41,
          page: 2,
          per_page: 15,
          last_page: 3,
        },
      },
    })
    const res = await fetchRoleMembers('department_manager', { search: 'ع', page: 2, perPage: 15 })

    expect(http.get).toHaveBeenCalledWith(
      '/admin/roles/department_manager/users',
      expect.objectContaining({ params: { search: 'ع', page: 2, per_page: 15 } }),
    )
    expect(res).toMatchObject({ total: 41, page: 2, lastPage: 3 })
    expect(res.items[0]).toMatchObject({ isActive: false, roleSource: 'specialized' })
  })
})

describe('effective access preview carries action_permissions', () => {
  const pageRow = {
    key: 'operations.weekly_reports',
    allowed: true,
    primary_source: 'role',
    primary_source_label_ar: 'من الدور',
    sources: ['role'],
    override_state: null,
    protected: false,
    reason: '',
    label_ar: 'التقارير الأسبوعية',
    category: 'operations',
    category_label_ar: 'العمليات',
    risk_level: 'ADMIN_ONLY',
  }

  it('is tolerant when the key is absent', async () => {
    http.get.mockResolvedValue({ data: { success: true, data: { user: { id: 1 }, allowed_keys: [], pages: [pageRow] } } })
    expect((await fetchUserEffectivePageAccess(1)).actionPermissions).toEqual([])

    render(<EffectiveAccessPreview userId={1} userName="عباس" />)
    expect(await screen.findByText('التقارير الأسبوعية')).toBeInTheDocument()
    expect(screen.queryByLabelText('صلاحيات الإجراءات الفعلية')).toBeNull()
  })

  it('renders the same status and source chips as the server decided', async () => {
    http.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          user: { id: 1 },
          allowed_keys: ['operations.weekly_reports'],
          pages: [pageRow],
          action_permissions: [
            {
              key: 'tickets.review_participated',
              label_ar: 'اعتماد التذاكر التي أشارك فيها',
              effective: true,
              source: 'direct',
              sources: [{ type: 'direct_allow', label_ar: 'منح مباشر' }],
            },
            { key: 'tickets.review', label_ar: 'مراجعة', effective: false, source: 'none', sources: [] },
          ],
        },
      },
    })
    render(<EffectiveAccessPreview userId={1} userName="عباس" />)

    const section = await screen.findByLabelText('صلاحيات الإجراءات الفعلية')
    const granted = section.querySelector('[data-action-permission="tickets.review_participated"]') as HTMLElement
    expect(within(granted).getByText('فعّالة')).toBeInTheDocument()
    expect(within(granted).getByText('منح مباشر')).toBeInTheDocument()
    const denied = section.querySelector('[data-action-permission="tickets.review"]') as HTMLElement
    await waitFor(() => expect(within(denied).getByText('غير فعّالة')).toBeInTheDocument())
  })
})
